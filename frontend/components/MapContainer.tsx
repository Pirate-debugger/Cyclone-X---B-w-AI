'use client';

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { 
  RotateCcw, 
  Wind, 
  Droplets, 
  Waves, 
  Building2, 
  Satellite, 
  AlertTriangle, 
  Navigation, 
  Users, 
  Clock, 
  Layers, 
  Maximize2, 
  Eye, 
  Target, 
  GitCompare, 
  TrendingUp, 
  ShieldCheck, 
  Compass, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { 
  TrackCollection, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  EnsembleAggregationResult,
  ForecastMember,
  AssetImpactProbability
} from '../lib/types';
import { 
  getEnsembleAggregation, 
  getEnsembleMembers, 
  getHazardsGeoJSON, 
  getAssetImpacts,
  getRouteRisk
} from '../lib/api';
import { 
  escapeHtml, 
  normalizeOpacity, 
  validateAndCleanGeoJSON, 
  extractRouteCoordinates 
} from '../lib/geojson-validator';
import { 
  LOCAL_OFFLINE_STYLE 
} from '../lib/offline-india-basemap';
import { 
  MapLayerManager, 
  MapErrorClassification, 
  MapLayerMeta 
} from '../lib/map-layer-manager';
import { 
  generatePopulationGridGeoJSON, 
  generateForecastChangeGeoJSON 
} from '../lib/map-overlay-helpers';

// Register maplibre worker on client
if (typeof window !== 'undefined' && typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

// Register PMTiles Protocol for MapLibre
let pmtilesInitialized = false;
function registerPMTilesProtocol() {
  if (typeof window !== 'undefined' && !pmtilesInitialized) {
    try {
      const protocol = new Protocol();
      maplibregl.addProtocol('pmtiles', protocol.tile);
      pmtilesInitialized = true;
    } catch (e) {
      console.warn('PMTiles protocol registration note:', e);
    }
  }
}

export type MapMode = 
  | 'TRACK'
  | 'ENSEMBLE'
  | 'FORECAST CHANGE'
  | 'WIND'
  | 'RAINFALL'
  | 'FLOOD'
  | 'IMPACT'
  | 'INFRASTRUCTURE'
  | 'POPULATION'
  | 'SATELLITE'
  | 'ROUTE RISK';

export type BasemapHealthStatus = 
  | 'BASEMAP_LOADING'
  | 'BASEMAP_READY'
  | 'BASEMAP_DEGRADED'
  | 'BASEMAP_FAILED'
  | 'OFFLINE';

export interface MapContainerProps {
  eventId?: string;
  selectedState?: string;
  selectedDistrict?: string;
  trackData?: TrackCollection | null;
  hotspots?: HotspotZone[];
  infrastructure?: InfrastructureRiskAssessment[];
  selectedZone?: HotspotZone | null;
  selectedInfra?: InfrastructureRiskAssessment | null;
  onSelectZone?: (zone: HotspotZone | null) => void;
  onSelectInfrastructure?: (infra: InfrastructureRiskAssessment | null) => void;
  onSelectAssetImpact?: (asset: AssetImpactProbability | null) => void;
  onModeChange?: (mode: MapMode) => void;
}

const DEFAULT_MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
const OPENFREEMAP_ATTRIBUTION = '© OpenFreeMap | © OpenMapTiles | © OpenStreetMap contributors';

// State bounding boxes for dynamic camera fitting [minLng, minLat, maxLng, maxLat]
const STATE_BOUNDS: Record<string, [number, number, number, number]> = {
  'OD': [81.3, 17.8, 87.5, 22.6],
  'ODISHA': [81.3, 17.8, 87.5, 22.6],
  'WB': [85.8, 21.5, 89.9, 27.2],
  'WEST BENGAL': [85.8, 21.5, 89.9, 27.2],
  'AP': [76.7, 12.6, 84.8, 19.1],
  'ANDHRA PRADESH': [76.7, 12.6, 84.8, 19.1],
  'TN': [76.2, 8.1, 80.3, 13.5],
  'TAMIL NADU': [76.2, 8.1, 80.3, 13.5],
  'GJ': [68.1, 20.1, 74.5, 24.7],
  'GUJARAT': [68.1, 20.1, 74.5, 24.7],
  'KL': [74.8, 8.3, 77.4, 12.8],
  'KERALA': [74.8, 8.3, 77.4, 12.8],
  'GA': [73.6, 14.8, 74.4, 15.8],
  'GOA': [73.6, 14.8, 74.4, 15.8],
  'MH': [72.6, 15.6, 80.9, 22.0],
  'MAHARASHTRA': [72.6, 15.6, 80.9, 22.0],
  'AN': [92.2, 6.7, 94.3, 13.7],
  'ANDAMAN & NICOBAR': [92.2, 6.7, 94.3, 13.7]
};

const TIME_STEPS = [
  { label: 'NOW', hours: 0 },
  { label: '+6h', hours: 6 },
  { label: '+12h', hours: 12 },
  { label: '+24h', hours: 24 },
  { label: '+36h', hours: 36 },
  { label: '+48h', hours: 48 },
  { label: '+72h', hours: 72 }
];

export const MapContainer: React.FC<MapContainerProps> = ({
  eventId = 'DEMO-TC-2026-ALPHA',
  selectedState,
  selectedDistrict,
  trackData,
  hotspots = [],
  infrastructure = [],
  selectedZone,
  selectedInfra,
  onSelectZone,
  onSelectInfrastructure,
  onSelectAssetImpact,
  onModeChange
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const layerManagerRef = useRef<MapLayerManager | null>(null);
  
  const [isStyleReady, setIsStyleReady] = useState(false);
  const [basemapHealth, setBasemapHealth] = useState<BasemapHealthStatus>('BASEMAP_LOADING');
  const [lastErrorType, setLastErrorType] = useState<MapErrorClassification | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeMode, setActiveMode] = useState<MapMode>('ENSEMBLE');
  const [selectedTimeHours, setSelectedTimeHours] = useState<number>(48);

  // Dynamic Geospatial Data
  const [ensembleData, setEnsembleData] = useState<EnsembleAggregationResult | null>(null);
  const [rawMembers, setRawMembers] = useState<ForecastMember[]>([]);
  const [hazardsGeoJSON, setHazardsGeoJSON] = useState<any>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [routeRiskData, setRouteRiskData] = useState<any>(null);
  const [satelliteTileUrl, setSatelliteTileUrl] = useState<string | null>(null);
  const [satelliteStatus, setSatelliteStatus] = useState<string>('CHECKING');

  // 1. Fetch Geospatial Data for the specific eventId
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const [ensAgg, ensMbrs, hazards, impacts, route] = await Promise.allSettled([
          getEnsembleAggregation(eventId),
          getEnsembleMembers(eventId),
          getHazardsGeoJSON(eventId),
          getAssetImpacts(eventId),
          getRouteRisk({
            origin_lat: 20.2961,
            origin_lon: 85.8245,
            dest_lat: 19.8135,
            dest_lon: 85.8312,
            event_id: eventId
          })
        ]);

        if (isCancelled) return;

        if (ensAgg.status === 'fulfilled') setEnsembleData((ensAgg.value as any)?.data || ensAgg.value);
        if (ensMbrs.status === 'fulfilled') setRawMembers(Array.isArray(ensMbrs.value) ? ensMbrs.value : (ensMbrs.value as any)?.data || []);
        if (hazards.status === 'fulfilled') setHazardsGeoJSON((hazards.value as any)?.data || hazards.value);
        if (impacts.status === 'fulfilled') setAssetImpacts(Array.isArray(impacts.value) ? impacts.value : (impacts.value as any)?.data || []);
        if (route.status === 'fulfilled') setRouteRiskData((route.value as any)?.data || route.value);
      } catch (err) {
        console.warn('[MapContainer] Geospatial loading error:', err);
      }
    }

    loadData();

    // Check Satellite Tile availability
    fetch('/api/earth-engine/layers')
      .then(res => res.json())
      .then(json => {
        if (!isCancelled && json?.data?.length) {
          const s1 = json.data.find((d: any) => d.id === 's1-grd');
          if (s1?.live_ee_available) {
            setSatelliteStatus('LIVE (EARTH ENGINE)');
          } else {
            setSatelliteStatus('DEMO PREVIEW (CACHED)');
          }
        }
      })
      .catch(() => {
        if (!isCancelled) setSatelliteStatus('NOT CONFIGURED');
      });

    return () => {
      isCancelled = true;
    };
  }, [eventId]);

  // 2. Initialize MapLibre GL instance exactly once
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    registerPMTilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: isOfflineMode ? LOCAL_OFFLINE_STYLE : DEFAULT_MAP_STYLE_URL,
      center: [85.5, 19.5],
      zoom: 6.8,
      attributionControl: false
    });

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: OPENFREEMAP_ATTRIBUTION
      }),
      'bottom-right'
    );

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    const layerManager = new MapLayerManager(map);
    layerManagerRef.current = layerManager;

    const onStyleReady = () => {
      if (map.isStyleLoaded()) {
        setIsStyleReady(true);
        setBasemapHealth(isOfflineMode ? 'OFFLINE' : 'BASEMAP_READY');
        setLastErrorType(null);
      }
    };

    map.on('load', onStyleReady);
    map.on('style.load', onStyleReady);

    map.on('error', (e: any) => {
      const msg = e?.error?.message || '';
      const status = e?.error?.status;
      if (status === 404 || status === 500 || msg.includes('Failed to fetch')) {
        setBasemapHealth('BASEMAP_DEGRADED');
        setLastErrorType('BASEMAP_ERROR');
      } else if (msg.includes('WebGL')) {
        setBasemapHealth('BASEMAP_FAILED');
        setLastErrorType('WEBGL_ERROR');
      }
    });

    // WebGL context recovery
    const canvas = map.getCanvas();
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setBasemapHealth('BASEMAP_FAILED');
      setLastErrorType('WEBGL_ERROR');
    };
    const handleContextRestored = () => {
      setBasemapHealth('BASEMAP_READY');
      setLastErrorType(null);
      layerManager.rehydrateAll();
    };

    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);

    mapRef.current = map;

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      layerManager.detachMap();
      layerManagerRef.current = null;
      map.remove();
      mapRef.current = null;
      setIsStyleReady(false);
    };
  }, []);

  // 3. ResizeObserver for responsive resizing
  useEffect(() => {
    if (!mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [isStyleReady]);

  // 4. Register and configure all application layers via MapLayerManager
  useEffect(() => {
    const map = mapRef.current;
    const lm = layerManagerRef.current;
    if (!map || !lm || !isStyleReady || !map.isStyleLoaded()) return;

    // --- A. Observed Track Line ---
    lm.registerSource('observed-track-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'observed-track-line',
      type: 'line',
      source: 'observed-track-source',
      paint: {
        'line-color': '#ef4444',
        'line-width': 3.2
      }
    }, {
      id: 'observed-track-line',
      label: 'Observed Track',
      sourceId: 'observed-track-source',
      classification: 'OBSERVATION',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- B. Forecast Track Line ---
    lm.registerSource('forecast-track-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'forecast-track-line',
      type: 'line',
      source: 'forecast-track-source',
      paint: {
        'line-color': '#f97316',
        'line-width': 2.6,
        'line-dasharray': [3, 2]
      }
    }, {
      id: 'forecast-track-line',
      label: 'Forecast Track',
      sourceId: 'forecast-track-source',
      classification: 'FORECAST',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- C. Forecast Points ---
    lm.registerSource('forecast-points-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'forecast-points-circle',
      type: 'circle',
      source: 'forecast-points-source',
      paint: {
        'circle-color': '#f97316',
        'circle-radius': 5.5,
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 1.5
      }
    }, {
      id: 'forecast-points-circle',
      label: 'Forecast Fix Points',
      sourceId: 'forecast-points-source',
      classification: 'FORECAST',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- D. Ensemble Member Lines (64-Members) ---
    lm.registerSource('ensemble-members-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'ensemble-members-lines',
      type: 'line',
      source: 'ensemble-members-source',
      paint: {
        'line-color': '#06b6d4',
        'line-width': 1.2,
        'line-opacity': 0.35
      }
    }, {
      id: 'ensemble-members-lines',
      label: '64-Mbr Ensemble Tracks',
      sourceId: 'ensemble-members-source',
      classification: 'ENSEMBLE',
      visible: true,
      opacity: 0.35,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- E. Track Density Grid ---
    lm.registerSource('track-density-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'track-density-fill',
      type: 'fill',
      source: 'track-density-source',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'occupancy_pct'],
          5, '#082f49',
          20, '#0284c7',
          50, '#38bdf8',
          80, '#f59e0b',
          100, '#ef4444'
        ],
        'fill-opacity': 0.35
      }
    }, {
      id: 'track-density-fill',
      label: 'Track Occupancy Density',
      sourceId: 'track-density-source',
      classification: 'MODEL_OUTPUT',
      visible: true,
      opacity: 0.35,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- F. Priority Hotspot Zones ---
    lm.registerSource('hotspot-zones-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'hotspot-zones-fill',
      type: 'fill',
      source: 'hotspot-zones-source',
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'risk_band'], 'SEVERE'], '#ef4444',
          ['==', ['get', 'risk_band'], 'HIGH'], '#f97316',
          ['==', ['get', 'risk_band'], 'MODERATE'], '#eab308',
          '#3b82f6'
        ],
        'fill-opacity': [
          'case',
          ['get', 'is_selected'], 0.45,
          0.24
        ]
      }
    }, {
      id: 'hotspot-zones-fill',
      label: 'Hotspot Priority Zones',
      sourceId: 'hotspot-zones-source',
      classification: 'SCENARIO',
      visible: true,
      opacity: 0.25,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    lm.registerLayer({
      id: 'hotspot-zones-stroke',
      type: 'line',
      source: 'hotspot-zones-source',
      paint: {
        'line-color': [
          'case',
          ['get', 'is_selected'], '#ffffff',
          ['==', ['get', 'risk_band'], 'SEVERE'], '#f87171',
          ['==', ['get', 'risk_band'], 'HIGH'], '#fb923c',
          '#fde047'
        ],
        'line-width': ['case', ['get', 'is_selected'], 2.5, 1.2],
        'line-dasharray': [2, 1]
      }
    }, {
      id: 'hotspot-zones-stroke',
      label: 'Hotspot Outlines',
      sourceId: 'hotspot-zones-source',
      classification: 'SCENARIO',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- G. Spatial Hazards (Wind, Rain, Surge, Flood) with Normalized Opacity ---
    lm.registerSource('hazards-spatial-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'hazards-spatial-fill',
      type: 'fill',
      source: 'hazards-spatial-source',
      paint: {
        'fill-color': ['get', 'color'],
        'fill-opacity': ['get', 'fill_opacity']
      }
    }, {
      id: 'hazards-spatial-fill',
      label: 'Multi-Hazard Polygons',
      sourceId: 'hazards-spatial-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 0.35,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    lm.registerLayer({
      id: 'hazards-spatial-line',
      type: 'line',
      source: 'hazards-spatial-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': 1.5,
        'line-dasharray': [3, 2]
      }
    }, {
      id: 'hazards-spatial-line',
      label: 'Hazard Boundaries',
      sourceId: 'hazards-spatial-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- H. Clustered Infrastructure Assets ---
    lm.registerSource('infra-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 40
    });

    lm.registerLayer({
      id: 'infra-clusters',
      type: 'circle',
      source: 'infra-source',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#0284c7', 5,
          '#38bdf8', 15,
          '#f59e0b'
        ],
        'circle-radius': [
          'step',
          ['get', 'point_count'],
          15, 5,
          20, 15,
          25
        ],
        'circle-stroke-color': '#080d1a',
        'circle-stroke-width': 2
      }
    }, {
      id: 'infra-clusters',
      label: 'Infrastructure Asset Clusters',
      sourceId: 'infra-source',
      classification: 'OBSERVATION',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    lm.registerLayer({
      id: 'infra-cluster-count',
      type: 'symbol',
      source: 'infra-source',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': 11
      },
      paint: { 'text-color': '#ffffff' }
    }, {
      id: 'infra-cluster-count',
      label: 'Asset Cluster Counts',
      sourceId: 'infra-source',
      classification: 'OBSERVATION',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    lm.registerLayer({
      id: 'infra-unclustered-point',
      type: 'circle',
      source: 'infra-source',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': [
          'match',
          ['get', 'type'],
          'hospital', '#38bdf8',
          'port', '#f97316',
          'substation', '#fbbf24',
          'bridge', '#a855f7',
          'water', '#06b6d4',
          'shelter', '#34d399',
          '#e2e8f0'
        ],
        'circle-radius': 7.0,
        'circle-stroke-color': '#050914',
        'circle-stroke-width': 2.0
      }
    }, {
      id: 'infra-unclustered-point',
      label: 'Individual Lifelines',
      sourceId: 'infra-source',
      classification: 'OBSERVATION',
      visible: true,
      opacity: 1.0,
      renderer: 'geojson',
      status: 'ACTIVE'
    });

    // --- I. Population Grid Layer ---
    lm.registerSource('population-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'population-fill',
      type: 'fill',
      source: 'population-source',
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'density_per_sqkm'],
          300, '#042f2e',
          600, '#0f766e',
          1000, '#14b8a6',
          1500, '#f59e0b',
          2500, '#ef4444'
        ],
        'fill-opacity': 0.38
      }
    }, {
      id: 'population-fill',
      label: 'WorldPop Demographic Density',
      sourceId: 'population-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 0.38,
      renderer: 'geojson',
      status: 'STANDBY'
    });

    // --- J. Forecast Change Delta Comparison ---
    lm.registerSource('forecast-change-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'forecast-change-lines',
      type: 'line',
      source: 'forecast-change-source',
      paint: {
        'line-color': ['get', 'color'],
        'line-width': [
          'case',
          ['==', ['get', 'shift_type'], 'LANDFALL_SHIFT_VECTOR'], 3.8,
          2.4
        ],
        'line-dasharray': [
          'case',
          ['==', ['get', 'line_type'], 'dashed'], ['literal', [3, 2]],
          ['literal', [1, 0]]
        ]
      }
    }, {
      id: 'forecast-change-lines',
      label: 'Forecast Cycle Delta',
      sourceId: 'forecast-change-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 0.85,
      renderer: 'geojson',
      status: 'STANDBY'
    });

    // --- K. Emergency Route Risk Corridors ---
    lm.registerSource('route-baseline-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'route-baseline-line',
      type: 'line',
      source: 'route-baseline-source',
      paint: {
        'line-color': '#ef4444',
        'line-width': 3.5,
        'line-opacity': 0.85
      }
    }, {
      id: 'route-baseline-line',
      label: 'Primary Evacuation Corridor',
      sourceId: 'route-baseline-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 0.85,
      renderer: 'geojson',
      status: 'STANDBY'
    });

    lm.registerSource('route-alt-source', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    lm.registerLayer({
      id: 'route-alt-line',
      type: 'line',
      source: 'route-alt-source',
      paint: {
        'line-color': '#10b981',
        'line-width': 3.5,
        'line-dasharray': [3, 1],
        'line-opacity': 0.9
      }
    }, {
      id: 'route-alt-line',
      label: 'Alternative Inland Evacuation Route',
      sourceId: 'route-alt-source',
      classification: 'MODEL_OUTPUT',
      visible: false,
      opacity: 0.9,
      renderer: 'geojson',
      status: 'STANDBY'
    });

    // Register interactions once with MapLayerManager
    lm.registerInteractions({
      onSelectZone: (zoneId, lngLat) => {
        const matched = hotspots.find(h => h.zone_id === zoneId);
        if (matched && onSelectZone) onSelectZone(matched);
        if (matched) {
          new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(lngLat)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <b style="color: #38bdf8; font-size: 12px;">${escapeHtml(matched.name)}</b>
                  <span style="background: ${matched.risk_band === 'SEVERE' ? '#ef4444' : '#f97316'}; color: white; padding: 1px 4px; border-radius: 2px; font-size: 9px; font-weight: bold;">${escapeHtml(matched.risk_band)}</span>
                </div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${escapeHtml(matched.administrative_area)}</div>
                <div style="margin-top: 4px; color: #f59e0b;">Top Hazard: <b>${escapeHtml(matched.top_hazard)}</b></div>
                <div style="margin-top: 2px; color: #cbd5e1;">Pop Exposure: <b>${matched.population_estimate ? matched.population_estimate.toLocaleString() : 'N/A'}</b></div>
                <div style="margin-top: 4px; font-size: 10px; color: #67e8f9; background: #0f172a; padding: 3px; border-radius: 2px;">
                  Action: ${escapeHtml(matched.suggested_action)}
                </div>
              </div>
            `)
            .addTo(map);
        }
      },
      onSelectInfrastructure: (assetId, coords) => {
        const matched = infrastructure.find(i => i.asset_id === assetId);
        if (matched && onSelectInfrastructure) onSelectInfrastructure(matched);
        const matchedProb = assetImpacts.find(a => a.asset_id === assetId);
        if (matchedProb && onSelectAssetImpact) onSelectAssetImpact(matchedProb);
        if (matched) {
          const pCombined = matchedProb ? `${Math.round(matchedProb.p_combined_impact * 100)}%` : 'N/A';
          const pWind = matchedProb ? `${Math.round(matchedProb.p_wind_exceedance * 100)}%` : 'N/A';
          const pRain = matchedProb ? `${Math.round(matchedProb.p_rain_exceedance * 100)}%` : 'N/A';
          const pFlood = matchedProb ? `${Math.round(matchedProb.p_inundation_exceedance * 100)}%` : 'N/A';
          const backup = matchedProb?.backup_power ? escapeHtml(matchedProb.backup_power) : 'N/A';
          const road = matchedProb?.road_access_status ? escapeHtml(matchedProb.road_access_status) : 'DATA UNAVAILABLE';

          new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
                <b style="color: #38bdf8; font-size: 12px; text-transform: uppercase;">${escapeHtml(matched.name)}</b>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 1px;">CRITICALITY: <b>${escapeHtml(matched.type.toUpperCase())}</b></div>
                <div style="margin-top: 6px; padding: 4px 6px; background: #1e1b4b; border: 1px solid #4338ca; border-radius: 4px;">
                  <span style="color: #c7d2fe;">P(COMBINED IMPACT): </span>
                  <b style="color: #f43f5e; font-size: 13px;">${pCombined}</b>
                </div>
                <div style="margin-top: 6px; line-height: 1.5; font-size: 10px;">
                  <div>• Wind P(>100 km/h): <b style="color: #f59e0b;">${pWind}</b></div>
                  <div>• Rain P(>200 mm): <b style="color: #38bdf8;">${pRain}</b></div>
                  <div>• Flood P(>0.5m): <b style="color: #06b6d4;">${pFlood}</b></div>
                  <div>• Backup Power: <b style="color: #34d399;">${backup}</b></div>
                  <div>• Road Access: <b style="color: #f43f5e;">${road}</b></div>
                </div>
              </div>
            `)
            .addTo(map);
        }
      },
      onSelectForecastPoint: (props, coords) => {
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
              <b style="color: #f97316;">${escapeHtml(props.category || 'TROPICAL CYCLONE')}</b>
              <div>Valid Time: <b>${escapeHtml(props.timestamp)}</b></div>
              <div>Lead: <b>+${props.lead_hours || 0}h</b></div>
              <div>Wind: <b>${props.wind_speed || props.wind_speed_kmh} km/h</b></div>
              <div>Central Pressure: <b>${props.pressure || props.central_pressure_hpa} hPa</b></div>
            </div>
          `)
          .addTo(map);
      },
      onSelectHazard: (props, lngLat) => {
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(lngLat)
          .setHTML(`
            <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
              <b style="color: ${escapeHtml(props.color || '#38bdf8')}; font-size: 12px;">${escapeHtml(props.label || props.hazard_type)}</b>
              <div style="color: #cbd5e1; margin-top: 3px;">Intensity: <b>${escapeHtml(props.intensity || 'High')}</b></div>
              <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Methodology: ${escapeHtml(props.methodology || 'PARAMETRIC PROXY')}</div>
            </div>
          `)
          .addTo(map);
      },
      onSelectRoute: (props, lngLat) => {
        new maplibregl.Popup({ closeButton: true })
          .setLngLat(lngLat)
          .setHTML(`
            <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
              <b style="color: #ef4444; font-size: 12px;">${escapeHtml(props.name || 'Evacuation Corridor')}</b>
              <div>Exposure Score: <b>${props.exposure || 0}%</b></div>
              <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Status: Route intersects modeled high-risk sector.</div>
            </div>
          `)
          .addTo(map);
      },
      onClusterClick: async (clusterId, coords) => {
        const source: any = map.getSource('infra-source');
        if (source && typeof source.getClusterExpansionZoom === 'function') {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({ center: coords, zoom });
        }
      }
    });

  }, [isStyleReady, hotspots, infrastructure, assetImpacts, onSelectZone, onSelectInfrastructure, onSelectAssetImpact]);

  // 5. Push Updated Geospatial Data to MapLayerManager Sources
  useEffect(() => {
    const lm = layerManagerRef.current;
    if (!lm || !isStyleReady) return;

    // Track Data (Observed, Forecast Line, Forecast Points)
    if (trackData) {
      const obsPoints: any[] = (trackData as any).observed_track || (trackData as any).observed || [];
      const fcPoints: any[] = (trackData as any).forecast_track || (trackData as any).forecast || [];
      const observedCoords = obsPoints.map((p: any) => [p.longitude, p.latitude]);
      const forecastCoords = fcPoints.map((p: any) => [p.longitude, p.latitude]);

      if (observedCoords.length > 1) {
        lm.updateSourceData('observed-track-source', {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: observedCoords },
          properties: { name: 'Observed Track' }
        });
      } else {
        lm.clearSource('observed-track-source');
      }

      if (forecastCoords.length > 1) {
        lm.updateSourceData('forecast-track-source', {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: forecastCoords },
          properties: { name: 'Forecast Track' }
        });

        // Forecast change generator using current forecast track
        const forecastChangeGeoJSON = generateForecastChangeGeoJSON(forecastCoords);
        lm.updateSourceData('forecast-change-source', forecastChangeGeoJSON);
      } else {
        lm.clearSource('forecast-track-source');
        lm.clearSource('forecast-change-source');
      }

      // Filter forecast points by time slider if needed
      const filteredFcPoints = fcPoints.filter((p: any) => {
        const lead = p.lead_hours ?? p.step_hours ?? 0;
        return selectedTimeHours === 0 || lead <= selectedTimeHours;
      });

      const forecastPointFeatures = filteredFcPoints.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          timestamp: p.timestamp,
          lead_hours: p.lead_hours ?? p.step_hours ?? 0,
          wind_speed: p.wind_speed_kmh || p.wind_speed,
          pressure: p.central_pressure_hpa || p.pressure,
          category: p.category
        }
      }));

      lm.updateSourceData('forecast-points-source', {
        type: 'FeatureCollection',
        features: forecastPointFeatures
      });
    } else {
      lm.clearSource('observed-track-source');
      lm.clearSource('forecast-track-source');
      lm.clearSource('forecast-points-source');
      lm.clearSource('forecast-change-source');
    }

    // Hotspot Zones
    if (hotspots && hotspots.length > 0) {
      const hotspotFeatures = hotspots.filter(h => h.geometry).map(h => ({
        type: 'Feature',
        geometry: h.geometry,
        properties: {
          zone_id: h.zone_id,
          name: h.name,
          administrative_area: h.administrative_area || '',
          risk_score: h.risk_score,
          risk_band: h.risk_band,
          top_hazard: h.top_hazard,
          population_estimate: h.population_estimate,
          suggested_action: h.suggested_action,
          is_selected: selectedZone?.zone_id === h.zone_id
        }
      }));
      lm.updateSourceData('hotspot-zones-source', {
        type: 'FeatureCollection',
        features: hotspotFeatures
      });
    } else {
      lm.clearSource('hotspot-zones-source');
    }

    // Ensemble Members & Track Density
    if (rawMembers && rawMembers.length > 0) {
      const membersByGroup: Record<string, ForecastMember[]> = {};
      rawMembers.forEach(m => {
        if (!membersByGroup[m.member_id]) membersByGroup[m.member_id] = [];
        membersByGroup[m.member_id].push(m);
      });

      const ensembleFeatures = Object.keys(membersByGroup)
        .map(mId => {
          const sortedPts = membersByGroup[mId].sort((a, b) => a.lead_hours - b.lead_hours);
          if (sortedPts.length < 2) return null;
          return {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: sortedPts.map(p => [p.longitude, p.latitude])
            },
            properties: { member_id: mId }
          };
        })
        .filter(Boolean);

      lm.updateSourceData('ensemble-members-source', {
        type: 'FeatureCollection',
        features: ensembleFeatures
      });
    } else {
      lm.clearSource('ensemble-members-source');
    }

    if (ensembleData?.track_density_geojson) {
      lm.updateSourceData('track-density-source', ensembleData.track_density_geojson);
    } else {
      lm.clearSource('track-density-source');
    }

    // Hazards GeoJSON (Normalized Opacity)
    if (hazardsGeoJSON) {
      const cleanHazards = validateAndCleanGeoJSON(hazardsGeoJSON);
      lm.updateSourceData('hazards-spatial-source', cleanHazards);
    } else {
      lm.clearSource('hazards-spatial-source');
    }

    // Clustered Infrastructure Assets
    if (infrastructure && infrastructure.length > 0) {
      const infraFeatures = infrastructure.filter(i => i.geometry).map(i => {
        const matchedProb = assetImpacts.find(a => a.asset_id === i.asset_id);
        return {
          type: 'Feature',
          geometry: i.geometry,
          properties: {
            asset_id: i.asset_id,
            name: i.name,
            type: i.type,
            risk_score: i.risk_score,
            threat: i.primary_threat,
            p_combined: matchedProb ? Math.round(matchedProb.p_combined_impact * 100) : null,
            p_wind: matchedProb ? Math.round(matchedProb.p_wind_exceedance * 100) : null,
            p_rain: matchedProb ? Math.round(matchedProb.p_rain_exceedance * 100) : null,
            p_flood: matchedProb ? Math.round(matchedProb.p_inundation_exceedance * 100) : null,
            backup_power: matchedProb?.backup_power || null,
            road_access: matchedProb?.road_access_status || null
          }
        };
      });

      lm.updateSourceData('infra-source', {
        type: 'FeatureCollection',
        features: infraFeatures
      });
    } else {
      lm.clearSource('infra-source');
    }

    // Population Grid Layer
    const populationData = generatePopulationGridGeoJSON(selectedState);
    lm.updateSourceData('population-source', populationData);

    // Route Risk Layers
    if (routeRiskData) {
      const baselineCoords = extractRouteCoordinates(routeRiskData);
      if (baselineCoords && baselineCoords.length >= 2) {
        lm.updateSourceData('route-baseline-source', {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: baselineCoords },
          properties: {
            name: 'Primary Evacuation Corridor',
            exposure: routeRiskData.baseline_exposure_score || routeRiskData.route_exposure_score || 0
          }
        });
      } else {
        lm.clearSource('route-baseline-source');
      }

      const altCoords = extractRouteCoordinates({
        route_geojson: routeRiskData.alternative_geojson,
        route_geometry: routeRiskData.alternative_geometry
      });
      if (altCoords && altCoords.length >= 2) {
        lm.updateSourceData('route-alt-source', {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: altCoords },
          properties: {
            name: 'Alternative Evacuation Route',
            reduction: routeRiskData.exposure_reduction_pct || 0
          }
        });
      } else {
        lm.clearSource('route-alt-source');
      }
    } else {
      lm.clearSource('route-baseline-source');
      lm.clearSource('route-alt-source');
    }

  }, [isStyleReady, trackData, hotspots, rawMembers, ensembleData, hazardsGeoJSON, infrastructure, assetImpacts, routeRiskData, selectedZone, selectedState, selectedTimeHours]);

  // 6. Map Mode Preset Controller: Toggles layer visibility without calling map.setStyle()
  useEffect(() => {
    const lm = layerManagerRef.current;
    if (!lm || !isStyleReady) return;

    // Default: turn all off, then turn active mode layers on
    const allLayers = [
      'observed-track-line',
      'forecast-track-line',
      'forecast-points-circle',
      'ensemble-members-lines',
      'track-density-fill',
      'hotspot-zones-fill',
      'hotspot-zones-stroke',
      'hazards-spatial-fill',
      'hazards-spatial-line',
      'infra-clusters',
      'infra-cluster-count',
      'infra-unclustered-point',
      'population-fill',
      'forecast-change-lines',
      'route-baseline-line',
      'route-alt-line'
    ];

    allLayers.forEach(l => lm.setLayerVisibility(l, false));

    switch (activeMode) {
      case 'TRACK':
        lm.setLayerVisibility('observed-track-line', true);
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('forecast-points-circle', true);
        break;

      case 'ENSEMBLE':
        lm.setLayerVisibility('observed-track-line', true);
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('forecast-points-circle', true);
        lm.setLayerVisibility('ensemble-members-lines', true);
        lm.setLayerVisibility('track-density-fill', true);
        lm.setLayerVisibility('hotspot-zones-fill', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        break;

      case 'FORECAST CHANGE':
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('forecast-points-circle', true);
        lm.setLayerVisibility('forecast-change-lines', true);
        lm.setLayerVisibility('hotspot-zones-fill', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        break;

      case 'WIND':
      case 'RAINFALL':
      case 'FLOOD':
      case 'IMPACT':
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('hazards-spatial-fill', true);
        lm.setLayerVisibility('hazards-spatial-line', true);
        lm.setLayerVisibility('hotspot-zones-fill', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        break;

      case 'INFRASTRUCTURE':
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        lm.setLayerVisibility('hotspot-zones-fill', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        break;

      case 'POPULATION':
        lm.setLayerVisibility('population-fill', true);
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        break;

      case 'SATELLITE':
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('hotspot-zones-stroke', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        break;

      case 'ROUTE RISK':
        lm.setLayerVisibility('forecast-track-line', true);
        lm.setLayerVisibility('route-baseline-line', true);
        lm.setLayerVisibility('route-alt-line', true);
        lm.setLayerVisibility('hazards-spatial-fill', true);
        lm.setLayerVisibility('infra-clusters', true);
        lm.setLayerVisibility('infra-cluster-count', true);
        lm.setLayerVisibility('infra-unclustered-point', true);
        break;
    }

    if (onModeChange) onModeChange(activeMode);
  }, [isStyleReady, activeMode, onModeChange]);

  // 7. Dynamic Camera Bounds Controller (Sections 11 & 12)
  const fitCameraToBounds = useCallback((boundsArray: [number, number, number, number]) => {
    const map = mapRef.current;
    if (!map) return;
    const [minLng, minLat, maxLng, maxLat] = boundsArray;
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: { top: 50, bottom: 50, left: 50, right: 50 }, duration: 1000, maxZoom: 10.5 }
    );
  }, []);

  // Sync camera when state / district changes
  useEffect(() => {
    if (!mapRef.current || !selectedState) return;
    const stateBounds = STATE_BOUNDS[selectedState.toUpperCase()];
    if (stateBounds) {
      fitCameraToBounds(stateBounds);
    }
  }, [selectedState, fitCameraToBounds]);

  // Sync camera when selectedZone changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZone?.geometry) return;
    try {
      if (selectedZone.geometry.type === 'Polygon' && selectedZone.geometry.coordinates?.[0]?.length) {
        const coords = selectedZone.geometry.coordinates[0];
        const bounds = new maplibregl.LngLatBounds();
        coords.forEach((c: number[]) => bounds.extend([c[0], c[1]]));
        map.fitBounds(bounds, { padding: 80, duration: 1000, maxZoom: 10.0 });
      } else if (selectedZone.geometry.type === 'Point') {
        map.flyTo({ center: selectedZone.geometry.coordinates as [number, number], zoom: 9.5, duration: 1000 });
      }
    } catch (e) {
      console.warn('Zone flyTo warning:', e);
    }
  }, [selectedZone]);

  // Sync camera when selectedInfra changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedInfra?.geometry) return;
    try {
      if (selectedInfra.geometry.coordinates) {
        map.flyTo({
          center: selectedInfra.geometry.coordinates as [number, number],
          zoom: 11.0,
          duration: 1000
        });
      }
    } catch (e) {
      console.warn('Infra flyTo warning:', e);
    }
  }, [selectedInfra]);

  // Reset to full event track bounds
  const resetCameraToTrack = () => {
    const map = mapRef.current;
    if (!map) return;

    if (trackData) {
      const points = [
        ...((trackData as any).observed_track || (trackData as any).observed || []),
        ...((trackData as any).forecast_track || (trackData as any).forecast || [])
      ];
      if (points.length >= 2) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p: any) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 70, duration: 900 });
        return;
      }
    }

    // Default regional bounds
    map.flyTo({ center: [85.5, 19.5], zoom: 6.8, duration: 900 });
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#050914] overflow-hidden select-none">
      <div ref={mapContainer} className="w-full h-full" />

      {/* TOP-LEFT: Engine & Basemap Health Status Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 bg-[#080d1a]/95 border border-[#334155] px-2.5 py-1.5 rounded text-[10px] font-mono shadow-xl backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              basemapHealth === 'BASEMAP_READY' ? 'bg-emerald-400' : basemapHealth === 'OFFLINE' ? 'bg-amber-400' : 'bg-rose-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              basemapHealth === 'BASEMAP_READY' ? 'bg-emerald-500' : basemapHealth === 'OFFLINE' ? 'bg-amber-500' : 'bg-rose-500'
            }`}></span>
          </span>
          <span className="text-slate-200 font-bold">MAPLIBRE GL JS 6.11.2</span>
          <span className="text-cyan-400 font-semibold px-1 rounded bg-cyan-950/60 border border-cyan-800 text-[9px]">
            {isOfflineMode ? 'LOCAL OFFLINE MAP' : 'OPENFREEMAP'}
          </span>
        </div>

        {/* Selected Event ID Badge */}
        <div className="flex items-center gap-1 bg-[#0b1329]/90 border border-[#1e293b] px-2 py-0.5 rounded text-[9px] font-mono text-slate-400">
          <span>EVENT:</span>
          <b className="text-cyan-300">{eventId}</b>
        </div>
      </div>

      {/* BASEMAP ERROR BANNER (Section 5 & 34) */}
      {(basemapHealth === 'BASEMAP_DEGRADED' || basemapHealth === 'BASEMAP_FAILED' || isOfflineMode) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-amber-500/60 text-amber-200 px-4 py-2.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3 font-mono text-xs max-w-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div className="flex-1">
            <div className="font-bold text-white flex items-center gap-2">
              {isOfflineMode ? 'LOCAL OFFLINE MAP ACTIVE' : 'BASEMAP DEGRADED / UNAVAILABLE'}
            </div>
            <div className="text-[11px] text-slate-300">
              {isOfflineMode 
                ? 'Displaying bundled India coastline and coastal state boundaries. Data layers remain active.'
                : 'OpenFreeMap tile server is slow or unreachable. You can switch to the local offline basemap.'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isOfflineMode ? (
              <button 
                onClick={() => {
                  setIsOfflineMode(true);
                  setBasemapHealth('OFFLINE');
                  if (mapRef.current) mapRef.current.setStyle(LOCAL_OFFLINE_STYLE);
                }}
                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded text-[10px]"
              >
                ACTIVATE OFFLINE MAP
              </button>
            ) : (
              <button 
                onClick={() => {
                  setIsOfflineMode(false);
                  setBasemapHealth('BASEMAP_LOADING');
                  if (mapRef.current) mapRef.current.setStyle(DEFAULT_MAP_STYLE_URL);
                }}
                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-black font-bold rounded text-[10px]"
              >
                TRY OPENFREEMAP
              </button>
            )}
          </div>
        </div>
      )}

      {/* GROUPED MAP MODES SELECTOR (Section 48) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-[#080d1a]/95 border border-[#334155] p-1.5 rounded-lg shadow-2xl backdrop-blur-md max-w-[95vw] overflow-x-auto">
        {/* Group 1: Forecast */}
        <div className="flex items-center gap-1 border-r border-[#334155] pr-1.5">
          {(['TRACK', 'ENSEMBLE', 'FORECAST CHANGE'] as MapMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMode === mode
                  ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              {mode === 'FORECAST CHANGE' && <GitCompare className="w-3 h-3" />}
              {mode}
            </button>
          ))}
        </div>

        {/* Group 2: Hazards */}
        <div className="flex items-center gap-1 border-r border-[#334155] pr-1.5">
          {(['WIND', 'RAINFALL', 'FLOOD', 'IMPACT'] as MapMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMode === mode
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              {mode === 'WIND' && <Wind className="w-3 h-3" />}
              {mode === 'RAINFALL' && <Droplets className="w-3 h-3" />}
              {mode === 'FLOOD' && <Waves className="w-3 h-3" />}
              {mode}
            </button>
          ))}
        </div>

        {/* Group 3: Context */}
        <div className="flex items-center gap-1">
          {(['INFRASTRUCTURE', 'POPULATION', 'SATELLITE', 'ROUTE RISK'] as MapMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeMode === mode
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              {mode === 'INFRASTRUCTURE' && <Building2 className="w-3 h-3" />}
              {mode === 'POPULATION' && <Users className="w-3 h-3" />}
              {mode === 'SATELLITE' && <Satellite className="w-3 h-3" />}
              {mode === 'ROUTE RISK' && <Navigation className="w-3 h-3" />}
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* TOP-RIGHT: Map Utility Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
        <button
          onClick={resetCameraToTrack}
          className="bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 p-2 rounded border border-[#334155] shadow-xl flex items-center justify-center transition-colors"
          title="Reset to Forecast Track Bounds"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SATELLITE MODE STATUS OVERLAY (Section 19 & 20) */}
      {activeMode === 'SATELLITE' && (
        <div className="absolute top-14 left-3 z-20 bg-[#080d1a]/95 border border-cyan-500/60 p-2 rounded shadow-2xl backdrop-blur-md font-mono text-[10px] max-w-xs text-slate-300">
          <div className="flex items-center justify-between text-cyan-400 font-bold mb-1">
            <span className="flex items-center gap-1">
              <Satellite className="w-3.5 h-3.5" />
              EARTH ENGINE SATELLITE OVERLAY
            </span>
            <span className="bg-cyan-950 px-1 rounded text-[9px] border border-cyan-800">{satelliteStatus}</span>
          </div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            {satelliteStatus.includes('LIVE') ? (
              <span>Streaming Sentinel-1 C-Band SAR GRD surface backscatter from Google Earth Engine catalog.</span>
            ) : (
              <span>Google Earth Engine credentials not mounted on server. Displaying high-resolution DEMO SATELLITE PREVIEW.</span>
            )}
          </div>
        </div>
      )}

      {/* TIME SLIDER (Section 38) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 bg-[#080d1a]/95 border border-[#334155] px-3 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-2 font-mono text-[10px]">
        <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="text-slate-400 font-semibold">VALID TIME:</span>
        <div className="flex items-center gap-1">
          {TIME_STEPS.map((step) => {
            const isSelected = selectedTimeHours === step.hours;
            return (
              <button
                key={step.label}
                onClick={() => setSelectedTimeHours(step.hours)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  isSelected
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b]'
                }`}
              >
                {step.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC MODE-SPECIFIC LEGEND (Section 49) */}
      <div className="absolute bottom-3 left-3 bg-[#080d1a]/95 border border-[#334155] rounded-md px-3 py-2 z-20 text-[10px] font-mono shadow-2xl backdrop-blur-md max-w-[85vw] overflow-x-auto">
        <div className="font-bold text-slate-200 mb-1 flex items-center justify-between gap-4">
          <span className="text-cyan-400">ACTIVE MODE: {activeMode}</span>
          <span className="text-slate-500">WeatherNext 3 / IMD Regional Guidance</span>
        </div>

        {activeMode === 'TRACK' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
              <span>Observed Track (IMD)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-amber-500 inline-block border-dashed"></span>
              <span>Forecast Track (WeatherNext 3)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 border border-white inline-block"></span>
              <span>Lead Fix Points</span>
            </div>
          </div>
        )}

        {activeMode === 'ENSEMBLE' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
              <span>64 Ensemble Members</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-sky-500/40 border border-sky-400 inline-block"></span>
              <span>Track Density Grid</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500/30 border border-red-500 inline-block"></span>
              <span>Priority Hotspots</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-400 inline-block"></span>
              <span>Clustered Assets</span>
            </div>
          </div>
        )}

        {activeMode === 'FORECAST CHANGE' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-slate-400 inline-block border-dashed"></span>
              <span>Run 12Z (Previous)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
              <span>Run 18Z (Current)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-1 bg-rose-500 inline-block"></span>
              <span>Landfall Shift Vector (+28.4km NE)</span>
            </div>
          </div>
        )}

        {(activeMode === 'WIND' || activeMode === 'RAINFALL' || activeMode === 'FLOOD' || activeMode === 'IMPACT') && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-red-500/50 border border-red-500 inline-block"></span>
              <span>Hurricane Wind Core (&gt;118 km/h)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500 inline-block"></span>
              <span>Storm Swath (&gt;92 km/h)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500/40 border border-blue-500 inline-block"></span>
              <span>Rain Exceedance (&gt;200mm/24h)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-cyan-500/50 border border-cyan-500 inline-block"></span>
              <span>Surge Inundation Corridor</span>
            </div>
          </div>
        )}

        {activeMode === 'POPULATION' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-800 inline-block"></span>
              <span>300-600 / km²</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-teal-500 inline-block"></span>
              <span>600-1,000 / km²</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
              <span>1,000-1,500 / km²</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span>
              <span>&gt;1,500 / km²</span>
            </div>
            <span className="text-[9px] text-slate-500 italic">WorldPop / GHSL 100m High-Res Grid</span>
          </div>
        )}

        {activeMode === 'ROUTE RISK' && (
          <div className="flex items-center gap-3 text-slate-300">
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-rose-500 inline-block"></span>
              <span>Baseline Route (High Hazard Exposure)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-400 inline-block border-dashed"></span>
              <span>Alternative Western Evacuation Corridor</span>
            </div>
            <span className="text-[9px] text-slate-400">Valhalla / OSRM Coastal Routing</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapContainer;
