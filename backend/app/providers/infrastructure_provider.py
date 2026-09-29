import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from shapely.geometry import shape, Point, box
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import InfrastructureAsset, InfrastructureType
from app.providers.base import InfrastructureProvider

class GeoJSONInfrastructureProvider(InfrastructureProvider):
    """Provides validated critical infrastructure assets from GeoJSON sources."""
    
    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir
        self._assets: List[InfrastructureAsset] = []
        self._load_demo_assets()

    def _load_demo_assets(self):
        infra_file = self.demo_dir / "infrastructure.geojson"
        if not infra_file.exists():
            logger.warning(f"Infrastructure GeoJSON not found at {infra_file}")
            return
            
        with open(infra_file, "r", encoding="utf-8") as f:
            raw = json.load(f)

        features = raw.get("features", [])
        loaded: List[InfrastructureAsset] = []
        
        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            try:
                # Validate geometry with shapely
                geom_shape = shape(geom)
                if not geom_shape.is_valid:
                    logger.warning(f"Invalid geometry skipped for asset {props.get('id')}")
                    continue

                asset = InfrastructureAsset(
                    id=props.get("id", f"INFRA-{len(loaded)+1}"),
                    name=props.get("name", "Unknown Asset"),
                    type=InfrastructureType(props.get("type", "government_facility")),
                    criticality=props.get("criticality", 70),
                    capacity=props.get("capacity"),
                    administrative_area=props.get("administrative_area", "Odisha Coastal Belt"),
                    state=props.get("state", props.get("administrative_area", "").split(",")[-1].strip() if "," in props.get("administrative_area", "") else "Odisha"),
                    district=props.get("district", props.get("administrative_area", "").split(",")[0].strip() if "," in props.get("administrative_area", "") else "Puri"),
                    city=props.get("city", props.get("name", "").split()[0]),
                    elevation_m=float(props.get("elevation_m", 10.0)),
                    distance_to_coast_km=float(props.get("distance_to_coast_km", 5.0)),
                    backup_power=props.get("backup_power", True),
                    road_access=props.get("road_access", True),
                    population_served=props.get("population_served", props.get("capacity", 500) * 10),
                    geometry=geom,
                    source=props.get("source", "Demo Open Infrastructure Registry"),
                    data_classification=props.get("data_classification", "DEMO DATA"),
                    data_quality=props.get("data_quality", "HIGH"),
                    last_verified=props.get("last_verified", "2026-09-20"),
                    properties=props
                )
                loaded.append(asset)
            except Exception as e:
                logger.error(f"Error parsing infrastructure feature: {str(e)}")

        self._assets = loaded
        logger.info(f"Loaded {len(self._assets)} critical infrastructure assets.")

    async def get_all_assets(self) -> List[InfrastructureAsset]:
        return self._assets

    async def get_assets_by_state(self, state: str) -> List[InfrastructureAsset]:
        st = state.strip().lower()
        return [a for a in self._assets if (a.state and a.state.lower() == st) or (st in a.administrative_area.lower())]

    async def get_assets_by_district(self, district: str) -> List[InfrastructureAsset]:
        dt = district.strip().lower()
        return [a for a in self._assets if (a.district and a.district.lower() == dt) or (dt in a.administrative_area.lower())]

    async def get_assets_by_bbox(self, min_lat: float, min_lon: float, max_lat: float, max_lon: float) -> List[InfrastructureAsset]:
        bbox_poly = box(min_lon, min_lat, max_lon, max_lat)
        matched: List[InfrastructureAsset] = []
        
        for asset in self._assets:
            try:
                geom_shape = shape(asset.geometry.dict())
                if bbox_poly.intersects(geom_shape):
                    matched.append(asset)
            except Exception:
                pass
                
        return matched

    def add_asset(self, asset: InfrastructureAsset):
        """Allows manual asset addition or validated upload."""
        self._assets.append(asset)
