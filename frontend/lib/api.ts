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
  IncidentReport
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const DEFAULT_API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'cb1_3zqt_1_dc5d1212b00788ce3409d182';

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

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': getApiKey(),
        ...(options?.headers || {})
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  } catch (err) {
    console.warn(`Fetch to ${endpoint} failed, checking demo fallback...`, err);
    throw err;
  }
}

export async function getEvents(): Promise<CycloneEvent[]> {
  return fetchJson<CycloneEvent[]>('/api/events');
}

export async function getTrack(eventId: string): Promise<TrackCollection> {
  return fetchJson<TrackCollection>(`/api/events/${eventId}/track`);
}

export async function getWeather(lat = 19.813, lon = 85.831): Promise<WeatherData> {
  return fetchJson<WeatherData>(`/api/weather?latitude=${lat}&longitude=${lon}`);
}

export async function getRiskOverview(): Promise<RiskOverview> {
  return fetchJson<RiskOverview>('/api/risk');
}

export async function getHotspots(): Promise<{ type: string; features: any[] }> {
  return fetchJson<{ type: string; features: any[] }>('/api/risk/hotspots');
}

export async function getInfrastructureRisk(): Promise<InfrastructureRiskAssessment[]> {
  return fetchJson<InfrastructureRiskAssessment[]>('/api/risk/infrastructure');
}

export async function getInfrastructureAssets(): Promise<InfrastructureAsset[]> {
  return fetchJson<InfrastructureAsset[]>('/api/infrastructure');
}

export async function runScenario(req: ScenarioRunRequest): Promise<ScenarioComparison> {
  return fetchJson<ScenarioComparison>('/api/scenarios/run', {
    method: 'POST',
    body: JSON.stringify(req)
  });
}

export async function askGeminiCopilot(query: string, eventId = 'DEMO-TC-2026-ALPHA'): Promise<GeminiStructuredExplanation> {
  return fetchJson<GeminiStructuredExplanation>('/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify({ query, event_id: eventId })
  });
}

export async function analyzeSatelliteImage(dataset = 'Sentinel-1 SAR GRD'): Promise<any> {
  return fetchJson<any>('/api/ai/analyze-image', {
    method: 'POST',
    body: JSON.stringify({ dataset_name: dataset })
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
