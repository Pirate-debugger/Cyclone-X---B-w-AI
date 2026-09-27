import pytest
from app.services.hazard_engine import HazardEngine
from app.services.exposure_engine import ExposureEngine
from app.services.vulnerability_engine import VulnerabilityEngine
from app.services.confidence_engine import ConfidenceEngine
from app.services.risk_engine import RiskEngine
from app.models.schemas import RiskBand, InfrastructureAsset, InfrastructureType

def test_hazard_engine_normalization():
    engine = HazardEngine()
    # Calm wind (20 km/h) -> low score
    low_wind = engine.normalize_wind_hazard(20.0)
    assert 0 <= low_wind <= 25

    # Very Severe Cyclone (165 km/h) -> high/severe score
    high_wind = engine.normalize_wind_hazard(165.0)
    assert 70 <= high_wind <= 95

    # Combined hazard
    combined = engine.calculate_combined_hazard(
        wind_speed_kmh=155.0,
        rainfall_24h_mm=210.0,
        inundation_depth_m=1.8,
        surge_height_m=2.2
    )
    assert 75 <= combined["combined_hazard_score"] <= 100

def test_confidence_engine():
    engine = ConfidenceEngine()
    # Default without official surge
    conf = engine.evaluate_confidence(has_official_surge=False, satellite_age_hours=12.0)
    assert 60 <= conf.score <= 85
    assert len(conf.limiting_factors) >= 2
    assert any("hydrodynamic" in f.lower() or "surge" in f.lower() for f in conf.limiting_factors)

def test_vulnerability_engine():
    engine = VulnerabilityEngine()
    # High elevation, inland -> low vulnerability
    safe_vuln = engine.calculate_terrain_vulnerability(elevation_m=45.0, distance_to_coast_km=55.0)
    assert safe_vuln <= 25

    # Low elevation, coastal -> severe vulnerability
    coastal_vuln = engine.calculate_terrain_vulnerability(elevation_m=2.5, distance_to_coast_km=1.8)
    assert coastal_vuln >= 75

def test_risk_engine_banding():
    engine = RiskEngine()
    assert engine.determine_risk_band(15) == RiskBand.LOW
    assert engine.determine_risk_band(35) == RiskBand.MODERATE
    assert engine.determine_risk_band(65) == RiskBand.HIGH
    assert engine.determine_risk_band(85) == RiskBand.SEVERE
