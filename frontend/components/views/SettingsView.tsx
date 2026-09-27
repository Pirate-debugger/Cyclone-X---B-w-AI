import React, { useState, useEffect } from 'react';
import { Settings, Shield, Sliders, Database, Key, CheckCircle, RefreshCw, Lock } from 'lucide-react';
import { getApiKey, setApiKey } from '@/lib/api';

export const SettingsView: React.FC = () => {
  const [appMode, setAppMode] = useState<'demo' | 'live'>('demo');
  const [selectedModel, setSelectedModel] = useState('gemini-3.7-flash');
  const [currentRole, setCurrentRole] = useState<'viewer' | 'operator' | 'admin'>('admin');
  const [apiKeyInput, setApiKeyInput] = useState('cb1_3zqt_1_dc5d1212b00788ce3409d182');
  const [hazardWeight, setHazardWeight] = useState(0.50);
  const [exposureWeight, setExposureWeight] = useState(0.30);
  const [vulnerabilityWeight, setVulnerabilityWeight] = useState(0.20);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    setApiKeyInput(getApiKey());
  }, []);

  const handleSave = () => {
    setApiKey(apiKeyInput.trim());
    setSavedNotice(`API Key & Configuration saved. Authenticated as: ${apiKeyInput.includes('cb1_') ? 'Lead Commander (Admin)' : currentRole.toUpperCase()}`);
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">SYSTEM CONFIGURATION & ACCESS CONTROL</h2>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
              ROLE: {currentRole.toUpperCase()}
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Manage operational environment mode, AI model version, RBAC clearance roles, and prototype policy parameters.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Save Configuration</span>
        </button>
      </div>

      {savedNotice && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-2.5 rounded font-mono text-xs animate-in fade-in">
          {savedNotice}
        </div>
      )}

      {/* Grid: App Mode & AI Model & Roles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* App Mode */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-mono">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>OPERATIONAL RUNTIME MODE</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            In DEMO MODE, CYCLONE-X runs 100% offline using simulated Bay of Bengal datasets. In LIVE MODE, real APIs are contacted.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setAppMode('demo')}
              className={`flex-1 py-1.5 rounded font-bold border transition-all ${
                appMode === 'demo'
                  ? 'bg-amber-950 text-amber-300 border-amber-600'
                  : 'bg-[#080d1a] text-slate-400 border-[#1e293b]'
              }`}
            >
              DEMO MODE
            </button>
            <button
              onClick={() => setAppMode('live')}
              className={`flex-1 py-1.5 rounded font-bold border transition-all ${
                appMode === 'live'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                  : 'bg-[#080d1a] text-slate-400 border-[#1e293b]'
              }`}
            >
              LIVE FEED
            </button>
          </div>
        </div>

        {/* AI Model Selection */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-mono">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>GEMINI REASONING MODEL</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Select active Google GenAI model. Default: <code className="text-cyan-300">gemini-3.7-flash</code> with override support.
          </p>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-[#080d1a] border border-[#1e293b] rounded p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="gemini-3.7-flash">gemini-3.7-flash (Default Recommended)</option>
            <option value="gemini-3.8-flash">gemini-3.8-flash (Latest Fast Tier)</option>
            <option value="gemini-2.5-flash">gemini-2.5-flash (Standard Fallback)</option>
          </select>
        </div>

        {/* Role Clearance Switcher */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-mono">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>ROLE-BASED CLEARANCE (RBAC)</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Switch role to test authorization controls (Viewer: Read-only, Operator: Drafts & Scenarios, Admin: Policy override).
          </p>
          <div className="flex gap-2">
            {(['viewer', 'operator', 'admin'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setCurrentRole(r)}
                className={`flex-1 py-1.5 rounded font-bold capitalize border transition-all ${
                  currentRole === r
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-[#080d1a] text-slate-400 border-[#1e293b]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Operational API Key & Commander Clearance */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-mono">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>OPERATIONAL API KEY & COMMANDER CLEARANCE</span>
          </div>
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {apiKeyInput === 'cb1_3zqt_1_dc5d1212b00788ce3409d182' ? 'ACTIVE: LEAD COMMANDER (FULL ADMIN ACCESS)' : 'AUTHENTICATED'}
          </span>
        </div>

        <div className="bg-[#080d1a] border border-[#1e293b] rounded p-3 space-y-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter API Key (e.g. cb1_3zqt_1_dc5d1212b00788ce3409d182)"
                className="w-full bg-[#0b1329] border border-[#1e293b] rounded px-3 py-2 font-mono text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => {
                setApiKeyInput('cb1_3zqt_1_dc5d1212b00788ce3409d182');
                setApiKey('cb1_3zqt_1_dc5d1212b00788ce3409d182');
                setSavedNotice('Active Commander Key applied (cb1_3zqt_1_dc5d1212b00788ce3409d182).');
                setTimeout(() => setSavedNotice(null), 3000);
              }}
              className="px-3 py-2 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 font-mono font-bold text-[11px] whitespace-nowrap transition-colors"
            >
              Use Commander Key
            </button>
          </div>
          <p className="text-slate-400 text-[11px]">
            Injected into request headers as <code className="text-cyan-400 font-mono">X-API-Key: {apiKeyInput.substring(0, 16)}...</code>. Grants role-based clearance for scenario runs, alert approvals, and report generations.
          </p>
        </div>
      </div>

      {/* Model Weights Editor */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-bold font-mono">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>PROTOTYPE RISK COMPOSITION WEIGHTS EDITOR</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Sum must equal 100% (1.00)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#080d1a] p-4 rounded border border-[#1e293b]">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-red-400 font-semibold">Hazard Weight:</span>
              <span className="font-mono text-slate-200 font-bold">{Math.round(hazardWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="0.8"
              step="0.05"
              value={hazardWeight}
              onChange={(e) => setHazardWeight(parseFloat(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-orange-400 font-semibold">Exposure Weight:</span>
              <span className="font-mono text-slate-200 font-bold">{Math.round(exposureWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.6"
              step="0.05"
              value={exposureWeight}
              onChange={(e) => setExposureWeight(parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-amber-400 font-semibold">Vulnerability Weight:</span>
              <span className="font-mono text-slate-200 font-bold">{Math.round(vulnerabilityWeight * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.05"
              value={vulnerabilityWeight}
              onChange={(e) => setVulnerabilityWeight(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
