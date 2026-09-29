'use client';

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight, 
  Building2, 
  Waves, 
  Wind,
  RefreshCw,
  Compass
} from 'lucide-react';
import { getRouteRisk } from '../../lib/api';

export const RouteRiskView: React.FC = () => {
  const [routeData, setRouteData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [originName, setOriginName] = useState('Bhubaneswar State EOC');
  const [destName, setDestName] = useState('District Hospital, Puri');

  const fetchRouteRisk = async () => {
    try {
      setLoading(true);
      const res = await getRouteRisk({
        origin_lat: 20.2961,
        origin_lon: 85.8245,
        dest_lat: 19.8135,
        dest_lon: 85.8312,
        origin_name: originName,
        dest_name: destName
      });
      if (res && res.data) {
        setRouteData(res.data);
      }
    } catch (e) {
      console.error('Error fetching route risk:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteRisk();
  }, []);

  return (
    <div className="w-full h-full bg-[#050914] text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-[10px] font-bold">
              {routeData?.route_provider ? `${routeData.route_provider.toUpperCase()} ROUTING` : 'VALHALLA ROUTING'} + HAZARD INTERSECTION
            </span>
            <span className="text-slate-500 text-xs font-mono">• Multi-Provider Evacuation Logistics</span>
          </div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white mt-1">
            Emergency Evacuation & Critical Supply Route Risk Intelligence
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time geospatial intersection of navigation corridors against modeled cyclone wind, rain, and storm surge fields.
          </p>
        </div>

        <button
          onClick={fetchRouteRisk}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-cyan-400 rounded text-xs font-mono transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recalculate Route Exposure</span>
        </button>
      </div>

      {/* Route Inputs Card */}
      <div className="bg-[#0b1329] border border-[#1e293b] rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              ORIGIN (Dispatch / Mobilization Hub)
            </label>
            <div className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] rounded px-3 py-2 text-xs font-mono text-cyan-300">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <input 
                type="text" 
                value={originName} 
                onChange={(e) => setOriginName(e.target.value)}
                className="bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">
              DESTINATION (Critical Infrastructure Target)
            </label>
            <div className="flex items-center gap-2 bg-[#0f172a] border border-[#1e293b] rounded px-3 py-2 text-xs font-mono text-cyan-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <input 
                type="text" 
                value={destName} 
                onChange={(e) => setDestName(e.target.value)}
                className="bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Banner */}
      {routeData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 font-mono uppercase">ROUTE DISTANCE</span>
            <div className="text-lg font-mono font-bold text-white mt-1">{routeData.distance_km} km</div>
            <span className="text-[10px] text-slate-400 font-mono">Transit Est: ~{routeData.duration_minutes} mins</span>
          </div>

          <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 font-mono uppercase">OVERALL RISK BAND</span>
            <div className="text-lg font-mono font-bold text-rose-400 mt-1">{routeData.overall_risk_band}</div>
            <span className="text-[10px] text-slate-400 font-mono">Exposure Index: {routeData.route_exposure_score}%</span>
          </div>

          <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 font-mono uppercase">HAZARD INTERSECTIONS</span>
            <div className="text-lg font-mono font-bold text-amber-400 mt-1">{routeData.high_risk_intersections?.length || 0} Sectors</div>
            <span className="text-[10px] text-slate-400 font-mono">Surge & Flash Waterlogging</span>
          </div>

          <div className="bg-[#0b1329] border border-[#1e293b] p-3 rounded-lg">
            <span className="text-[10px] text-slate-500 font-mono uppercase">CRITICAL BRIDGES</span>
            <div className="text-lg font-mono font-bold text-cyan-400 mt-1">{routeData.critical_bridges_crossed?.length || 0} Crossings</div>
            <span className="text-[10px] text-slate-400 font-mono">High Cross-Wind Exposure</span>
          </div>
        </div>
      )}

      {/* High-Risk Intersections & Critical Bridges */}
      {routeData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0b1329] border border-[#1e293b] rounded-lg p-4">
            <h3 className="text-xs font-mono font-bold text-amber-300 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>HIGH-RISK HAZARD INTERSECTIONS</span>
            </h3>
            <div className="space-y-2">
              {routeData.high_risk_intersections?.map((item: any, i: number) => (
                <div key={i} className="bg-[#0f172a] border border-[#1e293b] p-2.5 rounded text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>{item.location_name}</span>
                    <span className="text-rose-400 text-[10px] border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      {item.hazard_severity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Vulnerability: {item.risk_factor}</span>
                    <span>Peak Gusts: {item.wind_gust_kmh} km/h</span>
                  </div>
                  {item.modeled_water_depth_m && (
                    <div className="text-[10px] text-cyan-400">
                      Modeled Backwater Surge Inundation: ~{item.modeled_water_depth_m}m
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#0b1329] border border-[#1e293b] rounded-lg p-4">
            <h3 className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-2 mb-3">
              <Waves className="w-4 h-4 text-cyan-400" />
              <span>CRITICAL BRIDGES CROSSED & WIND GALE STRESS</span>
            </h3>
            <div className="space-y-2">
              {routeData.critical_bridges_crossed?.map((b: any, i: number) => (
                <div key={i} className="bg-[#0f172a] border border-[#1e293b] p-2.5 rounded text-xs font-mono space-y-1">
                  <div className="flex items-center justify-between text-white font-bold">
                    <span>{b.bridge_name}</span>
                    <span className="text-amber-400 text-[10px] border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {b.clearance_status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Modeled Crosswind: {b.modeled_crosswind_kmh} km/h</span>
                    <span>Max Safe Limit: {b.max_safe_wind_kmh} km/h</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Deck Clearance Elevation: {b.deck_elevation_m}m above mean sea level
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alternative Route Recommendation */}
      {routeData?.alternative_route_available && (
        <div className="bg-gradient-to-r from-emerald-950/40 to-cyan-950/40 border border-emerald-800/60 rounded-lg p-4 font-mono text-xs">
          <div className="flex items-center justify-between text-emerald-400 font-bold mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>OPTIMAL ALTERNATIVE EVACUATION CORRIDOR AVAILABLE</span>
            </div>
            {routeData.exposure_reduction_pct != null && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[11px]">
                -{routeData.exposure_reduction_pct}% EXPOSURE REDUCTION
              </span>
            )}
          </div>
          <p className="text-slate-300 text-[11px] leading-relaxed mb-3">
            {routeData.alternative_route_notes}
          </p>
          {routeData.baseline_exposure_score != null && routeData.alternative_exposure_score != null && (
            <div className="grid grid-cols-3 gap-2 bg-[#080d1a] border border-emerald-900/50 p-2.5 rounded text-[10px]">
              <div>
                <span className="text-slate-500 block">BASELINE EXPOSURE</span>
                <span className="text-rose-400 font-bold">{routeData.baseline_exposure_score}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ALTERNATIVE EXPOSURE</span>
                <span className="text-emerald-400 font-bold">{routeData.alternative_exposure_score}</span>
              </div>
              <div>
                <span className="text-slate-500 block">CALCULATED REDUCTION</span>
                <span className="text-cyan-300 font-bold">
                  {routeData.exposure_reduction_pct}% (1 - alt/base)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legal & Scientific Disclaimer (Section 8) */}
      <div className="bg-[#0b1329] border border-[#1e293b] rounded p-3 font-mono text-[10px] text-slate-400">
        <span className="text-amber-400 font-bold">LEGAL & OPERATIONAL NOTICE: </span>
        {routeData?.disclaimer || "Route intersects modeled high-risk area. Not an official road closure notice unless verified by civil authorities."}
      </div>
    </div>
  );
};
