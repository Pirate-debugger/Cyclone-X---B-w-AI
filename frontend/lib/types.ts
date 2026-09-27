export type DataClassification = 
  | 'OBSERVATION'
  | 'FORECAST'
  | 'ENSEMBLE'
  | 'HISTORICAL'
  | 'MODEL_OUTPUT'
  | 'SCENARIO'
  | 'AI_INTERPRETATION'
  | 'OFFICIAL_ADVISORY'
  | 'DEMO';

export type RiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export type InfrastructureType = 
  | 'hospital'
  | 'primary_health_centre'
  | 'power_station'
  | 'electricity_substation'
  | 'substation'
  | 'major_road'
  | 'road'
  | 'bridge'
  | 'railway'
  | 'rail'
  | 'airport'
  | 'port'
  | 'shelter'
  | 'emergency_shelter'
  | 'water'
  | 'water_facility'
  | 'telecom'
  | 'communication_facility'
  | 'government'
  | 'government_facility';

export interface CycloneEvent {
  event_id: string;
  name: string;
  basin: string;
  category: string;
  current_lat: number;
  current_lon: number;
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

export interface WeatherStation {
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
  stations: WeatherStation[];
}

export interface ConfidenceFactor {
  name: string;
  weight: number;
  status: 'optimal' | 'acceptable' | 'degraded' | 'unavailable';
  contribution: number;
  details: string;
}

export interface ConfidenceBreakdown {
  score: number;
  level: string;
  explanation: string;
  factors: ConfidenceFactor[];
  limiting_factors?: string[];
  data_completeness?: number;
  source_freshness?: number;
  temporal_consistency?: number;
  spatial_coverage?: number;
}

export interface HotspotZone {
  zone_id: string;
  name: string;
  administrative_area?: string;
  geometry: any;
  center_lat?: number;
  center_lon?: number;
  risk_score: number;
  risk_band: RiskBand;
  hazard_score: number;
  exposure_score: number;
  vulnerability_score: number;
  top_hazard: string;
  population_estimate: number;
  critical_assets_count: number;
  suggested_action: string;
}

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: InfrastructureType;
  criticality: number;
  elevation_m: number;
  distance_to_coast_km: number;
  backup_power: string;
  geometry: any;
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
  geometry: any;
  nearest_shelter_or_backup?: string;
}

export interface PopulationExposure {
  total_exposed: number;
  by_tier: {
    low: number;
    moderate: number;
    high: number;
    severe: number;
  };
  vulnerable_demographics: {
    children_under_5: number;
    elderly_over_65: number;
    low_income_households: number;
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
    data_type: string;
    primary_threat_window: string;
    closest_approach_time: string;
    closest_approach_area: string;
  };
  confidence_breakdown: ConfidenceBreakdown;
  population_exposure: PopulationExposure;
  top_priority_zones: HotspotZone[];
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
  parameters: any;
  baseline: MetricComparison;
  simulated: MetricComparison;
  delta: {
    overall_risk_delta: number;
    severe_hotspots_delta: number;
    critical_assets_delta: number;
    population_exposed_pct_change: number;
    access_connectivity_delta?: string;
    high_risk_area_delta_sqkm?: number;
  };
  changed_hotspots: HotspotZone[];
  disclaimer: string;
}

export interface ScenarioRunRequest {
  event_id?: string;
  wind_multiplier: number;
  rain_multiplier: number;
  surge_scenario_m: number;
  track_shift_km?: number;
  track_offset_km?: number;
  landfall_shift_hours?: number;
  intensity_perturbation_pct?: number;
  rainfall_perturbation_pct?: number;
  shelter_availability_pct?: number;
  bridge_closure?: boolean;
  power_loss?: boolean;
  notes?: string;
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
  urgency: 'ROUTINE' | 'WATCH' | 'WARNING' | 'URGENT';
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'SENT';
  workflow_step: 'DRAFT' | 'REVIEW' | 'APPROVE' | 'SEND';
  created_at: string;
  author: string;
  reviewer?: string;
  approved_at?: string;
  target_area: string;
  translations: {
    en: AlertTranslation;
    hi?: AlertTranslation;
    or?: AlertTranslation;
    te?: AlertTranslation;
    bn?: AlertTranslation;
  };
  action_notes?: string;
  delivery_channel: string;
  delivery_status: string;
  audit_trail: Array<{
    action: string;
    user: string;
    timestamp: string;
    result?: string;
  }>;
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

export interface SatelliteImageAnalysisResponse {
  dataset: string;
  observed_features: string[];
  possible_inundation_zones: string[];
  unknown_or_cloud_obscured: string[];
  confidence_assessment: string;
  disclaimer: string;
}

// ==========================================
// V2 ENTERPRISE PROBABILISTIC TYPES
// ==========================================

export interface ForecastMember {
  member_id: string;
  model: string;
  initialization_time: string;
  valid_time: string;
  lead_hours: number;
  latitude: number;
  longitude: number;
  max_wind_kmh: number;
  central_pressure_hpa: number;
  r34_km?: number;
  r50_km?: number;
  r64_km?: number;
  points?: Array<{ latitude: number; longitude: number; step_hours?: number; wind_speed_kmh?: number }>;
  source: string;
  classification: string;
}

export interface PercentileCurve {
  lead_hours: number;
  valid_time: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  mean: number;
  spread: number;
}

export interface LandfallSectorProbability {
  sector_id: string;
  name: string;
  sector_name?: string;
  state_district: string;
  coastline_geojson: any;
  probability_pct: number;
  earliest_arrival_time: string;
  most_likely_arrival_time: string;
  expected_intensity_band: string;
  peak_wind_p50_kmh: number;
}

export interface EnsembleAggregationResult {
  ensemble_id: string;
  model_name: string;
  initialization_time: string;
  member_count: number;
  mean_track: Array<{ lead_hours: number; latitude: number; longitude: number; mean_wind: number; mean_pressure: number }>;
  median_track: Array<{ lead_hours: number; latitude: number; longitude: number }>;
  consensus_track: Array<{ lead_hours: number; latitude: number; longitude: number }>;
  wind_percentiles: PercentileCurve[];
  pressure_percentiles: PercentileCurve[];
  landfall_sectors: LandfallSectorProbability[];
  track_density_geojson: any;
  along_track_spread_km: number;
  cross_track_spread_km: number;
  forecast_confidence_pct: number;
  prob_wind_exceed_100kmh?: number;
  landfall_probability_pct?: number;
  consensus_confidence_pct?: number;
  primary_divergence_notes: string;
  classification: string;
}

export interface ModelComparisonEntry {
  model_name: string;
  track_geojson: any;
  intensity_max_kmh: number;
  landfall_window: string;
  spread_km: number;
  freshness_minutes: number;
  data_quality_pct: number;
  historical_24h_error_km: number;
  historical_48h_error_km: number;
}

export interface MultiModelConsensus {
  initialization_time: string;
  models_evaluated: string[];
  model_entries: ModelComparisonEntry[];
  consensus_track: Array<{ lead_hours: number; lat: number; lon: number; max_wind_kmh: number; central_pressure_hpa: number; model_spread_km: number }>;
  inter_model_track_spread_km: number;
  inter_model_intensity_spread_kmh: number;
  confidence_assessment: string;
  classification: string;
}

export interface ForecastEvolutionRun {
  run_id: string;
  cycle: string;
  init_time: string;
  landfall_sector: string;
  landfall_lat: number;
  landfall_lon: number;
  peak_wind_kmh: number;
  central_pressure_hpa: number;
  impact_area_sqkm: number;
}

export interface ForecastRunComparison {
  current_run_id: string;
  previous_run_id: string;
  model: string;
  track_shift_km: number;
  track_shift_direction: string;
  intensity_revision_kmh: number;
  landfall_time_shift_hours: number;
  high_risk_area_change_pct: number;
  key_changes_summary: string;
}

export interface RainfallExceedanceProbability {
  lead_hours: number;
  p_exceed_50mm: number;
  p_exceed_100mm: number;
  p_exceed_200mm: number;
  p_exceed_300mm: number;
  peak_accumulation_p50_mm: number;
  peak_accumulation_p90_mm: number;
}

export interface InundationDecomposition {
  astronomical_tide_m: number;
  storm_surge_proxy_m: number;
  wave_setup_m: number;
  total_water_level_m: number;
  official_hydrodynamic_available: boolean;
  satellite_observed_water_change_detected: boolean;
  disclaimer: string;
}

export interface HazardFieldsOverview {
  event_id: string;
  forecast_time: string;
  wind_field_type: string;
  wind_grid_summary: any;
  rainfall_exceedances: RainfallExceedanceProbability[];
  inundation_components: InundationDecomposition;
  classification: string;
}

export interface AssetImpactProbability {
  asset_id: string;
  name: string;
  asset_name?: string;
  type: string;
  criticality: number;
  elevation_m: number;
  coastal_distance_km: number;
  p_wind_exceedance: number;
  p_rain_exceedance: number;
  p_inundation_exceedance: number;
  p_combined_impact: number;
  backup_power: string;
  flood_protection: string;
  road_access_status: string;
  cascading_risk_flag: boolean;
  cascading_details?: string;
  data_quality_pct: number;
  expected_downtime_hours: number;
}

export interface PriorityActionItem {
  action_id: string;
  title: string;
  target_asset_or_zone: string;
  urgency: 'IMMEDIATE' | 'HIGH_PRIORITY' | 'MONITOR';
  impact_probability: number;
  time_to_impact_hours: number;
  action_summary: string;
  responsible_authority: string;
  review_status: string;
}

export interface PriorityActionsPayload {
  event_id: string;
  generated_at: string;
  priority_actions: PriorityActionItem[];
  classification: string;
}

export interface ForecastVerificationMetric {
  event_id: string;
  storm_name: string;
  year: number;
  basin: string;
  model_name: string;
  track_error_24h_km: number;
  track_error_48h_km: number;
  track_error_72h_km: number;
  intensity_mae_kmh: number;
  pressure_mae_hpa: number;
  landfall_time_error_hrs: number;
  landfall_location_error_km: number;
  brier_score_wind_exceedance: number;
  crps_intensity: number;
  reliability_index: number;
}

export interface DataQualityReport {
  overall_quality_score: number;
  completeness: number;
  freshness: number;
  coverage: number;
  resolution: number;
  consistency: number;
  source_reliability: number;
  temporal_alignment: number;
  limiting_factors: string[];
}


