import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    Text,
    JSON,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from app.db.database import Base

def utc_now():
    return datetime.now(timezone.utc)

# 1. Events Table
class EventModel(Base):
    __tablename__ = "events"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    basin = Column(String(64), default="North Indian Ocean")
    category = Column(String(64), default="Very Severe Cyclonic Storm")
    status = Column(String(32), default="ACTIVE")  # ACTIVE, HISTORICAL, ARCHIVED
    current_lat = Column(Float, nullable=False)
    current_lon = Column(Float, nullable=False)
    max_sustained_wind_kmh = Column(Float, default=155.0)
    central_pressure_hpa = Column(Float, default=965.0)
    movement_speed_kmh = Column(Float, default=15.0)
    movement_direction = Column(String(32), default="NNW")
    classification = Column(String(32), default="DEMO")
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    forecast_runs = relationship("ForecastRunModel", back_populates="event", cascade="all, delete-orphan")
    alerts = relationship("AlertModel", back_populates="event")

# 2. Forecast Runs Table (Section 14 & 61)
class ForecastRunModel(Base):
    __tablename__ = "forecast_runs"

    run_id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("events.id"), nullable=False, index=True)
    model_name = Column(String(128), nullable=False)  # WeatherNext 3, WeatherNext Cyclones, IMD, ECMWF
    model_version = Column(String(64), default="v2.1")
    cycle = Column(String(16), default="00Z")  # 00Z, 06Z, 12Z, 18Z
    initialization_time = Column(DateTime, nullable=False, index=True)
    source = Column(String(128), nullable=False)
    status = Column(String(32), default="COMPLETED")
    data_hash = Column(String(64), nullable=True)
    lead_hours_total = Column(Integer, default=72)
    created_at = Column(DateTime, default=utc_now)

    event = relationship("EventModel", back_populates="forecast_runs")
    members = relationship("ForecastMemberModel", back_populates="run", cascade="all, delete-orphan")
    track_points = relationship("TrackPointModel", back_populates="run", cascade="all, delete-orphan")

# 3. Forecast Members Table (Section 11: 64-member ensemble)
class ForecastMemberModel(Base):
    __tablename__ = "forecast_members"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("forecast_runs.run_id"), nullable=False, index=True)
    member_id = Column(String(32), nullable=False, index=True)  # WN3-M01 to WN3-M64
    lead_hours = Column(Integer, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    max_wind_kmh = Column(Float, nullable=False)
    central_pressure_hpa = Column(Float, nullable=False)
    r34_km = Column(Float, default=120.0)
    r50_km = Column(Float, default=60.0)
    r64_km = Column(Float, default=30.0)
    source = Column(String(64), default="WeatherNext 3")
    classification = Column(String(32), default="ENSEMBLE")

    run = relationship("ForecastRunModel", back_populates="members")

    __table_args__ = (
        Index("idx_member_run_lead", "run_id", "member_id", "lead_hours"),
        Index("idx_member_spatial", "latitude", "longitude"),
    )

# 4. Track Points Table
class TrackPointModel(Base):
    __tablename__ = "track_points"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), ForeignKey("forecast_runs.run_id"), nullable=False, index=True)
    track_type = Column(String(32), default="FORECAST")  # OBSERVED, FORECAST, CONSENSUS
    lead_hours = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    wind_speed_kmh = Column(Float, nullable=False)
    gust_kmh = Column(Float, default=0.0)
    central_pressure_hpa = Column(Float, nullable=False)
    cone_radius_km = Column(Float, default=35.0)

    run = relationship("ForecastRunModel", back_populates="track_points")

# 5. Weather Grids Table
class WeatherGridModel(Base):
    __tablename__ = "weather_grids"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(64), nullable=False, index=True)
    variable = Column(String(64), nullable=False)  # wind_v10, precipitation, mslp, sst
    lead_hours = Column(Integer, nullable=False)
    valid_time = Column(DateTime, nullable=False)
    grid_bounds = Column(JSON, nullable=False)  # [min_lon, min_lat, max_lon, max_lat]
    resolution_deg = Column(Float, default=0.25)
    grid_data = Column(JSON, nullable=True)  # Downscaled matrix or storage pointer
    storage_uri = Column(String(256), nullable=True)  # Object storage URI for full Zarr/NetCDF

# 6. Hazard Runs Table (Section 15: Gridded hazard fields)
class HazardRunModel(Base):
    __tablename__ = "hazard_runs"

    hazard_id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), nullable=False, index=True)
    forecast_run_id = Column(String(64), nullable=False)
    lead_hours = Column(Integer, default=48)
    methodology = Column(String(64), default="GRID FORECAST")  # GRID FORECAST or PARAMETRIC PROXY
    max_v10_kmh = Column(Float, default=180.0)
    peak_rain_mm = Column(Float, default=320.0)
    peak_surge_m = Column(Float, default=3.1)
    total_water_level_m = Column(Float, default=5.6)
    geojson_summary = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now)

# 7. Hazard Tiles Table
class HazardTileModel(Base):
    __tablename__ = "hazard_tiles"

    id = Column(Integer, primary_key=True, autoincrement=True)
    hazard_id = Column(String(64), ForeignKey("hazard_runs.hazard_id"), nullable=False, index=True)
    zoom = Column(Integer, nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    tile_format = Column(String(16), default="mvt")  # mvt, cog, png
    tile_uri = Column(String(256), nullable=False)

    __table_args__ = (
        Index("idx_hazard_tile_xyz", "hazard_id", "zoom", "x", "y"),
    )

# 8. Risk Cells Table
class RiskCellModel(Base):
    __tablename__ = "risk_cells"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), nullable=False, index=True)
    h3_or_geom_id = Column(String(64), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    hazard_score = Column(Float, nullable=False)
    exposure_score = Column(Float, nullable=False)
    vulnerability_score = Column(Float, nullable=False)
    impact_probability = Column(Float, nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_band = Column(String(32), default="SEVERE")

    __table_args__ = (
        Index("idx_risk_spatial", "latitude", "longitude"),
    )

# 9. Infrastructure Assets Table (Section 21)
class InfrastructureAssetModel(Base):
    __tablename__ = "infrastructure_assets"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    type = Column(String(64), nullable=False, index=True)  # hospital, port, substation, bridge, shelter
    criticality = Column(Integer, default=80)
    capacity = Column(Integer, default=0)
    elevation_m = Column(Float, default=5.0)
    coastal_distance_km = Column(Float, default=3.0)
    backup_power = Column(String(128), default="AVAILABLE")
    flood_protection = Column(String(128), default="MODERATE")
    road_access_status = Column(String(128), default="OPEN")
    redundancy = Column(String(64), default="HIGH")
    population_served = Column(Integer, default=50000)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    geometry_geojson = Column(JSON, nullable=False)
    source = Column(String(128), default="OpenStreetMap / HOTOSM")
    data_quality_pct = Column(Float, default=95.0)
    last_verified = Column(String(64), default="2026-09-20")

    __table_args__ = (
        Index("idx_infra_type", "type"),
        Index("idx_infra_coords", "latitude", "longitude"),
    )

# 10. Population Layers Table (Section 23)
class PopulationLayerModel(Base):
    __tablename__ = "population_layers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), nullable=False, index=True)
    dataset_name = Column(String(128), default="WorldPop 100m")
    dataset_year = Column(Integer, default=2025)
    resolution = Column(String(64), default="100m")
    source = Column(String(128), default="University of Southampton / WorldPop")
    total_exposed = Column(Integer, default=1280000)
    severe_hazard_zone = Column(Integer, default=340000)
    high_hazard_zone = Column(Integer, default=510000)
    moderate_hazard_zone = Column(Integer, default=430000)
    demographic_vulnerable = Column(Integer, default=85000)
    created_at = Column(DateTime, default=utc_now)

# 11. Satellite Observations Table (Section 25 & 26)
class SatelliteObservationModel(Base):
    __tablename__ = "satellite_observations"

    id = Column(String(64), primary_key=True, index=True)
    sensor = Column(String(64), default="Sentinel-1 C-Band SAR")
    observation_time = Column(DateTime, nullable=False, index=True)
    retrieved_time = Column(DateTime, default=utc_now)
    valid_time = Column(DateTime, nullable=False)
    signal_type = Column(String(64), default="OBSERVED SATELLITE CHANGE")
    polarization = Column(String(16), default="VV+VH")
    resolution_m = Column(Float, default=10.0)
    inundation_area_sqkm = Column(Float, default=84.5)
    co_registration_status = Column(String(32), default="VALIDATED")
    metadata_json = Column(JSON, nullable=True)

# 12. Scenario Runs Table (Section 37 & 38)
class ScenarioRunModel(Base):
    __tablename__ = "scenario_runs"

    scenario_id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), nullable=False, index=True)
    title = Column(String(128), nullable=False)
    track_offset_km = Column(Float, default=0.0)
    intensity_delta_kmh = Column(Float, default=0.0)
    rainfall_delta_pct = Column(Float, default=0.0)
    surge_delta_m = Column(Float, default=0.0)
    infrastructure_closure = Column(String(128), default="NONE")
    delta_risk_score = Column(Float, default=0.0)
    delta_population_exposed = Column(Integer, default=0)
    delta_critical_assets_count = Column(Integer, default=0)
    delta_high_risk_area_sqkm = Column(Float, default=0.0)
    disclaimer = Column(String(256), default="WHAT-IF SCENARIO: Not an official forecast. Not an observed event.")
    created_by = Column(String(64), default="operator_seoc")
    created_at = Column(DateTime, default=utc_now)

# 13. Alerts Table (Section 52 - 54)
class AlertModel(Base):
    __tablename__ = "alerts"

    id = Column(String(64), primary_key=True, index=True)
    event_id = Column(String(64), ForeignKey("events.id"), nullable=False, index=True)
    type = Column(String(64), default="EVACUATION_ADVISORY")
    title = Column(String(256), nullable=False)
    urgency = Column(String(32), default="URGENT")
    status = Column(String(32), default="DRAFT", index=True)  # DRAFT, REVIEW, APPROVED, SENT
    workflow_step = Column(String(32), default="REVIEW")
    author = Column(String(64), default="Operator (SEOC Desk)")
    reviewer = Column(String(64), nullable=True)
    dispatcher = Column(String(64), nullable=True)
    target_area = Column(String(256), nullable=False)
    translations_json = Column(JSON, nullable=False)  # EN, HI, OR, TE, BN
    audit_trail_json = Column(JSON, nullable=False)
    delivery_channel = Column(String(32), default="DRY_RUN")
    delivery_status = Column(String(32), default="AWAITING_REVIEW")
    created_at = Column(DateTime, default=utc_now)
    approved_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)

    event = relationship("EventModel", back_populates="alerts")

# 14. Audit Logs Table (Section 65)
class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=utc_now, index=True)
    action = Column(String(64), nullable=False, index=True)  # LOGIN, FORECAST_RUN, RISK_CALC, ALERT_APPROVE, etc.
    user_id = Column(String(64), nullable=False)
    username = Column(String(64), nullable=False)
    role = Column(String(32), nullable=False)
    resource_id = Column(String(64), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(64), default="127.0.0.1")

# 15. Model Runs Table (Section 32 & 33)
class ModelRunModel(Base):
    __tablename__ = "model_runs"

    model_run_id = Column(String(64), primary_key=True, index=True)
    model_name = Column(String(128), nullable=False)
    model_version = Column(String(64), nullable=False)
    configuration_version = Column(String(64), default="v2.1")
    input_run_id = Column(String(64), nullable=False)
    data_sources = Column(JSON, nullable=False)
    parameters_json = Column(JSON, nullable=False)
    weights_json = Column(JSON, nullable=False)
    software_version = Column(String(64), default="CYCLONE-X v2.0.0")
    created_at = Column(DateTime, default=utc_now)

# 16. Verification Runs Table (Section 34 & 35)
class VerificationRunModel(Base):
    __tablename__ = "verification_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_id = Column(String(64), nullable=False, index=True)
    storm_name = Column(String(128), nullable=False)
    year = Column(Integer, nullable=False)
    model_name = Column(String(128), nullable=False)
    track_error_24h_km = Column(Float, nullable=False)
    track_error_48h_km = Column(Float, nullable=False)
    track_error_72h_km = Column(Float, nullable=False)
    intensity_mae_kmh = Column(Float, nullable=False)
    pressure_mae_hpa = Column(Float, nullable=False)
    landfall_time_error_hrs = Column(Float, nullable=False)
    landfall_location_error_km = Column(Float, nullable=False)
    brier_score = Column(Float, nullable=False)
    crps = Column(Float, nullable=False)
    reliability_index = Column(Float, default=0.92)

# 17. Data Sources Table (Section 55)
class DataSourceModel(Base):
    __tablename__ = "data_sources"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(128), nullable=False)
    dataset = Column(String(256), nullable=False)
    provider = Column(String(128), nullable=False)
    resolution = Column(String(64), nullable=False)
    temporal_resolution = Column(String(64), nullable=False)
    coverage = Column(String(128), default="Global / Bay of Bengal")
    license = Column(String(128), nullable=False)
    status = Column(String(32), default="CONNECTED")
    access_requirement = Column(String(128), default="PUBLIC_OR_AUTHORIZATION")
    attribution = Column(String(256), nullable=False)
    last_update = Column(DateTime, default=utc_now)
    latency_ms = Column(Integer, default=120)
    notes = Column(Text, nullable=True)
