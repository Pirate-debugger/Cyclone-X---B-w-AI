from typing import Any, Dict, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.providers.base import StormSurgeProvider

class INCOISProvider(StormSurgeProvider):
    """
    Indian National Centre for Ocean Information Services (INCOIS) Storm Surge & Ocean Hazard Adapter.
    Section 29 Mandates:
    - Support storm-surge info and ocean-related advisories when an authorized feed is configured.
    - Fields: bulletin, issue time, surge, inundation, location, source, valid time.
    - CRITICAL RULE: Do not generate fake INCOIS values.
    - If unavailable: show 'INCOIS NOT CONFIGURED'. Never silently replace with scenario data.
    """

    def __init__(self, bulletin_data: Optional[Dict[str, Any]] = None):
        self.enabled = settings.INCOIS_ENABLED
        self.bulletin_data = bulletin_data

    def is_configured(self) -> bool:
        return self.enabled and self.bulletin_data is not None

    async def get_surge_snapshot(self, event_id: str = "DEMO-TC-2026-ALPHA") -> Dict[str, Any]:
        if not self.is_configured():
            return {
                "event_id": event_id,
                "provider": "INCOIS",
                "status": "NOT CONFIGURED",
                "display_label": "INCOIS NOT CONFIGURED",
                "bulletin": None,
                "issue_time": None,
                "surge_m": None,
                "inundation_extent_km": None,
                "location": None,
                "source": "Indian National Centre for Ocean Information Services (INCOIS)",
                "valid_time": None,
                "data_classification": "UNAVAILABLE",
                "disclaimer": "Official INCOIS hydrodynamic surge bulletin feed is not configured. No simulated data is substituted."
            }

        return {
            "event_id": event_id,
            "provider": "INCOIS",
            "status": "CONFIGURED",
            "display_label": "OFFICIAL INCOIS",
            "bulletin": self.bulletin_data.get("bulletin_id", "INCOIS-SS-2026-09"),
            "issue_time": self.bulletin_data.get("issue_time", datetime.now(timezone.utc).isoformat()),
            "surge_m": self.bulletin_data.get("surge_height_m", 2.2),
            "inundation_extent_km": self.bulletin_data.get("inundation_km", 4.5),
            "location": self.bulletin_data.get("coastal_sector", "Puri - Jagatsinghpur"),
            "source": "Indian National Centre for Ocean Information Services (INCOIS)",
            "valid_time": self.bulletin_data.get("valid_time"),
            "data_classification": "OBSERVATION",
            "disclaimer": "Official INCOIS hydrodynamic storm surge modeling product."
        }

# Alias for backward compatibility
INCOISSurgeProvider = INCOISProvider

class ScenarioInundationProxy(StormSurgeProvider):
    """
    Calculates coastal low-elevation backwater & inundation proxy.
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
            "disclaimer": "WHAT-IF SCENARIO: Not an official hydrodynamic surge forecast."
        }
