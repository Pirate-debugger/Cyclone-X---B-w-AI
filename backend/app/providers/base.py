from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.models.schemas import (
    CycloneEvent,
    TrackCollection,
    WeatherData,
    InfrastructureAsset,
    Alert
)

class CycloneTrackProvider(ABC):
    """Interface for cyclone tracks (best track & forecast track)."""
    @abstractmethod
    async def get_active_events(self) -> List[CycloneEvent]:
        pass

    @abstractmethod
    async def get_event_by_id(self, event_id: str) -> Optional[CycloneEvent]:
        pass

    @abstractmethod
    async def get_track(self, event_id: str) -> TrackCollection:
        pass


class WeatherProvider(ABC):
    """Interface for weather forecast observations."""
    @abstractmethod
    async def get_forecast(self, latitude: float, longitude: float, event_id: Optional[str] = None) -> WeatherData:
        pass


class SatelliteProvider(ABC):
    """Interface for satellite observation metadata, Earth Engine tiles & change detection."""
    @abstractmethod
    async def get_available_datasets(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def get_tile_url(self, dataset_id: str, bbox: Optional[List[float]] = None) -> Dict[str, Any]:
        pass


class StormSurgeProvider(ABC):
    """Interface for storm surge observations and proxy scenarios."""
    @abstractmethod
    async def get_surge_snapshot(self, event_id: str) -> Dict[str, Any]:
        pass


class InfrastructureProvider(ABC):
    """Interface for critical infrastructure retrieval and geo-filtering."""
    @abstractmethod
    async def get_all_assets(self) -> List[InfrastructureAsset]:
        pass

    @abstractmethod
    async def get_assets_by_bbox(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> List[InfrastructureAsset]:
        pass


class NotificationProvider(ABC):
    """Interface for human-approved dispatch channels."""
    @abstractmethod
    async def send_alert(self, alert: Alert) -> Dict[str, Any]:
        pass
