'use client';

import React from 'react';
import {
  LayoutDashboard,
  Compass,
  AlertOctagon,
  Building2,
  Sliders,
  BellRing,
  Bot,
  FileText,
  Database,
  Settings,
  ShieldAlert
} from 'lucide-react';

export type NavTab = 
  | 'command-center'
  | 'cyclone-monitor'
  | 'risk-analysis'
  | 'infrastructure'
  | 'scenario-simulator'
  | 'alerts'
  | 'ai-copilot'
  | 'reports'
  | 'data-sources'
  | 'settings';

interface NavigationSidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  onSelectTab
}) => {
  const navItems = [
    { id: 'command-center', label: 'Command Center', icon: LayoutDashboard, badge: 'Main' },
    { id: 'cyclone-monitor', label: 'Cyclone Monitor', icon: Compass, badge: 'Track' },
    { id: 'risk-analysis', label: 'Risk Analysis', icon: AlertOctagon, badge: 'Model' },
    { id: 'infrastructure', label: 'Infrastructure', icon: Building2, badge: 'Assets' },
    { id: 'scenario-simulator', label: 'Scenario Simulator', icon: Sliders, badge: 'What-If' },
    { id: 'alerts', label: 'Alert Center', icon: BellRing, badge: 'Drafts' },
    { id: 'ai-copilot', label: 'AI Copilot', icon: Bot, badge: 'Reason' },
    { id: 'reports', label: 'Incident Reports', icon: FileText, badge: 'PDF' },
    { id: 'data-sources', label: 'Data Sources', icon: Database, badge: 'EE/Open' },
    { id: 'settings', label: 'System Settings', icon: Settings, badge: 'Config' }
  ];

  return (
    <aside className="w-16 md:w-56 bg-[#080d1a] border-r border-[#1e293b] flex flex-col justify-between shrink-0 select-none py-3">
      <div className="flex flex-col gap-1 px-2">
        <div className="hidden md:block px-3 py-1 mb-2">
          <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">OPERATIONAL MODULES</span>
        </div>
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center gap-3 px-2.5 py-2 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/80 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#0f172a] border border-transparent'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              <span className="hidden md:inline truncate">{item.label}</span>
              {isActive && (
                <span className="hidden md:inline ml-auto text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-900/50 text-cyan-200 border border-cyan-700/50">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="px-2 pt-3 border-t border-[#1e293b] hidden md:block">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded p-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-mono font-bold text-slate-200">DEMO-TC-ALPHA</span>
          </div>
          <p className="text-[10px] text-slate-400">Wind: 155 km/h • 968 hPa</p>
          <p className="text-[10px] text-amber-400 font-semibold mt-0.5">Landfall: ~18:00 UTC</p>
        </div>
      </div>
    </aside>
  );
};
