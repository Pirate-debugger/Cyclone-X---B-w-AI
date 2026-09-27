'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Filter, 
  Upload, 
  MapPin, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { InfrastructureRiskAssessment, InfrastructureType } from '../../lib/types';

interface InfrastructureViewProps {
  infrastructure?: InfrastructureRiskAssessment[];
  onSelectAsset?: (asset: InfrastructureRiskAssessment) => void;
}

export const InfrastructureView: React.FC<InfrastructureViewProps> = ({
  infrastructure = [],
  onSelectAsset
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const filteredAssets = infrastructure.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.primary_threat.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSimulateUpload = () => {
    setUploadStatus('GeoJSON validation passed: 4 custom coastal assets imported.');
    setTimeout(() => setUploadStatus(null), 4000);
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Header & Controls */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">CRITICAL INFRASTRUCTURE ASSET REGISTRY</h2>
            <span className="px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 text-[10px] font-mono font-bold">
              {infrastructure.length} LIFELINES
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Intersection of cyclone wind swaths, coastal surge proxy backwater, and asset criticality.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleSimulateUpload}
            className="flex items-center gap-1.5 bg-[#080d1a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-200 px-3 py-1.5 rounded transition-colors text-xs"
          >
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Upload GeoJSON</span>
          </button>
        </div>
      </div>

      {uploadStatus && (
        <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 p-2.5 rounded text-xs animate-in fade-in">
          {uploadStatus}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assets by name or threat (e.g. 'Puri', 'Substation', 'Hospital')..."
            className="w-full bg-[#0f172a] border border-[#1e293b] rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Asset Types</option>
            <option value="hospital">Hospitals & Health Centres</option>
            <option value="power_station">Power & Substations</option>
            <option value="emergency_shelter">Cyclone Shelters</option>
            <option value="bridge">Bridges & Transport</option>
            <option value="water_facility">Water Facilities</option>
          </select>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#080d1a] text-slate-400 border-b border-[#1e293b] text-[10px] uppercase font-mono">
                <th className="py-2.5 px-3">Asset Name</th>
                <th className="py-2.5 px-3">Facility Type</th>
                <th className="py-2.5 px-3 text-center">Criticality</th>
                <th className="py-2.5 px-3 text-center">Risk Score</th>
                <th className="py-2.5 px-3">Elevation & Coast Dist</th>
                <th className="py-2.5 px-3">Primary Physical Threat</th>
                <th className="py-2.5 px-3">Emergency Alternative / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {filteredAssets.map((asset) => {
                const isSevere = asset.risk_band === 'SEVERE';
                return (
                  <tr 
                    key={asset.asset_id}
                    onClick={() => onSelectAsset && onSelectAsset(asset)}
                    className="hover:bg-[#1e293b]/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-200">{asset.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{asset.asset_id}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 capitalize">
                      {asset.type.replace(/_/g, ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                      {asset.criticality}/100
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                        isSevere 
                          ? 'bg-red-950/80 text-red-400 border border-red-800' 
                          : 'bg-orange-950/80 text-orange-400 border border-orange-800'
                      }`}>
                        {asset.risk_score} • {asset.risk_band}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                      {asset.elevation_m}m ASL • {asset.distance_to_coast_km}km to sea
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-[220px]">
                      <span className={isSevere ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                        {asset.primary_threat}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-[240px] text-[11px]">
                      {asset.nearest_shelter_or_backup || 'Standard standby status'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
