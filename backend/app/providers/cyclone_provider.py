import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import CycloneEvent, TrackCollection, BestTrackPoint, ForecastTrackPoint, DataClassification
from app.providers.base import CycloneTrackProvider

class DemoCycloneProvider(CycloneTrackProvider):
    """Loads verified simulated Demo cyclone data for offline / DEMO MODE operation."""
    
    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir

    async def get_active_events(self) -> List[CycloneEvent]:
        events_file = self.demo_dir / "events.json"
        if not events_file.exists():
            logger.warning(f"Demo events file not found at {events_file}")
            return []
        with open(events_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [CycloneEvent(**item) for item in data]

    async def get_event_by_id(self, event_id: str) -> Optional[CycloneEvent]:
        events = await self.get_active_events()
        for ev in events:
            if ev.event_id == event_id:
                return ev
        return None

    async def get_track(self, event_id: str) -> TrackCollection:
        track_file = self.demo_dir / "tracks.json"
        if not track_file.exists():
            return TrackCollection(
                event_id=event_id,
                name="Unknown Event",
                issue_time="2026-09-27T00:00:00Z",
                source="Demo File Provider",
                observed_track=[],
                forecast_track=[]
            )
        with open(track_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return TrackCollection(**data)


class IBTrACSProvider(CycloneTrackProvider):
    """Historical cyclone best-track provider using NOAA IBTrACS data format."""
    
    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir

    async def get_active_events(self) -> List[CycloneEvent]:
        # IBTrACS is for historical reference, not live forecast
        fani_file = self.demo_dir / "historical_fani.json"
        if not fani_file.exists():
            return []
        with open(fani_file, "r", encoding="utf-8") as f:
            raw = json.load(f)
        return [
            CycloneEvent(
                event_id=raw["event_id"],
                name=raw["name"],
                basin=raw["basin"],
                category=raw["category"],
                current_lat=raw["track"][-2]["latitude"],
                current_lon=raw["track"][-2]["longitude"],
                max_sustained_wind_kmh=raw["peak_wind_kmh"],
                max_gust_kmh=raw["peak_wind_kmh"] * 1.2,
                central_pressure_hpa=raw["min_pressure_hpa"],
                movement_direction="NE",
                movement_speed_kmh=19.0,
                status="Archived (Historical Analysis)",
                data_classification=DataClassification.HISTORICAL,
                source="NOAA IBTrACS v04r00",
                timestamp=raw["track"][-2]["timestamp"],
                forecast_horizon="None (Historical Track Only)",
                notes=raw["disclaimer"]
            )
        ]

    async def get_event_by_id(self, event_id: str) -> Optional[CycloneEvent]:
        events = await self.get_active_events()
        for ev in events:
            if ev.event_id == event_id:
                return ev
        return None

    async def get_track(self, event_id: str) -> TrackCollection:
        fani_file = self.demo_dir / "historical_fani.json"
        if not fani_file.exists():
            return TrackCollection(
                event_id=event_id,
                name="Historical Track",
                issue_time="Historical",
                source="NOAA IBTrACS",
                observed_track=[],
                forecast_track=[]
            )
        with open(fani_file, "r", encoding="utf-8") as f:
            raw = json.load(f)
        
        observed = [
            BestTrackPoint(
                point_id=f"HIST-{idx}",
                timestamp=pt["timestamp"],
                latitude=pt["latitude"],
                longitude=pt["longitude"],
                wind_speed_kmh=pt["wind_kmh"],
                gust_kmh=pt["wind_kmh"] * 1.2,
                central_pressure_hpa=pt["pressure_hpa"],
                category="Historical Best Track",
                data_type=DataClassification.HISTORICAL,
                source="NOAA IBTrACS v04r00"
            )
            for idx, pt in enumerate(raw.get("track", []))
        ]
        return TrackCollection(
            event_id=raw["event_id"],
            name=raw["name"],
            issue_time=raw["landfall_date"],
            source="NOAA IBTrACS v04r00 (Historical)",
            data_classification="HISTORICAL",
            disclaimer=raw["disclaimer"],
            observed_track=observed,
            forecast_track=[]  # Explicit rule: never call historical best-track a forecast
        )
