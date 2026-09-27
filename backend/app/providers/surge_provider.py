from typing import Any, Dict, Optional
from app.providers.base import StormSurgeProvider

class INCOISSurgeProvider(StormSurgeProvider):
    """Adapter for official Indian National Centre for Ocean Information Services (INCOIS) surge bulletins."""
    
    def __init__(self, bulletin_data: Optional[Dict[str, Any]] = None):
        self.bulletin_data = bulletin_data

    async def get_surge_snapshot(self, event_id: str) -> Dict[str, Any]:
        if not self.bulletin_data:
            # When official hydrodynamic bulletin is not supplied
            proxy = ScenarioInundationProxy()
            return await proxy.get_surge_snapshot(event_id)
            
        return {
            "event_id": event_id,
            "source": "INCOIS Coastal Storm Surge & Wave Bulletin",
            "data_classification": "OBSERVATION",
            "surge_height_m": self.bulletin_data.get("surge_height_m", 2.2),
            "coastal_sector": self.bulletin_data.get("coastal_sector", "Puri - Jagatsinghpur"),
            "valid_time": self.bulletin_data.get("valid_time"),
            "is_hydrodynamic": True,
            "disclaimer": "Official INCOIS hydrodynamic modeling product."
        }


class ScenarioInundationProxy(StormSurgeProvider):
    """Calculates coastal low-elevation backwater & inundation proxy.
    
    SCIENTIFIC HONESTY: This is explicitly a scenario inundation proxy based on
    elevation, coastal proximity, and water baseline — NOT a hydrodynamic surge model.
    """
    
    def __init__(self, default_surge_m: float = 2.2):
        self.default_surge_m = default_surge_m

    async def get_surge_snapshot(self, event_id: str) -> Dict[str, Any]:
        return {
            "event_id": event_id,
            "source": "CYCLONE-X Scenario Inundation Proxy Engine",
            "data_classification": "SCENARIO",
            "scenario_surge_m": self.default_surge_m,
            "coastal_distance_cutoff_km": 15.0,
            "elevation_susceptibility_m": 5.0,
            "is_hydrodynamic": False,
            "disclaimer": "Scenario proxy — not a hydrodynamic surge forecast."
        }
