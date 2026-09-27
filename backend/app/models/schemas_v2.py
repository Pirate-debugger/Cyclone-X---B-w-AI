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
