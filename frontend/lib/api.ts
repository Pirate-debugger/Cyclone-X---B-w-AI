import {
  CycloneEvent,
  TrackCollection,
  WeatherData,
  RiskOverview,
  HotspotZone,
  InfrastructureRiskAssessment,
  InfrastructureAsset,
  ScenarioComparison,
  ScenarioRunRequest,
  GeminiStructuredExplanation,
  Alert,
  IncidentReport,
  EnsembleAggregationResult,
  ForecastMember,
  LandfallSectorProbability,
  MultiModelConsensus,
  ForecastEvolutionRun,
  HazardFieldsOverview,
  AssetImpactProbability,
  PriorityActionsPayload,
  ForecastVerificationMetric,
  DataQualityReport
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'demo-operator-key';

export function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('cyclonex_api_key') || DEFAULT_API_KEY;
  }
  return DEFAULT_API_KEY;
}

export function setApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('cyclonex_api_key', key);
  }
}

async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const apiKey = getApiKey();
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error (${response.status}): ${errorText || response.statusText}`);
  }

  const json = await response.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// --- Baseline Endpoints ---
export async function getEvents(): Promise<CycloneEvent[]> {
  return fetchJson<CycloneEvent[]>('/api/events');
}

export async function getTrack(eventId = 'DEMO-TC-2026-ALPHA'): Promise<TrackCollection> {
  return fetchJson<TrackCollection>(`/api/weather/track?event_id=${eventId}`);
}

export async function getWeatherData(eventId = 'DEMO-TC-2026-ALPHA'): Promise<WeatherData> {
  return fetchJson<WeatherData>(`/api/weather?event_id=${eventId}`);
}

export async function getRiskOverview(eventId = 'DEMO-TC-2026-ALPHA'): Promise<RiskOverview> {
  return fetchJson<RiskOverview>(`/api/risk/overview?event_id=${eventId}`);
}

export async function getHotspots(eventId = 'DEMO-TC-2026-ALPHA'): Promise<HotspotZone[]> {
  return fetchJson<HotspotZone[]>(`/api/risk/hotspots?event_id=${eventId}`);
}

export async function getInfrastructureRisk(eventId = 'DEMO-TC-2026-ALPHA'): Promise<InfrastructureRiskAssessment[]> {
  return fetchJson<InfrastructureRiskAssessment[]>(`/api/infrastructure?event_id=${eventId}`);
}

export async function runScenario(request: ScenarioRunRequest): Promise<ScenarioComparison> {
  return fetchJson<ScenarioComparison>('/api/scenarios/run', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function askGeminiCopilot(query: string, eventId = 'DEMO-TC-2026-ALPHA'): Promise<GeminiStructuredExplanation> {
  return fetchJson<GeminiStructuredExplanation>('/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify({ query, event_id: eventId })
  });
}

export async function analyzeSatelliteImage(datasetName = 'Sentinel-1 SAR GRD'): Promise<any> {
  return fetchJson<any>('/api/ai/analyze-image', {
    method: 'POST',
    body: JSON.stringify({ dataset_name: datasetName })
  });
}


export async function getAlerts(): Promise<Alert[]> {
  return fetchJson<Alert[]>('/api/alerts');
}

export async function createAlertDraft(data: {
  event_id: string;
  title: string;
  urgency: string;
  target_area: string;
  action_notes: string;
}): Promise<Alert> {
  return fetchJson<Alert>('/api/alerts/draft', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function approveAlert(alertId: string): Promise<Alert> {
  return fetchJson<Alert>('/api/alerts/approve', {
    method: 'POST',
    body: JSON.stringify({ alert_id: alertId })
  });
}

export async function sendAlert(alertId: string): Promise<any> {
  return fetchJson<any>('/api/alerts/send', {
    method: 'POST',
    body: JSON.stringify({ alert_id: alertId })
  });
}

export async function generateReport(eventId = 'DEMO-TC-2026-ALPHA'): Promise<IncidentReport> {
  return fetchJson<IncidentReport>('/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId })
  });
}

export async function getSystemHealth(): Promise<any> {
  return fetchJson<any>('/api/health');
}

export async function getDataHealth(): Promise<any> {
  return fetchJson<any>('/api/data-health');
}

export async function getDataSources(): Promise<any> {
  return fetchJson<any>('/api/data-sources');
}

export function getReportDownloadUrl(reportId: string, format = 'pdf'): string {
  return `${API_BASE}/api/reports/${reportId}/export?format=${format}`;
}

// ==========================================
// V2 PROBABILISTIC DISASTER INTELLIGENCE APIs
// ==========================================

export async function getEnsembleAggregation(eventId = 'cyclone-alpha'): Promise<EnsembleAggregationResult> {
  return fetchJson<EnsembleAggregationResult>(`/api/ensemble/aggregation?event_id=${eventId}`);
}

export async function getEnsembleMembers(eventId = 'cyclone-alpha'): Promise<ForecastMember[]> {
  return fetchJson<ForecastMember[]>(`/api/ensemble/members?event_id=${eventId}`);
}

export async function getLandfallSectors(eventId = 'cyclone-alpha'): Promise<LandfallSectorProbability[]> {
  return fetchJson<LandfallSectorProbability[]>(`/api/ensemble/landfall-sectors?event_id=${eventId}`);
}

export async function getModelComparison(eventId = 'cyclone-alpha'): Promise<MultiModelConsensus> {
  return fetchJson<MultiModelConsensus>(`/api/forecast/comparison?event_id=${eventId}`);
}

export async function getForecastEvolution(eventId = 'cyclone-alpha'): Promise<any> {
  return fetchJson<any>(`/api/forecast/evolution?event_id=${eventId}`);
}

export async function getHazardsOverview(eventId = 'cyclone-alpha', leadHours = 48): Promise<HazardFieldsOverview> {
  return fetchJson<HazardFieldsOverview>(`/api/hazards/overview?event_id=${eventId}&lead_hours=${leadHours}`);
}

export async function getHazardsGeoJSON(eventId = 'cyclone-alpha'): Promise<any> {
  return fetchJson<any>(`/api/hazards/geojson?event_id=${eventId}`);
}

export async function getAssetImpacts(eventId = 'cyclone-alpha'): Promise<AssetImpactProbability[]> {
  return fetchJson<AssetImpactProbability[]>(`/api/impact/assets?event_id=${eventId}`);
}

export async function getCascadingNetwork(eventId = 'cyclone-alpha'): Promise<any> {
  return fetchJson<any>(`/api/impact/cascading-network?event_id=${eventId}`);
}

export async function getBacktestMetrics(eventId = 'hist-fani-2019'): Promise<any> {
  return fetchJson<any>(`/api/backtesting/metrics?event_id=${eventId}`);
}

export async function getPriorityActions(eventId = 'cyclone-alpha'): Promise<PriorityActionsPayload> {
  return fetchJson<PriorityActionsPayload>(`/api/actions/priority?event_id=${eventId}`);
}

export async function getDataQualityReport(eventId = 'cyclone-alpha'): Promise<DataQualityReport> {
  return fetchJson<DataQualityReport>(`/api/data-quality/report?event_id=${eventId}`);
}

export async function getFreshnessProviders(): Promise<any[]> {
  return fetchJson<any[]>('/api/freshness/providers');
}

export async function askCopilotV2(query: string, eventId = 'cyclone-alpha'): Promise<any> {
  return fetchJson<any>('/api/ai/copilot-v2', {
    method: 'POST',
    body: JSON.stringify({ query, event_id: eventId })
  });
}
