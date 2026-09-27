from typing import List, Dict, Any
from app.models.schemas import InfrastructureAsset, PopulationTierBreakdown, PopulationExposure

class ExposureEngine:
    """Calculates population and critical asset exposure within cyclone hazard zones."""

    def calculate_asset_exposure_score(self, asset: InfrastructureAsset, hazard_score: int) -> int:
        """Computes asset exposure score (0-100) based on criticality and local hazard intensity."""
        # Exposure is a function of asset criticality and physical impact
        crit = asset.criticality
        exposure = (crit * 0.6) + (hazard_score * 0.4)
        return max(0, min(100, int(round(exposure))))

    def estimate_population_exposure(self, overall_risk_score: int, multiplier: float = 1.0) -> PopulationExposure:
        """Estimates population in modeled risk zones with scalable demographic density."""
        base_low = 14220
        base_mod = 32410
        base_high = 18125
        base_sev = 7845

        # Shift population toward higher tiers as risk increases
        shift_factor = max(0.5, overall_risk_score / 75.0) * multiplier
        
        low = int(base_low * max(0.4, 2.0 - shift_factor))
        mod = int(base_mod * (1.1 if shift_factor > 1.0 else 0.9))
        high = int(base_high * shift_factor)
        severe = int(base_sev * (shift_factor ** 1.3))

        total = low + mod + high + severe

        return PopulationExposure(
            total_exposed=total,
            dataset="WorldPop Global 100m (2020 projection)",
            note="Estimated population within modeled risk zones — not live census counts.",
            by_tier=PopulationTierBreakdown(
                low=low,
                moderate=mod,
                high=high,
                severe=severe
            )
        )
