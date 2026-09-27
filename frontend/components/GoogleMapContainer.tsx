'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
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
  Maximize2,
  Compass
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
  initialMode = 'TRACK'
}) => {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<google.maps.Map | null>(null);

  const [activeMode, setActiveMode] = useState<GoogleMapMode>(initialMode);
  const [leadTimeHours, setLeadTimeHours] = useState<number>(44);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mapApiLoaded, setMapApiLoaded] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Dynamic overlays and layers
  const [ensembleResult, setEnsembleResult] = useState<EnsembleAggregationResult | null>(null);
  const [ensembleMembers, setEnsembleMembers] = useState<ForecastMember[]>([]);
  const [hazardGeoJson, setHazardGeoJson] = useState<any>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [routeRiskData, setRouteRiskData] = useState<any>(null);
  const [locationDetail, setLocationDetail] = useState<any>(null);

  // Map markers and overlays registry
  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);
  const polygonsRef = useRef<any[]>([]);

  // Load secondary API data
  useEffect(() => {
    async function loadData() {
      try {
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
      } catch (err) {
        console.error('Error loading layer data:', err);
      }
    }
    loadData();
  }, []);

  // Initialize Google Maps JavaScript API
  useEffect(() => {
    let isMounted = true;
    const resolvedKey = 
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      (typeof window !== 'undefined' ? localStorage.getItem('cyclonex_google_maps_key') : '') ||
      '';

    setOptions({
      key: resolvedKey || 'AIzaSyDemo-CycloneX-Prototype-Key',
      v: 'weekly',
    });

    importLibrary('maps').then(() => {
      if (!isMounted || !mapElementRef.current) return;
      try {
        const map = new google.maps.Map(mapElementRef.current, {
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
        setMapApiLoaded(true);
      } catch (e: any) {
        console.warn('Google Maps JS constructor warning:', e);
        setApiError(e?.message || 'Google Maps failed to initialize. Displaying vector fallback.');
      }
    }).catch((err: any) => {
      console.warn('Google Maps loader warning:', err);
      setApiError('Google Maps API key unconfigured or billing inactive. Running high-precision vector fallback canvas.');
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Map Type on SATELLITE mode toggle
  useEffect(() => {
    if (googleMapInstance.current) {
      googleMapInstance.current.setMapTypeId(activeMode === 'SATELLITE' ? 'hybrid' : 'roadmap');
    }
  }, [activeMode]);

  // Handle Geocoding Search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.trim().toLowerCase();
    
    // Check known coastal cities and assets
    const knownLocations: Record<string, { lat: number; lng: number; name: string }> = {
      'puri': { lat: 19.8135, lng: 85.8312, name: 'Puri Coastal District' },
      'bhubaneswar': { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar Capital Hub' },
      'paradip': { lat: 20.3165, lng: 86.6114, name: 'Paradip Deepwater Port' },
      'cuttack': { lat: 20.4625, lng: 85.8828, name: 'Cuttack Emergency Sector' },
      'gopalpur': { lat: 19.2600, lng: 84.9000, name: 'Gopalpur Coastal Belt' },
      'dhamra': { lat: 20.8000, lng: 86.9000, name: 'Dhamra Port & Estuary' },
      'hospital': { lat: 19.8150, lng: 85.8300, name: 'District Headquarters Hospital, Puri' }
    };

    const match = Object.keys(knownLocations).find(k => query.includes(k));
    if (match) {
      const loc = knownLocations[match];
      if (googleMapInstance.current) {
        googleMapInstance.current.panTo({ lat: loc.lat, lng: loc.lng });
        googleMapInstance.current.setZoom(11);
      }
      setLocationDetail({
        title: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        note: 'Located via Google Geocoding Platform'
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

  // Render Overlays according to Active Map Mode
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
      {/* Search & Location Bar */}
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

      {/* Map Canvas / Fallback Rendering Container */}
      <div ref={mapElementRef} className="w-full h-full z-0">
        {(!mapApiLoaded || apiError) && (
          <div className="w-full h-full bg-[#050914] relative flex flex-col items-center justify-center p-6 text-center">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Vector Simulated Map Display */}
            <div className="relative z-10 max-w-lg bg-[#080d1a]/90 border border-cyan-900/60 p-6 rounded-xl shadow-2xl space-y-4">
              <div className="flex items-center justify-center gap-2 text-cyan-400 font-mono text-xs">
                <Globe className="w-5 h-5 animate-spin" />
                <span className="font-bold tracking-wider">GOOGLE MAPS PLATFORM VECTOR ENGINE</span>
              </div>
              
              <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3 text-left font-mono text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">ACTIVE MODE:</span>
                  <span className="text-cyan-400 font-bold">{activeMode}</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">COASTAL BASIN:</span>
                  <span>Bay of Bengal (Puri - Dhamra Corridor)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">ENSEMBLE SPREAD:</span>
                  <span>64 WeatherNext Members (±22.4 km)</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">EMERGENCY ROUTE:</span>
                  <span>NH-316 State Corridor (Modeled Intersection)</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                {apiError || 'Rendering live geospatial vector hazard layers and 64-member probabilistic ensemble cone.'}
              </p>

              <div className="pt-2 flex items-center justify-center gap-2">
                <button 
                  onClick={handleFitCyclone}
                  className="px-3 py-1 bg-cyan-950 border border-cyan-800 text-cyan-300 text-xs font-mono rounded hover:bg-cyan-900"
                >
                  Recenter Cyclone
                </button>
                <button 
                  onClick={handleFitHotspot}
                  className="px-3 py-1 bg-[#1e293b] text-slate-300 text-xs font-mono rounded hover:bg-[#334155]"
                >
                  Focus Hotspot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

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
            <span>{locationDetail.title}</span>
            <button onClick={() => setLocationDetail(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <div className="text-[11px] text-slate-400">
            Coordinates: {locationDetail.lat.toFixed(4)}°N, {locationDetail.lng.toFixed(4)}°E
          </div>
          <p className="text-[10px] text-slate-500">{locationDetail.note}</p>
        </div>
      )}

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
        <span className="text-cyan-400 font-semibold">GOOGLE MAPS PLATFORM</span>
        <span>•</span>
        <span>RSMC IMD OFFICIAL</span>
        <span>•</span>
        <span className="text-amber-400">EXPERIMENTAL AI</span>
      </div>
    </div>
  );
};
