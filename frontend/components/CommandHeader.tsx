'use client';

import React, { useState, useEffect } from 'react';
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
  AlertTriangle,
  Radio,
  Cpu,
  Mic
} from 'lucide-react';

interface CommandHeaderProps {
  onSearchCommand?: (cmd: string) => void;
  onOpenDataHealth?: () => void;
  onOpenCopilot?: () => void;
  onOpenVoice?: () => void;
  isDemo?: boolean;
  eventTitle?: string;
  latestRunId?: string;
  modelVersion?: string;
}

export const CommandHeader: React.FC<CommandHeaderProps> = ({
  onSearchCommand,
  onOpenDataHealth,
  onOpenCopilot,
  onOpenVoice,
  isDemo = true,
  eventTitle = "TC-2026-ALPHA (Bay of Bengal)",
  latestRunId = "RUN-18Z",
  modelVersion = "WeatherNext 3 / Cyclones v2.0"
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchValue.trim() && onSearchCommand) {
      onSearchCommand(searchValue.trim());
      setSearchValue('');
    }
  };

  return (
    <header className="w-full bg-[#080d1a] border-b border-[#1e293b] px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-3 text-xs select-none">
      {/* Brand & Identity (Section 1 & 43) */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-600 via-amber-600 to-cyan-600 flex items-center justify-center text-white shadow-lg shadow-red-950/40">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm tracking-wider text-slate-100 font-mono">CYCLONE-X</span>
              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase font-mono ${
                isDemo 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
              }`}>
                {isDemo ? 'DEMO MODE' : 'LIVE FEED'}
              </span>
            </div>
            <p className="text-[10px] text-cyan-400 font-mono tracking-tight">GLOBAL DISASTER INTELLIGENCE PLATFORM</p>
          </div>
        </div>

        {/* Active Operational Chips (Section 42) */}
        <div className="hidden xl:flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
          <div className="bg-[#0f172a] border border-rose-900/60 px-2 py-0.5 rounded flex items-center gap-1.5 text-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
            <span className="font-bold">IMD: RED ALERT</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] px-2 py-0.5 rounded flex items-center gap-1">
            <span className="text-slate-500">WEATHERNEXT:</span>
            <span className="text-cyan-300 font-semibold">64 MBRS</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] px-2 py-0.5 rounded flex items-center gap-1">
            <span className="text-slate-500">EE:</span>
            <span className="text-emerald-300 font-semibold">S1-SAR</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] px-2 py-0.5 rounded flex items-center gap-1">
            <span className="text-slate-500">VERTEX:</span>
            <span className="text-purple-300 font-semibold">IMPACT MODEL</span>
          </div>

          <div className="bg-[#0f172a] border border-[#1e293b] px-2 py-0.5 rounded flex items-center gap-1">
            <span className="text-slate-500">RUN:</span>
            <span className="text-cyan-400 font-semibold">{latestRunId}</span>
          </div>
        </div>
      </div>

      {/* Quick Search Bar with Natural Language Support (Section 75) */}
      <div className="flex-1 max-w-md w-full relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input 
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask: 'Show high impact hospitals', 'Compare runs', 'Route risk'..."
          className="w-full bg-[#0f172a] border border-[#1e293b] rounded pl-8 pr-16 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors font-mono"
        />
        <span className="absolute right-2.5 top-2 text-[10px] text-slate-500 font-mono bg-[#1e293b] px-1 rounded">↵ Enter</span>
      </div>

      {/* Right Telemetry & Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto">
        <button 
          onClick={onOpenDataHealth}
          className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 px-2.5 py-1 rounded transition-colors"
          title="Inspect subsystem health & latency"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px]">DATA HEALTH</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
        </button>

        <div className="hidden sm:flex items-center gap-1 bg-[#0f172a] border border-[#1e293b] px-2 py-1 rounded text-slate-300">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-mono">{currentTime || '00:00:00 UTC'}</span>
        </div>

        <button 
          onClick={onOpenVoice}
          className="flex items-center gap-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-cyan-800/80 text-cyan-300 px-2.5 py-1 rounded transition-colors"
          title="Voice Command Center (Google Cloud STT / TTS)"
        >
          <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="font-mono text-[11px] font-bold">VOICE</span>
        </button>

        <button 
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-950 to-blue-950 hover:from-cyan-900 hover:to-blue-900 border border-cyan-800 text-cyan-300 px-3 py-1 rounded transition-all shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold text-[11px] font-mono">GEMINI 3.8</span>
        </button>

        <div className="flex items-center gap-1.5 bg-[#0f172a] border border-[#1e293b] px-2.5 py-1 rounded text-slate-400 text-[11px] font-mono">
          <User className="w-3 h-3 text-slate-400" />
          <span>Operator (SEOC)</span>
        </div>
      </div>
    </header>
  );
};
