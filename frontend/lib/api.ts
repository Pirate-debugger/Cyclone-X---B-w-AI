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

const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('backend:8000')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // In the browser, always use relative path so Next.js rewrites proxy to backend
  if (typeof window !== 'undefined') {
    return '';
  }
  return (process.env.INTERNAL_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
};

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

async function fetchJson<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 20000, retryCount = 1): Promise<T> {
  const base = getApiBase();
  const url = `${base}${endpoint}`;
  const apiKey = getApiKey();
  const requestId = `client-${Math.random().toString(36).substring(2, 10)}`;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  headers.set('X-Request-ID', requestId);
  if (apiKey) {
    headers.set('X-API-Key', apiKey);
  }

  const isSafeGet = !options.method || options.method.toUpperCase() === 'GET';

  for (let attempt = 0; attempt <= (isSafeGet ? retryCount : 0); attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        let errorJson: any = null;
        try {
          errorJson = await response.json();
        } catch {
          // Non-JSON response
        }
        
        // Retry safe GET requests on 502/503/504 if attempts remain
        if (isSafeGet && [502, 503, 504].includes(response.status) && attempt < retryCount) {
          clearTimeout(timeoutId);
          await new Promise(r => setTimeout(r, 600));
          continue;
        }

        const message = errorJson?.error?.message || errorJson?.detail || response.statusText;
        const err: any = new Error(`API Error [${response.status}] on ${endpoint}: ${message}`);
        err.status = response.status;
        err.code = errorJson?.error?.code || `HTTP_${response.status}`;
        err.provider = errorJson?.error?.provider || 'CYCLONE-X API';
        err.requestId = errorJson?.error?.request_id || requestId;
        err.data = errorJson;
        throw err;
      }

      const json = await response.json();
      if (json && typeof json === 'object' && 'data' in json) {
        return json.data as T;
      }
      return json as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Request to ${endpoint} timed out after ${timeoutMs}ms (Request ID: ${requestId})`);
      }
      // Retry safe GET requests on network failures
      if (isSafeGet && attempt < retryCount && !err.status) {
        clearTimeout(timeoutId);
        await new Promise(r => setTimeout(r, 600));
        continue;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Failed to complete request to ${endpoint}`);
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
  return `${getApiBase()}/api/reports/${reportId}/export?format=${format}`;
}

// ==========================================
// V2 PROBABILISTIC DISASTER INTELLIGENCE APIs
// ==========================================

export async function getEnsembleAggregation(eventId = 'DEMO-TC-2026-ALPHA'): Promise<EnsembleAggregationResult> {
  return fetchJson<EnsembleAggregationResult>(`/api/ensemble/aggregation?event_id=${eventId}`);
}

export async function getEnsembleMembers(eventId = 'DEMO-TC-2026-ALPHA'): Promise<ForecastMember[]> {
  return fetchJson<ForecastMember[]>(`/api/ensemble/members?event_id=${eventId}`);
}

export async function getLandfallSectors(eventId = 'DEMO-TC-2026-ALPHA'): Promise<LandfallSectorProbability[]> {
  return fetchJson<LandfallSectorProbability[]>(`/api/ensemble/landfall-sectors?event_id=${eventId}`);
}

export async function getModelComparison(eventId = 'DEMO-TC-2026-ALPHA'): Promise<MultiModelConsensus> {
  return fetchJson<MultiModelConsensus>(`/api/forecast/comparison?event_id=${eventId}`);
}

export async function getForecastEvolution(eventId = 'DEMO-TC-2026-ALPHA'): Promise<any> {
  return fetchJson<any>(`/api/forecast/evolution?event_id=${eventId}`);
}

export async function getHazardsOverview(eventId = 'DEMO-TC-2026-ALPHA', leadHours = 48): Promise<HazardFieldsOverview> {
  return fetchJson<HazardFieldsOverview>(`/api/hazards/overview?event_id=${eventId}&lead_hours=${leadHours}`);
}

export async function getHazardsGeoJSON(eventId = 'DEMO-TC-2026-ALPHA'): Promise<any> {
  return fetchJson<any>(`/api/hazards/geojson?event_id=${eventId}`);
}

export async function getAssetImpacts(eventId = 'DEMO-TC-2026-ALPHA'): Promise<AssetImpactProbability[]> {
  return fetchJson<AssetImpactProbability[]>(`/api/impact/assets?event_id=${eventId}`);
}

export async function getCascadingNetwork(eventId = 'DEMO-TC-2026-ALPHA'): Promise<any> {
  return fetchJson<any>(`/api/impact/cascading-network?event_id=${eventId}`);
}

export async function getBacktestMetrics(eventId = 'hist-fani-2019'): Promise<any> {
  return fetchJson<any>(`/api/backtesting/metrics?event_id=${eventId}`);
}

export async function getPriorityActions(eventId = 'DEMO-TC-2026-ALPHA'): Promise<PriorityActionsPayload> {
  return fetchJson<PriorityActionsPayload>(`/api/actions/priority?event_id=${eventId}`);
}

export async function getDataQualityReport(eventId = 'DEMO-TC-2026-ALPHA'): Promise<DataQualityReport> {
  return fetchJson<DataQualityReport>(`/api/data-quality/report?event_id=${eventId}`);
}

export async function getFreshnessProviders(): Promise<any[]> {
  return fetchJson<any[]>('/api/freshness/providers');
}

export async function askCopilotV2(query: string, eventId = 'DEMO-TC-2026-ALPHA'): Promise<any> {
  return fetchJson<any>('/api/ai/copilot-v2', {
    method: 'POST',
    body: JSON.stringify({ query, event_id: eventId })
  });
}

export async function getGoogleCompliance(): Promise<any> {
  return fetchJson<any>('/api/system/google-compliance');
}

export async function getOfficialIMDBulletin(eventId = 'DEMO-TC-2026-ALPHA'): Promise<any> {
  return fetchJson<any>(`/api/v2/imd/official-bulletin?event_id=${eventId}`);
}

export async function getRouteRisk(params: {
  origin_lat?: number;
  origin_lon?: number;
  dest_lat?: number;
  dest_lon?: number;
  origin_name?: string;
  dest_name?: string;
} = {}): Promise<any> {
  return fetchJson<any>('/api/v2/routes/risk', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}

export async function getVertexPredict(features: any): Promise<any> {
  return fetchJson<any>('/api/v2/vertex/predict', {
    method: 'POST',
    body: JSON.stringify(features)
  });
}

export async function getVertexPipelineStatus(): Promise<any> {
  return fetchJson<any>('/api/v2/vertex/pipeline-status');
}

export async function getBigQueryOverview(): Promise<any> {
  return fetchJson<any>('/api/v2/bigquery/overview');
}

export async function getBhuvanDatasets(): Promise<any> {
  return fetchJson<any>('/api/v2/bhuvan/datasets');
}

export async function sendVoiceCommand(
  transcript: string,
  languageCode = 'en-IN',
  isDemo = false,
  demoCommand?: string
): Promise<any> {
  return fetchJson<any>('/api/v2/voice/command', {
    method: 'POST',
    body: JSON.stringify({
      transcript,
      language_code: languageCode,
      is_demo: isDemo,
      demo_command: demoCommand
    })
  });
}

export async function translateAdvisory(payload: {
  source_advisory_id: string;
  english_title: string;
  english_body: string;
  target_language: string;
}): Promise<any> {
  return fetchJson<any>('/api/v2/alerts/translate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getMode(): Promise<{ app_mode: string; is_demo: boolean; message: string }> {
  return fetchJson<{ app_mode: string; is_demo: boolean; message: string }>('/api/mode');
}
