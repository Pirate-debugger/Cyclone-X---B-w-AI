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
                    elevation_m=float(props.get("elevation_m", 10.0)),
                    distance_to_coast_km=float(props.get("distance_to_coast_km", 5.0)),
                    geometry=geom,
                    source=props.get("source", "Demo Open Infrastructure Registry"),
                    data_classification=props.get("data_classification", "DEMO DATA"),
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
