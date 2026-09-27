export type DataClassification = 
  | 'OBSERVATION'
  | 'FORECAST'
  | 'HISTORICAL'
  | 'MODEL_OUTPUT'
  | 'SCENARIO'
  | 'AI_INTERPRETATION'
  | 'DEMO DATA';

export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export type InfrastructureType = 
  | 'hospital'
  | 'primary_health_centre'
  | 'power_station'
  | 'electricity_substation'
  | 'major_road'
  | 'bridge'
  | 'railway'
  | 'airport'
  | 'emergency_shelter'
  | 'water_facility'
  | 'communication_facility'
  | 'government_facility';

export interface CycloneEvent {
  event_id: string;
  name: string;
  basin: string;
  category: string;
  current_lat: float;
  current_lon: float;
  max_sustained_wind_kmh: number;
  max_gust_kmh: number;
  central_pressure_hpa: number;
  movement_direction: string;
  movement_speed_kmh: number;
  status: string;
  data_classification: DataClassification;
  source: string;
  timestamp: string;
  forecast_horizon: string;
  estimated_landfall_time?: string;
  estimated_landfall_location?: string;
  notes?: string;
}

export type float = number;

export interface BestTrackPoint {
  point_id: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  wind_speed_kmh: number;
  gust_kmh: number;
  central_pressure_hpa: number;
  category: string;
  data_type: DataClassification;
  source: string;
}

export interface ForecastTrackPoint {
  point_id: string;
  step_hours: number;
  timestamp: string;
  latitude: number;
  longitude: number;
  wind_speed_kmh: number;
  gust_kmh: number;
  central_pressure_hpa: number;
  category: string;
  cone_radius_km: number;
  movement_dir: string;
  movement_speed_kmh: number;
  data_type: DataClassification;
  source: string;
}

export interface TrackCollection {
  event_id: string;
  name: string;
  issue_time: string;
  source: string;
  data_classification: string;
  disclaimer: string;
  observed_track: BestTrackPoint[];
  forecast_track: ForecastTrackPoint[];
}

export interface HourlyWeather {
  timestamp: string;
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  wind_direction_deg: number;
  precipitation_mm: number;
  pressure_hpa: number;
  temperature_c: number;
  relative_humidity_pct: number;
}

export interface StationWeather {
  station_id: string;
  name: string;
  latitude: number;
  longitude: number;
  hourly: HourlyWeather[];
}

export interface WeatherData {
  event_id: string;
  source: string;
  retrieved_at: string;
  valid_until: string;
  freshness: string;
  confidence: number;
  stations: StationWeather[];
}

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: InfrastructureType;
  criticality: number;
  capacity?: number;
  administrative_area: string;
  elevation_m: number;
  distance_to_coast_km: number;
  geometry: {
    type: string;
    coordinates: any;
  };
  source: string;
  data_classification: string;
  last_verified: string;
}

export interface InfrastructureRiskAssessment {
  asset_id: string;
  name: string;
  type: InfrastructureType;
  criticality: number;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  risk_score: number;
  risk_band: RiskBand;
  primary_threat: string;
  elevation_m: number;
  distance_to_coast_km: number;
  geometry: {
    type: string;
    coordinates: any;
  };
  nearest_shelter_or_backup?: string;
}

export interface HotspotZone {
  zone_id: string;
  name: string;
  administrative_area: string;
  risk_score: number;
  risk_band: RiskBand;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  top_hazard: string;
  critical_assets_count: number;
  exposed_assets: string[];
  population_estimate: number;
  suggested_action: string;
  geometry: {
    type: string;
    coordinates: any;
  };
}

export interface ConfidenceBreakdown {
  score: number;
  data_completeness: number;
  source_freshness: number;
  temporal_consistency: number;
  spatial_coverage: number;
  limiting_factors: string[];
}

export interface PopulationExposure {
  total_exposed: number;
  dataset: string;
  note: string;
  by_tier: {
    low: number;
    moderate: number;
    high: number;
    severe: number;
  };
}

export interface RiskOverview {
  event_id: string;
  model_version: string;
  disclaimer: string;
  data_classification: string;
  calculated_at: string;
  weights: {
    hazard: number;
    exposure: number;
    vulnerability: number;
  };
  overall_metrics: {
    overall_risk_score: number;
    risk_band: string;
    hazard_score: number;
    exposure_score: number;
    vulnerability_score: number;
    confidence_score: number;
    primary_threat_window: string;
    closest_approach_time: string;
    closest_approach_area: string;
  };
  confidence_breakdown: ConfidenceBreakdown;
  population_exposure: PopulationExposure;
  top_priority_zones: HotspotZone[];
}

export interface ScenarioRunRequest {
  event_id?: string;
  wind_multiplier: number;
  rain_multiplier: number;
  surge_scenario_m: number;
  track_shift_km: number;
  landfall_shift_hours: number;
}

export interface MetricComparison {
  overall_risk: number;
  hazard_score: number;
  exposure_score: number;
  severe_hotspots_count: number;
  critical_assets_at_severe_risk: number;
  total_population_at_severe_risk: number;
}

export interface ScenarioComparison {
  scenario_id: string;
  timestamp: string;
  parameters: Record<string, any>;
  baseline: MetricComparison;
  simulated: MetricComparison;
  delta: {
    overall_risk_delta: number;
    severe_hotspots_delta: number;
    critical_assets_delta: number;
    population_exposed_pct_change: number;
  };
  changed_hotspots: HotspotZone[];
  disclaimer: string;
}

export interface GeminiStructuredExplanation {
  summary: string;
  risk_level: string;
  risk_score: number;
  confidence: number;
  primary_drivers: string[];
  affected_assets: string[];
  affected_population: number;
  recommended_actions: string[];
  uncertainties: string[];
  data_sources: string[];
  human_review_required: boolean;
  ai_status: string;
}

export interface AlertTranslation {
  title: string;
  body: string;
}

export interface Alert {
  id: string;
  event_id: string;
  type: string;
  title: string;
  urgency: string;
  status: string;
  workflow_step: string;
  created_at: string;
  author: string;
  reviewer?: string;
  approved_at?: string;
  target_area: string;
  disclaimer: string;
  translations: Record<string, AlertTranslation>;
  delivery_channel: string;
  delivery_status: string;
  audit_trail: Array<{ action: string; user: string; timestamp: string }>;
}

export interface IncidentReport {
  report_id: string;
  title: string;
  generated_at: string;
  event_id: string;
  executive_summary: string;
  threat_window: string;
  closest_approach: string;
  overall_risk: number;
  hazard_score: number;
  top_priority_zones: HotspotZone[];
  critical_infrastructure: InfrastructureRiskAssessment[];
  population_summary: PopulationExposure;
  uncertainties: string[];
  data_provenance: Array<{ component: string; source: string; freshness: string }>;
  disclaimer: string;
}
