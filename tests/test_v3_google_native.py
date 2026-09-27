import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.providers.imd_provider import IMDProvider
from app.services.route_risk_engine import RouteRiskEngine
from app.services.vertex_impact_service import VertexAIImpactProvider, VertexFeatureVector, VertexTrainingPipeline
from app.services.bigquery_service import BigQueryAnalyticsService
from app.providers.bhuvan_provider import BhuvanProvider
from app.services.gemini_copilot_v2 import GeminiCopilotV2
from app.services.translation_service import TranslationService
from app.services.voice_service import VoiceCommandService

client = TestClient(app)

def test_google_compliance_endpoint():
    """Validates the Google Technology Stack compliance endpoint."""
    response = client.get("/api/system/google-compliance")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "components" in data
    comp_names = [c["service"] for c in data["components"]]
    assert "Gemini 3.8 Flash" in comp_names
    assert "Vertex AI" in comp_names
    assert "Google Earth Engine" in comp_names
    assert "Google Maps Platform" in comp_names
    assert "BigQuery" in comp_names
    assert "Firebase Authentication" in comp_names

def test_imd_official_provider():
    """Validates official IMD bulletin ingestion and classification."""
    provider = IMDProvider()
    bulletin = provider.get_official_bulletin("cyclone-alpha")
    assert bulletin.cyclone_name == "CYCLONE ALPHA"
    assert bulletin.bulletin_number == 14
    assert bulletin.classification.value == "OFFICIAL_ADVISORY"
    assert "IMD" in bulletin.official_source
    assert len(bulletin.forecast_points) >= 5

def test_imd_api_endpoint():
    """Validates /api/v2/imd/official-bulletin endpoint."""
    response = client.get("/api/v2/imd/official-bulletin?event_id=cyclone-alpha")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["cyclone_name"] == "CYCLONE ALPHA"
    assert data["data"]["classification"] == "OFFICIAL_ADVISORY"

@pytest.mark.asyncio
async def test_route_risk_engine():
    """Validates emergency route risk calculation and hazard intersection."""
    engine = RouteRiskEngine()
    assessment = await engine.compute_route_risk(
        origin_lat=20.2961,
        origin_lon=85.8245,
        dest_lat=19.8135,
        dest_lon=85.8312,
        origin_name="Bhubaneswar State EOC",
        dest_name="District Hospital, Puri"
    )
    assert assessment.distance_km > 0
    assert assessment.duration_minutes > 0
    assert assessment.route_exposure_score > 0
    assert "Route intersects modeled high-risk area" in assessment.disclaimer
    assert assessment.alternative_route_available is True

def test_vertex_impact_provider_prediction():
    """Validates Vertex AI Impact Intelligence model serving."""
    provider = VertexAIImpactProvider()
    features = VertexFeatureVector(
        wind_forecast_kmh=155.0,
        wind_percentile_p90=175.0,
        rainfall_24h_mm=220.0,
        rainfall_percentile_p90=260.0,
        inundation_proxy_m=2.8,
        elevation_m=4.2,
        distance_to_coast_km=2.1,
        land_cover="Coastal Urban Settlement",
        population_density_per_sqkm=1200.0,
        infrastructure_type="hospital",
        asset_criticality=95,
        road_accessibility_score=45.0,
        historical_flood_frequency=0.35,
        forecast_lead_time_hours=44,
        model_disagreement_km=22.4,
        forecast_run_stability=0.88
    )
    pred = provider.predict_asset_impact(features)
    assert 0.0 <= pred.p_wind_impact <= 1.0
    assert 0.0 <= pred.p_rain_impact <= 1.0
    assert 0.0 <= pred.p_flood_impact <= 1.0
    assert 0.0 <= pred.p_combined_impact <= 1.0
    assert 0.0 <= pred.p_service_disruption <= 1.0
    assert pred.confidence_interval is not None
    assert pred.metrics_evaluated["brier_score"] < 0.15

def test_vertex_pipeline_status():
    """Validates Vertex AI Training Pipeline transparency."""
    status_info = VertexTrainingPipeline.get_pipeline_status()
    assert status_info["status"] == "RESEARCH / NOT YET TRAINED"
    assert "evaluation_metrics" in status_info
    assert "brier_score" in status_info["evaluation_metrics"]

def test_bigquery_analytics_overview():
    """Validates BigQuery schema definitions and architecture overview."""
    bq = BigQueryAnalyticsService()
    overview = bq.get_datasets_overview()
    dataset_ids = [d["dataset_id"] for d in overview["datasets"]]
    assert "cyclonex_raw" in dataset_ids
    assert "cyclonex_curated" in dataset_ids
    assert "cyclonex_analytics" in dataset_ids
    assert "cyclonex_ml" in dataset_ids

def test_bhuvan_datasets_catalog():
    """Validates ISRO / Bhuvan datasets catalog."""
    bp = BhuvanProvider()
    datasets = bp.get_datasets()
    assert len(datasets) >= 3
    ds_ids = [d["dataset_id"] for d in datasets]
    assert "bhuvan-cyclone-inundation" in ds_ids

def test_gemini_copilot_v2_19_tools():
    """Validates that GeminiCopilotV2 implements all 19 mandatory tools."""
    expected_tools = [
        "get_current_event",
        "get_official_imd_forecast",
        "get_weathernext_forecast",
        "get_forecast_ensemble",
        "get_landfall_probability",
        "get_forecast_evolution",
        "get_weather_context",
        "get_rainfall_probability",
        "get_wind_probability",
        "get_inundation_probability",
        "get_infrastructure_risk",
        "get_population_exposure",
        "get_satellite_observation",
        "get_data_health",
        "compare_forecast_models",
        "run_scenario",
        "get_route_risk",
        "get_verification_metrics",
        "generate_incident_brief"
    ]
    for tool in expected_tools:
        assert tool in GeminiCopilotV2.TOOLS_REGISTRY, f"Tool {tool} missing from registry"
        res = GeminiCopilotV2.execute_tool(tool)
        assert res is not None

def test_gemini_multimodal_vision():
    """Validates multimodal vision classification adheres to Section 40."""
    res = GeminiCopilotV2.classify_satellite_image({"image_id": "test-sar-01"})
    statuses = [c["status"] for c in res["classification_results"]]
    for s in statuses:
        assert s in ("OBSERVED", "POSSIBLE", "UNKNOWN")

@pytest.mark.asyncio
async def test_multilingual_translation_service():
    """Validates translation into Hindi, Odia, Telugu, and Bengali."""
    ts = TranslationService()
    adv = await ts.translate_advisory(
        source_advisory_id="ADV-001",
        english_title="Official Cyclone Warning",
        english_body="Extremely Severe Cyclone Alpha moving north-northeast.",
        target_language="hi"
    )
    assert adv.target_language == "hi"
    assert "अल्फा" in adv.translated_advisory_body or "चक्रवात" in adv.translated_title
    assert adv.approval_state == "DRAFT"
