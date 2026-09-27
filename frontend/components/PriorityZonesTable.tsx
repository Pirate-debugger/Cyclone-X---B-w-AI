'use client';

import React from 'react';
import { AlertTriangle, MapPin, Users, Building, ShieldAlert } from 'lucide-react';
import { HotspotZone } from '../lib/types';

interface PriorityZonesTableProps {
  hotspots?: HotspotZone[];
  selectedZone?: HotspotZone | null;
  onSelectZone?: (zone: HotspotZone) => void;
}

export const PriorityZonesTable: React.FC<PriorityZonesTableProps> = ({
  hotspots = [],
  selectedZone,
  onSelectZone
}) => {
  return (
    <div className="w-full bg-[#080d1a] border-t border-[#1e293b] p-3 text-xs select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400" />
          <span className="font-bold text-slate-200 tracking-wider uppercase font-mono text-xs">
            TOP PRIORITY OPERATIONAL RISK ZONES
          </span>
          <span className="text-[10px] text-slate-500 font-mono">({hotspots.length} ZONES MODELED)</span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline">
          Click any zone to center map & inspect facilities
        </span>
      </div>

      <div className="overflow-x-auto rounded border border-[#1e293b]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f172a] text-slate-400 border-b border-[#1e293b] text-[10px] uppercase font-mono">
              <th className="py-2 px-3">Priority Zone</th>
              <th className="py-2 px-3">Administrative District</th>
              <th className="py-2 px-3 text-center">Risk Score</th>
              <th className="py-2 px-3">Hazard Drivers</th>
              <th className="py-2 px-3">Critical Lifelines</th>
              <th className="py-2 px-3 text-right">Population Exposed</th>
              <th className="py-2 px-3">Preparedness Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e293b] bg-[#080d1a]/50">
            {hotspots.map((zone) => {
              const isSelected = selectedZone?.zone_id === zone.zone_id;
              const isSevere = zone.risk_band === 'SEVERE';
              
              return (
                <tr 
                  key={zone.zone_id}
                  onClick={() => onSelectZone && onSelectZone(zone)}
                  className={`hover:bg-[#0f172a] cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-950/40 border-l-2 border-l-cyan-400' : ''
                  }`}
                >
                  <td className="py-2 px-3 font-bold text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <MapPin className={`w-3.5 h-3.5 ${isSevere ? 'text-red-400' : 'text-orange-400'}`} />
                      <span>{zone.name}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-400 whitespace-nowrap">{zone.administrative_area}</td>
                  <td className="py-2 px-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                      isSevere 
                        ? 'bg-red-950/80 text-red-400 border border-red-800' 
                        : 'bg-orange-950/80 text-orange-400 border border-orange-800'
                    }`}>
                      {zone.risk_score} • {zone.risk_band}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-slate-300 max-w-[200px] truncate" title={zone.top_hazard}>
                    {zone.top_hazard}
                  </td>
                  <td className="py-2 px-3 text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-cyan-400" />
                      <span className="font-mono">{zone.critical_assets_count} facilities</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-mono text-right whitespace-nowrap">
                    {zone.population_estimate.toLocaleString()}
                  </td>
                  <td className="py-2 px-3 text-slate-400 max-w-[280px] truncate" title={zone.suggested_action}>
                    {zone.suggested_action}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
