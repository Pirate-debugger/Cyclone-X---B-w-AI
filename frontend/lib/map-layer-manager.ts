import type { Map as MapLibreInstance, LayerSpecification, SourceSpecification, GeoJSONSource } from 'maplibre-gl';
import { validateAndCleanGeoJSON } from './geojson-validator';

export interface MapLayerMeta {
  id: string;
  label: string;
  sourceId: string;
  classification: 'OFFICIAL' | 'OBSERVATION' | 'FORECAST' | 'ENSEMBLE' | 'MODEL_OUTPUT' | 'SCENARIO' | 'DEMO' | 'SATELLITE';
  visible: boolean;
  opacity: number;
  renderer: 'vector' | 'geojson' | 'raster';
  timestamp?: string;
  resolution?: string;
  status: 'ACTIVE' | 'STANDBY' | 'UNAVAILABLE' | 'LAYER_NOT_READY';
}

export type MapErrorClassification = 
  | 'STYLE_ERROR'
  | 'BASEMAP_ERROR'
  | 'VECTOR_TILE_ERROR'
  | 'RASTER_ERROR'
  | 'GEOJSON_ERROR'
  | 'WORKER_ERROR'
  | 'WEBGL_ERROR';

export interface MapInteractionCallbacks {
  onSelectZone?: (zoneId: string, lngLat: [number, number]) => void;
  onSelectInfrastructure?: (assetId: string, coords: [number, number]) => void;
  onSelectForecastPoint?: (props: any, coords: [number, number]) => void;
  onSelectHazard?: (props: any, lngLat: [number, number]) => void;
  onSelectRoute?: (props: any, lngLat: [number, number]) => void;
  onClusterClick?: (clusterId: number, coords: [number, number]) => void;
}

export class MapLayerManager {
  private map: MapLibreInstance | null = null;
  private sources: Map<string, { spec: SourceSpecification; data?: any }> = new Map();
  private layers: Map<string, { spec: LayerSpecification; meta: MapLayerMeta }> = new Map();
  private pendingVisibility: Map<string, boolean> = new Map();
  private interactionsRegistered = false;
  private boundCallbacks: MapInteractionCallbacks = {};
  private activeListeners: Array<{ type: string; layerId?: string; listener: (...args: any[]) => void }> = [];

  constructor(map?: MapLibreInstance | null) {
    if (map) this.attachMap(map);
  }

  public attachMap(map: MapLibreInstance) {
    this.map = map;
    this.setupLifecycleListeners();
  }

  public detachMap() {
    this.cleanupInteractions();
    this.map = null;
  }

  private setupLifecycleListeners() {
    if (!this.map) return;
    
    // Automatically rehydrate all registered application sources and layers when style loads or replaces
    const rehydrate = () => {
      if (this.map && this.map.isStyleLoaded()) {
        this.rehydrateAll();
      }
    };

    this.map.on('style.load', rehydrate);
    this.map.on('load', rehydrate);
  }

  /**
   * Registers or updates a GeoJSON or Raster source.
   * Stores source specification and data in registry so it survives style replacement.
   */
  public registerSource(sourceId: string, spec: SourceSpecification, data?: any) {
    const cleanData = spec.type === 'geojson' && data ? validateAndCleanGeoJSON(data) : data;
    this.sources.set(sourceId, { spec: { ...spec, ...(cleanData ? { data: cleanData } : {}) }, data: cleanData });

    if (this.map && this.map.isStyleLoaded()) {
      try {
        if (!this.map.getSource(sourceId)) {
          this.map.addSource(sourceId, {
            ...spec,
            ...(cleanData ? { data: cleanData } : {})
          });
        } else if (cleanData && spec.type === 'geojson') {
          (this.map.getSource(sourceId) as GeoJSONSource).setData(cleanData);
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Source registration note (${sourceId}):`, err);
      }
    }
  }

  /**
   * Registers a layer definition with metadata.
   */
  public registerLayer(spec: LayerSpecification, meta: MapLayerMeta) {
    this.layers.set(spec.id, { spec, meta });

    if (this.map && this.map.isStyleLoaded()) {
      try {
        if (!this.map.getLayer(spec.id)) {
          // If source doesn't exist yet, defer until source is present
          if (this.map.getSource(meta.sourceId)) {
            this.map.addLayer(spec);
            const targetVis = this.pendingVisibility.has(spec.id) 
              ? this.pendingVisibility.get(spec.id)! 
              : meta.visible;
            this.map.setLayoutProperty(spec.id, 'visibility', targetVis ? 'visible' : 'none');
            meta.status = targetVis ? 'ACTIVE' : 'STANDBY';
          } else {
            meta.status = 'LAYER_NOT_READY';
          }
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Layer registration note (${spec.id}):`, err);
        meta.status = 'LAYER_NOT_READY';
      }
    }
  }

  /**
   * Updates data for a GeoJSON source.
   * If data is empty or null, clears source with an empty FeatureCollection.
   */
  public updateSourceData(sourceId: string, data: any) {
    const cleanData = data ? validateAndCleanGeoJSON(data) : { type: 'FeatureCollection', features: [] };
    const entry = this.sources.get(sourceId);
    if (entry) {
      entry.data = cleanData;
    }

    if (this.map && this.map.isStyleLoaded()) {
      try {
        const src = this.map.getSource(sourceId) as GeoJSONSource;
        if (src && typeof src.setData === 'function') {
          src.setData(cleanData);
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Source update note (${sourceId}):`, err);
      }
    }
  }

  /**
   * Clears a source completely with an empty FeatureCollection.
   */
  public clearSource(sourceId: string) {
    this.updateSourceData(sourceId, { type: 'FeatureCollection', features: [] });
  }

  /**
   * Central layer visibility toggle with existence check and safe retry.
   */
  public setLayerVisibility(layerId: string, visible: boolean) {
    this.pendingVisibility.set(layerId, visible);
    const layerEntry = this.layers.get(layerId);
    if (layerEntry) {
      layerEntry.meta.visible = visible;
    }

    if (this.map && this.map.isStyleLoaded()) {
      try {
        if (this.map.getLayer(layerId)) {
          this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
          if (layerEntry) {
            layerEntry.meta.status = visible ? 'ACTIVE' : 'STANDBY';
          }
        } else if (layerEntry) {
          layerEntry.meta.status = 'LAYER_NOT_READY';
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Visibility set note (${layerId}):`, err);
        if (layerEntry) layerEntry.meta.status = 'LAYER_NOT_READY';
      }
    }
  }

  /**
   * Rehydrates all registered sources and layers.
   * Used on load, style.load, or after basemap style switch.
   */
  public rehydrateAll() {
    if (!this.map || !this.map.isStyleLoaded()) return;

    // 1. Rehydrate all sources
    this.sources.forEach((sourceDef, sourceId) => {
      try {
        if (!this.map!.getSource(sourceId)) {
          this.map!.addSource(sourceId, {
            ...sourceDef.spec,
            ...(sourceDef.data ? { data: sourceDef.data } : {})
          });
        } else if (sourceDef.data && sourceDef.spec.type === 'geojson') {
          (this.map!.getSource(sourceId) as GeoJSONSource).setData(sourceDef.data);
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Rehydrate source warning (${sourceId}):`, err);
      }
    });

    // 2. Rehydrate all layers
    this.layers.forEach((layerDef) => {
      try {
        if (!this.map!.getLayer(layerDef.spec.id)) {
          if (this.map!.getSource(layerDef.meta.sourceId)) {
            this.map!.addLayer(layerDef.spec);
            const targetVis = this.pendingVisibility.has(layerDef.spec.id)
              ? this.pendingVisibility.get(layerDef.spec.id)!
              : layerDef.meta.visible;
            this.map!.setLayoutProperty(layerDef.spec.id, 'visibility', targetVis ? 'visible' : 'none');
            layerDef.meta.status = targetVis ? 'ACTIVE' : 'STANDBY';
          }
        }
      } catch (err) {
        console.warn(`[MapLayerManager] Rehydrate layer warning (${layerDef.spec.id}):`, err);
      }
    });

    // 3. Re-attach interaction bindings if they were active
    if (this.interactionsRegistered) {
      this.rebindInteractions();
    }
  }

  /**
   * Registers user interactions (clicks, cursor changes) once with automatic cleanup.
   */
  public registerInteractions(callbacks: MapInteractionCallbacks) {
    this.boundCallbacks = callbacks;
    this.interactionsRegistered = true;
    this.rebindInteractions();
  }

  private rebindInteractions() {
    if (!this.map) return;
    this.cleanupInteractions(false);

    const map = this.map;
    const addListener = (type: string, layerId: string | undefined, listener: (...args: any[]) => void) => {
      if (layerId) {
        map.on(type as any, layerId, listener);
      } else {
        map.on(type as any, listener);
      }
      this.activeListeners.push({ type, layerId, listener });
    };

    // Hotspot Click
    addListener('click', 'hotspot-zones-fill', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const zoneId = e.features[0].properties?.zone_id;
      if (zoneId && this.boundCallbacks.onSelectZone) {
        this.boundCallbacks.onSelectZone(zoneId, [e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Infrastructure Point Click
    addListener('click', 'infra-unclustered-point', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const assetId = e.features[0].properties?.asset_id;
      const coords = e.features[0].geometry?.coordinates;
      if (assetId && this.boundCallbacks.onSelectInfrastructure && coords) {
        this.boundCallbacks.onSelectInfrastructure(assetId, [coords[0], coords[1]]);
      }
    });

    // Cluster Click Zoom
    addListener('click', 'infra-clusters', async (e: any) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['infra-clusters'] });
      if (!features || !features[0]) return;
      const clusterId = features[0].properties?.cluster_id;
      const coords = (features[0].geometry as any)?.coordinates;
      if (clusterId !== undefined && coords && this.boundCallbacks.onClusterClick) {
        this.boundCallbacks.onClusterClick(clusterId, [coords[0], coords[1]]);
      }
    });

    // Forecast Point Click
    addListener('click', 'forecast-points-circle', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      const coords = (e.features[0].geometry as any)?.coordinates;
      if (props && coords && this.boundCallbacks.onSelectForecastPoint) {
        this.boundCallbacks.onSelectForecastPoint(props, [coords[0], coords[1]]);
      }
    });

    // Hazard Click
    addListener('click', 'hazards-spatial-fill', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      if (props && this.boundCallbacks.onSelectHazard) {
        this.boundCallbacks.onSelectHazard(props, [e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Route Click
    addListener('click', 'route-baseline-line', (e: any) => {
      if (!e.features || !e.features[0]) return;
      const props = e.features[0].properties;
      if (props && this.boundCallbacks.onSelectRoute) {
        this.boundCallbacks.onSelectRoute(props, [e.lngLat.lng, e.lngLat.lat]);
      }
    });

    // Cursor Pointers
    const cursorLayers = ['hotspot-zones-fill', 'infra-unclustered-point', 'infra-clusters', 'forecast-points-circle'];
    cursorLayers.forEach(lId => {
      addListener('mouseenter', lId, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      addListener('mouseleave', lId, () => {
        map.getCanvas().style.cursor = '';
      });
    });
  }

  public cleanupInteractions(permanent = true) {
    if (!this.map) return;
    for (const item of this.activeListeners) {
      try {
        if (item.layerId) {
          this.map.off(item.type as any, item.layerId, item.listener);
        } else {
          this.map.off(item.type as any, item.listener);
        }
      } catch {
        // ignore cleanup error
      }
    }
    this.activeListeners = [];
    if (permanent) {
      this.interactionsRegistered = false;
      this.boundCallbacks = {};
    }
  }

  public getRegisteredLayerList(): MapLayerMeta[] {
    return Array.from(this.layers.values()).map(l => ({ ...l.meta }));
  }
}
