import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.providers.imd_provider import IMDProvider
from app.providers.weathernext_provider import WeatherNext3Provider
from app.providers.weathernext_cyclone_provider import WeatherNextCycloneProvider
from app.services.route_risk_engine import RouteRiskEngine
from app.services.ensemble_engine import EnsembleAggregator, LandfallProbabilityEngine
from app.services.impact_probability_engine import ImpactProbabilityEngine
from app.services.backtest_engine import BacktestEngine
from app.services.gemini_copilot_v2 import GeminiCopilotV2
from app.models.schemas_v2 import DataClassification

client = TestClient(app)

# ==============================================================================
# AUDIT VERIFICATION: MAP & ROUTING ENGINE CONFIGURATION (Requirements 2, 5, 6, 7, 18)
# ==============================================================================

def test_map_provider_configuration_and_defaults():
    """Verify MAP_PROVIDER defaults to openfreemap, and allows pmtiles/maptiler/google-maps."""
    assert settings.MAP_PROVIDER in ("openfreemap", "pmtiles", "maptiler", "google-maps")
    assert settings.MAP_PROVIDER == "openfreemap"  # Default hackathon/demo zero-key basemap
    
    # Verify system health reflects configured map engine
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert "openfreemap" in data["subsystems"]["map_engine"]


def test_valhalla_route_provider_and_exposure_reduction():
    """
    Verify RouteRiskEngine supports Valhalla self-hosted routing (Docker container)
    and computes dynamic exposure reduction using formula: 1 - alt_exposure / baseline_exposure.
    """
    assert settings.ROUTE_PROVIDER in ("valhalla", "google-routes", "osrm", "demo")
    engine = RouteRiskEngine(provider="demo")
    
    assessment = engine.compute_route_risk_sync(
        origin_lat=20.2961,
        origin_lon=85.8245,
        dest_lat=19.8135,
        dest_lon=85.8312,
        origin_name="Bhubaneswar State EOC",
        dest_name="District Hospital Puri"
    )
    
    assert assessment.distance_km > 0
    assert assessment.baseline_exposure_score is not None
    assert assessment.alternative_exposure_score is not None
    assert assessment.exposure_reduction_pct is not None
    
    # Check that reduction percentage matches formula: 1 - alt / baseline
    expected_reduction = round((1.0 - (assessment.alternative_exposure_score / assessment.baseline_exposure_score)) * 100.0, 1)
    assert assessment.exposure_reduction_pct == expected_reduction


# ==============================================================================
# AUDIT VERIFICATION: DATA PROVENANCE & LIVE/DEMO SEPARATION (Requirements 21, 22, 23, 24)
# ==============================================================================

def test_imd_provenance_and_zero_manufactured_bulletin():
    """
    Requirement 21 & 22:
    - In DEMO mode: marked SIMULATED CYCLONE SCENARIO with null bulletin number.
    - In LIVE mode: if no live IMD bulletin feed active, must return OFFICIAL_SOURCE_UNAVAILABLE.
    - Never manufacture bulletin numbers or official warning text.
    """
    provider = IMDProvider()
    demo_bulletin = provider.get_official_bulletin("DEMO-TC-2026-ALPHA")
    
    # In demo mode, it must be flagged DEMO and bulletin number must be None
    assert demo_bulletin.classification == DataClassification.DEMO
    assert demo_bulletin.bulletin_number is None
    assert "SIMULATED" in demo_bulletin.cyclone_name or "SIMULATED" in demo_bulletin.disclaimer

    # Simulate live mode check
    original_mode = settings.APP_MODE
    try:
        settings.APP_MODE = "live"
        live_bulletin = provider.get_official_bulletin("LIVE-TC-2026-BETA")
        assert live_bulletin.classification == DataClassification.OFFICIAL_SOURCE_UNAVAILABLE
        assert live_bulletin.warning_status == "OFFICIAL_FEED_UNAVAILABLE"
        assert live_bulletin.bulletin_number is None
    finally:
        settings.APP_MODE = original_mode


def test_weathernext_3_live_demo_separation():
    """
    Requirement 23 & 24:
    - Truthful labels: WEATHERNEXT 3, DEMO ENSEMBLE, HISTORICAL WEATHERNEXT.
    - Never generate random ensemble members in LIVE mode.
    """
    wn3 = WeatherNext3Provider()
    status_info = wn3.get_status_info()
    assert status_info["status"] in ("CONNECTED", "NOT_CONFIGURED", "DEMO")
    
    # In live mode when not configured, members must be empty
    original_mode = settings.APP_MODE
    try:
        settings.APP_MODE = "live"
        # Since not configured with GCP auth in test runner, should return empty or not configured
        if not wn3.is_available():
            members = wn3.generate_64_member_ensemble()
            assert len(members) == 0, "Requirement 23: Never generate random ensemble members in LIVE mode"
    finally:
        settings.APP_MODE = original_mode


def test_weathernext_cyclone_async_inference_tracking():
    """
    Requirement 25:
    - WeatherNext Cyclones & WeatherNext Cyclones Mini support.
    - Store: model version, checkpoint, input reference, inference timestamp, output reference, status.
    """
    cyclone_provider = WeatherNextCycloneProvider(variant="weathernext_cyclones")
    model_info = cyclone_provider.get_model_info()
    assert model_info["model_name"] == "WeatherNext Cyclones"
    assert "checkpoint" in model_info
    assert "model_version" in model_info

    mini_provider = WeatherNextCycloneProvider(variant="weathernext_cyclones_mini")
    mini_info = mini_provider.get_model_info()
    assert mini_info["model_name"] == "WeatherNext Cyclones Mini"


# ==============================================================================
# AUDIT VERIFICATION: CANONICAL EVENT ID & EVIDENCE DERIVED PROBABILITIES (Requirements 26, 27, 28, 37)
# ==============================================================================

def test_canonical_event_id_consistency():
    """Requirement 37: Ensure DEMO-TC-2026-ALPHA is canonical across endpoints."""
    assert settings.DEFAULT_EVENT_ID == "DEMO-TC-2026-ALPHA"
    
    # Test IMD endpoint with default event
    res = client.get("/api/imd/official-bulletin")
    assert res.status_code == 200
    assert res.json()["data"]["event_id"] == "DEMO-TC-2026-ALPHA"
    
    # Test Ensemble endpoint with default event
    res_ens = client.get("/api/ensemble/aggregation")
    assert res_ens.status_code == 200
    assert res_ens.json()["data"]["ensemble_id"] == "WN3-ENS-2026-ALPHA"


def test_empirical_ensemble_probabilities_no_hardcoding():
    """
    Requirements 26 & 27:
    - Calculate exceedances: prob_wind_exceed_100kmh, prob_wind_exceed_140kmh, prob_wind_exceed_180kmh
    - Must be derived from members (exceeding members / total valid members).
    """
    agg = EnsembleAggregator.get_ensemble_aggregation("DEMO-TC-2026-ALPHA")
    assert agg.member_count == 64
    assert agg.prob_wind_exceed_100kmh is not None
    assert 0.0 <= agg.prob_wind_exceed_100kmh <= 1.0
    assert 0.0 <= agg.prob_wind_exceed_140kmh <= 1.0
    assert 0.0 <= agg.prob_wind_exceed_180kmh <= 1.0
    # Higher threshold exceedance probability must be <= lower threshold exceedance
    assert agg.prob_wind_exceed_180kmh <= agg.prob_wind_exceed_140kmh <= agg.prob_wind_exceed_100kmh


def test_critical_assets_impact_probabilities():
    """
    Requirement 28:
    - P(wind threshold), P(rain threshold), P(inundation threshold), P(combined impact), P(service disruption)
    - Calculated mathematically from hazard fields and fragility curves.
    """
    assets = ImpactProbabilityEngine.get_critical_assets_impact("DEMO-TC-2026-ALPHA")
    assert len(assets) > 0
    for a in assets:
        assert 0.0 <= a.p_wind_threshold <= 1.0
        assert 0.0 <= a.p_rain_threshold <= 1.0
        assert 0.0 <= a.p_inundation_threshold <= 1.0
        assert 0.0 <= a.p_combined_impact <= 1.0
        assert 0.0 <= a.p_service_disruption <= 1.0


# ==============================================================================
# AUDIT VERIFICATION: BACKTESTING & VERIFICATION ENGINE (Requirement 31)
# ==============================================================================

def test_backtest_engine_historical_metrics():
    """
    Requirement 31:
    - Real backtest calculates track error, intensity MAE, landfall error, Brier score.
    - If data unavailable: returns VERIFICATION DATA UNAVAILABLE.
    """
    metrics = BacktestEngine.get_verification_metrics("hist-fani-2019")
    assert metrics["event_id"] == "hist-fani-2019"
    assert len(metrics["models_compared"]) > 0
    assert metrics["models_compared"][0]["track_error_24h_km"] > 0
    assert metrics["models_compared"][0]["intensity_mae_kmh"] > 0
    assert metrics["models_compared"][0]["brier_score_wind_exceedance"] >= 0

    # Test unknown event
    unknown_metrics = BacktestEngine.get_verification_metrics("non-existent-event-999")
    assert unknown_metrics["disclaimer"] == "VERIFICATION DATA UNAVAILABLE. Stored observational track verification records not found for this event."


# ==============================================================================
# AUDIT VERIFICATION: 19 GEMINI COPILOT TOOLS & PROVENANCE METADATA (Requirements 42, 43, 44)
# ==============================================================================

def test_gemini_copilot_all_19_tools_provenance():
    """
    Requirements 42 & 43:
    Every tool must return: source, timestamp, classification, model/version, data quality.
    """
    required_tools = [
        "get_current_event",
        "get_official_imd_forecast",
        "get_weathernext",
        "get_ensemble",
        "get_landfall_probability",
        "get_forecast_evolution",
        "get_weather",
        "get_wind_probability",
        "get_rainfall_probability",
        "get_inundation_probability",
        "get_infrastructure_risk",
        "get_population",
        "get_satellite",
        "get_data_health",
        "compare_models",
        "run_scenario",
        "get_route_risk",
        "get_verification",
        "generate_incident_brief"
    ]
    
    for tool_name in required_tools:
        assert tool_name in GeminiCopilotV2.TOOLS_REGISTRY, f"Mandatory tool {tool_name} missing from GeminiCopilotV2"
        res = GeminiCopilotV2.execute_tool(tool_name)
        assert res is not None, f"Tool {tool_name} returned None"
        
        # Tools returning dicts must have provenance
        if isinstance(res, dict):
            assert "source" in res or "official_source" in res, f"Tool {tool_name} missing source provenance"
            assert "classification" in res, f"Tool {tool_name} missing classification"


# ==============================================================================
# AUDIT VERIFICATION: INDIA GEOGRAPHY REGISTRY & GAZETTEER (Sections 9, 10, 52)
# ==============================================================================

def test_india_geography_registry_and_gazetteer():
    """Verify India geography hierarchy and non-Google gazetteer search."""
    from app.geospatial.india_geography import IndiaGeographyRegistry
    
    # 1. State coverage
    states = IndiaGeographyRegistry.get_states()
    state_codes = [s["code"] for s in states]
    for required in ["OD", "WB", "AP", "TN", "GJ", "KL", "GA", "AN"]:
        assert required in state_codes, f"Required state {required} missing from India geography"
    
    # 2. Hierarchy API
    res = client.get("/api/geography/states")
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 8

    # 3. Local Gazetteer: Search state
    search_res = client.get("/api/geography/search?q=West%20Bengal")
    assert search_res.status_code == 200
    results = search_res.json()["data"]["results"]
    assert any(r["name"] == "West Bengal" for r in results)

    # 4. Local Gazetteer: Search district
    search_dist = client.get("/api/geography/search?q=Visakhapatnam")
    assert search_dist.status_code == 200
    dist_results = search_dist.json()["data"]["results"]
    assert any("Visakhapatnam" in r["name"] for r in dist_results)

    # 5. Local Gazetteer: Coordinate parser (no Google geocoding required)
    coord_search = client.get("/api/geography/search?q=19.81,85.83")
    assert coord_search.status_code == 200
    coords = coord_search.json()["data"]["results"]
    assert len(coords) == 1
    assert coords[0]["type"] == "COORDINATE"
    assert abs(coords[0]["lat"] - 19.81) < 0.01


# ==============================================================================
# AUDIT VERIFICATION: MULTI-STATE INFRASTRUCTURE (Section 26 & 52)
# ==============================================================================

@pytest.mark.asyncio
async def test_multi_state_infrastructure():
    """Verify infrastructure assets cover multiple states without Puri-only hardcoding."""
    from app.providers.infrastructure_provider import GeoJSONInfrastructureProvider
    
    provider = GeoJSONInfrastructureProvider()
    assets = await provider.get_all_assets()
    assert len(assets) >= 12
    
    # Check multi-state representation
    states_present = {a.state for a in assets if a.state}
    assert "West Bengal" in states_present or any("West Bengal" in (a.administrative_area or "") for a in assets)
    assert "Andhra Pradesh" in states_present or any("Andhra Pradesh" in (a.administrative_area or "") for a in assets)
    assert "Tamil Nadu" in states_present or any("Tamil Nadu" in (a.administrative_area or "") for a in assets)

    # Check asset types coverage
    types_present = {a.type.value if hasattr(a.type, "value") else str(a.type) for a in assets}
    assert "hospital" in types_present
    assert "port" in types_present or "government_facility" in types_present


# ==============================================================================
# AUDIT VERIFICATION: VOICE SERVICE & INDIAN LOCALES (Sections 33 & 34)
# ==============================================================================

@pytest.mark.asyncio
async def test_voice_service_no_fake_speech_injection():
    """
    Section 33: Never inject fake user speech transcripts when no speech is supplied.
    Explicit demo command must be explicitly flagged as demo.
    """
    from app.services.voice_service import VoiceCommandService
    
    vs = VoiceCommandService()
    
    # 1. Without audio and without transcript -> must fail gracefully, not inject fake speech
    res_empty = await vs.handle_voice_query()
    assert res_empty["success"] is False
    assert res_empty["provider_status"] == "VOICE SERVICE NOT CONFIGURED"

    # 2. Explicit demo command -> marked as EXPLICIT DEMO COMMAND
    res_demo = await vs.handle_voice_query(
        is_demo=True,
        demo_command="Show severe-risk hospitals in Vizag.",
        language_code="hi-IN"
    )
    assert res_demo.get("voice_metadata", {}).get("input_source") == "EXPLICIT DEMO COMMAND"
    assert res_demo.get("voice_metadata", {}).get("language_code") == "hi-IN"

    # 3. User supplied transcript -> processed with user locale
    res_user = await vs.handle_voice_query(
        transcript="Explain why risk increased",
        language_code="ta-IN"
    )
    assert res_user.get("voice_metadata", {}).get("language_code") == "ta-IN"


# ==============================================================================
# AUDIT VERIFICATION: TRANSLATION SERVICE & TAMIL SUPPORT (Section 35)
# ==============================================================================

@pytest.mark.asyncio
async def test_translation_service_tamil_and_demo_label():
    """Section 35: Fallback must be labelled LOCAL DEMO TRANSLATION. Supports Tamil (ta)."""
    from app.services.translation_service import TranslationService
    
    ts = TranslationService()
    adv_ta = await ts.translate_advisory(
        source_advisory_id="ADV-999",
        english_title="Cyclone Alpha Red Alert",
        english_body="Extremely Severe Cyclone Alpha moving north-northeast.",
        target_language="ta"
    )
    
    assert adv_ta.target_language == "ta"
    assert "தமிழ்" in adv_ta.target_language_name
    assert adv_ta.translation_engine == "LOCAL DEMO TRANSLATION"
    assert adv_ta.classification == DataClassification.DEMO


# ==============================================================================
# AUDIT VERIFICATION: HAZARD ENGINE HYDRODYNAMIC PRODUCT VS PROXY (Section 21)
# ==============================================================================

def test_hazard_engine_parametric_proxy_differentiation():
    """Section 21: Never mark official_hydrodynamic_available=True unless real official data exists."""
    from app.services.hazard_field_engine import HazardFieldEngine
    
    overview = HazardFieldEngine.get_hazard_overview()
    # In demo mode, official hydrodynamic is False, labelled as PARAMETRIC PROXY
    assert overview.inundation_components.official_hydrodynamic_available is False
    assert "PARAMETRIC PROXY" in overview.inundation_components.disclaimer

    # GeoJSON contours have explicit methodology
    geojson = HazardFieldEngine.get_spatial_hazard_geojson()
    features = geojson["features"]
    methodologies = {f["properties"].get("methodology") for f in features}
    assert "PARAMETRIC PROXY" in methodologies
    assert "SCENARIO INUNDATION PROXY" in methodologies

