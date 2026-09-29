'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Wind, 
  Droplets, 
  Waves, 
  Building2, 
  Users, 
  AlertOctagon, 
  Gauge, 
  Compass, 
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Target,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { CommandHeader } from '../components/CommandHeader';
import { NavigationSidebar, NavTab } from '../components/NavigationSidebar';
import { RiskMetricCard } from '../components/RiskMetricCard';
import { ContextIntelligencePanel } from '../components/ContextIntelligencePanel';
import { PriorityZonesTable } from '../components/PriorityZonesTable';
import { AICopilotDrawer } from '../components/AICopilotDrawer';
import { DataHealthDrawer } from '../components/DataHealthDrawer';
import { EvidenceDrawer } from '../components/EvidenceDrawer';

const MapContainer = dynamic(
  () => import('../components/MapContainer').then((mod) => mod.MapContainer || (mod as any).default),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-400 font-mono text-xs space-y-2">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Initializing MapLibre GL JS Geospatial Engine (Zero-Key)...</span>
      </div>
    ),
  }
);

// Specialized Views
import { CycloneMonitorView } from '../components/views/CycloneMonitorView';
import { RiskAnalysisView } from '../components/views/RiskAnalysisView';
import { InfrastructureView } from '../components/views/InfrastructureView';
import { ScenarioSimulatorView } from '../components/views/ScenarioSimulatorView';
import { AlertCenterView } from '../components/views/AlertCenterView';
import { ReportsView } from '../components/views/ReportsView';
import { DataSourcesView } from '../components/views/DataSourcesView';
import { SettingsView } from '../components/views/SettingsView';
import { ForecastEvolutionView } from '../components/views/ForecastEvolutionView';
import { ModelComparisonView } from '../components/views/ModelComparisonView';
import { ForecastVerificationView } from '../components/views/ForecastVerificationView';
import { EarlyActionsView } from '../components/views/EarlyActionsView';
import { GoogleComplianceView } from '../components/views/GoogleComplianceView';
import { RouteRiskView } from '../components/views/RouteRiskView';
import { VoiceCommandModal } from '../components/VoiceCommandModal';

import { 
  CycloneEvent, 
  TrackCollection, 
  RiskOverview, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  GeminiStructuredExplanation,
  EnsembleAggregationResult,
  AssetImpactProbability,
  HazardFieldsOverview
} from '../lib/types';
import { 
  getEvents, 
  getTrack, 
  getRiskOverview, 
  getInfrastructureRisk, 
  askGeminiCopilot,
  getDataHealth,
  getEnsembleAggregation,
  getAssetImpacts,
  getHazardsOverview,
  getSystemHealth,
  getMode,
  getForecastEvolution
} from '../lib/api';

export default function CycloneXApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('command-center');
  const [event, setEvent] = useState<CycloneEvent | null>(null);
  const [trackData, setTrackData] = useState<TrackCollection | null>(null);
  const [riskData, setRiskData] = useState<RiskOverview | null>(null);
  const [infrastructure, setInfrastructure] = useState<InfrastructureRiskAssessment[]>([]);
  const [ensembleData, setEnsembleData] = useState<EnsembleAggregationResult | null>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [hazardOverview, setHazardOverview] = useState<HazardFieldsOverview | null>(null);
  const [selectedZone, setSelectedZone] = useState<HotspotZone | null>(null);
  const [selectedInfra, setSelectedInfra] = useState<InfrastructureRiskAssessment | null>(null);
  const [aiExplanation, setAiExplanation] = useState<GeminiStructuredExplanation | null>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [modeInfo, setModeInfo] = useState<any>(null);
  const [evolutionInfo, setEvolutionInfo] = useState<any>(null);
  
  // Drawers & Modals
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [dataHealthOpen, setDataHealthOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [dataHealthInfo, setDataHealthInfo] = useState<any>(null);
  const [selectedState, setSelectedState] = useState('Odisha');
  const [selectedDistrict, setSelectedDistrict] = useState('Puri');

  // Initial load using resilient Promise.allSettled (Section 12 & 38)
  useEffect(() => {
    async function loadInitialData() {
      // 1. Load Event & Track
      try {
        const events = await getEvents();
        if (events && events.length > 0) {
          const currentEv = events[0];
          setEvent(currentEv);
          try {
            const track = await getTrack(currentEv.event_id);
            if (track) setTrackData(track);
          } catch (tErr) {
            console.warn("Track data fetch warning:", tErr);
          }
        }
      } catch (eErr) {
        console.warn("Events fetch note:", eErr);
      }

      // 2. Load Core Intelligence Datasets via Promise.allSettled
      const [riskRes, infraRes, healthRes, ensRes, impactsRes, hazardsRes, sysHealthRes, modeRes, evoRes] = await Promise.allSettled([
        getRiskOverview(),
        getInfrastructureRisk(),
        getDataHealth(),
        getEnsembleAggregation(),
        getAssetImpacts(),
        getHazardsOverview(),
        getSystemHealth(),
        getMode(),
        getForecastEvolution()
      ]);

      if (riskRes.status === 'fulfilled' && riskRes.value) {
        setRiskData(riskRes.value);
        if (riskRes.value.top_priority_zones && riskRes.value.top_priority_zones.length > 0) {
          setSelectedZone(riskRes.value.top_priority_zones[0]);
        }
      }
      if (infraRes.status === 'fulfilled' && infraRes.value) {
        setInfrastructure(infraRes.value);
      }
      if (healthRes.status === 'fulfilled' && healthRes.value) {
        setDataHealthInfo(healthRes.value);
      }
      if (ensRes.status === 'fulfilled' && ensRes.value) {
        setEnsembleData(ensRes.value);
      }
      if (impactsRes.status === 'fulfilled' && impactsRes.value) {
        setAssetImpacts(impactsRes.value);
      }
      if (hazardsRes.status === 'fulfilled' && hazardsRes.value) {
        setHazardOverview(hazardsRes.value);
      }
      if (sysHealthRes.status === 'fulfilled' && sysHealthRes.value) {
        setSystemHealth(sysHealthRes.value);
      }
      if (modeRes.status === 'fulfilled' && modeRes.value) {
        setModeInfo((modeRes.value as any)?.data || modeRes.value);
      }
      if (evoRes.status === 'fulfilled' && evoRes.value) {
        setEvolutionInfo(evoRes.value?.data || evoRes.value);
      }

      // 3. Grounded AI initial summary
      try {
        const explanation = await askGeminiCopilot("Summarize current threat for Puri coastal zone");
        if (explanation) setAiExplanation(explanation);
      } catch (aiErr) {
        console.warn("AI copilot initialization note:", aiErr);
      }
    }

    loadInitialData();
  }, []);

  const handleSearchCommand = (cmd: string) => {
    const c = cmd.toLowerCase();
    if (c.includes('google') || c.includes('stack') || c.includes('compliance')) {
      setActiveTab('google-stack');
    } else if (c.includes('route') || c.includes('evac') || c.includes('road')) {
      setActiveTab('route-risk');
    } else if (c.includes('voice') || c.includes('speak') || c.includes('listen') || c.includes('mic')) {
      setVoiceModalOpen(true);
    } else if (c.includes('evolution') || c.includes('cycle') || c.includes('shift')) {
      setActiveTab('forecast-evolution');
    } else if (c.includes('model') || c.includes('consensus') || c.includes('compare')) {
      setActiveTab('model-comparison');
    } else if (c.includes('verify') || c.includes('backtest') || c.includes('fani')) {
      setActiveTab('verification');
    } else if (c.includes('early') || c.includes('action') || c.includes('priority')) {
      setActiveTab('early-actions');
    } else if (c.includes('hospital') || c.includes('infra') || c.includes('asset')) {
      setActiveTab('infrastructure');
    } else if (c.includes('scenario') || c.includes('stress') || c.includes('simulat')) {
      setActiveTab('scenario-simulator');
    } else if (c.includes('report') || c.includes('brief') || c.includes('pdf')) {
      setActiveTab('reports');
    } else if (c.includes('track') || c.includes('timeline') || c.includes('monitor')) {
      setActiveTab('cyclone-monitor');
    } else if (c.includes('alert') || c.includes('advisory')) {
      setActiveTab('alerts');
    } else {
      setCopilotOpen(true);
    }
  };

  const metrics = riskData?.overall_metrics;
  const topSector = ensembleData?.landfall_sectors?.[0];
  const dynamicWindProb = ensembleData?.prob_wind_exceed_100kmh !== undefined 
    ? `${Math.round(ensembleData.prob_wind_exceed_100kmh * 100)}%` 
    : "84% (DEMO)";
  const dynamicRainProb = hazardOverview?.rainfall_exceedances?.[1]?.p_exceed_200mm !== undefined 
    ? `${Math.round(hazardOverview.rainfall_exceedances[1].p_exceed_200mm * 100)}%` 
    : "64% (DEMO)";
  const dynamicPopExposure = selectedZone?.population_estimate 
    ? `${Math.round(selectedZone.population_estimate / 1000)}k` 
    : (riskData?.population_exposure?.total_exposed ? `${Math.round(riskData.population_exposure.total_exposed / 1000)}k` : "340k (DEMO)");
  const dynamicPopSub = riskData?.population_exposure?.total_exposed 
    ? `Total: ${(riskData.population_exposure.total_exposed / 1000000).toFixed(2)}M` 
    : "Total: 1.28M (DEMO)";
  const dynamicImpactProb = assetImpacts?.[0]?.p_combined_impact !== undefined 
    ? `${Math.round(assetImpacts[0].p_combined_impact * 100)}%` 
    : (selectedZone?.risk_score !== undefined ? `${selectedZone.risk_score}%` : "62% (DEMO)");
  const dynamicImpactSub = assetImpacts?.[0]?.name || (selectedZone ? selectedZone.name : "District Hospital Puri");
  const dynamicStability = ensembleData?.forecast_confidence_pct !== undefined 
    ? `${ensembleData.forecast_confidence_pct}%` 
    : "88% (DEMO)";

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* Top Command Header (Section 39 & 43) */}
      <CommandHeader 
        onSearchCommand={handleSearchCommand}
        onOpenDataHealth={() => setDataHealthOpen(true)}
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenVoice={() => setVoiceModalOpen(true)}
        onOpenEvidence={() => setEvidenceOpen(true)}
        isDemo={modeInfo?.is_demo ?? true}
        eventTitle={event?.name || "DEMO-TC-2026-ALPHA (Bay of Bengal)"}
        latestRunId={evolutionInfo?.latest_run?.run_id || "RUN-18Z"}
        modelVersion={systemHealth?.subsystems?.weathernext_3 ? `WeatherNext 3 (${systemHealth.subsystems.weathernext_3})` : "WeatherNext 3 / Cyclones v2.0"}
        selectedState={selectedState}
        selectedDistrict={selectedDistrict}
        onSelectState={(st) => setSelectedState(st)}
        onSelectDistrict={(dt) => setSelectedDistrict(dt)}
      />

      {/* Main Operational Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <NavigationSidebar 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
        />

        {/* Center Dynamic Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050914] overflow-hidden">
          {activeTab === 'command-center' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Section 44: Top Metrics Bar (The 8 Mandatory Scientific Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 p-2 bg-[#080d1a] border-b border-[#1e293b] shrink-0 select-none">
                {/* 1. Landfall Probability */}
                <RiskMetricCard 
                  label="Landfall Probability"
                  value={topSector ? `${topSector.probability_pct}%` : (ensembleData?.landfall_probability_pct !== undefined ? `${ensembleData.landfall_probability_pct}%` : "47.0% (DEMO)")}
                  subvalue={topSector ? (topSector.sector_name || topSector.name) : "Puri - Astaranga Belt"}
                  icon={Target}
                  variant="severe"
                  badge="64-MBR"
                />

                {/* 2. Track Spread */}
                <RiskMetricCard 
                  label="Track Spread"
                  value={ensembleData?.cross_track_spread_km !== undefined ? `±${ensembleData.cross_track_spread_km}km` : "±28.4km (DEMO)"}
                  subvalue="Cross-track spread @ +48h"
                  icon={TrendingUp}
                  variant="high"
                  badge="SPREAD"
                />

                {/* 3. Peak Wind Probability */}
                <RiskMetricCard 
                  label="Peak Wind Prob."
                  value={dynamicWindProb}
                  subvalue="P(Wind > 100 km/h)"
                  icon={Wind}
                  variant="severe"
                  badge="V10"
                />

                {/* 4. Rainfall Exceedance */}
                <RiskMetricCard 
                  label="Rain Exceedance"
                  value={dynamicRainProb}
                  subvalue="P(24h Rain > 200mm)"
                  icon={Droplets}
                  variant="high"
                  badge="P>200"
                />

                {/* 5. Population Exposure */}
                <RiskMetricCard 
                  label="Population Exposure"
                  value={dynamicPopExposure}
                  subvalue={dynamicPopSub}
                  icon={Users}
                  variant="severe"
                  badge="WORLDPOP"
                />

                {/* 6. Critical Infra Exposure */}
                <RiskMetricCard 
                  label="Critical Lifelines"
                  value={`${infrastructure.filter(i => (i.risk_score || 0) >= 70).length || (infrastructure.length > 0 ? infrastructure.length : "12")}`}
                  subvalue="Hospitals, Ports, Grids"
                  icon={Building2}
                  variant="severe"
                  badge="POSTGIS"
                />

                {/* 7. Impact Probability */}
                <RiskMetricCard 
                  label="Combined Impact P"
                  value={dynamicImpactProb}
                  subvalue={dynamicImpactSub}
                  icon={AlertOctagon}
                  variant="severe"
                  badge="P(COMB)"
                />

                {/* 8. Forecast Stability */}
                <RiskMetricCard 
                  label="Forecast Stability"
                  value={dynamicStability}
                  subvalue="High consensus (3 models)"
                  icon={CheckCircle2}
                  variant="moderate"
                  badge="STABLE"
                />
              </div>

              {/* Map + Right Intelligence Panel Split */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Center Geospatial Map with MapLibre GL JS */}
                <div className="flex-1 h-full min-h-[350px] relative">
                  <MapContainer 
                    eventId={event?.event_id || 'DEMO-TC-2026-ALPHA'}
                    selectedState={selectedState}
                    selectedDistrict={selectedDistrict}
                    trackData={trackData}
                    hotspots={riskData?.top_priority_zones}
                    infrastructure={infrastructure}
                    selectedZone={selectedZone}
                    selectedInfra={selectedInfra}
                    onSelectZone={(z) => setSelectedZone(z)}
                    onSelectInfrastructure={(infra) => setSelectedInfra(infra)}
                    onSelectAssetImpact={(asset) => {
                      if (asset) {
                        const matchedInfra = infrastructure.find(i => i.asset_id === asset.asset_id);
                        if (matchedInfra) setSelectedInfra(matchedInfra);
                      }
                    }}
                  />
                </div>

                {/* Right Context Intelligence Panel */}
                <ContextIntelligencePanel 
                  riskData={riskData}
                  aiExplanation={aiExplanation}
                  selectedZone={selectedZone}
                  selectedInfra={selectedInfra}
                  onOpenCopilot={() => setCopilotOpen(true)}
                  onSelectZone={(z) => setSelectedZone(z)}
                />
              </div>

              {/* Bottom Priority Zones Table */}
              <PriorityZonesTable 
                hotspots={riskData?.top_priority_zones}
                selectedZone={selectedZone}
                onSelectZone={(z) => setSelectedZone(z)}
              />
            </div>
          )}

          {activeTab === 'google-stack' && (
            <GoogleComplianceView />
          )}

          {activeTab === 'route-risk' && (
            <RouteRiskView />
          )}

          {activeTab === 'forecast-evolution' && (
            <ForecastEvolutionView />
          )}

          {activeTab === 'model-comparison' && (
            <ModelComparisonView />
          )}

          {activeTab === 'verification' && (
            <ForecastVerificationView />
          )}

          {activeTab === 'early-actions' && (
            <EarlyActionsView />
          )}

          {activeTab === 'cyclone-monitor' && (
            <CycloneMonitorView 
              trackData={trackData} 
              event={event} 
            />
          )}

          {activeTab === 'risk-analysis' && (
            <RiskAnalysisView 
              riskData={riskData} 
            />
          )}

          {activeTab === 'infrastructure' && (
            <InfrastructureView 
              infrastructure={infrastructure}
              onSelectAsset={(a) => {
                setSelectedInfra(a);
                setActiveTab('command-center');
              }}
            />
          )}

          {activeTab === 'scenario-simulator' && (
            <ScenarioSimulatorView />
          )}

          {activeTab === 'alerts' && (
            <AlertCenterView />
          )}

          {activeTab === 'ai-copilot' && (
            <div className="w-full h-full p-4 flex flex-col bg-[#050914] overflow-hidden">
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold font-mono text-slate-100">AI MULTIMODAL REASONING & EVIDENCE INSPECTOR</h2>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 uppercase">
                  {systemHealth?.subsystems?.gemini ? systemHealth.subsystems.gemini.toUpperCase() : 'GEMINI 3.8 FLASH ACTIVE'}
                </span>
              </div>
              <div className="flex-1 relative overflow-hidden rounded-lg border border-[#1e293b]">
                <AICopilotDrawer 
                  isOpen={true} 
                  onClose={() => setActiveTab('command-center')} 
                />
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <ReportsView />
          )}

          {activeTab === 'data-sources' && (
            <DataSourcesView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Floating Drawers */}
      <AICopilotDrawer 
        isOpen={copilotOpen} 
        onClose={() => setCopilotOpen(false)} 
        selectedZoneName={selectedZone?.name}
      />

      <DataHealthDrawer 
        isOpen={dataHealthOpen} 
        onClose={() => setDataHealthOpen(false)}
        healthData={dataHealthInfo}
      />

      <EvidenceDrawer 
        isOpen={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        selectedZone={selectedZone}
        selectedInfra={selectedInfra}
        ensembleData={ensembleData}
        isDemo={true}
      />

      <VoiceCommandModal 
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setVoiceModalOpen(false);
        }}
      />
    </div>
  );
}
