'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface RiskMetricCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon: LucideIcon;
  badge?: string;
  variant?: 'default' | 'low' | 'moderate' | 'high' | 'severe' | 'cyan';
}

export const RiskMetricCard: React.FC<RiskMetricCardProps> = ({
  label,
  value,
  subvalue,
  icon: Icon,
  badge,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'border-[#1e293b] text-slate-100 bg-[#0f172a]',
    low: 'border-emerald-900/50 text-emerald-400 bg-emerald-950/20',
    moderate: 'border-amber-900/50 text-amber-400 bg-amber-950/20',
    high: 'border-orange-900/50 text-orange-400 bg-orange-950/20',
    severe: 'border-red-900/60 text-red-400 bg-red-950/30',
    cyan: 'border-cyan-900/50 text-cyan-400 bg-cyan-950/20',
  };

  return (
    <div className={`p-3 rounded border transition-all hover:border-slate-600 ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        <Icon className="w-4 h-4 opacity-80 shrink-0" />
      </div>
      
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-xl md:text-2xl font-bold font-mono tracking-tight">{value}</span>
        {badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
            {badge}
          </span>
        )}
      </div>

      {subvalue && (
        <p className="text-[10px] text-slate-400 mt-1 truncate">{subvalue}</p>
      )}
    </div>
  );
};
