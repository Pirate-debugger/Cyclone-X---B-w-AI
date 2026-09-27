'use client';

import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Compass, 
  Search, 
  User, 
  Database, 
  Sparkles,
  Layers,
  AlertTriangle
} from 'lucide-react';

interface CommandHeaderProps {
  onSearchCommand?: (cmd: string) => void;
  onOpenDataHealth?: () => void;
  onOpenCopilot?: () => void;
  isDemo?: boolean;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onSearchCommand,
  onOpenDataHealth,
  onOpenCopilot,
  isDemo = true
}) => {
  const [searchValue, setSearchValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() && onSearchCommand) {
      onSearchCommand(searchValue.trim());
      setSearchValue('');
    }
  };

  return (
    <header className="w-full bg-[#080d1a] border-b border-[#1e293b] px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs select-none">
      {/* Brand & Mission Status */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-950/40">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-slate-100 font-mono">CYCLONE-X</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                isDemo 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isDemo ? 'DEMO MODE' : 'LIVE FEED'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Impact & Infrastructure Vulnerability Intelligence</p>
          </div>
        </div>

        {/* Global Warning Notice */}
        <div className="hidden lg:flex items-center gap-1.5 bg-red-950/30 border border-red-900/40 text-red-400 px-2.5 py-1 rounded text-[10px]">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Prototype decision-support output — not an official warning</span>
        </div>
      </div>

      {/* Quick Command Search Bar */}
      <div className="flex-1 max-w-md w-full relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input 
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Command bar: e.g. 'Show high risk hospitals', 'Focus Puri', 'Run severe scenario'..."
          className="w-full bg-[#0f172a] border border-[#1e293b] rounded pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-mono bg-[#1e293b] px-1 rounded">↵ Enter</span>
      </div>

      {/* System State & Telemetry Chips */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto">
        <button 
          onClick={onOpenDataHealth}
          className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 px-2.5 py-1 rounded transition-colors"
          title="Inspect subsystem latency & data providers"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px]">DATA HEALTH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </button>

        <div className="hidden sm:flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] px-2 py-1 rounded text-slate-300">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono">00Z CYCLE</span>
        </div>

        <button 
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-800 text-cyan-300 px-3 py-1 rounded transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-[11px]">AI COPILOT</span>
        </button>

        <div className="flex items-center gap-1.5 bg-[#0f172a] border border-[#1e293b] px-2.5 py-1 rounded text-slate-400 text-[11px]">
          <User className="w-3 h-3 text-slate-400" />
          <span>Operator (SEOC)</span>
        </div>
      </div>
    </header>
  );
};
