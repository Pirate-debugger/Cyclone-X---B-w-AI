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
  Building, 
  CheckSquare,
  Square
} from 'lucide-react';
import { TrackCollection, HotspotZone, InfrastructureRiskAssessment } from '../lib/types';

// Configure MapLibre Web Worker explicitly to ensure Next.js Turbopack resolves it cleanly
if (typeof window !== 'undefined' && typeof (maplibregl as any).setWorkerUrl === 'function') {
  (maplibregl as any).setWorkerUrl('/maplibre-gl-worker.mjs');
}

interface MapContainerProps {
  trackData?: TrackCollection | null;
  hotspots?: HotspotZone[];
  infrastructure?: InfrastructureRiskAssessment[];
  selectedZone?: HotspotZone | null;
  onSelectZone?: (zone: HotspotZone | null) => void;
  onSelectInfrastructure?: (infra: InfrastructureRiskAssessment | null) => void;
}

export const MapContainer: React.FC<MapContainerProps> = ({
  trackData,
  hotspots = [],
  infrastructure = [],
  selectedZone,
  onSelectZone,
  onSelectInfrastructure
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  
  const [activeLayers, setActiveLayers] = useState({
    forecastTrack: true,
    observedTrack: true,
    uncertaintyCone: true,
    windHazard: true,
    rainfallHazard: true,
    surgeInundation: true,
    hotspots: true,
    infrastructure: true,
  });

  // 1. Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Use official CARTO Basemaps API key parameter: ?key=YOUR_API_KEY
    const cartoKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || 'cb1_3zqt_1_dc5d1212b00788ce3409d182';
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
              `https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}@2x.png${keyQuery}`
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, © CARTO'
          }
        },
        layers: [
          {
            id: 'carto-dark-layer',
            type: 'raster',
            source: 'carto-dark',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [86.2, 19.8], // Coastal Odisha / Bay of Bengal
      zoom: 6.8,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('load', () => {
      setIsLoaded(true);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setIsLoaded(false);
    };
  }, []);

  // 2. Render Cyclone Tracks & Uncertainty Cone
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || !trackData) return;

    // A. Observed Best Track
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

    // B. Forecast Track Line
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
            'line-width': 4
          }
        });
      }

      // C. Uncertainty Cone Corridor Polygon
      if (trackData.forecast_track.length >= 2) {
        const leftCoords: [number, number][] = [];
        const rightCoords: [number, number][] = [];

        trackData.forecast_track.forEach(p => {
          const rDeg = Math.max(0.2, (p.cone_radius_km || 35) / 111.0);
          leftCoords.push([p.longitude - rDeg * 0.8, p.latitude + rDeg * 0.6]);
          rightCoords.push([p.longitude + rDeg * 0.8, p.latitude - rDeg * 0.6]);
        });

        const conePolyCoords = [
          ...leftCoords,
          ...rightCoords.reverse(),
          leftCoords[0]
        ];

        const coneGeoJSON = {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [conePolyCoords] }
        };

        if (map.getSource('uncertainty-cone-source')) {
          (map.getSource('uncertainty-cone-source') as maplibregl.GeoJSONSource).setData(coneGeoJSON as any);
        } else {
          map.addSource('uncertainty-cone-source', { type: 'geojson', data: coneGeoJSON as any });
          map.addLayer({
            id: 'uncertainty-cone-fill',
            type: 'fill',
            source: 'uncertainty-cone-source',
            paint: {
              'fill-color': '#f97316',
              'fill-opacity': 0.18
            }
          }, 'observed-track-line');
          map.addLayer({
            id: 'uncertainty-cone-stroke',
            type: 'line',
            source: 'uncertainty-cone-source',
            paint: {
              'line-color': '#ea580c',
              'line-width': 1.8,
              'line-dasharray': [3, 2]
            }
          }, 'observed-track-line');
        }
      }

      // D. Forecast Points (Circles with hover popups)
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
            'circle-radius': 6,
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
              <div style="font-family: sans-serif; font-size: 11px; color: #f8fafc; padding: 2px;">
                <b style="color: #ef4444; font-size: 12px;">+${props.step_hours}h Forecast (${props.category})</b>
                <div style="margin-top: 3px;">Max Sustained Wind: <b>${props.wind} km/h</b></div>
                <div>Central Pressure: <b>${props.pressure} hPa</b></div>
              </div>
            `)
            .addTo(map);
        });

        map.on('mouseenter', 'forecast-points-circle', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'forecast-points-circle', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }
  }, [isLoaded, trackData]);

  // 3. Render Priority Risk Hotspots (Polygons)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || hotspots.length === 0) return;

    const geojson = {
      type: 'FeatureCollection',
      features: hotspots.map(h => ({
        type: 'Feature',
        geometry: h.geometry,
        properties: {
          zone_id: h.zone_id,
          name: h.name,
          risk_score: h.risk_score,
          risk_band: h.risk_band,
          top_hazard: h.top_hazard,
          pop: h.population_estimate,
          assets: h.critical_assets_count
        }
      }))
    };

    if (map.getSource('hotspots-source')) {
      (map.getSource('hotspots-source') as maplibregl.GeoJSONSource).setData(geojson as any);
    } else {
      map.addSource('hotspots-source', { type: 'geojson', data: geojson as any });
      
      map.addLayer({
        id: 'hotspots-fill',
        type: 'fill',
        source: 'hotspots-source',
        paint: {
          'fill-color': [
            'match',
            ['get', 'risk_band'],
            'SEVERE', '#ef4444',
            'HIGH', '#f97316',
            'MODERATE', '#f59e0b',
            '#10b981'
          ],
          'fill-opacity': 0.38
        }
      });

      map.addLayer({
        id: 'hotspots-stroke',
        type: 'line',
        source: 'hotspots-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'risk_band'],
            'SEVERE', '#b91c1c',
            'HIGH', '#ea580c',
            '#d97706'
          ],
          'line-width': 2.5
        }
      });

      map.on('click', 'hotspots-fill', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const matched = hotspots.find(h => h.zone_id === props.zone_id);
        if (matched && onSelectZone) {
          onSelectZone(matched);
        }
      });

      map.on('mouseenter', 'hotspots-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'hotspots-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [isLoaded, hotspots, onSelectZone]);

  // 4. Render Critical Infrastructure Pins
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded || infrastructure.length === 0) return;

    const geojson = {
      type: 'FeatureCollection',
      features: infrastructure.map(i => ({
        type: 'Feature',
        geometry: i.geometry,
        properties: {
          asset_id: i.asset_id,
          name: i.name,
          type: i.type,
          risk_score: i.risk_score,
          threat: i.primary_threat,
          elevation: i.elevation_m
        }
      }))
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
            'primary_health_centre', '#0284c7',
            'power_station', '#fbbf24',
            'electricity_substation', '#f59e0b',
            'emergency_shelter', '#34d399',
            'bridge', '#a855f7',
            '#e2e8f0'
          ],
          'circle-radius': 6.5,
          'circle-stroke-color': '#050914',
          'circle-stroke-width': 2
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

        new maplibregl.Popup({ closeButton: true })
          .setLngLat(coords)
          .setHTML(`
            <div style="font-family: sans-serif; font-size: 11px; padding: 2px;">
              <b style="color: #f8fafc; font-size: 12px;">${props.name}</b>
              <div style="color: #94a3b8; margin-top: 2px;">Type: <span style="color: #38bdf8; text-transform: uppercase;">${props.type.replace(/_/g, ' ')}</span></div>
              <div style="color: #ef4444; font-weight: bold; margin-top: 2px;">Risk Score: ${props.risk_score}/100</div>
              <div style="color: #cbd5e1; margin-top: 2px;">Threat: ${props.threat}</div>
              <div style="color: #64748b; font-size: 10px; margin-top: 3px;">Elevation: ${props.elevation}m ASL</div>
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
  }, [isLoaded, infrastructure, onSelectInfrastructure]);

  // 5. Update Layer Visibility
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    const setVisibility = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    setVisibility('observed-track-line', activeLayers.observedTrack);
    setVisibility('forecast-track-line', activeLayers.forecastTrack);
    setVisibility('forecast-points-circle', activeLayers.forecastTrack);
    setVisibility('uncertainty-cone-fill', activeLayers.uncertaintyCone);
    setVisibility('uncertainty-cone-stroke', activeLayers.uncertaintyCone);
    setVisibility('hotspots-fill', activeLayers.hotspots);
    setVisibility('hotspots-stroke', activeLayers.hotspots);
    setVisibility('infra-points', activeLayers.infrastructure);
  }, [isLoaded, activeLayers]);

  // Focus Actions
  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [86.2, 19.8], zoom: 6.8 });
    }
  };

  const handleFitCyclone = () => {
    if (mapRef.current && trackData?.forecast_track.length) {
      const bounds = new maplibregl.LngLatBounds();
      trackData.forecast_track.forEach(p => bounds.extend([p.longitude, p.latitude]));
      trackData.observed_track.forEach(p => bounds.extend([p.longitude, p.latitude]));
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  };

  const handleFitHotspots = () => {
    if (mapRef.current && hotspots.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      hotspots.forEach(h => {
        const coords = h.geometry.coordinates[0];
        coords.forEach((c: number[]) => bounds.extend([c[0], c[1]]));
      });
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  };

  return (
    <div className="relative w-full h-full min-h-[500px] bg-[#050914] overflow-hidden select-none">
      {/* MapLibre Canvas Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Floating Map Controls Top-Right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <button
          onClick={() => setLayersOpen(!layersOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-xl transition-all ${
            layersOpen 
              ? 'bg-cyan-600 text-white border border-cyan-400' 
              : 'bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-200 border border-[#334155]'
          }`}
          title="Toggle Layers"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Layers</span>
        </button>

        <button
          onClick={handleFitCyclone}
          className="bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 p-2 rounded border border-[#334155] shadow-xl flex items-center justify-center transition-colors"
          title="Fit Cyclone Track Corridor"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleFitHotspots}
          className="bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 p-2 rounded border border-[#334155] shadow-xl flex items-center justify-center transition-colors"
          title="Focus Priority Hotspots"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleResetView}
          className="bg-[#0f172a]/90 hover:bg-[#1e293b] text-slate-300 p-2 rounded border border-[#334155] shadow-xl flex items-center justify-center transition-colors"
          title="Reset Map View"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Layer Toggle Drawer */}
      {layersOpen && (
        <div className="absolute top-14 right-3 w-64 bg-[#0f172a]/95 border border-[#334155] rounded-md shadow-2xl p-3 z-20 text-xs backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-[#1e293b] mb-2 font-semibold text-slate-200">
            <span>Geospatial Map Layers</span>
            <span className="text-[10px] text-cyan-400 font-mono">ACTIVE</span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.forecastTrack} 
                onChange={(e) => setActiveLayers({ ...activeLayers, forecastTrack: e.target.checked })}
                className="rounded border-slate-600 accent-red-500"
              />
              <span className="w-3 h-0.5 bg-red-500 inline-block"></span>
              <span>Forecast Track (+72h)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.observedTrack} 
                onChange={(e) => setActiveLayers({ ...activeLayers, observedTrack: e.target.checked })}
                className="rounded border-slate-600 accent-sky-400"
              />
              <span className="w-3 h-0.5 border-t border-dashed border-sky-400 inline-block"></span>
              <span>Observed Track (History)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.uncertaintyCone} 
                onChange={(e) => setActiveLayers({ ...activeLayers, uncertaintyCone: e.target.checked })}
                className="rounded border-slate-600 accent-amber-500"
              />
              <span className="w-2.5 h-2.5 rounded bg-orange-500/30 border border-orange-500 inline-block"></span>
              <span>Uncertainty Cone (Radius)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.hotspots} 
                onChange={(e) => setActiveLayers({ ...activeLayers, hotspots: e.target.checked })}
                className="rounded border-slate-600 accent-orange-500"
              />
              <span className="w-2.5 h-2.5 rounded bg-orange-600 inline-block"></span>
              <span>Risk Hotspots (Polygons)</span>
            </label>

            <label className="flex items-center gap-2 text-slate-300 cursor-pointer hover:text-white">
              <input 
                type="checkbox" 
                checked={activeLayers.infrastructure} 
                onChange={(e) => setActiveLayers({ ...activeLayers, infrastructure: e.target.checked })}
                className="rounded border-slate-600 accent-sky-400"
              />
              <Building className="w-3.5 h-3.5 text-sky-400" />
              <span>Critical Infrastructure (PostGIS)</span>
            </label>
          </div>
        </div>
      )}

      {/* Floating Dynamic Legend Bottom-Left */}
      <div className="absolute bottom-3 left-3 bg-[#0f172a]/90 border border-[#334155] rounded-md px-3 py-2 z-10 text-[10px] shadow-xl backdrop-blur-sm">
        <div className="font-bold text-slate-300 mb-1 flex items-center justify-between gap-3">
          <span>RISK CLASSIFICATION</span>
          <span className="font-mono text-cyan-400">CARTO Dark Matter (Retina)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-600 inline-block"></span>
            <span className="text-red-400 font-semibold">SEVERE (75-100)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block"></span>
            <span className="text-orange-400 font-semibold">HIGH (50-74)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span>
            <span className="text-amber-400 font-semibold">MOD (25-49)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
            <span className="text-emerald-400 font-semibold">LOW (0-24)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
