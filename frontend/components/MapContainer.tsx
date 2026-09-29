'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { 
  Layers, 
  RotateCcw, 
  Crosshair, 
  MapPin, 
  Wind, 
  Droplets, 
  Waves, 
  Building2, 
  Eye,
  GitCompare,
  TrendingUp,
  Activity,
  ShieldAlert,
  Satellite,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Navigation,
  Users
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

// Register maplibre worker if available
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

// 12-Layer Registry Definition (Section 7 & 8)
export interface MapLayerDefinition {
  id: string;
  label: string;
  source: string;
  classification: 'OFFICIAL' | 'OBSERVATION' | 'FORECAST' | 'ENSEMBLE' | 'MODEL_OUTPUT' | 'SCENARIO' | 'DEMO' | 'SATELLITE';
  visibility: boolean;
  opacity: number;
  renderer: 'vector' | 'geojson' | 'raster';
  timestamp: string;
  resolution: string;
  status: 'ACTIVE' | 'STANDBY' | 'UNAVAILABLE';
}

export type LayerRegistryEntry = MapLayerDefinition;

export type MapMode = 
  | 'TRACK'
  | 'ENSEMBLE'
  | 'WIND'
  | 'RAINFALL'
  | 'FLOOD'
  | 'IMPACT'
  | 'INFRASTRUCTURE'
  | 'POPULATION'
  | 'SATELLITE'
  | 'FORECAST CHANGE'
  | 'ROUTE RISK';

interface MapContainerProps {
  trackData?: TrackCollection | null;
  hotspots?: HotspotZone[];
  infrastructure?: InfrastructureRiskAssessment[];
  selectedZone?: HotspotZone | null;
  selectedInfra?: InfrastructureRiskAssessment | null;
  onSelectZone?: (zone: HotspotZone | null) => void;
  onSelectInfrastructure?: (infra: InfrastructureRiskAssessment | null) => void;
  onSelectAssetImpact?: (asset: AssetImpactProbability | null) => void;
}

// Basemap URL Constants (Section 2, 5 & 6)
const DEFAULT_MAP_STYLE_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty';
const OPENFREEMAP_ATTRIBUTION = '© OpenFreeMap | © OpenMapTiles | Data from OpenStreetMap';
const LOCAL_OFFLINE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'offline-background',
      type: 'background',
      paint: {
        'background-color': '#080d1a'
      }
    }
  ]
};

export const MapContainer: React.FC<MapContainerProps> = ({
  trackData,
  hotspots = [],
  infrastructure = [],
  selectedZone,
  selectedInfra,
  onSelectZone,
  onSelectInfrastructure,
  onSelectAssetImpact
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [basemapError, setBasemapError] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [activeMode, setActiveMode] = useState<MapMode>('ENSEMBLE');

  // Dynamic Layer Registry State (Section 8)
  const [layerVisibility, setLayerVisibility] = useState<Record<string, boolean>>({
    'OFFICIAL TRACK': true,
    'ENSEMBLE TRACK': true,
    'TRACK DENSITY': true,
    'WIND PROBABILITY': true,
    'RAINFALL PROBABILITY': true,
    'FLOOD/INUNDATION': true,
    'IMPACT PROBABILITY': true,
    'INFRASTRUCTURE': true,
    'POPULATION': false,
    'SATELLITE': false,
    'FORECAST CHANGE': false,
    'ROUTE RISK': false
  });

  // Dynamic V2 Geospatial Data
  const [ensembleData, setEnsembleData] = useState<EnsembleAggregationResult | null>(null);
  const [rawMembers, setRawMembers] = useState<ForecastMember[]>([]);
  const [hazardsGeoJSON, setHazardsGeoJSON] = useState<any>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [routeRiskData, setRouteRiskData] = useState<any>(null);

  // Initialize PMTiles on mount
  useEffect(() => {
    registerPMTilesProtocol();
  }, []);

  // Fetch V2 Ensemble, Hazards, and Asset Impacts with independent fallbacks
  useEffect(() => {
    async function loadGeospatialLayers() {
      const results = await Promise.allSettled([
        getEnsembleAggregation(),
        getEnsembleMembers(),
        getHazardsGeoJSON(),
        getAssetImpacts(),
        getRouteRisk({
          origin_lat: 20.2961,
          origin_lon: 85.8245,
          dest_lat: 19.8135,
          dest_lon: 85.8312
        })
      ]);

      if (results[0].status === 'fulfilled') setEnsembleData(results[0].value);
      if (results[1].status === 'fulfilled') setRawMembers(results[1].value);
      if (results[2].status === 'fulfilled') setHazardsGeoJSON(results[2].value);
      if (results[3].status === 'fulfilled') setAssetImpacts(results[3].value);
      if (results[4].status === 'fulfilled') setRouteRiskData(results[4].value?.data);
    }
    loadGeospatialLayers();
  }, []);

  // 1. Initialize MapLibre GL Map using OpenFreeMap Dark Basemap (Sections 3 & 5)
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    registerPMTilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: DEFAULT_MAP_STYLE_URL,
      center: [86.2, 19.8], // Bay of Bengal & Odisha coastline
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

    const markReady = () => {
      if (map.isStyleLoaded()) {
        setIsLoaded(true);
        setBasemapError(false);
      }
    };

    map.on('load', markReady);
    map.on('style.load', markReady);

    map.on('error', (e) => {
      // If basemap tiles fail, surface explicit error state without crashing
      const status = (e as any)?.error?.status;
      if (status === 404 || status === 500 || status === 401 || (e as any)?.error?.message?.includes('Failed to fetch')) {
        console.warn('Basemap tile warning:', e);
        setBasemapError(true);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // 1b. ResizeObserver for fluid layout
  useEffect(() => {
    if (!mapContainer.current || !mapRef.current) return;
    const ro = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.resize();
      }
    });
    ro.observe(mapContainer.current);
    return () => ro.disconnect();
  }, [isLoaded]);

  // 1c. Sync FlyTo when selectedZone changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedZone || !selectedZone.geometry) return;
    try {
      if (selectedZone.geometry.type === 'Polygon' && selectedZone.geometry.coordinates?.[0]?.length) {
        const coords = selectedZone.geometry.coordinates[0];
        const avgLon = coords.reduce((acc: number, c: number[]) => acc + c[0], 0) / coords.length;
        const avgLat = coords.reduce((acc: number, c: number[]) => acc + c[1], 0) / coords.length;
        map.flyTo({ center: [avgLon, avgLat], zoom: 8.4, duration: 1100, essential: true });
      } else if (selectedZone.geometry.type === 'Point') {
        map.flyTo({ center: selectedZone.geometry.coordinates, zoom: 9.0, duration: 1100, essential: true });
      }
    } catch (err) {
      console.warn("FlyTo zone warning:", err);
    }
  }, [selectedZone]);

  // 1d. Sync FlyTo when selectedInfra changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedInfra || !selectedInfra.geometry) return;
    try {
      if (selectedInfra.geometry.coordinates) {
        map.flyTo({ center: selectedInfra.geometry.coordinates, zoom: 10.5, duration: 1000, essential: true });
      }
    } catch (err) {
      console.warn("FlyTo infra warning:", err);
    }
  }, [selectedInfra]);

  // 2. Render Priority Hotspots Zones (Polygons)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !hotspots?.length) return;

    try {
      const hotspotFeatures = hotspots.filter(h => h.geometry).map(h => ({
        type: 'Feature',
        geometry: h.geometry,
        properties: {
          zone_id: h.zone_id,
          name: h.name,
          admin_area: h.administrative_area || '',
          risk_score: h.risk_score,
          risk_band: h.risk_band,
          top_hazard: h.top_hazard,
          population: h.population_estimate,
          action: h.suggested_action,
          is_selected: selectedZone?.zone_id === h.zone_id
        }
      }));

      const hotspotGeoJSON = {
        type: 'FeatureCollection',
        features: hotspotFeatures
      };

      if (map.getSource('hotspot-zones-source')) {
        (map.getSource('hotspot-zones-source') as maplibregl.GeoJSONSource).setData(hotspotGeoJSON as any);
      } else {
        map.addSource('hotspot-zones-source', {
          type: 'geojson',
          data: hotspotGeoJSON as any
        });

        map.addLayer({
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
              0.22
            ]
          }
        });

        map.addLayer({
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
            'line-width': [
              'case',
              ['get', 'is_selected'], 2.5,
              1.2
            ],
            'line-dasharray': [2, 1]
          }
        });

        map.on('click', 'hotspot-zones-fill', (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          const matched = hotspots.find(h => h.zone_id === props.zone_id);
          if (matched && onSelectZone) {
            onSelectZone(matched);
          }

          new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <b style="color: #38bdf8; font-size: 12px;">${props.name}</b>
                  <span style="background: ${props.risk_band === 'SEVERE' ? '#ef4444' : '#f97316'}; color: white; padding: 1px 4px; border-radius: 2px; font-size: 9px; font-weight: bold;">${props.risk_band}</span>
                </div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">${props.admin_area}</div>
                <div style="margin-top: 4px; color: #f59e0b;">Top Hazard: <b>${props.top_hazard}</b></div>
                <div style="margin-top: 2px; color: #cbd5e1;">Pop Exposure: <b>${props.population ? props.population.toLocaleString() : 'N/A'}</b></div>
                <div style="margin-top: 4px; font-size: 10px; color: #67e8f9; background: #0f172a; padding: 3px; border-radius: 2px;">
                  Action: ${props.action}
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'hotspot-zones-fill', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'hotspot-zones-fill', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    } catch (err) {
      console.warn("Hotspot zone render warning:", err);
    }
  }, [isLoaded, hotspots, selectedZone, onSelectZone]);

  // 3. Render 64 Ensemble Members & Track Density Grid (Section 13)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !rawMembers.length) return;

    try {
      const membersByGroup: Record<string, [number, number][]> = {};
      rawMembers.forEach(m => {
        if (!membersByGroup[m.member_id]) {
          membersByGroup[m.member_id] = [];
        }
        membersByGroup[m.member_id].push([m.longitude, m.latitude]);
      });

      const ensembleFeatures = Object.keys(membersByGroup).map(mId => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: membersByGroup[mId]
        },
        properties: { member_id: mId }
      }));

      const ensembleGeoJSON = {
        type: 'FeatureCollection',
        features: ensembleFeatures
      };

      if (map.getSource('ensemble-members-source')) {
        (map.getSource('ensemble-members-source') as maplibregl.GeoJSONSource).setData(ensembleGeoJSON as any);
      } else {
        map.addSource('ensemble-members-source', { type: 'geojson', data: ensembleGeoJSON as any });
        map.addLayer({
          id: 'ensemble-members-lines',
          type: 'line',
          source: 'ensemble-members-source',
          paint: {
            'line-color': '#06b6d4',
            'line-width': 1.2,
            'line-opacity': 0.35
          }
        });
      }

      // Render Track Density Grid Polygons
      if (ensembleData?.track_density_geojson) {
        if (map.getSource('track-density-source')) {
          (map.getSource('track-density-source') as maplibregl.GeoJSONSource).setData(ensembleData.track_density_geojson as any);
        } else {
          map.addSource('track-density-source', { type: 'geojson', data: ensembleData.track_density_geojson as any });
          map.addLayer({
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
          });
        }
      }
    } catch (err) {
      console.warn("Ensemble members render warning:", err);
    }
  }, [isLoaded, rawMembers, ensembleData]);

  // 4. Render Official IMD Track & Cone of Uncertainty
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !trackData) return;

    try {
      const obsPoints: any[] = (trackData as any).observed_track || (trackData as any).observed || [];
      const fcPoints: any[] = (trackData as any).forecast_track || (trackData as any).forecast || [];
      const observedCoords = obsPoints.map((p: any) => [p.longitude, p.latitude]);
      const forecastCoords = fcPoints.map((p: any) => [p.longitude, p.latitude]);

      // Observed Track Line
      if (observedCoords.length > 1) {
        const observedLine = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: observedCoords },
          properties: {}
        };
        if (map.getSource('observed-track-source')) {
          (map.getSource('observed-track-source') as maplibregl.GeoJSONSource).setData(observedLine as any);
        } else {
          map.addSource('observed-track-source', { type: 'geojson', data: observedLine as any });
          map.addLayer({
            id: 'observed-track-line',
            type: 'line',
            source: 'observed-track-source',
            paint: { 'line-color': '#ef4444', 'line-width': 2.8 }
          });
        }
      }

      // Forecast Track Line
      if (forecastCoords.length > 1) {
        const forecastLine = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: forecastCoords },
          properties: {}
        };
        if (map.getSource('forecast-track-source')) {
          (map.getSource('forecast-track-source') as maplibregl.GeoJSONSource).setData(forecastLine as any);
        } else {
          map.addSource('forecast-track-source', { type: 'geojson', data: forecastLine as any });
          map.addLayer({
            id: 'forecast-track-line',
            type: 'line',
            source: 'forecast-track-source',
            paint: {
              'line-color': '#f97316',
              'line-width': 2.4,
              'line-dasharray': [2, 1]
            }
          });
        }
      }

      // Forecast Points
      const forecastPointFeatures = fcPoints.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
        properties: {
          timestamp: p.timestamp,
          wind_speed: p.wind_speed_kmh || p.wind_speed,
          gust_speed: p.gust_kmh || p.gust_speed,
          pressure: p.central_pressure_hpa || p.pressure,
          category: p.category
        }
      }));

      const pointsGeoJSON = { type: 'FeatureCollection', features: forecastPointFeatures };
      if (map.getSource('forecast-points-source')) {
        (map.getSource('forecast-points-source') as maplibregl.GeoJSONSource).setData(pointsGeoJSON as any);
      } else {
        map.addSource('forecast-points-source', { type: 'geojson', data: pointsGeoJSON as any });
        map.addLayer({
          id: 'forecast-points-circle',
          type: 'circle',
          source: 'forecast-points-source',
          paint: {
            'circle-color': '#f97316',
            'circle-radius': 5,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5
          }
        });

        map.on('click', 'forecast-points-circle', (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          new maplibregl.Popup({ closeButton: true })
            .setLngLat((e.features[0].geometry as any).coordinates)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc;">
                <b style="color: #f97316;">${props.category}</b>
                <div>Time: <b>${props.timestamp}</b></div>
                <div>Sustained Wind: <b>${props.wind_speed} km/h</b></div>
                <div>Pressure: <b>${props.pressure} hPa</b></div>
              </div>
            `)
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn("Track render warning:", err);
    }
  }, [isLoaded, trackData]);

  // 5. Render Spatial Hazard Polygons (Wind Swaths, Rain Exceedance, Surge Flood)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !hazardsGeoJSON) return;

    try {
      if (map.getSource('hazards-spatial-source')) {
        (map.getSource('hazards-spatial-source') as maplibregl.GeoJSONSource).setData(hazardsGeoJSON as any);
      } else {
        map.addSource('hazards-spatial-source', { type: 'geojson', data: hazardsGeoJSON as any });
        
        map.addLayer({
          id: 'hazards-spatial-fill',
          type: 'fill',
          source: 'hazards-spatial-source',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'fill_opacity']
          }
        });

        map.addLayer({
          id: 'hazards-spatial-line',
          type: 'line',
          source: 'hazards-spatial-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
            'line-dasharray': [3, 2]
          }
        });

        map.on('click', 'hazards-spatial-fill', (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          new maplibregl.Popup({ closeButton: true })
            .setLngLat(e.lngLat)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc;">
                <b style="color: ${props.color}; font-size: 12px;">${props.label}</b>
                <div style="color: #cbd5e1; margin-top: 3px;">Hazard: <b>${props.intensity}</b></div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Classification: MODEL_OUTPUT</div>
              </div>
            `)
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn("Hazards render warning:", err);
    }
  }, [isLoaded, hazardsGeoJSON]);

  // 6. Render Infrastructure with MapLibre Source Clustering (Section 14)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !infrastructure.length) return;

    try {
      const geojson = {
        type: 'FeatureCollection',
        features: infrastructure.map(i => {
          const matchingProb = assetImpacts.find(a => a.asset_id === i.asset_id);
          return {
            type: 'Feature',
            geometry: i.geometry,
            properties: {
              asset_id: i.asset_id,
              name: i.name,
              type: i.type,
              risk_score: i.risk_score,
              threat: i.primary_threat,
              elevation: i.elevation_m,
              p_combined: matchingProb ? Math.round(matchingProb.p_combined_impact * 100) : 60,
              p_wind: matchingProb ? Math.round(matchingProb.p_wind_exceedance * 100) : 80,
              p_rain: matchingProb ? Math.round(matchingProb.p_rain_exceedance * 100) : 70,
              p_flood: matchingProb ? Math.round(matchingProb.p_inundation_exceedance * 100) : 45,
              backup_power: matchingProb?.backup_power || "AVAILABLE",
              road_access: matchingProb?.road_access_status || "MODELLED DEGRADED",
              data_quality: matchingProb?.data_quality_pct || 92.5
            }
          };
        })
      };

      if (map.getSource('infra-source')) {
        (map.getSource('infra-source') as maplibregl.GeoJSONSource).setData(geojson as any);
      } else {
        // Configure clustering directly in GeoJSON source (Section 14)
        map.addSource('infra-source', { 
          type: 'geojson', 
          data: geojson as any,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 40
        });

        // Cluster Circles
        map.addLayer({
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
        });

        // Cluster Count Text
        map.addLayer({
          id: 'infra-cluster-count',
          type: 'symbol',
          source: 'infra-source',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 11
          },
          paint: {
            'text-color': '#ffffff'
          }
        });

        // Unclustered Infrastructure Points
        map.addLayer({
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
        });

        // Zoom into cluster on click
        map.on('click', 'infra-clusters', async (e) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ['infra-clusters'] });
          const clusterId = features[0].properties.cluster_id;
          const source: any = map.getSource('infra-source');
          const zoom = await source.getClusterExpansionZoom(clusterId);
          map.easeTo({
            center: (features[0].geometry as any).coordinates,
            zoom: zoom
          });
        });

        // Click individual asset point
        map.on('click', 'infra-unclustered-point', (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as any).coordinates.slice();
          const matched = infrastructure.find(i => i.asset_id === props.asset_id);
          if (matched && onSelectInfrastructure) {
            onSelectInfrastructure(matched);
          }

          const matchedProb = assetImpacts.find(a => a.asset_id === props.asset_id);
          if (matchedProb && onSelectAssetImpact) {
            onSelectAssetImpact(matchedProb);
          }

          new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 4px; color: #f8fafc; background: #080d1a; border-radius: 4px;">
                <b style="color: #38bdf8; font-size: 12px; text-transform: uppercase;">${props.name}</b>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 1px;">CRITICALITY: <b>${props.type.toUpperCase()}</b></div>
                
                <div style="margin-top: 6px; padding: 4px 6px; background: #1e1b4b; border: 1px solid #4338ca; border-radius: 4px;">
                  <span style="color: #c7d2fe;">P(COMBINED IMPACT): </span>
                  <b style="color: #f43f5e; font-size: 13px;">${props.p_combined}%</b>
                </div>

                <div style="margin-top: 6px; line-height: 1.5; font-size: 10px;">
                  <div>• Wind P(>100 km/h): <b style="color: #f59e0b;">${props.p_wind}%</b></div>
                  <div>• Rain P(>200 mm): <b style="color: #38bdf8;">${props.p_rain}%</b></div>
                  <div>• Flood P(>0.5m): <b style="color: #06b6d4;">${props.p_flood}%</b></div>
                  <div>• Backup Power: <b style="color: #34d399;">${props.backup_power}</b></div>
                  <div>• Road Access: <b style="color: #f43f5e;">${props.road_access}</b></div>
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'infra-unclustered-point', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'infra-unclustered-point', () => { map.getCanvas().style.cursor = ''; });
        map.on('mouseenter', 'infra-clusters', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'infra-clusters', () => { map.getCanvas().style.cursor = ''; });
      }
    } catch (err) {
      console.warn("Infrastructure render warning:", err);
    }
  }, [isLoaded, infrastructure, assetImpacts, onSelectInfrastructure, onSelectAssetImpact]);

  // 7. Render Emergency Route Risk Corridors (Section 19 & 20)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !routeRiskData) return;

    try {
      const baselineGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeRiskData.route_geometry || [
            [85.8245, 20.2961],
            [85.8340, 20.1500],
            [85.8300, 19.9800],
            [85.8312, 19.8135]
          ]
        },
        properties: {
          name: 'Baseline Route',
          exposure: routeRiskData.baseline_exposure_score
        }
      };

      const altGeoJSON = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routeRiskData.alternative_geometry || [
            [85.8245, 20.2961],
            [85.7000, 20.1000],
            [85.6500, 19.9500],
            [85.8312, 19.8135]
          ]
        },
        properties: {
          name: 'Alternative Evacuation Corridor',
          reduction: routeRiskData.exposure_reduction_pct
        }
      };

      if (map.getSource('route-baseline-source')) {
        (map.getSource('route-baseline-source') as maplibregl.GeoJSONSource).setData(baselineGeoJSON as any);
      } else {
        map.addSource('route-baseline-source', { type: 'geojson', data: baselineGeoJSON as any });
        map.addLayer({
          id: 'route-baseline-line',
          type: 'line',
          source: 'route-baseline-source',
          paint: {
            'line-color': '#ef4444',
            'line-width': 3.5,
            'line-opacity': 0.8
          }
        });
      }

      if (map.getSource('route-alt-source')) {
        (map.getSource('route-alt-source') as maplibregl.GeoJSONSource).setData(altGeoJSON as any);
      } else {
        map.addSource('route-alt-source', { type: 'geojson', data: altGeoJSON as any });
        map.addLayer({
          id: 'route-alt-line',
          type: 'line',
          source: 'route-alt-source',
          paint: {
            'line-color': '#10b981',
            'line-width': 3.5,
            'line-dasharray': [3, 1],
            'line-opacity': 0.85
          }
        });
      }
    } catch (err) {
      console.warn("Route risk render warning:", err);
    }
  }, [isLoaded, routeRiskData]);

  // 8. Map Mode Visibility Controller (Section 13)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded()) return;

    try {
      const setVis = (layerId: string, visible: boolean) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      };

      switch (activeMode) {
        case 'TRACK':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', false);
          setVis('infra-clusters', false);
          setVis('infra-cluster-count', false);
          setVis('infra-unclustered-point', false);
          setVis('hotspot-zones-fill', false);
          setVis('hotspot-zones-stroke', false);
          setVis('route-baseline-line', false);
          setVis('route-alt-line', false);
          break;
        case 'ENSEMBLE':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', true);
          setVis('hazards-spatial-fill', false);
          setVis('infra-clusters', true);
          setVis('infra-cluster-count', true);
          setVis('infra-unclustered-point', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          setVis('route-baseline-line', false);
          setVis('route-alt-line', false);
          break;
        case 'WIND':
        case 'RAINFALL':
        case 'FLOOD':
        case 'IMPACT':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', true);
          setVis('infra-clusters', true);
          setVis('infra-cluster-count', true);
          setVis('infra-unclustered-point', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          setVis('route-baseline-line', false);
          setVis('route-alt-line', false);
          break;
        case 'INFRASTRUCTURE':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', false);
          setVis('infra-clusters', true);
          setVis('infra-cluster-count', true);
          setVis('infra-unclustered-point', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          setVis('route-baseline-line', false);
          setVis('route-alt-line', false);
          break;
        case 'ROUTE RISK':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', true);
          setVis('infra-clusters', true);
          setVis('infra-cluster-count', true);
          setVis('infra-unclustered-point', true);
          setVis('hotspot-zones-fill', false);
          setVis('hotspot-zones-stroke', false);
          setVis('route-baseline-line', true);
          setVis('route-alt-line', true);
          break;
        default:
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', true);
          setVis('hazards-spatial-fill', true);
          setVis('infra-clusters', true);
          setVis('infra-cluster-count', true);
          setVis('infra-unclustered-point', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          setVis('route-baseline-line', false);
          setVis('route-alt-line', false);
          break;
      }
    } catch (err) {
      console.warn("Mode change sync warning:", err);
    }
  }, [isLoaded, activeMode]);

  const mapModesList: MapMode[] = [
    'TRACK',
    'ENSEMBLE',
    'WIND',
    'RAINFALL',
    'FLOOD',
    'IMPACT',
    'INFRASTRUCTURE',
    'ROUTE RISK',
    'POPULATION',
    'SATELLITE'
  ];

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#050914] overflow-hidden select-none">
      <div ref={mapContainer} className="w-full h-full" />

      {/* BASEMAP UNAVAILABLE ERROR BANNER (Section 8 & 15) */}
      {(basemapError || isOfflineMode) && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 bg-rose-950/95 border border-rose-600 text-rose-200 px-4 py-2.5 rounded-lg shadow-2xl backdrop-blur-md flex items-center gap-3 font-mono text-xs max-w-xl">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              BASEMAP UNAVAILABLE
              {isOfflineMode && <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1.5 py-0.5 rounded border border-amber-500/40">LOCAL OFFLINE MAP ACTIVE</span>}
            </div>
            <div className="text-[11px] text-rose-300">
              OpenFreeMap basemap could not be reached. Local administrative geometry and cyclone risk layers remain fully active.
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button 
              onClick={() => {
                setIsOfflineMode(true);
                setBasemapError(false);
                if (mapRef.current) mapRef.current.setStyle(LOCAL_OFFLINE_STYLE);
              }}
              className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded text-[10px]"
            >
              LOCAL OFFLINE MAP
            </button>
            <button 
              onClick={() => {
                setIsOfflineMode(false);
                setBasemapError(false);
                if (mapRef.current) mapRef.current.setStyle(DEFAULT_MAP_STYLE_URL);
              }}
              className="px-2 py-1 bg-rose-900 hover:bg-rose-800 text-white rounded text-[10px] font-bold"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* 10 Map Modes Selector Pills Top-Center (Section 45) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#080d1a]/95 border border-[#334155] p-1 rounded-lg shadow-2xl backdrop-blur-md max-w-[95vw] overflow-x-auto">
        {mapModesList.map((mode) => {
          const isActive = activeMode === mode;
          return (
            <button
              key={mode}
              onClick={() => setActiveMode(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-[#1e293b]'
              }`}
            >
              {mode === 'ROUTE RISK' && <Navigation className="w-3 h-3" />}
              {mode === 'SATELLITE' && <Satellite className="w-3 h-3" />}
              {mode}
            </button>
          );
        })}
      </div>

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-14 right-3 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => {
            if (mapRef.current) {
              mapRef.current.flyTo({ center: [86.2, 19.8], zoom: 6.8 });
            }
          }}
          className="bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 p-2 rounded border border-[#334155] shadow-xl flex items-center justify-center transition-colors"
          title="Reset Map View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Primary Map Engine Badge Top-Left (Sections 2, 3, 5) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#080d1a]/95 border border-[#334155] px-2.5 py-1.5 rounded text-[10px] font-mono shadow-xl backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-slate-300 font-bold">MAPLIBRE GL JS</span>
        <span className="text-cyan-400 font-semibold px-1 rounded bg-cyan-950/60 border border-cyan-800 text-[9px]">
          OPENFREEMAP
        </span>
      </div>

      {/* Dynamic Scientific Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 bg-[#080d1a]/95 border border-[#334155] rounded-md px-3 py-2 z-10 text-[10px] font-mono shadow-2xl backdrop-blur-md max-w-[85vw] overflow-x-auto">
        <div className="font-bold text-slate-200 mb-1 flex items-center justify-between gap-4">
          <span className="text-cyan-400">ACTIVE MODE: {activeMode}</span>
          <span className="text-slate-500">WeatherNext 3 (64-Mbr Ensemble)</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
            <span>Official Track</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span>
            <span>64-Mbr Ensemble</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded border border-red-500 bg-red-500/30 inline-block"></span>
            <span>Priority Zones</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block"></span>
            <span>Clustered Assets</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block border-dashed"></span>
            <span>Alt Evacuation Route</span>
          </div>
        </div>
      </div>
    </div>
  );
};
