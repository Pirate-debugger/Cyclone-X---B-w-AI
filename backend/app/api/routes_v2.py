from fastapi import APIRouter, Query, HTTPException, Body
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from app.services.ensemble_engine import EnsembleAggregator, LandfallProbabilityEngine
from app.services.forecast_comparison_engine import ForecastComparisonEngine
from app.services.hazard_field_engine import HazardFieldEngine
from app.services.impact_probability_engine import ImpactProbabilityEngine
from app.services.data_quality_engine import DataQualityEngine
from app.services.freshness_engine import FreshnessEngine
from app.services.backtest_engine import BacktestEngine
from app.services.action_prioritization_engine import ActionPrioritizationEngine
from app.services.gemini_copilot_v2 import GeminiCopilotV2
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
    event_id: Optional[str] = "cyclone-alpha"

# --- 1. Ensemble Intelligence ---
@router.get("/ensemble/aggregation", response_model=Dict[str, Any])
async def get_ensemble_aggregation(event_id: str = Query("cyclone-alpha")):
    res = EnsembleAggregator.get_ensemble_aggregation(event_id)
    return {
        "success": True,
        "data": res.model_dump()
    }

@router.get("/ensemble/members", response_model=Dict[str, Any])
async def get_ensemble_members(event_id: str = Query("cyclone-alpha")):
    members = EnsembleAggregator.get_all_raw_members(event_id)
    return {
        "success": True,
        "count": len(members),
        "data": [m.model_dump() for m in members]
    }

@router.get("/ensemble/landfall-sectors", response_model=Dict[str, Any])
async def get_landfall_sectors(event_id: str = Query("cyclone-alpha")):
    sectors = LandfallProbabilityEngine.calculate_sector_landfall_probabilities(event_id)
    return {
        "success": True,
        "data": [s.model_dump() for s in sectors]
    }

# --- 2. Model Comparison & Run Evolution ---
@router.get("/forecast/comparison", response_model=Dict[str, Any])
async def get_model_comparison(event_id: str = Query("cyclone-alpha")):
    consensus = ForecastComparisonEngine.get_multi_model_consensus(event_id)
    return {
        "success": True,
        "data": consensus.model_dump()
    }

@router.get("/forecast/evolution", response_model=Dict[str, Any])
async def get_forecast_evolution(event_id: str = Query("cyclone-alpha")):
    evo = ForecastComparisonEngine.get_forecast_evolution(event_id)
    return {
        "success": True,
        "data": evo
    }

# --- 3. Gridded Spatial Hazard Fields ---
@router.get("/hazards/overview", response_model=Dict[str, Any])
async def get_hazards_overview(event_id: str = Query("cyclone-alpha"), lead_hours: int = Query(48)):
    overview = HazardFieldEngine.get_hazard_overview(event_id, lead_hours=lead_hours)
    return {
        "success": True,
        "data": overview.model_dump()
    }

@router.get("/hazards/geojson", response_model=Dict[str, Any])
async def get_hazards_geojson(event_id: str = Query("cyclone-alpha")):
    geojson = HazardFieldEngine.get_spatial_hazard_geojson(event_id)
    return {
        "success": True,
        "data": geojson
    }

# --- 4. Asset Impact Probabilities & Cascading Network ---
@router.get("/impact/assets", response_model=Dict[str, Any])
async def get_asset_impacts(event_id: str = Query("cyclone-alpha")):
    assets = ImpactProbabilityEngine.get_critical_assets_impact(event_id)
    return {
        "success": True,
        "count": len(assets),
        "data": [a.model_dump() for a in assets]
    }

@router.get("/impact/cascading-network", response_model=Dict[str, Any])
async def get_cascading_network(event_id: str = Query("cyclone-alpha")):
    network = ImpactProbabilityEngine.get_cascading_network_graph(event_id)
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
async def get_priority_actions(event_id: str = Query("cyclone-alpha")):
    actions = ActionPrioritizationEngine.get_priority_actions(event_id)
    return {
        "success": True,
        "data": actions
    }

# --- 7. Data Quality & Dynamic Freshness ---
@router.get("/data-quality/report", response_model=Dict[str, Any])
async def get_data_quality_report(event_id: str = Query("cyclone-alpha")):
    report = DataQualityEngine.evaluate_pipeline_quality(event_id)
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
    result = GeminiCopilotV2.process_query(payload.query, event_id=payload.event_id or "cyclone-alpha")
    return {
        "success": True,
        "data": result
    }
