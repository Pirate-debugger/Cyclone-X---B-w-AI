from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, ScenarioRunRequest, HotspotZone
from app.services.risk_engine import RiskEngine
from app.services.scenario_engine import ScenarioEngine
from app.api.routes_risk import load_precomputed_risk

router = APIRouter(prefix="/scenarios", tags=["Scenario Simulator"])

risk_engine = RiskEngine()
scenario_engine = ScenarioEngine(risk_engine)

# In-memory storage for executed scenarios in current session
_scenario_cache: Dict[str, Any] = {}

@router.post("/run")
async def run_scenario(request: ScenarioRunRequest):
    """Executes a what-if physical parameter simulation and returns impact deltas."""
    precomputed = load_precomputed_risk()
    baseline_hotspots = [HotspotZone(**h) for h in precomputed.get("top_priority_zones", [])]
    baseline_risk = precomputed.get("overall_metrics", {}).get("overall_risk_score", 82)

    result = scenario_engine.run_scenario(request, baseline_hotspots, baseline_risk)
    _scenario_cache[result.scenario_id] = result

    return APIResponse(
        data=result,
        meta=ResponseMeta(
            source="CYCLONE-X Scenario Simulation Engine",
            freshness="SIMULATION RUN",
            confidence=68.0,
            data_classification=DataClassification.SCENARIO,
            disclaimer="Scenario proxy simulation — not an official operational forecast."
        )
    )

@router.get("/{scenario_id}")
async def get_scenario(scenario_id: str):
    """Retrieves results of a previously executed scenario simulation."""
    if scenario_id not in _scenario_cache:
        raise HTTPException(status_code=404, detail=f"Scenario run '{scenario_id}' not found")
        
    return APIResponse(
        data=_scenario_cache[scenario_id],
        meta=ResponseMeta(
            source="CYCLONE-X Scenario Storage",
            data_classification=DataClassification.SCENARIO
        )
    )
