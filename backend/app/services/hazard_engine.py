from typing import Dict, Any
from app.core.config import settings

class HazardEngine:
    """Calculates normalized 0-100 hazard scores for wind, precipitation, and coastal inundation."""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or settings.load_risk_config()
        self.w_thresh = self.config.get("wind_thresholds", {})
        self.r_thresh = self.config.get("rainfall_thresholds", {})
        self.s_thresh = self.config.get("surge_thresholds", {})
        self.h_weights = self.config.get("hazard_weights", {"wind": 0.40, "rainfall": 0.30, "inundation": 0.30})

    def normalize_wind_hazard(self, wind_speed_kmh: float) -> int:
        """Normalizes sustained wind speed to a 0-100 hazard score based on IMD/Saffir-Simpson."""
        gale_min = self.w_thresh.get("gale_force_min", 62.0)
        super_min = self.w_thresh.get("super_cyclone_min", 222.0)
        max_ref = self.w_thresh.get("max_reference_kmh", 260.0)

        if wind_speed_kmh <= 30.0:
            return int((wind_speed_kmh / 30.0) * 15.0)
        elif wind_speed_kmh <= gale_min:
            return int(15.0 + ((wind_speed_kmh - 30.0) / (gale_min - 30.0)) * 25.0)
        elif wind_speed_kmh <= super_min:
            return int(40.0 + ((wind_speed_kmh - gale_min) / (super_min - gale_min)) * 50.0)
        else:
            return min(100, int(90.0 + ((wind_speed_kmh - super_min) / (max_ref - super_min)) * 10.0))

    def normalize_rainfall_hazard(self, rainfall_24h_mm: float) -> int:
        """Normalizes 24-hr cumulative rainfall to a 0-100 hazard score."""
        mod_mm = self.r_thresh.get("moderate_mm", 64.5)
        ext_mm = self.r_thresh.get("extremely_heavy_mm", 204.5)
        exc_mm = self.r_thresh.get("exceptional_mm", 350.0)

        if rainfall_24h_mm <= mod_mm:
            return int((rainfall_24h_mm / mod_mm) * 35.0)
        elif rainfall_24h_mm <= ext_mm:
            return int(35.0 + ((rainfall_24h_mm - mod_mm) / (ext_mm - mod_mm)) * 45.0)
        else:
            ratio = (rainfall_24h_mm - ext_mm) / (exc_mm - ext_mm)
            return min(100, int(80.0 + ratio * 20.0))

    def normalize_inundation_hazard(self, inundation_depth_m: float, surge_height_m: float = 2.0) -> int:
        """Normalizes coastal surge proxy / inundation depth to 0-100 score."""
        if inundation_depth_m <= 0.05:
            # Low lying near coast but not overtopping
            return int(min(30.0, surge_height_m * 10.0))
        elif inundation_depth_m <= 0.5:
            return int(30.0 + (inundation_depth_m / 0.5) * 30.0)
        elif inundation_depth_m <= 1.5:
            return int(60.0 + ((inundation_depth_m - 0.5) / 1.0) * 25.0)
        else:
            return min(100, int(85.0 + min(15.0, (inundation_depth_m - 1.5) * 10.0)))

    def calculate_combined_hazard(
        self,
        wind_speed_kmh: float,
        rainfall_24h_mm: float,
        inundation_depth_m: float,
        surge_height_m: float = 2.0
    ) -> Dict[str, Any]:
        """Calculates sub-hazard scores and weighted combined hazard."""
        h_wind = self.normalize_wind_hazard(wind_speed_kmh)
        h_rain = self.normalize_rainfall_hazard(rainfall_24h_mm)
        h_inund = self.normalize_inundation_hazard(inundation_depth_m, surge_height_m)

        w_w = self.h_weights.get("wind", 0.40)
        w_r = self.h_weights.get("rainfall", 0.30)
        w_i = self.h_weights.get("inundation", 0.30)

        combined = int(round(h_wind * w_w + h_rain * w_r + h_inund * w_i))
        combined = max(0, min(100, combined))

        return {
            "combined_hazard_score": combined,
            "wind_hazard_score": h_wind,
            "rainfall_hazard_score": h_rain,
            "inundation_hazard_score": h_inund,
            "weights": {"wind": w_w, "rainfall": w_r, "inundation": w_i}
        }
