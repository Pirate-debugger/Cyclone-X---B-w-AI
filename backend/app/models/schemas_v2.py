from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# Enterprise Data Classification Layers (Section 5)
class DataClassification(str, Enum):
    OBSERVATION = "OBSERVATION"
    FORECAST = "FORECAST"
    ENSEMBLE = "ENSEMBLE"
    HISTORICAL = "HISTORICAL"
    MODEL_OUTPUT = "MODEL_OUTPUT"
    SCENARIO = "SCENARIO"
    AI_INTERPRETATION = "AI_INTERPRETATION"
    OFFICIAL_ADVISORY = "OFFICIAL_ADVISORY"
    DEMO = "DEMO"

class FreshnessState(str, Enum):
    REAL_TIME = "REAL_TIME"
    FRESH = "FRESH"
    AGING = "AGING"
    STALE = "STALE"
    EXPIRED = "EXPIRED"
    UNAVAILABLE = "UNAVAILABLE"

class RiskBand(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"

class ModelProvider(str, Enum):
    WEATHERNEXT_3 = "WeatherNext 3"
    WEATHERNEXT_CYCLONES = "WeatherNext Cyclones"
    ECMWF_IFS = "ECMWF IFS 0.25°"
    OFFICIAL_IMD = "Official IMD / RSMC"
    CONSENSUS = "Multi-Model Consensus"

# 1. Ensemble Modeling Schemas
class ForecastMember(BaseModel):
    member_id: str
    model: str
    initialization_time: str
    valid_time: str
    lead_hours: int
    latitude: float
    longitude: float
    max_wind_kmh: float
    central_pressure_hpa: float
    r34_km: Optional[float] = 120.0
    r50_km: Optional[float] = 60.0
    r64_km: Optional[float] = 30.0
    source: str = "WeatherNext Ensemble"
    classification: DataClassification = DataClassification.ENSEMBLE

class PercentileCurve(BaseModel):
    lead_hours: int
    valid_time: str
    p10: float
    p25: float
    p50: float
    p75: float
    p90: float
    mean: float
    spread: float

class LandfallSectorProbability(BaseModel):
    sector_id: str
    name: str
    state_district: str
    coastline_geojson: Dict[str, Any]
    probability_pct: float
    earliest_arrival_time: str
    most_likely_arrival_time: str
    expected_intensity_band: str
    peak_wind_p50_kmh: float

class EnsembleAggregationResult(BaseModel):
    ensemble_id: str
    model_name: str
    initialization_time: str
    member_count: int
    mean_track: List[Dict[str, Any]]
    median_track: List[Dict[str, Any]]
    consensus_track: List[Dict[str, Any]]
    wind_percentiles: List[PercentileCurve]
    pressure_percentiles: List[PercentileCurve]
    landfall_sectors: List[LandfallSectorProbability]
    track_density_geojson: Dict[str, Any]
    along_track_spread_km: float
    cross_track_spread_km: float
    forecast_confidence_pct: float
    primary_divergence_notes: str
    classification: DataClassification = DataClassification.ENSEMBLE

# 2. Forecast Evolution & Comparison Schemas
class ForecastRunComparison(BaseModel):
    current_run_id: str
    previous_run_id: str
    model: str
    track_shift_km: float
    track_shift_direction: str
    intensity_revision_kmh: float
    landfall_time_shift_hours: float
    high_risk_area_change_pct: float
    key_changes_summary: str

class ModelComparisonEntry(BaseModel):
    model_name: str
    track_geojson: Dict[str, Any]
    intensity_max_kmh: float
    landfall_window: str
    spread_km: float
    freshness_minutes: int
    data_quality_pct: float
    historical_24h_error_km: Optional[float] = None
    historical_48h_error_km: Optional[float] = None

class MultiModelConsensus(BaseModel):
    initialization_time: str
    models_evaluated: List[str]
    model_entries: List[ModelComparisonEntry]
    consensus_track: List[Dict[str, Any]]
    inter_model_track_spread_km: float
    inter_model_intensity_spread_kmh: float
    confidence_assessment: str
    classification: DataClassification = DataClassification.MODEL_OUTPUT

# 3. Gridded Spatial Hazard Fields & Probabilities
class RainfallExceedanceProbability(BaseModel):
    lead_hours: int
    p_exceed_50mm: float
    p_exceed_100mm: float
    p_exceed_200mm: float
    p_exceed_300mm: float
    peak_accumulation_p50_mm: float
    peak_accumulation_p90_mm: float

class InundationDecomposition(BaseModel):
    astronomical_tide_m: float
    storm_surge_proxy_m: float
    wave_setup_m: float
    total_water_level_m: float
    official_hydrodynamic_available: bool = False
    satellite_observed_water_change_detected: bool = True
    disclaimer: str = "Tide + proxy surge + wave setup decomposition; prototype decision-support output."

class HazardFieldsOverview(BaseModel):
    event_id: str
    forecast_time: str
    wind_field_type: str = "GRID_FORECAST"  # GRID_FORECAST vs PARAMETRIC_PROXY
    wind_grid_summary: Dict[str, Any]
    rainfall_exceedances: List[RainfallExceedanceProbability]
    inundation_components: InundationDecomposition
    classification: DataClassification = DataClassification.MODEL_OUTPUT

# 4. Probabilistic Asset Impact & Cascading Network
class AssetImpactProbability(BaseModel):
    asset_id: str
    name: str
    type: str
    criticality: int
    elevation_m: float
    coastal_distance_km: float
    p_wind_exceedance: float
    p_rain_exceedance: float
    p_inundation_exceedance: float
    p_combined_impact: float
    backup_power: str
    flood_protection: str
    road_access_status: str
    cascading_risk_flag: bool
    cascading_details: Optional[str] = None
    data_quality_pct: float
    expected_downtime_hours: Optional[float] = None

class CascadingImpactNode(BaseModel):
    node_id: str
    name: str
    type: str
    status: str
    dependency_ids: List[str]
    impacted_services: List[str]
    cascading_probability: float

# 5. Verification & Backtesting Schemas
class ForecastVerificationMetric(BaseModel):
    event_id: str
    storm_name: str
    year: int
    basin: str
    model_name: str
    track_error_24h_km: float
    track_error_48h_km: float
    track_error_72h_km: float
    intensity_mae_kmh: float
    pressure_mae_hpa: float
    landfall_time_error_hrs: float
    landfall_location_error_km: float
    brier_score_wind_exceedance: float
    crps_intensity: float
    reliability_index: float

# 6. Decoupled Data Quality & Dynamic Freshness
class DataQualityReport(BaseModel):
    overall_quality_score: float
    completeness: float
    freshness: float
    coverage: float
    resolution: float
    consistency: float
    source_reliability: float
    temporal_alignment: float
    limiting_factors: List[str]

class ProviderFreshnessDetail(BaseModel):
    provider_name: str
    dataset: str
    status: str
    freshness_state: FreshnessState
    last_retrieved_iso: str
    elapsed_minutes: int
    latency_ms: int
    access_tier: str

# 7. Official IMD Cyclone Ingestion Schemas (Section 12)
class OfficialForecastPoint(BaseModel):
    valid_time: str
    lead_hours: int
    latitude: float
    longitude: float
    max_sustained_wind_kmh: float
    max_gust_kmh: float
    central_pressure_hpa: float
    stage: str
    r34_radius_km: float = 120.0
    r50_radius_km: float = 60.0

class OfficialForecastRun(BaseModel):
    event_id: str
    cyclone_name: str
    bulletin_number: int
    bulletin_time: str
    next_bulletin_time: str
    warning_status: str
    advisory_text: str
    observed_lat: float
    observed_lon: float
    current_intensity_kmh: float
    central_pressure_hpa: float
    estimated_landfall_sector: str
    estimated_landfall_time: str
    forecast_points: List[OfficialForecastPoint]
    official_source: str = "India Meteorological Department (RSMC New Delhi)"
    official_source_url: str = "https://mausam.imd.gov.in/cyclone"
    classification: DataClassification = DataClassification.OFFICIAL_ADVISORY
    disclaimer: str = "OFFICIAL IMD GOVERNMENT WARNING. Legally authoritative civil defense forecast."

# 8. Route Risk Intelligence Schemas (Sections 8 & 37)
class RouteRiskIntersection(BaseModel):
    location_name: str
    latitude: float
    longitude: float
    risk_factor: str
    hazard_severity: str
    modeled_water_depth_m: Optional[float] = None
    wind_gust_kmh: Optional[float] = None

class RouteRiskAssessment(BaseModel):
    route_id: str
    origin_name: str
    destination_name: str
    origin_coords: List[float]
    destination_coords: List[float]
    distance_km: float
    duration_minutes: float
    overall_risk_band: RiskBand
    route_exposure_score: float
    high_risk_intersections: List[RouteRiskIntersection]
    critical_bridges_crossed: List[Dict[str, Any]]
    alternative_route_available: bool
    alternative_route_notes: Optional[str] = None
    route_geojson: Dict[str, Any]
    disclaimer: str = "Route intersects modeled high-risk area. Not an official road closure notice unless verified by civil authorities."
    classification: DataClassification = DataClassification.MODEL_OUTPUT

# 9. Vertex AI Predictive Impact Model Schemas (Sections 15-18)
class VertexFeatureVector(BaseModel):
    wind_forecast_kmh: float
    wind_percentile_p90: float
    rainfall_24h_mm: float
    rainfall_percentile_p90: float
    inundation_proxy_m: float
    elevation_m: float
    distance_to_coast_km: float
    land_cover: str
    population_density_per_sqkm: float
    infrastructure_type: str
    asset_criticality: int
    road_accessibility_score: float
    historical_flood_frequency: float
    forecast_lead_time_hours: int
    model_disagreement_km: float
    forecast_run_stability: float

class VertexPredictionResult(BaseModel):
    model_name: str = "CYCLONE-X Impact Intelligence Model"
    model_version: str = "v3.0.0-vertex-prod"
    model_endpoint: str
    serving_mode: str  # "VERTEX_ENDPOINT", "LOCAL_BASELINE", "DEMO"
    prediction_timestamp: str
    input_run_id: str
    p_wind_impact: float
    p_rain_impact: float
    p_flood_impact: float
    p_service_disruption: float
    p_combined_impact: float
    confidence_interval: Optional[Dict[str, float]] = None
    metrics_evaluated: Optional[Dict[str, float]] = None
    classification: DataClassification = DataClassification.MODEL_OUTPUT

# 10. Multilingual Advisory Workflow Schemas (Section 25)
class MultilingualAdvisory(BaseModel):
    advisory_id: str
    source_advisory_id: str
    source_language: str
    target_language: str
    target_language_name: str
    translated_title: str
    translated_advisory_body: str
    key_action_directives: List[str]
    translation_engine: str = "Google Cloud Translation API v3"
    translation_timestamp: str
    human_reviewed: bool = False
    reviewer_id: Optional[str] = None
    approval_state: str = "DRAFT"  # "DRAFT", "EVIDENCE_REVIEWED", "APPROVED", "DISPATCHED"
    classification: DataClassification = DataClassification.OFFICIAL_ADVISORY
