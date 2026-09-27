import json
from pathlib import Path
from fastapi import APIRouter, Query
from app.core.config import settings
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, HotspotZone
from app.providers.infrastructure_provider import GeoJSONInfrastructureProvider
from app.services.risk_engine import RiskEngine
from app.services.confidence_engine import ConfidenceEngine
from app.services.exposure_engine import ExposureEngine

router = APIRouter(prefix="/risk", tags=["Risk & Hotspots"])

infra_provider = GeoJSONInfrastructureProvider()
risk_engine = RiskEngine()
confidence_engine = ConfidenceEngine()
exposure_engine = ExposureEngine()

def load_precomputed_risk():
    risk_file = settings.DEMO_DATA_PATH / "risk_precomputed.json"
    if risk_file.exists():
        with open(risk_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

@router.get("")
async def get_risk_overview(event_id: str = Query("DEMO-TC-2026-ALPHA")):
    """Returns top-level risk metrics, confidence score with limiting factors, and priority zones."""
    precomputed = load_precomputed_risk()
    hotspots = [HotspotZone(**h) for h in precomputed.get("top_priority_zones", [])]
    confidence = confidence_engine.evaluate_confidence(has_official_surge=False)
    pop_exposure = exposure_engine.estimate_population_exposure(precomputed.get("overall_metrics", {}).get("overall_risk_score", 82))
    
    overview = risk_engine.compute_risk_overview(
        event_id=event_id,
        hotspots=hotspots,
        infrastructure=[],
        confidence_breakdown=confidence,
        population_exposure=pop_exposure
    )

    return APIResponse(
        data=overview,
        meta=ResponseMeta(
            source="CYCLONE-X Risk Synthesis Engine v1.0",
            freshness="SYNTHESIZED",
            confidence=float(confidence.score),
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )

@router.get("/hotspots")
async def get_hotspots(event_id: str = Query("DEMO-TC-2026-ALPHA")):
    """Returns ranked priority hotspot zones with geometry and hazard drivers."""
    precomputed = load_precomputed_risk()
    hotspots = precomputed.get("top_priority_zones", [])
    
    # Format as GeoJSON FeatureCollection for direct map consumption
    features = [
        {
            "type": "Feature",
            "properties": {
                "zone_id": h["zone_id"],
                "name": h["name"],
                "risk_score": h["risk_score"],
                "risk_band": h["risk_band"],
                "hazard_score": h["hazard_score"],
                "exposure_score": h["exposure_score"],
                "vulnerability_score": h["vulnerability_score"],
                "top_hazard": h["top_hazard"],
                "critical_assets_count": h["critical_assets_count"],
                "exposed_assets": h["exposed_assets"],
                "population_estimate": h["population_estimate"],
                "suggested_action": h["suggested_action"]
            },
            "geometry": h["geometry"]
        }
        for h in hotspots
    ]

    return APIResponse(
        data={
            "type": "FeatureCollection",
            "features": features
        },
        meta=ResponseMeta(
            source="Spatial Hotspot Cluster Engine",
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )

@router.get("/infrastructure")
async def get_infrastructure_risk(event_id: str = Query("DEMO-TC-2026-ALPHA")):
    """Returns intersected hazard and risk scores for all critical infrastructure assets."""
    assets = await infra_provider.get_all_assets()
    assessments = risk_engine.assess_infrastructure_risk(assets)

    return APIResponse(
        data=assessments,
        meta=ResponseMeta(
            source="Infrastructure Vulnerability Assessment Module",
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )

@router.get("/population")
async def get_population_exposure(event_id: str = Query("DEMO-TC-2026-ALPHA")):
    """Returns demographic exposure stratified across LOW, MODERATE, HIGH, and SEVERE risk tiers."""
    pop_exposure = exposure_engine.estimate_population_exposure(82)
    return APIResponse(
        data=pop_exposure,
        meta=ResponseMeta(
            source="WorldPop Global 100m Demographic Model",
            freshness="CACHED BASELINE",
            data_classification=DataClassification.MODEL_OUTPUT
        )
    )
