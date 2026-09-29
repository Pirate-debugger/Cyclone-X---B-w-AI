from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

# Core Scientific Distinction Classification
class DataClassification(str, Enum):
    OBSERVATION = "OBSERVATION"
    FORECAST = "FORECAST"
    HISTORICAL = "HISTORICAL"
    MODEL_OUTPUT = "MODEL_OUTPUT"
    SCENARIO = "SCENARIO"
    AI_INTERPRETATION = "AI_INTERPRETATION"
    DEMO_DATA = "DEMO DATA"

class RiskBand(str, Enum):
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"
    SEVERE = "SEVERE"

class InfrastructureType(str, Enum):
    HOSPITAL = "hospital"
    PRIMARY_HEALTH_CENTRE = "primary_health_centre"
    PHC = "PHC"
    POWER_STATION = "power_station"
    POWER = "power"
    ELECTRICITY_SUBSTATION = "electricity_substation"
    SUBSTATION = "substation"
    MAJOR_ROAD = "major_road"
    ROAD = "road"
    BRIDGE = "bridge"
    RAILWAY = "railway"
    AIRPORT = "airport"
    EMERGENCY_SHELTER = "emergency_shelter"
    SHELTER = "shelter"
    WATER_FACILITY = "water_facility"
    WATER = "water"
    COMMUNICATION_FACILITY = "communication_facility"
    TELECOM = "telecom"
    GOVERNMENT_FACILITY = "government_facility"
    GOVERNMENT = "government"
    PORT = "port"

# Standard API Envelope
class ResponseMeta(BaseModel):
    source: str = "CYCLONE-X Data Engine"
    retrieved_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat() + "Z")
    valid_until: Optional[str] = None
    freshness: str = "LIVE"
    confidence: float = 85.0
    data_classification: DataClassification = DataClassification.MODEL_OUTPUT
    disclaimer: str = "Prototype decision-support output — not an official warning."

class APIResponse(BaseModel):
    success: bool = True
    data: Any
    meta: ResponseMeta = Field(default_factory=ResponseMeta)
    error: Optional[Dict[str, Any]] = None

# Cyclone & Track Models
class CycloneEvent(BaseModel):
    event_id: str
    name: str
    basin: str
    category: str
    current_lat: float
    current_lon: float
    max_sustained_wind_kmh: float
    max_gust_kmh: float
    central_pressure_hpa: float
    movement_direction: str
    movement_speed_kmh: float
    status: str
    data_classification: DataClassification = DataClassification.OBSERVATION
    source: str
    timestamp: str
    valid_until: Optional[str] = None
    forecast_horizon: str = "72h"
    estimated_landfall_time: Optional[str] = None
    estimated_landfall_location: Optional[str] = None
    notes: Optional[str] = None

class BestTrackPoint(BaseModel):
    point_id: str
    timestamp: str
    latitude: float
    longitude: float
    wind_speed_kmh: float
    gust_kmh: float
    central_pressure_hpa: float
    category: str
    data_type: DataClassification = DataClassification.OBSERVATION
    source: str

class ForecastTrackPoint(BaseModel):
    point_id: str
    step_hours: int
    timestamp: str
    latitude: float
    longitude: float
    wind_speed_kmh: float
    gust_kmh: float
    central_pressure_hpa: float
    category: str
    cone_radius_km: float = 30.0
    movement_dir: str
    movement_speed_kmh: float
    data_type: DataClassification = DataClassification.FORECAST
    source: str

class TrackCollection(BaseModel):
    event_id: str
    name: str
    issue_time: str
    source: str
    data_classification: str = "DEMO DATA"
    disclaimer: str = "Prototype decision-support output — not an official warning."
    observed_track: List[BestTrackPoint] = []
    forecast_track: List[ForecastTrackPoint] = []

# Weather Models
class HourlyWeather(BaseModel):
    timestamp: str
    wind_speed_kmh: float
    wind_gust_kmh: float
    wind_direction_deg: int
    precipitation_mm: float
    pressure_hpa: float
    temperature_c: float
    relative_humidity_pct: float

class StationWeather(BaseModel):
    station_id: str
    name: str
    latitude: float
    longitude: float
    hourly: List[HourlyWeather]

class WeatherData(BaseModel):
    event_id: str
    source: str
    retrieved_at: str
    valid_until: str
    freshness: str
    confidence: float
    stations: List[StationWeather]

# Geospatial & Infrastructure Models
class GeoJSONGeometry(BaseModel):
    type: str
    coordinates: Any

class InfrastructureAsset(BaseModel):
    id: str
    name: str
    type: InfrastructureType
    criticality: int
    capacity: Optional[int] = None
    administrative_area: str
    state: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    elevation_m: float
    distance_to_coast_km: float
    backup_power: Optional[bool] = None
    road_access: Optional[bool] = None
    population_served: Optional[int] = None
    geometry: GeoJSONGeometry
    source: str
    data_classification: str = "DEMO DATA"
    data_quality: str = "HIGH"
    last_verified: str
    properties: Optional[Dict[str, Any]] = None

class InfrastructureRiskAssessment(BaseModel):
    asset_id: str
    name: str
    type: InfrastructureType
    criticality: int
    hazard_score: int
    exposure_score: int
    vulnerability_score: int
    risk_score: int
    risk_band: RiskBand
    primary_threat: str
    elevation_m: float
    distance_to_coast_km: float
    geometry: GeoJSONGeometry
    nearest_shelter_or_backup: Optional[str] = None

# Hotspots & Priority Zones
class HotspotZone(BaseModel):
    zone_id: str
    name: str
    administrative_area: str
    risk_score: int
    risk_band: RiskBand
    hazard_score: int
    exposure_score: int
    vulnerability_score: int
    top_hazard: str
    critical_assets_count: int
    exposed_assets: List[str]
    population_estimate: int
    suggested_action: str
    geometry: GeoJSONGeometry

class PopulationTierBreakdown(BaseModel):
    low: int
    moderate: int
    high: int
    severe: int

class PopulationExposure(BaseModel):
    total_exposed: int
    dataset: str
    note: str
    by_tier: PopulationTierBreakdown

class ConfidenceBreakdown(BaseModel):
    score: int
    data_completeness: int
    source_freshness: int
    temporal_consistency: int
    spatial_coverage: int
    limiting_factors: List[str]

class RiskOverview(BaseModel):
    event_id: str
    model_version: str
    disclaimer: str
    data_classification: str
    calculated_at: str
    weights: Dict[str, float]
    overall_metrics: Dict[str, Any]
    confidence_breakdown: ConfidenceBreakdown
    population_exposure: PopulationExposure
    top_priority_zones: List[HotspotZone]

# Scenario Simulator Models
class ScenarioRunRequest(BaseModel):
    event_id: str = "DEMO-TC-2026-ALPHA"
    wind_multiplier: float = Field(default=1.0, ge=0.5, le=2.0)
    rain_multiplier: float = Field(default=1.0, ge=0.5, le=2.5)
    surge_scenario_m: float = Field(default=2.0, ge=0.0, le=7.0)
    track_shift_km: float = Field(default=0.0, ge=-100.0, le=100.0)
    landfall_shift_hours: float = Field(default=0.0, ge=-24.0, le=24.0)

class MetricComparison(BaseModel):
    overall_risk: int
    hazard_score: int
    exposure_score: int
    severe_hotspots_count: int
    critical_assets_at_severe_risk: int
    total_population_at_severe_risk: int

class ScenarioComparison(BaseModel):
    scenario_id: str
    timestamp: str
    parameters: Dict[str, Any]
    baseline: MetricComparison
    simulated: MetricComparison
    delta: Dict[str, Any]
    changed_hotspots: List[HotspotZone]
    disclaimer: str = "Scenario proxy simulation — not an official operational forecast."

# Gemini AI Copilot Models
class AICopilotRequest(BaseModel):
    query: str
    event_id: str = "DEMO-TC-2026-ALPHA"
    zone_id: Optional[str] = None
    scenario_id: Optional[str] = None

class GeminiStructuredExplanation(BaseModel):
    summary: str
    risk_level: str
    risk_score: int
    confidence: int
    primary_drivers: List[str]
    affected_assets: List[str]
    affected_population: int
    recommended_actions: List[str]
    uncertainties: List[str]
    data_sources: List[str]
    human_review_required: bool = True
    ai_status: str = "LIVE"

class SatelliteImageAnalysisRequest(BaseModel):
    image_b64: Optional[str] = None
    dataset_name: str = "Sentinel-1 SAR GRD"
    bounding_box: Optional[List[float]] = None

class SatelliteImageAnalysisResponse(BaseModel):
    dataset: str
    observed_features: List[str]
    possible_inundation_zones: List[str]
    unknown_or_cloud_obscured: List[str]
    confidence_assessment: str
    disclaimer: str = "Multimodal AI screening — requires ground-truth validation."

# Alert & Notification Models
class AlertTranslation(BaseModel):
    title: str
    body: str

class AlertDraftRequest(BaseModel):
    event_id: str
    type: str = "preparedness_advisory"
    title: str
    urgency: str = "HIGH"
    target_area: str
    action_notes: str

class Alert(BaseModel):
    id: str
    event_id: str
    type: str
    title: str
    urgency: str
    status: str  # DRAFT, REVIEW, APPROVED, SENT
    workflow_step: str  # DRAFT, REVIEW, APPROVE, SEND
    created_at: str
    author: str
    reviewer: Optional[str] = None
    approved_at: Optional[str] = None
    target_area: str
    disclaimer: str = "Prototype decision-support output — not an official warning."
    translations: Dict[str, AlertTranslation]
    delivery_channel: str = "DRY_RUN"
    delivery_status: str = "PENDING"
    audit_trail: List[Dict[str, str]] = []

# Reports
class IncidentReport(BaseModel):
    report_id: str
    title: str
    generated_at: str
    event_id: str
    executive_summary: str
    threat_window: str
    closest_approach: str
    overall_risk: int
    hazard_score: int
    top_priority_zones: List[HotspotZone]
    critical_infrastructure: List[InfrastructureRiskAssessment]
    population_summary: PopulationExposure
    uncertainties: List[str]
    data_provenance: List[Dict[str, str]]
    disclaimer: str = "Prototype decision-support output — not an official warning."
