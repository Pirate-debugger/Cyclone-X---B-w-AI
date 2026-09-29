from fastapi import APIRouter, Query, HTTPException, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.core.config import settings
from app.services.ensemble_engine import EnsembleAggregator, LandfallProbabilityEngine
from app.services.forecast_comparison_engine import ForecastComparisonEngine
from app.services.hazard_field_engine import HazardFieldEngine
from app.services.impact_probability_engine import ImpactProbabilityEngine
from app.services.data_quality_engine import DataQualityEngine
from app.services.freshness_engine import FreshnessEngine
from app.services.backtest_engine import BacktestEngine
from app.services.action_prioritization_engine import ActionPrioritizationEngine
from app.services.gemini_copilot_v2 import GeminiCopilotV2
from app.providers.imd_provider import IMDProvider
from app.services.route_risk_engine import RouteRiskEngine
from app.services.vertex_impact_service import VertexAIImpactProvider, VertexTrainingPipeline, VertexFeatureVector
from app.services.bigquery_service import BigQueryAnalyticsService
from app.models.schemas_v2 import (
    EnsembleAggregationResult,
    MultiModelConsensus,
    HazardFieldsOverview,
    AssetImpactProbability,
    DataQualityReport,
    ProviderFreshnessDetail,
    ForecastVerificationMetric
)

router = APIRouter(tags=["V2 Enterprise Disaster Intelligence"])

class CopilotQueryRequest(BaseModel):
    query: str
    event_id: Optional[str] = None

# --- 1. Ensemble Intelligence ---
@router.get("/ensemble/aggregation", response_model=Dict[str, Any])
async def get_ensemble_aggregation(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    res = EnsembleAggregator.get_ensemble_aggregation(eid)
    return {
        "success": True,
        "data": res.model_dump()
    }

@router.get("/ensemble/members", response_model=Dict[str, Any])
async def get_ensemble_members(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    members = EnsembleAggregator.get_all_raw_members(eid)
    return {
        "success": True,
        "count": len(members),
        "data": [m.model_dump() for m in members]
    }

@router.get("/ensemble/landfall-sectors", response_model=Dict[str, Any])
async def get_landfall_sectors(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    sectors = LandfallProbabilityEngine.calculate_sector_landfall_probabilities(eid)
    return {
        "success": True,
        "data": [s.model_dump() for s in sectors]
    }

# --- 2. Model Comparison & Run Evolution ---
@router.get("/forecast/comparison", response_model=Dict[str, Any])
async def get_model_comparison(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    consensus = ForecastComparisonEngine.get_multi_model_consensus(eid)
    return {
        "success": True,
        "data": consensus.model_dump()
    }

@router.get("/forecast/evolution", response_model=Dict[str, Any])
async def get_forecast_evolution(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    evo = ForecastComparisonEngine.get_forecast_evolution(eid)
    return {
        "success": True,
        "data": evo
    }

# --- 3. Gridded Spatial Hazard Fields ---
@router.get("/hazards/overview", response_model=Dict[str, Any])
async def get_hazards_overview(event_id: str = Query(None), lead_hours: int = Query(48)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    overview = HazardFieldEngine.get_hazard_overview(eid, lead_hours=lead_hours)
    return {
        "success": True,
        "data": overview.model_dump()
    }

@router.get("/hazards/geojson", response_model=Dict[str, Any])
async def get_hazards_geojson(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    geojson = HazardFieldEngine.get_spatial_hazard_geojson(eid)
    return {
        "success": True,
        "data": geojson
    }

# --- 4. Asset Impact Probabilities & Cascading Network ---
@router.get("/impact/assets", response_model=Dict[str, Any])
async def get_asset_impacts(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    assets = ImpactProbabilityEngine.get_critical_assets_impact(eid)
    return {
        "success": True,
        "count": len(assets),
        "data": [a.model_dump() for a in assets]
    }

@router.get("/impact/cascading-network", response_model=Dict[str, Any])
async def get_cascading_network(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    network = ImpactProbabilityEngine.get_cascading_network_graph(eid)
    return {
        "success": True,
        "data": network
    }

# --- 5. Scientific Backtesting & Verification ---
@router.get("/backtesting/metrics", response_model=Dict[str, Any])
async def get_backtesting_metrics(event_id: str = Query("hist-fani-2019")):
    metrics = BacktestEngine.get_verification_metrics(event_id)
    return {
        "success": True,
        "data": metrics
    }

# --- 6. Early Response Action Prioritization ---
@router.get("/actions/priority", response_model=Dict[str, Any])
async def get_priority_actions(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    actions = ActionPrioritizationEngine.get_priority_actions(eid)
    return {
        "success": True,
        "data": actions
    }

# --- 7. Data Quality & Dynamic Freshness ---
@router.get("/data-quality/report", response_model=Dict[str, Any])
async def get_data_quality_report(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    report = DataQualityEngine.evaluate_pipeline_quality(eid)
    return {
        "success": True,
        "data": report.model_dump()
    }

@router.get("/freshness/providers", response_model=Dict[str, Any])
async def get_freshness_providers():
    freshness = FreshnessEngine.get_providers_freshness()
    return {
        "success": True,
        "count": len(freshness),
        "data": [p.model_dump() for p in freshness]
    }

# --- 8. AI Copilot V2 with Evidence Grounding ---
@router.post("/ai/copilot-v2", response_model=Dict[str, Any])
async def process_copilot_v2_query(payload: CopilotQueryRequest):
    result = GeminiCopilotV2.process_query(payload.query, event_id=payload.event_id or settings.DEFAULT_EVENT_ID)
    return {
        "success": True,
        "data": result
    }

# --- 9. Official IMD Cyclone Bulletin Ingestion (Section 12) ---
@router.get("/imd/official-bulletin", response_model=Dict[str, Any])
async def get_official_imd_bulletin(event_id: str = Query(None)):
    eid = event_id or settings.DEFAULT_EVENT_ID
    bulletin = IMDProvider().get_official_bulletin(eid)
    return {
        "success": True,
        "data": bulletin.model_dump()
    }

# --- 10. Emergency Route Risk Intelligence (Sections 8 & 37) ---
class RouteRiskRequest(BaseModel):
    origin_lat: float = 20.2961
    origin_lon: float = 85.8245
    dest_lat: float = 19.8135
    dest_lon: float = 85.8312
    origin_name: Optional[str] = "Bhubaneswar State EOC"
    dest_name: Optional[str] = "District Hospital, Puri"

@router.post("/routes/risk", response_model=Dict[str, Any])
async def compute_route_risk(payload: RouteRiskRequest):
    engine = RouteRiskEngine()
    assessment = await engine.compute_route_risk(
        origin_lat=payload.origin_lat,
        origin_lon=payload.origin_lon,
        dest_lat=payload.dest_lat,
        dest_lon=payload.dest_lon,
        origin_name=payload.origin_name or "Bhubaneswar State EOC",
        dest_name=payload.dest_name or "District Hospital, Puri"
    )
    return {
        "success": True,
        "data": assessment.model_dump()
    }

# --- 11. Vertex AI Predictive Impact Model (Sections 15-18) ---
@router.post("/vertex/predict", response_model=Dict[str, Any])
async def predict_vertex_impact(payload: VertexFeatureVector, run_id: str = Query("RUN-20260928-18Z")):
    provider = VertexAIImpactProvider()
    prediction = provider.predict_asset_impact(payload, input_run_id=run_id)
    return {
        "success": True,
        "data": prediction.model_dump()
    }

@router.get("/vertex/pipeline-status", response_model=Dict[str, Any])
async def get_vertex_pipeline_status():
    status_info = VertexTrainingPipeline.get_pipeline_status()
    return {
        "success": True,
        "data": status_info
    }

# --- 12. BigQuery Analytics & Archival Layer (Section 19) ---
@router.get("/bigquery/overview", response_model=Dict[str, Any])
async def get_bigquery_overview():
    bq = BigQueryAnalyticsService()
    return {
        "success": True,
        "data": bq.get_datasets_overview()
    }

@router.get("/bigquery/backtest-history", response_model=Dict[str, Any])
async def get_bigquery_backtests(storm_name: str = Query("FANI")):
    bq = BigQueryAnalyticsService()
    records = bq.query_historical_backtests(storm_name=storm_name)
    return {
        "success": True,
        "storm_name": storm_name,
        "count": len(records),
        "data": records
    }

# --- 13. ISRO / Bhuvan Disaster Datasets (Section 28) ---
@router.get("/bhuvan/datasets", response_model=Dict[str, Any])
async def get_bhuvan_datasets():
    from app.providers.bhuvan_provider import BhuvanProvider
    bp = BhuvanProvider()
    return {
        "success": True,
        "count": len(bp.get_datasets()),
        "data": bp.get_datasets()
    }

# --- 14. Voice Command Center (Sections 33 & 34) ---
class VoiceCommandRequest(BaseModel):
    transcript: Optional[str] = None
    language_code: str = "en-IN"
    is_demo: bool = False
    demo_command: Optional[str] = None

@router.post("/voice/command", response_model=Dict[str, Any])
async def process_voice_command(payload: VoiceCommandRequest):
    from app.services.voice_service import VoiceCommandService
    vs = VoiceCommandService()
    res = await vs.handle_voice_query(
        transcript=payload.transcript,
        language_code=payload.language_code,
        is_demo=payload.is_demo,
        demo_command=payload.demo_command
    )
    return {
        "success": res.get("success", True) if isinstance(res, dict) else True,
        "data": res
    }

# --- 15. Multilingual Advisory Translation (Section 25) ---
class AdvisoryTranslationRequest(BaseModel):
    source_advisory_id: str
    english_title: str
    english_body: str
    target_language: str = "hi"

@router.post("/alerts/translate", response_model=Dict[str, Any])
async def translate_advisory_endpoint(payload: AdvisoryTranslationRequest):
    from app.services.translation_service import TranslationService
    ts = TranslationService()
    res = await ts.translate_advisory(
        source_advisory_id=payload.source_advisory_id,
        english_title=payload.english_title,
        english_body=payload.english_body,
        target_language=payload.target_language
    )
    return {
        "success": True,
        "data": res.model_dump()
    }

# --- 16. Multimodal Vision Classification (Section 40) ---
class SatelliteVisionRequest(BaseModel):
    image_id: Optional[str] = "S1-SAR-ODISHA-PASS-0927"
    sensor: Optional[str] = "Sentinel-1 C-Band SAR"
    notes: Optional[str] = "Pre/post landfall backscatter delta"

@router.post("/ai/classify-satellite", response_model=Dict[str, Any])
async def classify_satellite_image(payload: SatelliteVisionRequest):
    res = GeminiCopilotV2.classify_satellite_image(payload.model_dump())
    return {
        "success": True,
        "data": res
    }

# --- 17. WeatherNext Cyclones Neural Inference Worker (Section 14) ---
class CycloneInferenceRequest(BaseModel):
    event_id: str = "DEMO-TC-2026-ALPHA"
    lead_hours: int = 72
    perturbation_spread: float = 1.0

@router.post("/weathernext-cyclones/run", response_model=Dict[str, Any])
async def run_weathernext_cyclones_worker(payload: CycloneInferenceRequest):
    from app.providers.weathernext_cyclone_provider import WeatherNextCycloneProvider
    provider = WeatherNextCycloneProvider()
    job_id = await provider.schedule_background_inference(
        event_id=payload.event_id,
        lead_hours=payload.lead_hours,
        perturbation_spread=payload.perturbation_spread
    )
    return {
        "success": True,
        "job_id": job_id,
        "status": "QUEUED",
        "message": "WeatherNext Cyclones neural inference dispatched to background worker. Non-blocking asynchronous execution."
    }
