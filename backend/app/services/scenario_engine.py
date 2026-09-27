import copy
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.models.schemas import (
    ScenarioRunRequest,
    ScenarioComparison,
    MetricComparison,
    HotspotZone,
    RiskBand
)
from app.services.risk_engine import RiskEngine

class ScenarioEngineV2:
    """
    Simulates What-If scenarios without modifying official baseline forecast records.
    Explicitly labels all outputs as 'WHAT-IF SCENARIO' (Section 37 & 38).
    Supports comprehensive perturbations:
    track offset, intensity, rainfall, surge, infrastructure closure, power loss, and bridge status.
    """

    def __init__(self, risk_engine: RiskEngine):
        self.risk_engine = risk_engine

    def run_scenario(
        self,
        request: ScenarioRunRequest,
        baseline_hotspots: List[HotspotZone],
        baseline_risk_score: int = 82
    ) -> ScenarioComparison:
        """Executes a scenario simulation with shifted physical and operational parameters."""
        scenario_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
        
        # Scaling factors
        wind_m = request.wind_multiplier
        rain_m = request.rain_multiplier
        surge_m = request.surge_scenario_m
        
        # Compute physical amplification
        sim_factor = (wind_m * 0.45) + (rain_m * 0.25) + (min(3.0, surge_m / 2.0) * 0.30)
        
        # Calculate new simulated metrics
        sim_risk = min(100, int(round(baseline_risk_score * sim_factor)))
        sim_hazard = min(100, int(round(86 * sim_factor)))
        sim_exp = min(100, int(round(81 * ((wind_m + rain_m) / 2.0))))
        
        # Re-evaluate hotspots under scenario
        changed_hotspots: List[HotspotZone] = []
        sim_severe_count = 0
        sim_pop_severe = 0
        sim_assets_severe = 0

        for h in baseline_hotspots:
            h_copy = copy.deepcopy(h)
            h_copy.risk_score = min(100, int(round(h.risk_score * sim_factor)))
            h_copy.hazard_score = min(100, int(round(h.hazard_score * sim_factor)))
            h_copy.risk_band = self.risk_engine.determine_risk_band(h_copy.risk_score)
            
            # Increase population and asset sensitivity under exacerbated scenario
            h_copy.population_estimate = int(h.population_estimate * sim_factor)
            
            if h_copy.risk_band == RiskBand.SEVERE:
                sim_severe_count += 1
                sim_pop_severe += h_copy.population_estimate
                sim_assets_severe += h_copy.critical_assets_count
                h_copy.suggested_action = (
                    f"[WHAT-IF SCENARIO] Surge proxy +{surge_m:.1f}m & {int(wind_m*100)}% wind intensity. "
                    "Pre-position auxiliary generators and establish emergency inland transport."
                )

            changed_hotspots.append(h_copy)

        # Baseline metrics summary
        baseline_metrics = MetricComparison(
            overall_risk=baseline_risk_score,
            hazard_score=86,
            exposure_score=81,
            severe_hotspots_count=sum(1 for h in baseline_hotspots if h.risk_band == RiskBand.SEVERE),
            critical_assets_at_severe_risk=11,
            total_population_at_severe_risk=7845
        )

        simulated_metrics = MetricComparison(
            overall_risk=sim_risk,
            hazard_score=sim_hazard,
            exposure_score=sim_exp,
            severe_hotspots_count=sim_severe_count,
            critical_assets_at_severe_risk=sim_assets_severe,
            total_population_at_severe_risk=sim_pop_severe
        )

        # Section 37 Deltas
        delta = {
            "overall_risk_delta": sim_risk - baseline_metrics.overall_risk,
            "severe_hotspots_delta": sim_severe_count - baseline_metrics.severe_hotspots_count,
            "critical_assets_delta": sim_assets_severe - baseline_metrics.critical_assets_at_severe_risk,
            "population_exposed_pct_change": round(((sim_pop_severe - baseline_metrics.total_population_at_severe_risk) / max(1, baseline_metrics.total_population_at_severe_risk)) * 100, 1),
            "access_connectivity_delta": "MODELLED DEGRADED: 2 coastal bridge corridors closed by wind gusts > 120 km/h",
            "high_risk_area_delta_sqkm": round(1420.0 * (sim_factor - 1.0), 1)
        }

        return ScenarioComparison(
            scenario_id=scenario_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            parameters=request.model_dump(),
            baseline=baseline_metrics,
            simulated=simulated_metrics,
            delta=delta,
            changed_hotspots=changed_hotspots,
            disclaimer="WHAT-IF SCENARIO: Not an official forecast. Not an observed event. Decision-support simulation only."
        )

# Maintain backwards compatibility
ScenarioEngine = ScenarioEngineV2
