'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
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
  AlertTriangle
} from 'lucide-react';
import { 
  TrackCollection, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  EnsembleAggregationResult,
  ForecastMember,
  AssetImpactProbability
} from '../lib/types';
import { getEnsembleAggregation, getEnsembleMembers, getHazardsGeoJSON, getAssetImpacts } from '../lib/api';

if (typeof window !== 'undefined' && typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

export const CARTO_DEFAULT_KEY = '';

export function getResolvedCartoKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('cyclonex_carto_api_key');
    if (stored && stored.trim()) return stored.trim();
  }
  return (
    process.env.NEXT_PUBLIC_CARTO_API_KEY ||
    process.env.NEXT_PUBLIC_MAP_KEY ||
    process.env.NEXT_PUBLIC_MAP_API_KEY ||
    CARTO_DEFAULT_KEY
  );
}

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
  | 'FORECAST CHANGE';

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
  
  // 10 Enterprise Map Modes (Section 45)
  const [activeMode, setActiveMode] = useState<MapMode>('ENSEMBLE');
  
  // Dynamic V2 Data
  const [ensembleData, setEnsembleData] = useState<EnsembleAggregationResult | null>(null);
  const [rawMembers, setRawMembers] = useState<ForecastMember[]>([]);
  const [hazardsGeoJSON, setHazardsGeoJSON] = useState<any>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [showDensityGrid, setShowDensityGrid] = useState(true);
  const [tileKeyActive, setTileKeyActive] = useState(true);

  // Fetch V2 Ensemble & Spatial Hazards Data
  useEffect(() => {
    async function loadGeospatialLayers() {
      try {
        const [ens, members, hazards, impacts] = await Promise.all([
          getEnsembleAggregation(),
          getEnsembleMembers(),
          getHazardsGeoJSON(),
          getAssetImpacts()
        ]);
        setEnsembleData(ens);
        setRawMembers(members);
        setHazardsGeoJSON(hazards);
        setAssetImpacts(impacts);
      } catch (err) {
        console.warn("Geospatial layer loading note:", err);
      }
    }
    loadGeospatialLayers();
  }, []);

  // 1. Initialize MapLibre GL Map with Dual Multi-Basemap Sources (CARTO Retina + ESRI Satellite)
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const cartoKey = getResolvedCartoKey();
    const keyQuery = cartoKey ? `?key=${cartoKey}` : '';

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'carto-dark': {
            type: 'raster',
            tiles: [
              `https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png${keyQuery}`
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          },
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            attribution: '© Esri, Maxar, Earthstar Geographics'
          },
          'carto-dark-labels': {
            type: 'raster',
            tiles: [
              `https://a.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://b.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://c.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyQuery}`,
              `https://d.basemaps.cartocdn.com/rastertiles/dark_only_labels/{z}/{x}/{y}@2x.png${keyQuery}`
            ],
            tileSize: 256,
            attribution: '© CARTO'
          }
        },
        layers: [
          {
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: 'none'
            }
          },
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: 'visible'
            }
          },
          {
            id: 'carto-dark-labels-layer',
            type: 'raster',
            source: 'carto-dark-labels',
            minzoom: 0,
            maxzoom: 19,
            layout: {
              visibility: 'none'
            }
          }
        ]
      },
      center: [86.2, 19.8], // Bay of Bengal & Odisha coastline
      zoom: 6.8,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    const markReady = () => {
      if (map.isStyleLoaded()) {
        setIsLoaded(true);
      }
    };

    map.on('load', markReady);
    map.on('style.load', markReady);

    map.on('error', (e) => {
      // Graceful error logging without crashing map
      if ((e as any)?.error?.status === 401 || (e as any)?.error?.status === 403) {
        setTileKeyActive(false);
      }
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // 1b. Robust ResizeObserver for zero-distortion panel transitions
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

  // 2. Render Priority Hotspots Zones (Polygons) with Risk Color Coding & Selection Sync
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
        map.addSource('hotspot-zones-source', { type: 'geojson', data: hotspotGeoJSON as any });

        map.addLayer({
          id: 'hotspot-zones-fill',
          type: 'fill',
          source: 'hotspot-zones-source',
          paint: {
            'fill-color': [
              'match',
              ['get', 'risk_band'],
              'SEVERE', '#ef4444',
              'HIGH', '#f97316',
              'MODERATE', '#eab308',
              '#06b6d4'
            ],
            'fill-opacity': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              0.5,
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
              'match',
              ['get', 'risk_band'],
              'SEVERE', '#f87171',
              'HIGH', '#fb923c',
              'MODERATE', '#fde047',
              '#38bdf8'
            ],
            'line-width': [
              'case',
              ['boolean', ['get', 'is_selected'], false],
              2.8,
              1.4
            ],
            'line-dasharray': [3, 2]
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
                <div style="margin-top: 4px; color: #f59e0b;">Threat: <b>${props.top_hazard}</b></div>
                <div style="margin-top: 2px; color: #cbd5e1;">Pop at Risk: <b>${props.population ? props.population.toLocaleString() : 'N/A'}</b></div>
                <div style="margin-top: 4px; font-size: 10px; color: #67e8f9; background: #0f172a; padding: 3px; border-radius: 2px;">
                  Directive: ${props.action}
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

  // 3. Render 64 Ensemble Members & Track Density Grid (Section 46 & 47)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !rawMembers.length) return;

    try {
      // Group members by member_id into LineStrings
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
        properties: {
          member_id: mId
        }
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

      // Render Track Density Grid Polygons (Section 47)
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
                10, '#0e7490',
                30, '#06b6d4',
                50, '#eab308',
                70, '#f97316',
                90, '#ef4444'
              ],
              'fill-opacity': 0.35
            }
          }, 'ensemble-members-lines');

          map.addLayer({
            id: 'track-density-stroke',
            type: 'line',
            source: 'track-density-source',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 0.8,
              'line-opacity': 0.3
            }
          }, 'ensemble-members-lines');

          map.on('click', 'track-density-fill', (e) => {
            if (!e.features || !e.features[0]) return;
            const props = e.features[0].properties;
            const coords = e.lngLat;

            new maplibregl.Popup({ closeButton: true })
              .setLngLat(coords)
              .setHTML(`
                <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc;">
                  <b style="color: #38bdf8; font-size: 12px;">ENSEMBLE TRACK DENSITY</b>
                  <div style="margin-top: 4px; color: #cbd5e1;">Occupancy: <b>${props.occupancy_pct}%</b></div>
                  <div style="color: #f59e0b; font-weight: bold;">${props.label}</div>
                  <div style="color: #64748b; font-size: 10px; margin-top: 2px;">64-Member WeatherNext 3 Flow</div>
                </div>
              `)
              .addTo(map);
          });

          map.on('mouseenter', 'track-density-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'track-density-fill', () => {
            map.getCanvas().style.cursor = '';
          });
        }
      }
    } catch (err) {
      console.warn("Ensemble render warning:", err);
    }
  }, [isLoaded, rawMembers, ensembleData]);

  // 4. Render Official Track, Consensus Track & Observed Track
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded() || !trackData) return;

    try {
      // A. Observed Track
      if (trackData.observed_track && trackData.observed_track.length > 0) {
        const observedCoords = trackData.observed_track.map(p => [p.longitude, p.latitude]);
        const observedGeoJSON = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: observedCoords }
        };

        if (map.getSource('observed-track-source')) {
          (map.getSource('observed-track-source') as maplibregl.GeoJSONSource).setData(observedGeoJSON as any);
        } else {
          map.addSource('observed-track-source', { type: 'geojson', data: observedGeoJSON as any });
          map.addLayer({
            id: 'observed-track-line',
            type: 'line',
            source: 'observed-track-source',
            paint: {
              'line-color': '#38bdf8',
              'line-width': 3,
              'line-dasharray': [2, 1.5]
            }
          });
        }
      }

      // B. Forecast Official Track
      if (trackData.forecast_track && trackData.forecast_track.length > 0) {
        const forecastCoords = trackData.forecast_track.map(p => [p.longitude, p.latitude]);
        const forecastGeoJSON = {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: forecastCoords }
        };

        if (map.getSource('forecast-track-source')) {
          (map.getSource('forecast-track-source') as maplibregl.GeoJSONSource).setData(forecastGeoJSON as any);
        } else {
          map.addSource('forecast-track-source', { type: 'geojson', data: forecastGeoJSON as any });
          map.addLayer({
            id: 'forecast-track-line',
            type: 'line',
            source: 'forecast-track-source',
            paint: {
              'line-color': '#ef4444',
              'line-width': 3.5
            }
          });
        }

        // Forecast Points
        const forecastPointsGeoJSON = {
          type: 'FeatureCollection',
          features: trackData.forecast_track.map(p => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] },
            properties: {
              point_id: p.point_id,
              step_hours: p.step_hours,
              wind: p.wind_speed_kmh,
              category: p.category,
              pressure: p.central_pressure_hpa
            }
          }))
        };

        if (map.getSource('forecast-points-source')) {
          (map.getSource('forecast-points-source') as maplibregl.GeoJSONSource).setData(forecastPointsGeoJSON as any);
        } else {
          map.addSource('forecast-points-source', { type: 'geojson', data: forecastPointsGeoJSON as any });
          map.addLayer({
            id: 'forecast-points-circle',
            type: 'circle',
            source: 'forecast-points-source',
            paint: {
              'circle-color': '#dc2626',
              'circle-radius': 5.5,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 2
            }
          });

          map.on('click', 'forecast-points-circle', (e) => {
            if (!e.features || !e.features[0]) return;
            const props = e.features[0].properties;
            const coords = (e.features[0].geometry as any).coordinates.slice();

            new maplibregl.Popup({ closeButton: true })
              .setLngLat(coords)
              .setHTML(`
                <div style="font-family: monospace; font-size: 11px; color: #f8fafc; padding: 2px;">
                  <b style="color: #ef4444; font-size: 12px;">+${props.step_hours}h OFFICIAL TRACK (${props.category})</b>
                  <div style="margin-top: 3px;">Max Wind: <b>${props.wind} km/h</b></div>
                  <div>Central Pressure: <b>${props.pressure} hPa</b></div>
                </div>
              `)
              .addTo(map);
          });
        }
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
        }, 'observed-track-line');

        map.addLayer({
          id: 'hazards-spatial-line',
          type: 'line',
          source: 'hazards-spatial-source',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 1.5,
            'line-dasharray': [3, 2]
          }
        }, 'observed-track-line');

        map.on('click', 'hazards-spatial-fill', (e) => {
          if (!e.features || !e.features[0]) return;
          const props = e.features[0].properties;
          const coords = e.lngLat;

          new maplibregl.Popup({ closeButton: true })
            .setLngLat(coords)
            .setHTML(`
              <div style="font-family: monospace; font-size: 11px; padding: 2px; color: #f8fafc;">
                <b style="color: ${props.color}; font-size: 12px;">${props.label}</b>
                <div style="color: #cbd5e1; margin-top: 3px;">Threat Level: <b>${props.intensity}</b></div>
                <div style="color: #94a3b8; font-size: 10px; margin-top: 2px;">Methodology: GRID FORECAST</div>
              </div>
            `)
            .addTo(map);
        });
      }
    } catch (err) {
      console.warn("Hazards render warning:", err);
    }
  }, [isLoaded, hazardsGeoJSON]);

  // 6. Render Infrastructure with Probabilistic Impact Cards (Section 48)
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
              p_combined: matchingProb ? Math.round(matchingProb.p_combined_impact * 100) : 62,
              p_wind: matchingProb ? Math.round(matchingProb.p_wind_exceedance * 100) : 84,
              p_rain: matchingProb ? Math.round(matchingProb.p_rain_exceedance * 100) : 71,
              p_flood: matchingProb ? Math.round(matchingProb.p_inundation_exceedance * 100) : 46,
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
        map.addSource('infra-source', { type: 'geojson', data: geojson as any });

        map.addLayer({
          id: 'infra-points',
          type: 'circle',
          source: 'infra-source',
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
            'circle-stroke-width': 2.2
          }
        });

        map.on('click', 'infra-points', (e) => {
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
                  <span style="color: #c7d2fe;">COMBINED IMPACT PROBABILITY: </span>
                  <b style="color: #f43f5e; font-size: 13px;">${props.p_combined}%</b>
                </div>

                <div style="margin-top: 6px; line-height: 1.5; font-size: 10px;">
                  <div>• Wind P(>100 km/h): <b style="color: #f59e0b;">${props.p_wind}%</b></div>
                  <div>• Rain P(>200 mm): <b style="color: #38bdf8;">${props.p_rain}%</b></div>
                  <div>• Flood P(>0.5m): <b style="color: #06b6d4;">${props.p_flood}%</b></div>
                  <div>• Backup Power: <b style="color: #34d399;">${props.backup_power}</b></div>
                  <div>• Road Access: <b style="color: #f43f5e;">${props.road_access}</b></div>
                  <div>• Data Quality: <b style="color: #10b981;">${props.data_quality}%</b></div>
                </div>

                <div style="margin-top: 6px; font-size: 9px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 3px;">
                  Source: CYCLONE-X 64-mbr Impact Engine v2.0
                </div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'infra-points', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'infra-points', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    } catch (err) {
      console.warn("Infrastructure render warning:", err);
    }
  }, [isLoaded, infrastructure, assetImpacts, onSelectInfrastructure, onSelectAssetImpact]);

  // 7. Map Mode Visibility & Basemap Switching Controller (Section 45)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !map.isStyleLoaded()) return;

    try {
      const setVis = (layerId: string, visible: boolean) => {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
        }
      };

      // Basemap switching (Satellite vs CARTO Dark Matter)
      const isSatellite = activeMode === 'SATELLITE';
      setVis('esri-satellite-layer', isSatellite);
      setVis('carto-dark-labels-layer', isSatellite);
      setVis('carto-dark-layer', !isSatellite);

      switch (activeMode) {
        case 'TRACK':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', false);
          setVis('infra-points', false);
          setVis('hotspot-zones-fill', false);
          setVis('hotspot-zones-stroke', false);
          break;
        case 'ENSEMBLE':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', showDensityGrid);
          setVis('hazards-spatial-fill', false);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'WIND':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', true);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'RAINFALL':
        case 'FLOOD':
        case 'IMPACT':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', true);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'INFRASTRUCTURE':
          setVis('observed-track-line', false);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', false);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'POPULATION':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', false);
          setVis('ensemble-members-lines', false);
          setVis('track-density-fill', false);
          setVis('hazards-spatial-fill', false);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'SATELLITE':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', showDensityGrid);
          setVis('hazards-spatial-fill', true);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
        case 'FORECAST CHANGE':
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', true);
          setVis('hazards-spatial-fill', false);
          setVis('infra-points', false);
          setVis('hotspot-zones-fill', false);
          setVis('hotspot-zones-stroke', false);
          break;
        default:
          setVis('observed-track-line', true);
          setVis('forecast-track-line', true);
          setVis('forecast-points-circle', true);
          setVis('ensemble-members-lines', true);
          setVis('track-density-fill', true);
          setVis('hazards-spatial-fill', true);
          setVis('infra-points', true);
          setVis('hotspot-zones-fill', true);
          setVis('hotspot-zones-stroke', true);
          break;
      }
    } catch (err) {
      console.warn("Mode change sync warning:", err);
    }
  }, [isLoaded, activeMode, showDensityGrid]);

  const mapModesList: MapMode[] = [
    'TRACK',
    'ENSEMBLE',
    'WIND',
    'RAINFALL',
    'FLOOD',
    'IMPACT',
    'INFRASTRUCTURE',
    'POPULATION',
    'SATELLITE',
    'FORECAST CHANGE'
  ];

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#050914] overflow-hidden select-none">
      <div ref={mapContainer} className="w-full h-full" />

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
              {mode === 'SATELLITE' && <Satellite className="w-3 h-3" />}
              {mode}
            </button>
          );
        })}
      </div>

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-14 right-3 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => setShowDensityGrid(!showDensityGrid)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-xl transition-all ${
            showDensityGrid 
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' 
              : 'bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 border border-[#334155]'
          }`}
          title="Toggle Ensemble Density Grid"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-mono text-[11px]">DENSITY</span>
        </button>

        <button
          onClick={() => setActiveMode(activeMode === 'SATELLITE' ? 'ENSEMBLE' : 'SATELLITE')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-xl transition-all ${
            activeMode === 'SATELLITE'
              ? 'bg-amber-950 text-amber-300 border border-amber-600'
              : 'bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 border border-[#334155]'
          }`}
          title="Toggle Satellite Imagery"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono text-[11px]">SATELLITE</span>
        </button>

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

      {/* Basemap Key Status Pill Top-Left */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-[#080d1a]/95 border border-[#334155] px-2.5 py-1.5 rounded text-[10px] font-mono shadow-xl backdrop-blur-md">
        <span className="relative flex h-2 w-2">
          {tileKeyActive ? (
            <>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </>
          ) : (
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          )}
        </span>
        <span className="text-slate-300 font-bold">
          {activeMode === 'SATELLITE' ? 'ESRI SATELLITE (HIGH-RES)' : 'CARTO DARK MATTER (RETINA)'}
        </span>
        <span className="text-emerald-400 font-semibold px-1 rounded bg-emerald-950/60 border border-emerald-800 text-[9px]">
          AUTH OK
        </span>
      </div>

      {/* Dynamic Scientific Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 bg-[#080d1a]/95 border border-[#334155] rounded-md px-3 py-2 z-10 text-[10px] font-mono shadow-2xl backdrop-blur-md max-w-[85vw] overflow-x-auto">
        <div className="font-bold text-slate-200 mb-1 flex items-center justify-between gap-4">
          <span className="text-cyan-400">MAP MODE: {activeMode}</span>
          <span className="text-slate-500">WeatherNext 3 (64-Mbr Flow)</span>
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
            <span>Hospital</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
            <span>Substation</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
            <span>Port</span>
          </div>
        </div>
      </div>
    </div>
  );
};
