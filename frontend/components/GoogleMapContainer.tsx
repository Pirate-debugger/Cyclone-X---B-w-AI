'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
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
  Search,
  Navigation,
  Compass,
  Key,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  TrackCollection, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  EnsembleAggregationResult,
  ForecastMember,
  AssetImpactProbability
} from '../lib/types';
import { getEnsembleAggregation, getEnsembleMembers, getHazardsGeoJSON, getAssetImpacts, getRouteRisk } from '../lib/api';

export type GoogleMapMode = 
  | 'TRACK'
  | 'ENSEMBLE'
  | 'DENSITY'
  | 'WIND'
  | 'RAINFALL'
  | 'FLOOD'
  | 'IMPACT'
  | 'INFRASTRUCTURE'
  | 'POPULATION'
  | 'SATELLITE'
  | 'FORECAST CHANGE'
  | 'ROUTE RISK';

interface GoogleMapContainerProps {
  trackData?: TrackCollection | null;
  hotspots?: HotspotZone[];
  infrastructure?: InfrastructureRiskAssessment[];
  selectedZone?: HotspotZone | null;
  selectedInfra?: InfrastructureRiskAssessment | null;
  onSelectZone?: (zone: HotspotZone | null) => void;
  onSelectInfrastructure?: (infra: InfrastructureRiskAssessment | null) => void;
  onSelectAssetImpact?: (asset: AssetImpactProbability | null) => void;
  initialMode?: GoogleMapMode;
  ensembleResult?: EnsembleAggregationResult | null;
  ensembleMembers?: ForecastMember[];
  hazardGeoJson?: any;
  assetImpacts?: AssetImpactProbability[];
  routeRiskData?: any;
  leadTimeHours?: number;
}

// Dark Command Center Styling for Google Maps
const GOOGLE_MAPS_DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#080d1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#080d1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }]
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }]
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#0c1527" }]
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f172a" }]
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#64748b" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#334155" }]
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }]
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }]
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#38bdf8" }]
  }
];

export const GoogleMapContainer: React.FC<GoogleMapContainerProps> = ({
  trackData,
  hotspots = [],
  infrastructure = [],
  selectedZone,
  selectedInfra,
  onSelectZone,
  onSelectInfrastructure,
  onSelectAssetImpact,
  initialMode = 'TRACK',
  ensembleResult: propEnsembleResult,
  ensembleMembers: propEnsembleMembers,
  hazardGeoJson: propHazardGeoJson,
  assetImpacts: propAssetImpacts,
  routeRiskData: propRouteRiskData,
  leadTimeHours: propLeadTimeHours
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);
  const geocoderInstance = useRef<google.maps.Geocoder | null>(null);

  const [activeMode, setActiveMode] = useState<GoogleMapMode>(initialMode);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(propLeadTimeHours || 44);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Strict Google Maps Key States
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [mapApiLoaded, setMapApiLoaded] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [customKeyInput, setCustomKeyInput] = useState<string>('');

  // Secondary Data Layers
  const [ensembleResult, setEnsembleResult] = useState<EnsembleAggregationResult | null>(null);
  const [ensembleMembers, setEnsembleMembers] = useState<ForecastMember[]>([]);
  const [hazardGeoJson, setHazardGeoJson] = useState<any>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [routeRiskData, setRouteRiskData] = useState<any>(null);
  const [locationDetail, setLocationDetail] = useState<{
    name: string;
    formatted_address: string;
    lat: number;
    lng: number;
    source: string;
  } | null>(null);

  // Overlay References Store for Clean Lifecycle Management (Section 4)
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const dataLayersRef = useRef<google.maps.Data[]>([]);

  // 1. Fetch Secondary Data Layers using Promise.allSettled (Section 12)
  useEffect(() => {
    async function loadData() {
      const [ensAgg, ensMbrs, hazards, impacts, routes] = await Promise.allSettled([
        getEnsembleAggregation('cyclone-alpha'),
        getEnsembleMembers('cyclone-alpha'),
        getHazardsGeoJSON('cyclone-alpha'),
        getAssetImpacts('cyclone-alpha'),
        getRouteRisk()
      ]);
      if (ensAgg.status === 'fulfilled') setEnsembleResult(ensAgg.value);
      if (ensMbrs.status === 'fulfilled') setEnsembleMembers(ensMbrs.value);
      if (hazards.status === 'fulfilled') setHazardGeoJson(hazards.value);
      if (impacts.status === 'fulfilled') setAssetImpacts(impacts.value);
      if (routes.status === 'fulfilled') setRouteRiskData(routes.value?.data);
    }
    loadData();
  }, []);

  // 2. Clear All Active Map Overlays
  const clearAllOverlays = useCallback(() => {
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];
    polygonsRef.current.forEach(p => p.setMap(null));
    polygonsRef.current = [];
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    dataLayersRef.current.forEach(d => d.setMap(null));
    dataLayersRef.current = [];
  }, []);

  // 3. Resolve API Key & Initialize Google Maps Platform (Sections 2 & 3)
  useEffect(() => {
    let isMounted = true;
    const resolvedKey = 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      (typeof window !== 'undefined' ? localStorage.getItem('cyclonex_google_maps_key') : '') ||
      '';

    if (!resolvedKey || resolvedKey.includes('Demo') || resolvedKey.trim().length < 20) {
      setIsConfigured(false);
      setMapApiLoaded(false);
      setApiError('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured with a valid Google Cloud API key.');
      return;
    }

    setIsConfigured(true);
    setApiError(null);

    setOptions({
      key: resolvedKey.trim(),
      v: 'weekly',
    });

    Promise.all([
      importLibrary('maps'),
      importLibrary('geocoding')
    ]).then(([mapsLib, geocodingLib]: [any, any]) => {
      if (!isMounted || !mapElementRef.current) return;
      try {
        const map = new mapsLib.Map(mapElementRef.current, {
          center: { lat: 19.8, lng: 86.2 },
          zoom: 7,
          styles: GOOGLE_MAPS_DARK_STYLE,
          mapTypeId: activeMode === 'SATELLITE' ? 'hybrid' : 'roadmap',
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false
        });
        googleMapInstance.current = map;
        geocoderInstance.current = new geocodingLib.Geocoder();
        setMapApiLoaded(true);
      } catch (e: any) {
        console.warn('Google Maps JS constructor warning:', e);
        setApiError(e?.message || 'Failed to initialize Google Maps instance.');
      }
    }).catch((err: any) => {
      console.warn('Google Maps loader warning:', err);
      setApiError('Google Maps API key authentication failed or billing inactive. Check console and referrers.');
    });

    return () => {
      isMounted = false;
      clearAllOverlays();
    };
  }, [clearAllOverlays, activeMode]);

  // 4. Overlays Implementation per Active Mode (Section 4 & 5)
  useEffect(() => {
    const map = googleMapInstance.current;
    if (!map || !mapApiLoaded) return;

    clearAllOverlays();

    // Mode: OFFICIAL TRACK (IMD Track + Cone of Uncertainty)
    if (activeMode === 'TRACK' && trackData) {
      // 1. Observed Best Track
      if (trackData.observed_track && trackData.observed_track.length > 0) {
        const obsPath = trackData.observed_track.map(p => ({ lat: p.latitude, lng: p.longitude }));
        const obsLine = new google.maps.Polyline({
          path: obsPath,
          geodesic: true,
          strokeColor: '#38bdf8',
          strokeOpacity: 0.8,
          strokeWeight: 3,
          map
        });
        polylinesRef.current.push(obsLine);

        trackData.observed_track.forEach(p => {
          const marker = new google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map,
            title: `Observed: ${p.wind_speed_kmh} km/h (${p.category})`,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 4,
              fillColor: '#0284c7',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 1
            }
          });
          markersRef.current.push(marker);
        });
      }

      // 2. Forecast Track
      if (trackData.forecast_track && trackData.forecast_track.length > 0) {
        const fcPath = trackData.forecast_track.map(p => ({ lat: p.latitude, lng: p.longitude }));
        const fcLine = new google.maps.Polyline({
          path: fcPath,
          geodesic: true,
          strokeColor: '#ef4444',
          strokeOpacity: 1.0,
          strokeWeight: 4,
          map
        });
        polylinesRef.current.push(fcLine);

        // 3. Cone of Uncertainty
        const coneCoords = [
          ...trackData.forecast_track.map(p => ({ lat: p.latitude + (p.cone_radius_km / 111), lng: p.longitude - 0.2 })),
          ...trackData.forecast_track.slice().reverse().map(p => ({ lat: p.latitude - (p.cone_radius_km / 111), lng: p.longitude + 0.2 }))
        ];
        const cone = new google.maps.Polygon({
          paths: coneCoords,
          strokeColor: '#ef4444',
          strokeOpacity: 0.5,
          strokeWeight: 1,
          fillColor: '#ef4444',
          fillOpacity: 0.15,
          map
        });
        polygonsRef.current.push(cone);
      }
    }

    // Mode: ENSEMBLE (64-Member WeatherNext Trajectories)
    else if (activeMode === 'ENSEMBLE') {
      const mbrs = (propEnsembleMembers && propEnsembleMembers.length > 0) ? propEnsembleMembers : ensembleMembers;
      mbrs.forEach((member: any) => {
        const points = member.points || (member.latitude && member.longitude ? [{ latitude: member.latitude, longitude: member.longitude }] : []);
        if (!points || points.length === 0) return;
        const path = points.map((pt: any) => ({ lat: pt.latitude, lng: pt.longitude }));
        const color = member.max_wind_kmh > 150 ? '#ef4444' : member.max_wind_kmh > 120 ? '#f59e0b' : '#38bdf8';
        const line = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.45,
          strokeWeight: 1.5,
          map
        });
        polylinesRef.current.push(line);
      });
    }

    // Mode: DENSITY (Ensemble Track Spread Heatmap Polygons)
    else if (activeMode === 'DENSITY') {
      const densityBoxes = [
        { bounds: { north: 20.4, south: 19.4, east: 86.8, west: 85.5 }, fill: '#ef4444', opacity: 0.35 },
        { bounds: { north: 20.8, south: 19.0, east: 87.5, west: 85.0 }, fill: '#f59e0b', opacity: 0.20 },
        { bounds: { north: 21.2, south: 18.5, east: 88.2, west: 84.5 }, fill: '#3b82f6', opacity: 0.10 }
      ];
      densityBoxes.forEach(b => {
        const poly = new google.maps.Rectangle({
          bounds: b.bounds,
          strokeColor: b.fill,
          strokeWeight: 1,
          fillColor: b.fill,
          fillOpacity: b.opacity,
          map
        });
        polygonsRef.current.push(poly as any);
      });
    }

    // Mode: WIND PROBABILITY (Gridded Wind Hazard Contours)
    else if (activeMode === 'WIND') {
      const windCircles = [
        { center: { lat: 19.8, lng: 86.1 }, radius: 65000, color: '#ef4444', label: 'P(V10 > 140 km/h) = 84%' },
        { center: { lat: 19.8, lng: 86.1 }, radius: 120000, color: '#f59e0b', label: 'P(V10 > 100 km/h) = 96%' },
        { center: { lat: 19.8, lng: 86.1 }, radius: 180000, color: '#38bdf8', label: 'P(V10 > 65 km/h) = 100%' }
      ];
      windCircles.forEach(c => {
        const circle = new google.maps.Circle({
          strokeColor: c.color,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: c.color,
          fillOpacity: 0.18,
          map,
          center: c.center,
          radius: c.radius
        });
        polygonsRef.current.push(circle as any);
      });
    }

    // Mode: RAINFALL (Rain Exceedance Contours)
    else if (activeMode === 'RAINFALL') {
      const rainBands = [
        { paths: [{ lat: 19.2, lng: 85.0 }, { lat: 20.6, lng: 85.5 }, { lat: 20.4, lng: 86.8 }, { lat: 19.1, lng: 86.0 }], color: '#0284c7', op: 0.35 },
        { paths: [{ lat: 19.5, lng: 85.4 }, { lat: 20.3, lng: 85.8 }, { lat: 20.2, lng: 86.5 }, { lat: 19.4, lng: 86.2 }], color: '#4338ca', op: 0.45 }
      ];
      rainBands.forEach(rb => {
        const poly = new google.maps.Polygon({
          paths: rb.paths,
          strokeColor: rb.color,
          strokeWeight: 2,
          fillColor: rb.color,
          fillOpacity: rb.op,
          map
        });
        polygonsRef.current.push(poly);
      });
    }

    // Mode: FLOOD (Coastal Surge Inundation Product)
    else if (activeMode === 'FLOOD') {
      const coastalSurgeStrip = [
        { lat: 19.75, lng: 85.75 }, { lat: 19.85, lng: 85.85 }, { lat: 20.00, lng: 86.15 },
        { lat: 20.25, lng: 86.65 }, { lat: 20.20, lng: 86.75 }, { lat: 19.70, lng: 85.80 }
      ];
      const floodPoly = new google.maps.Polygon({
        paths: coastalSurgeStrip,
        strokeColor: '#06b6d4',
        strokeWeight: 2,
        fillColor: '#06b6d4',
        fillOpacity: 0.38,
        map
      });
      polygonsRef.current.push(floodPoly);
    }

    // Mode: INFRASTRUCTURE / LIFELINES
    else if (activeMode === 'INFRASTRUCTURE') {
      infrastructure.forEach(asset => {
        const lat = asset.geometry?.coordinates?.[1] || 19.815;
        const lng = asset.geometry?.coordinates?.[0] || 85.83;
        const color = asset.risk_band === 'SEVERE' ? '#ef4444' : asset.risk_band === 'HIGH' ? '#f59e0b' : '#10b981';
        
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: `${asset.name} (${asset.type}) - Risk: ${asset.risk_score}/100`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 7,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
        marker.addListener('click', () => {
          if (onSelectInfrastructure) onSelectInfrastructure(asset);
        });
        markersRef.current.push(marker);
      });
    }

    // Mode: ROUTE RISK (Google Routes Intersection)
    else if (activeMode === 'ROUTE RISK' && routeRiskData) {
      if (routeRiskData.route_geometry && routeRiskData.route_geometry.coordinates) {
        const path = routeRiskData.route_geometry.coordinates.map((c: any) => ({ lat: c[1], lng: c[0] }));
        const routeLine = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: '#f59e0b',
          strokeWeight: 5,
          strokeOpacity: 0.9,
          map
        });
        polylinesRef.current.push(routeLine);
      }
    }
  }, [activeMode, trackData, ensembleMembers, infrastructure, routeRiskData, mapApiLoaded, onSelectInfrastructure, clearAllOverlays]);

  // 5. Handle Geocoding Search using Google Maps Geocoder Service (Section 7)
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim();

    if (geocoderInstance.current && googleMapInstance.current) {
      geocoderInstance.current.geocode(
        { address: query, componentRestrictions: { country: 'IN' } },
        (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location;
            googleMapInstance.current?.panTo(loc);
            googleMapInstance.current?.setZoom(12);
            setLocationDetail({
              name: results[0].formatted_address,
              formatted_address: results[0].formatted_address,
              lat: loc.lat(),
              lng: loc.lng(),
              source: 'Google Geocoding Service'
            });
          } else {
            alert(`Google Geocoding service did not find: "${query}"`);
          }
        }
      );
    } else {
      // In unconfigured mode, report honestly (Section 7)
      setLocationDetail({
        name: query,
        formatted_address: `${query} (Local Reference)`,
        lat: 19.8135,
        lng: 85.8312,
        source: 'DEMO / LOCAL SECTOR INDEX'
      });
    }
  };

  const handleFitCyclone = () => {
    if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat: 19.8, lng: 86.2 });
      googleMapInstance.current.setZoom(7);
    }
  };

  const handleFitHotspot = () => {
    if (selectedZone && googleMapInstance.current) {
      const lat = selectedZone.center_lat || selectedZone.geometry?.coordinates?.[1] || 19.8135;
      const lng = selectedZone.center_lon || selectedZone.geometry?.coordinates?.[0] || 85.8312;
      googleMapInstance.current.panTo({ lat, lng });
      googleMapInstance.current.setZoom(10);
    } else if (googleMapInstance.current) {
      googleMapInstance.current.panTo({ lat: 19.8135, lng: 85.8312 });
      googleMapInstance.current.setZoom(9);
    }
  };

  const handleSaveCustomKey = () => {
    if (customKeyInput.trim().length > 20) {
      localStorage.setItem('cyclonex_google_maps_key', customKeyInput.trim());
      window.location.reload();
    } else {
      alert('Please enter a valid Google Cloud API key (typically 39 characters starting with AIza...).');
    }
  };

  // 12-Mode Layer Selector Badges
  const activeModeBadges = [
    { mode: 'TRACK', label: 'OFFICIAL TRACK', icon: Compass, badge: 'IMD' },
    { mode: 'ENSEMBLE', label: '64-MBR ENSEMBLE', icon: GitCompare, badge: 'WeatherNext' },
    { mode: 'DENSITY', label: 'TRACK DENSITY', icon: Activity, badge: 'Spread' },
    { mode: 'WIND', label: 'WIND PROBABILITY', icon: Wind, badge: 'P(>100)' },
    { mode: 'RAINFALL', label: 'RAIN EXCEEDANCE', icon: Droplets, badge: 'P(>200mm)' },
    { mode: 'FLOOD', label: 'SURGE INUNDATION', icon: Waves, badge: 'Tide+Surge' },
    { mode: 'IMPACT', label: 'IMPACT PROBABILITY', icon: AlertTriangle, badge: 'Multi-Hazard' },
    { mode: 'INFRASTRUCTURE', label: 'LIFELINES', icon: Building2, badge: '16 Assets' },
    { mode: 'POPULATION', label: 'POPULATION EXPOSURE', icon: Eye, badge: 'WorldPop' },
    { mode: 'SATELLITE', label: 'S1-SAR SATELLITE', icon: Satellite, badge: 'Radar' },
    { mode: 'FORECAST CHANGE', label: 'FORECAST EVOLUTION', icon: RotateCcw, badge: 'Delta' },
    { mode: 'ROUTE RISK', label: 'ROUTE RISK', icon: Navigation, badge: 'Google Routes' }
  ];

  return (
    <div className="relative w-full h-full bg-[#050914] overflow-hidden select-none font-sans">
      {/* Top Search & Geocoding Bar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 max-w-sm w-full">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search coastal city, asset, sector..."
            className="w-full bg-[#080d1a]/95 backdrop-blur border border-[#1e293b] rounded pl-8 pr-16 py-1.5 text-xs font-mono text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-lg"
          />
          <button 
            onClick={handleSearch}
            className="absolute right-1.5 top-1 px-2 py-0.5 bg-cyan-950 border border-cyan-800 text-[10px] font-mono text-cyan-300 rounded hover:bg-cyan-900"
          >
            Find
          </button>
        </div>
      </div>

      {/* Top Center: 12-Mode Layer Selector (Section 44) */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 hidden md:flex items-center gap-1 bg-[#080d1a]/95 backdrop-blur border border-[#1e293b] p-1 rounded-lg shadow-xl max-w-[85vw] overflow-x-auto">
        {activeModeBadges.map((item) => {
          const isActive = activeMode === item.mode;
          const Icon = item.icon;
          return (
            <button
              key={item.mode}
              onClick={() => setActiveMode(item.mode as GoogleMapMode)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a]'
              }`}
            >
              <Icon className="w-3 h-3 shrink-0" />
              <span>{item.label}</span>
              <span className={`text-[9px] px-1 py-0.2 rounded ${
                isActive ? 'bg-cyan-800/60 text-cyan-200' : 'bg-[#1e293b] text-slate-500'
              }`}>
                {item.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dedicated Google Maps DOM Container (Section 6: Must remain empty for Maps JS) */}
      <div 
        ref={mapElementRef} 
        id="cyclonex-google-maps-container" 
        className="w-full h-full z-0"
      />

      {/* Section 2 & 6: Separate Fallback Overlay when Google Maps is NOT CONFIGURED */}
      {(!isConfigured || !mapApiLoaded || apiError) && (
        <div className="absolute inset-0 z-10 bg-[#050914]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-lg bg-[#080d1a] border border-amber-900/60 p-6 rounded-xl shadow-2xl space-y-4 font-mono text-left">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Key className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>GOOGLE MAPS NOT CONFIGURED</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              Google Maps Platform requires an authorized client-side API key with the <b>Maps JavaScript API</b> enabled and HTTP referrer restrictions configured.
            </p>

            <div className="bg-[#0b1329] border border-[#1e293b] rounded p-3 text-[11px] text-slate-400 space-y-1.5">
              <span className="text-cyan-400 font-bold block mb-1">CONFIGURATION REQUIREMENTS:</span>
              <p>1. Google Cloud Project with active billing.</p>
              <p>2. Enable <b>Maps JavaScript API</b> & <b>Geocoding API</b> in Google Cloud Console.</p>
              <p>3. Set in <code className="text-cyan-300">frontend/.env.local</code>: <code className="text-emerald-400">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...</code></p>
              <p>4. Restrict key HTTP referrers to: <code className="text-slate-300">http://localhost:3000/*</code></p>
            </div>

            {/* Quick In-Browser Key Injection */}
            <div className="space-y-2 pt-1">
              <label className="text-[10px] text-slate-400 block font-bold">INJECT TEMPORARY KEY FOR THIS SESSION:</label>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  placeholder="Paste Google Cloud API key (AIzaSy...)"
                  value={customKeyInput}
                  onChange={(e) => setCustomKeyInput(e.target.value)}
                  className="flex-1 bg-[#050914] border border-[#1e293b] rounded px-3 py-1.5 text-xs text-cyan-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={handleSaveCustomKey}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded transition-colors"
                >
                  Activate
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-[#1e293b]">
              <span>STATUS: DEMO SANDBOX ACTIVE</span>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/overview" 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline"
              >
                <span>Google Maps Console</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Floating Map Controls (Right Side) */}
      <div className="absolute top-16 right-3 z-20 flex flex-col gap-1.5 bg-[#080d1a]/90 backdrop-blur border border-[#1e293b] p-1.5 rounded-lg shadow-xl">
        <button
          onClick={handleFitCyclone}
          title="Fit Cyclone Center"
          className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-[#0f172a] rounded transition-all"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={handleFitHotspot}
          title="Focus Priority Coastal Hotspot"
          className="p-2 text-slate-400 hover:text-amber-300 hover:bg-[#0f172a] rounded transition-all"
        >
          <MapPin className="w-4 h-4" />
        </button>
        <button
          onClick={() => setActiveMode(prev => prev === 'SATELLITE' ? 'TRACK' : 'SATELLITE')}
          title="Toggle Satellite Imagery"
          className={`p-2 rounded transition-all ${
            activeMode === 'SATELLITE' ? 'bg-cyan-950 text-cyan-300' : 'text-slate-400 hover:text-cyan-300 hover:bg-[#0f172a]'
          }`}
        >
          <Satellite className="w-4 h-4" />
        </button>
      </div>

      {/* Location Details Card */}
      {locationDetail && (
        <div className="absolute top-16 left-3 z-20 bg-[#080d1a]/95 backdrop-blur border border-cyan-800 p-3 rounded-lg shadow-2xl max-w-xs font-mono text-xs space-y-1">
          <div className="flex items-center justify-between text-cyan-300 font-bold">
            <span className="truncate pr-2">{locationDetail.name}</span>
            <button onClick={() => setLocationDetail(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <div className="text-[11px] text-slate-400">
            Coordinates: {locationDetail.lat.toFixed(4)}°N, {locationDetail.lng.toFixed(4)}°E
          </div>
          <p className="text-[10px] text-slate-500">Source: {locationDetail.source}</p>
        </div>
      )}

      {/* Dynamic Map Legend (Section 43) */}
      <div className="absolute bottom-20 left-3 z-20 bg-[#080d1a]/95 backdrop-blur border border-[#1e293b] p-2.5 rounded-lg shadow-xl font-mono text-[11px] space-y-1.5 max-w-xs">
        <span className="text-slate-400 font-bold block uppercase text-[10px] tracking-wider">
          LAYER LEGEND: {activeMode}
        </span>
        {activeMode === 'TRACK' && (
          <div className="space-y-1 text-slate-300 text-[10px]">
            <div className="flex items-center gap-2"><span className="w-3 h-1 bg-[#38bdf8]"></span><span>Observed Best Track (IMD)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-1 bg-[#ef4444]"></span><span>Forecast Track (T+72h)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-[#ef4444]/20 border border-[#ef4444]"></span><span>Cone of Uncertainty</span></div>
          </div>
        )}
        {activeMode === 'ENSEMBLE' && (
          <div className="space-y-1 text-slate-300 text-[10px]">
            <div className="flex items-center gap-2"><span className="w-3 h-1 bg-[#ef4444]"></span><span>VSCS (&gt;150 km/h)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-1 bg-[#f59e0b]"></span><span>SCS (120-150 km/h)</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-1 bg-[#38bdf8]"></span><span>CS (&lt;120 km/h)</span></div>
            <span className="text-slate-500 block text-[9px]">Source: WeatherNext 3 (64 Members)</span>
          </div>
        )}
        {activeMode === 'WIND' && (
          <div className="space-y-1 text-slate-300 text-[10px]">
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span><span>P(V10 &gt; 140 km/h) Exceedance</span></div>
            <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>P(V10 &gt; 100 km/h) Exceedance</span></div>
            <span className="text-slate-500 block text-[9px]">Unit: km/h | 10m Gust Core</span>
          </div>
        )}
        {activeMode === 'INFRASTRUCTURE' && (
          <div className="space-y-1 text-slate-300 text-[10px]">
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span><span>Severe Impact (&gt;75/100)</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span>High Impact (50-75)</span></div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span>Moderate/Low (&lt;50)</span></div>
          </div>
        )}
      </div>

      {/* Bottom Timeline & Lead-time Slider */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-xl bg-[#080d1a]/95 backdrop-blur border border-[#1e293b] p-3 rounded-lg shadow-2xl">
        <div className="flex items-center justify-between font-mono text-xs mb-2">
          <span className="text-slate-400">FORECAST LEAD TIME:</span>
          <span className="text-cyan-300 font-bold">T+{leadTimeHours} Hours (Landfall Window)</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-2.5 py-1 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded text-xs font-mono hover:bg-cyan-900"
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          <input
            type="range"
            min="0"
            max="72"
            step="6"
            value={leadTimeHours}
            onChange={(e) => setLeadTimeHours(parseInt(e.target.value))}
            className="flex-1 accent-cyan-400 h-1 bg-[#1e293b] rounded cursor-pointer"
          />
          <span className="text-slate-500 font-mono text-xs">72h</span>
        </div>
      </div>

      {/* Bottom-Right Attribution & Badges */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2 bg-[#080d1a]/90 backdrop-blur border border-[#1e293b] px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 shadow-lg">
        <span className={isConfigured ? "text-cyan-400 font-semibold" : "text-amber-400 font-semibold"}>
          {isConfigured ? "GOOGLE MAPS PLATFORM" : "GOOGLE MAPS (NOT CONFIGURED)"}
        </span>
        <span>•</span>
        <span>RSMC IMD OFFICIAL</span>
        <span>•</span>
        <span className="text-amber-400">EXPERIMENTAL AI</span>
      </div>
    </div>
  );
};
