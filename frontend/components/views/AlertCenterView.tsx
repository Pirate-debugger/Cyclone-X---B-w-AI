'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BellRing, 
  CheckCircle, 
  Send, 
  FileEdit, 
  ShieldCheck, 
  Languages, 
  Plus 
} from 'lucide-react';
import { Alert } from '../../lib/types';
import { getAlerts, createAlertDraft, approveAlert, sendAlert, translateAdvisory } from '../../lib/api';

interface TranslationMeta {
  translation_engine?: string;
  source_advisory_id?: string;
  target_language?: string;
  translated_title?: string;
  translated_advisory_body?: string;
  [key: string]: unknown;
}

export const AlertCenterView: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedLang, setSelectedLang] = useState<'en' | 'hi' | 'or' | 'te' | 'bn'>('en');
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationMeta, setTranslationMeta] = useState<TranslationMeta | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);

  // New draft form state
  const [draftTitle, setDraftTitle] = useState('Puri Coastal Sector Early Evacuation Advisory');
  const [draftTarget, setDraftTarget] = useState('Puri South, Astaranga & Konark Coast (0-3km)');
  const [draftAction, setDraftAction] = useState('Verify MPCS shelter stock, deploy emergency boat rescue teams.');

  const loadAlerts = useCallback(async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
      setSelectedAlert(prev => prev ?? (data.length > 0 ? data[0] : null));
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleCreateDraft = async () => {
    setLoading(true);
    try {
      const created = await createAlertDraft({
        event_id: 'DEMO-TC-2026-ALPHA',
        title: draftTitle,
        urgency: 'HIGH',
        target_area: draftTarget,
        action_notes: draftAction
      });
      setShowDraftModal(false);
      await loadAlerts();
      setSelectedAlert(created);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedAlert) return;
    setLoading(true);
    try {
      const updated = await approveAlert(selectedAlert.id);
      setSelectedAlert(updated);
      await loadAlerts();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!selectedAlert) return;
    setLoading(true);
    try {
      const res = await sendAlert(selectedAlert.id);
      setDispatchStatus(`Alert ${selectedAlert.id} dispatched via DRY RUN: ${res.status}`);
      await loadAlerts();
      setTimeout(() => setDispatchStatus(null), 5000);
    } catch (e) {
      const err = e as Error;
      alert(err.message || 'Dispatch error');
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async (lang: 'hi' | 'or' | 'te' | 'bn') => {
    if (!selectedAlert) return;
    setTranslating(true);
    try {
      const res = await translateAdvisory({
        source_advisory_id: selectedAlert.id,
        english_title: selectedAlert.title,
        english_body: selectedAlert.translations?.en?.body || selectedAlert.action_notes || selectedAlert.title,
        target_language: lang
      });
      setTranslationMeta(res as Record<string, unknown>);
      
      setSelectedAlert(prev => {
        if (!prev) return null;
        return {
          ...prev,
          translations: {
            ...prev.translations,
            [lang]: {
              title: res.translated_title || prev.translations[lang]?.title || prev.title,
              body: res.translated_advisory_body || prev.translations[lang]?.body
            }
          }
        };
      });
      setSelectedLang(lang);
    } catch (e) {
      const err = e as Error;
      console.error(err);
      alert('Cloud Translation API failed: ' + (err.message || ''));
    } finally {
      setTranslating(false);
    }
  };

  const languageLabels = {
    en: 'English (Original)',
    hi: 'हिन्दी (Hindi)',
    or: 'ଓଡ଼ିଆ (Odia)',
    te: 'తెలుగు (Telugu)',
    bn: 'বাংলা (Bengali)'
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BellRing className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">HUMAN-REVIEWABLE ADVISORY & ALERT CENTER</h2>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
              SAFE DRY-RUN CHANNEL
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Multi-stage operational clearance workflow (DRAFT → REVIEW → APPROVE → SEND). No public alerts are broadcast automatically.
          </p>
        </div>

        <button
          onClick={() => setShowDraftModal(true)}
          className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-3 py-1.5 rounded shadow transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Draft New Advisory</span>
        </button>
      </div>

      {dispatchStatus && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3 rounded font-mono text-xs animate-in fade-in">
          {dispatchStatus}
        </div>
      )}

      {/* Main Grid: Alert List (Left) + Detail & Translation View (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Alerts List */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 space-y-2">
          <span className="font-bold text-slate-300 uppercase font-mono text-[10px] block mb-2">
            ACTIVE ADVISORY QUEUE ({alerts.length})
          </span>

          <div className="space-y-2">
            {alerts.map((al) => {
              const isSelected = selectedAlert?.id === al.id;
              const isApproved = al.status === 'APPROVED';
              const isDraft = al.status === 'DRAFT';

              return (
                <div
                  key={al.id}
                  onClick={() => setSelectedAlert(al)}
                  className={`p-3 rounded border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-cyan-950/50 border-cyan-700 text-white' 
                      : 'bg-[#080d1a] border-[#1e293b] text-slate-300 hover:bg-[#1e293b]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] text-cyan-400 font-bold">{al.id}</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase ${
                      isApproved 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : isDraft 
                        ? 'bg-amber-950 text-amber-400 border border-amber-800' 
                        : 'bg-blue-950 text-blue-400 border border-blue-800'
                    }`}>
                      {al.status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-200 text-xs line-clamp-1">{al.title}</p>
                  <p className="text-[10px] text-slate-500 mt-1 truncate">{al.target_area}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Alert Inspection & Workflow Stepper */}
        {selectedAlert && (
          <div className="md:col-span-2 bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-4">
            {/* Workflow Clearance Stepper */}
            {/* Workflow Clearance Stepper (Section 49) */}
            <div className="bg-[#080d1a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block mb-2">
                CIVIL DEFENSE CLEARANCE WORKFLOW (SECTION 49: DRAFT → EVIDENCE → LANGUAGE → APPROVAL → DISPATCH)
              </span>
              <div className="flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1 text-emerald-400 font-bold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>1. DRAFT</span>
                </div>
                <div className="h-0.5 flex-1 bg-slate-700 mx-1.5"></div>
                <div className={`flex items-center gap-1 ${selectedAlert.status !== 'DRAFT' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}`}>
                  <FileEdit className="w-3.5 h-3.5" />
                  <span>2. EVIDENCE</span>
                </div>
                <div className="h-0.5 flex-1 bg-slate-700 mx-1.5"></div>
                <div className={`flex items-center gap-1 ${translationMeta || selectedLang !== 'en' ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}`}>
                  <Languages className="w-3.5 h-3.5" />
                  <span>3. LANGUAGE</span>
                </div>
                <div className="h-0.5 flex-1 bg-slate-700 mx-1.5"></div>
                <div className={`flex items-center gap-1 ${selectedAlert.status === 'APPROVED' || selectedAlert.status === 'SENT' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>4. APPROVAL</span>
                </div>
                <div className="h-0.5 flex-1 bg-slate-700 mx-1.5"></div>
                <div className={`flex items-center gap-1 ${selectedAlert.status === 'SENT' ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <Send className="w-3.5 h-3.5" />
                  <span>5. DISPATCH</span>
                </div>
              </div>
            </div>

            {/* Language Selector & Cloud Translation Trigger */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#080d1a] p-2 rounded border border-[#1e293b]">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <span className="text-[10px] text-slate-500 font-mono font-bold mr-1">LANG:</span>
                {(Object.keys(languageLabels) as Array<'en' | 'hi' | 'or' | 'te' | 'bn'>).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                      selectedLang === lang 
                        ? 'bg-cyan-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white bg-[#0f172a]'
                    }`}
                  >
                    {languageLabels[lang]}
                  </button>
                ))}
              </div>

              {selectedLang !== 'en' && (
                <button
                  onClick={() => handleTranslate(selectedLang)}
                  disabled={translating}
                  className="flex items-center gap-1 bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-purple-200 border border-purple-700/60 text-[11px] font-mono px-2.5 py-1 rounded transition-all shrink-0"
                >
                  <Languages className="w-3.5 h-3.5 text-purple-400" />
                  <span>{translating ? 'Translating...' : 'Translate with Cloud Translation API'}</span>
                </button>
              )}
            </div>

            {/* Advisory Preview Body & Provenance */}
            <div className="bg-[#080d1a] border border-[#1e293b] rounded p-4 space-y-3">
              {selectedLang !== 'en' && (
                <div className="bg-[#0b1329] border border-purple-900/50 rounded p-2 text-[10px] font-mono flex flex-wrap items-center justify-between gap-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="text-purple-400 font-bold">TRANSLATION PROVENANCE:</span>
                    <span>ENGINE: {translationMeta?.translation_engine || 'Google Cloud Translation API (v3)'}</span>
                    <span>• REVIEW: Gemini 3.8 Contextual Polish</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.5 rounded font-bold">
                      HUMAN REVIEW REQUIRED
                    </span>
                    <span>{new Date().toISOString().slice(0, 16)} UTC</span>
                  </div>
                </div>
              )}

              <h3 className="font-bold text-slate-100 text-sm">
                {selectedAlert.translations[selectedLang]?.title || selectedAlert.title}
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed font-sans">
                {selectedAlert.translations[selectedLang]?.body || selectedAlert.translations.en.body}
              </p>
              <div className="pt-3 border-t border-[#1e293b] flex items-center justify-between text-[10px] text-slate-500">
                <span>Target Area: <b className="text-slate-400">{selectedAlert.target_area}</b></span>
                <span>Urgency: <b className="text-red-400">{selectedAlert.urgency}</b></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-[10px] text-slate-500">
                Created: {selectedAlert.created_at.slice(0, 16)} by {selectedAlert.author}
              </div>

              <div className="flex items-center gap-2">
                {selectedAlert.status === 'DRAFT' || selectedAlert.status === 'REVIEW' ? (
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Approve Advisory</span>
                  </button>
                ) : (
                  <button
                    onClick={handleSend}
                    disabled={loading || selectedAlert.status === 'SENT'}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-1.5 rounded transition-all disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{selectedAlert.status === 'SENT' ? 'Already Dispatched' : 'Dispatch (DRY RUN)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Draft Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#080d1a] border border-[#334155] rounded-lg p-5 space-y-3">
            <h3 className="font-bold text-slate-100 text-sm font-mono uppercase">Draft Emergency Preparedness Advisory</h3>
            <p className="text-slate-400 text-xs">
              Advisories must be reviewed and approved by an authorized supervisor before being staged for dispatch.
            </p>

            <div>
              <label className="text-slate-400 block mb-1">Advisory Title</label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Target Geographic Sector</label>
              <input
                type="text"
                value={draftTarget}
                onChange={(e) => setDraftTarget(e.target.value)}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Operational Directives & Preparedness Notes</label>
              <textarea
                value={draftAction}
                onChange={(e) => setDraftAction(e.target.value)}
                rows={3}
                className="w-full bg-[#0f172a] border border-[#1e293b] rounded p-2 text-slate-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDraftModal(false)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDraft}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded"
              >
                {loading ? 'Submitting...' : 'Submit Draft for Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
