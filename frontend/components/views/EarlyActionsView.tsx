'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Building2, 
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { getPriorityActions } from '@/lib/api';
import { PriorityActionItem, PriorityActionsPayload } from '@/lib/types';

export const EarlyActionsView: React.FC = () => {
  const [actionsData, setActionsData] = useState<PriorityActionsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewedActions, setReviewedActions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadActions() {
      try {
        const data = await getPriorityActions();
        setActionsData(data);
      } catch (err) {
        console.error("Failed to load priority actions", err);
      } finally {
        setLoading(false);
      }
    }
    loadActions();
  }, []);

  const handleToggleReview = (actionId: string) => {
    setReviewedActions(prev => ({
      ...prev,
      [actionId]: !prev[actionId]
    }));
  };

  if (loading || !actionsData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-400 font-mono text-xs">
        <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span>Evaluating Action Prioritization Engine Recommendations...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#050914] text-slate-100 space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-[#1e293b] p-4 rounded-lg shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-red-950/80 border border-red-800 text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100">EARLY ACTION & INTERVENTION PRIORITIZATION</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                DECISION SUPPORT
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked early action advisories derived from ensemble impact probabilities, asset criticalities, and lead times. Human review required.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400">
          AUTHORIZED ROLE: <span className="text-amber-400 font-bold">OPERATOR / REVIEWER</span>
        </div>
      </div>

      {/* Priority Action Cards */}
      <div className="grid grid-cols-1 gap-3">
        {actionsData.priority_actions.map((action: PriorityActionItem) => {
          const isReviewed = reviewedActions[action.action_id] || false;

          const urgencyBg = 
            action.urgency === 'IMMEDIATE' ? 'border-red-600/80 bg-red-950/20' :
            action.urgency === 'HIGH_PRIORITY' ? 'border-amber-600/80 bg-amber-950/20' :
            'border-slate-700 bg-slate-900/40';

          const urgencyBadge = 
            action.urgency === 'IMMEDIATE' ? 'bg-red-950 text-red-300 border-red-700' :
            action.urgency === 'HIGH_PRIORITY' ? 'bg-amber-950 text-amber-300 border-amber-700' :
            'bg-slate-800 text-slate-300 border-slate-700';

          return (
            <div 
              key={action.action_id}
              className={`border rounded-lg p-4 transition-all shadow-md ${urgencyBg}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${urgencyBadge}`}>
                      {action.urgency}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      ID: {action.action_id}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      Impact P: {Math.round(action.impact_probability * 100)}%
                    </span>
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      T-{action.time_to_impact_hours}h to impact
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 font-sans">
                    {action.title}
                  </h3>
                  <div className="text-xs text-cyan-300 font-mono">
                    Target: {action.target_asset_or_zone}
                  </div>
                  <p className="text-xs text-slate-300 font-sans leading-relaxed pt-1">
                    {action.action_summary}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="text-[11px] font-mono text-slate-400">
                    Authority: <span className="text-slate-200 font-bold">{action.responsible_authority}</span>
                  </div>

                  <button
                    onClick={() => handleToggleReview(action.action_id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-bold transition-all border ${
                      isReviewed 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                        : 'bg-[#0f172a] hover:bg-[#1e293b] text-slate-300 border-slate-600'
                    }`}
                  >
                    {isReviewed ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>OPERATOR VERIFIED</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>MARK AS REVIEWED</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 rounded bg-[#0f172a] border border-[#1e293b] text-xs text-slate-400 font-mono flex items-center justify-between">
        <span>MANDATORY GOVERNANCE: All intervention orders must be confirmed by District Emergency Authority.</span>
        <span className="text-cyan-400 font-bold">CYCLONE-X v2.0 Decision Support</span>
      </div>
    </div>
  );
};
