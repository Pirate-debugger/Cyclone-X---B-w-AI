'use client';

import React, { useState } from 'react';
import { Compass, Wind, Gauge, Navigation, Calendar, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { TrackCollection, CycloneEvent } from '../../lib/types';

interface CycloneMonitorViewProps {
  trackData?: TrackCollection | null;
  event?: CycloneEvent | null;
}

export const CycloneMonitorView: React.FC<CycloneMonitorViewProps> = ({
  trackData,
  event
}) => {
  const [selectedStep, setSelectedStep] = useState<number>(18); // Default to landfall (+18h)
  const forecastPoints = trackData?.forecast_track || [];
  const observedPoints = trackData?.observed_track || [];

  const currentPoint = forecastPoints.find(p => p.step_hours === selectedStep) || forecastPoints[0];

  return (
    <div className="w-full h-full flex flex-col p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Cyclone Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <h2 className="text-lg font-bold font-mono text-slate-100">{event?.name || 'DEMO CYCLONE ALPHA'}</h2>
            <span className="px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800 text-[10px] font-mono font-bold">
              {event?.category || 'Very Severe Cyclonic Storm'}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono">
              DEMO DATA
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Basin: {event?.basin || 'North Indian Ocean (Bay of Bengal)'} • Movement: {event?.movement_direction || 'NNW'} at {event?.movement_speed_kmh || 18.5} km/h
          </p>
        </div>

        <div className="flex items-center gap-4 bg-[#080d1a] border border-[#1e293b] rounded px-4 py-2">
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Max Sustained Wind</span>
            <span className="font-mono text-lg font-bold text-red-400">{event?.max_sustained_wind_kmh || 155} km/h</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Central Pressure</span>
            <span className="font-mono text-lg font-bold text-cyan-400">{event?.central_pressure_hpa || 968} hPa</span>
          </div>
          <div className="h-6 w-px bg-slate-800"></div>
          <div className="text-center">
            <span className="text-[10px] text-slate-500 block uppercase">Landfall Window</span>
            <span className="font-mono text-xs font-bold text-amber-400">~18:00 UTC Today</span>
          </div>
        </div>
      </div>

      {/* Interactive Forecast Timeline Slider */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase font-mono">Forecast Horizon Step Progression</span>
          </div>
          <span className="text-cyan-400 font-mono text-xs font-bold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
            Selected Step: +{selectedStep}h ({currentPoint?.timestamp ? currentPoint.timestamp.slice(11, 16) + ' UTC' : ''})
          </span>
        </div>

        {/* Timeline Buttons */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {forecastPoints.map((pt) => {
            const isSelected = pt.step_hours === selectedStep;
            const isLandfall = pt.step_hours === 18;

            return (
              <button
                key={pt.point_id}
                onClick={() => setSelectedStep(pt.step_hours)}
                className={`flex flex-col items-center justify-center p-2 rounded border transition-all ${
                  isSelected 
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md' 
                    : isLandfall
                    ? 'bg-red-950/40 text-red-300 border-red-800 hover:bg-red-900/50'
                    : 'bg-[#080d1a] text-slate-300 border-[#1e293b] hover:bg-[#1e293b]'
                }`}
              >
                <span className="font-mono font-bold text-xs">+{pt.step_hours}h</span>
                <span className="text-[9px] opacity-80 mt-0.5">{pt.wind_speed_kmh} km/h</span>
                {isLandfall && (
                  <span className="text-[8px] font-bold text-amber-300 uppercase tracking-tighter mt-1 bg-amber-950 px-1 rounded">
                    Landfall
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Point Telemetry */}
        {currentPoint && (
          <div className="mt-4 bg-[#080d1a] border border-[#1e293b] rounded p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
            <div>
              <span className="text-slate-500 block">Position Coordinates:</span>
              <span className="font-mono font-bold text-slate-200">{currentPoint.latitude.toFixed(2)}°N, {currentPoint.longitude.toFixed(2)}°E</span>
            </div>
            <div>
              <span className="text-slate-500 block">Sustained Wind / Gusts:</span>
              <span className="font-mono font-bold text-red-400">{currentPoint.wind_speed_kmh} km/h / {currentPoint.gust_kmh} km/h</span>
            </div>
            <div>
              <span className="text-slate-500 block">Atmospheric Pressure:</span>
              <span className="font-mono font-bold text-cyan-400">{currentPoint.central_pressure_hpa} hPa</span>
            </div>
            <div>
              <span className="text-slate-500 block">Uncertainty Cone Radius:</span>
              <span className="font-mono font-bold text-slate-300">±{currentPoint.cone_radius_km} km</span>
            </div>
          </div>
        )}
      </div>

      {/* Observed Track vs Forecast Track Comparison Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Observed Track Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-cyan-400 text-xs uppercase">OBSERVED BEST TRACK (IBTrACS BASELINE)</span>
            <span className="text-[10px] text-slate-500 font-mono">OBSERVATION</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e293b]">
                  <th className="pb-1.5">Timestamp</th>
                  <th className="pb-1.5">Coords</th>
                  <th className="pb-1.5 text-right">Wind</th>
                  <th className="pb-1.5 text-right">Pressure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {observedPoints.map((pt) => (
                  <tr key={pt.point_id} className="text-slate-300">
                    <td className="py-1 font-mono text-[10px] text-slate-400">{pt.timestamp.slice(11, 16)} UTC</td>
                    <td className="py-1 font-mono">{pt.latitude.toFixed(2)}°N, {pt.longitude.toFixed(2)}°E</td>
                    <td className="py-1 font-mono text-right text-cyan-400">{pt.wind_speed_kmh} km/h</td>
                    <td className="py-1 font-mono text-right text-slate-400">{pt.central_pressure_hpa} hPa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Forward Forecast Track Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-red-400 text-xs uppercase">FORWARD FORECAST TRACK (RSMC BULLETIN)</span>
            <span className="text-[10px] text-slate-500 font-mono">FORECAST</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e293b]">
                  <th className="pb-1.5">Step</th>
                  <th className="pb-1.5">Valid Time</th>
                  <th className="pb-1.5">Coords</th>
                  <th className="pb-1.5 text-right">Wind</th>
                  <th className="pb-1.5 text-right">Cone (±km)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e293b]/60">
                {forecastPoints.map((pt) => (
                  <tr key={pt.point_id} className={`text-slate-300 ${pt.step_hours === 18 ? 'bg-red-950/30' : ''}`}>
                    <td className="py-1 font-mono font-bold text-slate-200">+{pt.step_hours}h</td>
                    <td className="py-1 font-mono text-[10px] text-slate-400">{pt.timestamp.slice(8, 16)}</td>
                    <td className="py-1 font-mono">{pt.latitude.toFixed(2)}°N, {pt.longitude.toFixed(2)}°E</td>
                    <td className="py-1 font-mono text-right text-red-400">{pt.wind_speed_kmh} km/h</td>
                    <td className="py-1 font-mono text-right text-slate-400">±{pt.cone_radius_km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
