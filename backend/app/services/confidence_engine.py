from typing import List, Dict, Any
from app.core.config import settings
from app.models.schemas import ConfidenceBreakdown

class ConfidenceEngine:
    """Calculates transparent data confidence metrics and explains limiting factors."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or settings.load_risk_config()
        self.penalties = self.config.get("confidence_penalties", {})

    def evaluate_confidence(
        self,
        has_official_surge: bool = False,
        satellite_age_hours: float = 12.0,
        weather_resolution_km: float = 9.0,
        infrastructure_count: int = 15,
        has_coastal_radar: bool = True
    ) -> ConfidenceBreakdown:
        """Computes data completeness, source freshness, temporal consistency, spatial coverage."""
        completeness = 95
        freshness = 90
        temporal = 90
        spatial = 88
        
        limiting_factors: List[str] = []

        if not has_official_surge:
            penalty = self.penalties.get("missing_surge_input", 15.0)
            completeness -= int(penalty)
            limiting_factors.append(
                f"Missing hydrodynamic storm surge forecast (-{int(penalty)}%); using Scenario Inundation Proxy."
            )

        if satellite_age_hours > 6.0:
            penalty = self.penalties.get("stale_satellite_over_24h", 12.0)
            freshness -= int(penalty)
            limiting_factors.append(
                f"Satellite observation is {satellite_age_hours:.1f} hours prior to current forecast cycle."
            )

        if weather_resolution_km >= 9.0:
            penalty = self.penalties.get("coarse_weather_resolution", 8.0)
            spatial -= int(penalty)
            limiting_factors.append(
                f"Global numerical weather forecast resolution ({weather_resolution_km} km) lacks fine coastal micro-terrain downscaling."
            )

        if infrastructure_count < 25:
            penalty = self.penalties.get("incomplete_infrastructure", 10.0)
            completeness -= int(penalty)
            limiting_factors.append(
                "Critical infrastructure inventory relies on open baseline records; rural secondary feeders partially represented."
            )

        # Harmonic/geometric blend normalized to 0-100
        score = int(round((completeness * 0.35) + (freshness * 0.25) + (temporal * 0.20) + (spatial * 0.20)))
        score = max(30, min(100, score))

        return ConfidenceBreakdown(
            score=score,
            data_completeness=completeness,
            source_freshness=freshness,
            temporal_consistency=temporal,
            spatial_coverage=spatial,
            limiting_factors=limiting_factors
        )
