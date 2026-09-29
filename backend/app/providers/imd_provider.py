import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas_v2 import (
    OfficialForecastRun,
    OfficialForecastPoint,
    DataClassification
)

class IMDProvider:
    """
    Official India Meteorological Department (IMD / RSMC New Delhi) Bulletin Provider.
    Requirements 21 & 22 Compliance:
    - Never modify official values.
    - Never replace official warnings with AI outputs.
    - In LIVE mode: if real IMD bulletin exists: OFFICIAL IMD; otherwise: OFFICIAL SOURCE UNAVAILABLE.
    - In DEMO mode: SIMULATED CYCLONE SCENARIO.
    - Never label synthetic data as OFFICIAL IMD or OFFICIAL GOVERNMENT WARNING.
    - Every bulletin: source, bulletin ID, issue time, retrieved_at, source URL, classification must be traceable.
    - Never manufacture bulletin number or warning text.
    """

    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir
        self.enabled = settings.IMD_ENABLED

    def get_official_bulletin(self, event_id: Optional[str] = None) -> OfficialForecastRun:
        """
        Retrieves the official RSMC bulletin for the specified cyclonic event.
        Strictly enforces live vs demo separation.
        """
        target_event = event_id or settings.DEFAULT_EVENT_ID
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z")

        # 1. LIVE MODE
        if settings.APP_MODE == "live":
            # If a live operational IMD client/scraper is implemented and active:
            # Otherwise, truthfully report that the official source is unavailable:
            return OfficialForecastRun(
                event_id=target_event,
                cyclone_name="N/A",
                bulletin_number=None,
                bulletin_time=now_str,
                next_bulletin_time=None,
                warning_status="OFFICIAL_FEED_UNAVAILABLE",
                advisory_text="Official IMD RSMC bulletin feed is currently unavailable or unconfigured.",
                status="NOT_AVAILABLE",
                official_source="India Meteorological Department (RSMC New Delhi)",
                official_source_url="https://mausam.imd.gov.in/cyclone",
                classification=DataClassification.OFFICIAL_SOURCE_UNAVAILABLE,
                disclaimer="OFFICIAL SOURCE UNAVAILABLE. No active operational IMD bulletin received.",
                forecast_points=[]
            )

        # 2. DEMO MODE: Load calibrated simulation scenario
        imd_file = self.demo_dir / "imd_bulletin.json"
        if imd_file.exists():
            try:
                with open(imd_file, "r", encoding="utf-8") as f:
                    raw = json.load(f)
                raw["event_id"] = target_event
                # Ensure demo labeling is strict
                raw["status"] = "DEMO"
                raw["official_source"] = "SIMULATED CYCLONE SCENARIO"
                raw["classification"] = DataClassification.DEMO.value
                raw["disclaimer"] = "SIMULATED CYCLONE SCENARIO — Not an official government warning."
                return OfficialForecastRun(**raw)
            except Exception as e:
                logger.error(f"Error parsing IMD demo bulletin file: {str(e)}")

        # Fallback simulation object clearly marked DEMO
        return OfficialForecastRun(
            event_id=target_event,
            cyclone_name="SIMULATED CYCLONE SCENARIO ALPHA",
            bulletin_number=None,
            bulletin_time="2026-09-27T00:00:00Z",
            next_bulletin_time="2026-09-27T06:00:00Z",
            warning_status="SIMULATED EXTREMELY SEVERE CYCLONIC STORM SCENARIO",
            advisory_text="SIMULATED CYCLONE SCENARIO FOR DRILL & DISASTER PREPAREDNESS EVALUATION. NOT AN OFFICIAL GOVERNMENT WARNING.",
            observed_lat=16.80,
            observed_lon=86.40,
            current_intensity_kmh=155.0,
            central_pressure_hpa=965.0,
            estimated_landfall_sector="Puri - Astaranga Coastal Belt (Odisha)",
            estimated_landfall_time="2026-09-27T18:00:00Z",
            forecast_points=[
                OfficialForecastPoint(
                    valid_time="2026-09-27T00:00:00Z",
                    lead_hours=0,
                    latitude=16.80,
                    longitude=86.40,
                    max_sustained_wind_kmh=155.0,
                    max_gust_kmh=180.0,
                    central_pressure_hpa=965.0,
                    stage="Simulated Extremely Severe Cyclonic Storm",
                    r34_radius_km=140.0,
                    r50_radius_km=75.0
                ),
                OfficialForecastPoint(
                    valid_time="2026-09-27T12:00:00Z",
                    lead_hours=12,
                    latitude=18.05,
                    longitude=86.75,
                    max_sustained_wind_kmh=165.0,
                    max_gust_kmh=190.0,
                    central_pressure_hpa=955.0,
                    stage="Simulated Extremely Severe Cyclonic Storm",
                    r34_radius_km=155.0,
                    r50_radius_km=85.0
                ),
                OfficialForecastPoint(
                    valid_time="2026-09-28T00:00:00Z",
                    lead_hours=24,
                    latitude=19.30,
                    longitude=86.70,
                    max_sustained_wind_kmh=165.0,
                    max_gust_kmh=190.0,
                    central_pressure_hpa=958.0,
                    stage="Simulated Extremely Severe Cyclonic Storm",
                    r34_radius_km=160.0,
                    r50_radius_km=90.0
                ),
                OfficialForecastPoint(
                    valid_time="2026-09-28T12:00:00Z",
                    lead_hours=36,
                    latitude=20.25,
                    longitude=86.20,
                    max_sustained_wind_kmh=130.0,
                    max_gust_kmh=150.0,
                    central_pressure_hpa=975.0,
                    stage="Simulated Overland Deceleration",
                    r34_radius_km=130.0,
                    r50_radius_km=60.0
                )
            ],
            status="DEMO",
            official_source="SIMULATED CYCLONE SCENARIO",
            official_source_url="https://cyclonex.gov.in/scenarios/demo-tc-2026-alpha",
            classification=DataClassification.DEMO,
            disclaimer="SIMULATED CYCLONE SCENARIO — Not an official government warning."
        )
