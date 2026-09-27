import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.core.logging import logger
from app.providers.base import SatelliteProvider

class DemoSatelliteProvider(SatelliteProvider):
    """Provides verified demo satellite metadata and visual tile references."""
    
    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir

    async def get_available_datasets(self) -> List[Dict[str, Any]]:
        sat_file = self.demo_dir / "satellite_metadata.json"
        if not sat_file.exists():
            return []
        with open(sat_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("datasets", [])

    async def get_tile_url(self, dataset_id: str, bbox: Optional[List[float]] = None) -> Dict[str, Any]:
        datasets = await self.get_available_datasets()
        matched = next((d for d in datasets if d["id"] == dataset_id), None)
        if not matched:
            return {
                "dataset_id": dataset_id,
                "status": "UNAVAILABLE",
                "tile_url": None,
                "note": "Dataset ID not recognized"
            }
        
        # In demo mode, return stylized raster XYZ / vector overlay url or precomputed tile template
        return {
            "dataset_id": dataset_id,
            "name": matched["name"],
            "ee_asset_id": matched["ee_asset_id"],
            "status": "READY (DEMO CACHED)",
            "tile_url": f"/api/earth-engine/demo-tiles/{dataset_id}/{{z}}/{{x}}/{{y}}.png",
            "acquisition_time": matched.get("acquisition_time"),
            "freshness": matched.get("freshness"),
            "resolution": matched.get("resolution"),
            "source": matched.get("source"),
            "license": matched.get("license")
        }


class EarthEngineProvider(SatelliteProvider):
    """Server-side Google Earth Engine provider with ADC or service-account authentication."""
    
    def __init__(self):
        self.initialized = False
        self.init_error: Optional[str] = None
        self._init_earth_engine()

    def _init_earth_engine(self):
        """Attempts to initialize Earth Engine server-side without crashing if unconfigured."""
        project = settings.EARTH_ENGINE_PROJECT or settings.GOOGLE_CLOUD_PROJECT
        try:
            import ee
            if project:
                ee.Initialize(project=project)
            else:
                ee.Initialize()
            self.initialized = True
            logger.info("Google Earth Engine successfully initialized.")
        except Exception as e:
            self.initialized = False
            self.init_error = (
                f"Earth Engine initialization not active ({str(e)}). "
                "Ensure Google Cloud Project has Earth Engine API enabled and Application Default Credentials (ADC) configured."
            )
            logger.warning(self.init_error)

    async def get_available_datasets(self) -> List[Dict[str, Any]]:
        demo_provider = DemoSatelliteProvider()
        demo_datasets = await demo_provider.get_available_datasets()
        
        # Enrich with live EE status
        for d in demo_datasets:
            d["live_ee_available"] = self.initialized
            d["ee_status"] = "CONNECTED" if self.initialized else "UNAVAILABLE (DEMO CACHED)"
            if not self.initialized:
                d["ee_setup_help"] = self.init_error
        return demo_datasets

    async def get_tile_url(self, dataset_id: str, bbox: Optional[List[float]] = None) -> Dict[str, Any]:
        if not self.initialized:
            # Clean fallback to demo metadata & tiles with clear explanation
            demo_prov = DemoSatelliteProvider()
            res = await demo_prov.get_tile_url(dataset_id, bbox)
            res["status"] = "DEMO FALLBACK"
            res["reason"] = self.init_error
            return res

        # When Earth Engine is authenticated on server:
        try:
            import ee
            if dataset_id == "nasadem":
                img = ee.Image("NASA/NASADEM_HGT/001").select("elevation")
                vis = {"min": 0, "max": 100, "palette": ["001144", "0055aa", "22bbff", "aaff55", "ffff55", "ff5500"]}
                map_id = img.getMapId(vis)
                return {
                    "dataset_id": dataset_id,
                    "status": "LIVE",
                    "tile_url": map_id["tile_fetcher"].url_format,
                    "mapid": map_id["mapid"],
                    "token": map_id["token"],
                    "source": "NASA/NASADEM_HGT/001 via Google Earth Engine"
                }
            elif dataset_id == "jrc-water":
                img = ee.Image("JRC/GSW1_4/GlobalSurfaceWater").select("occurrence")
                vis = {"min": 0, "max": 100, "palette": ["ffffff", "ffcccc", "99ccff", "0000ff"]}
                map_id = img.getMapId(vis)
                return {
                    "dataset_id": dataset_id,
                    "status": "LIVE",
                    "tile_url": map_id["tile_fetcher"].url_format,
                    "mapid": map_id["mapid"],
                    "token": map_id["token"],
                    "source": "JRC/GSW1_4/GlobalSurfaceWater via Google Earth Engine"
                }
            elif dataset_id == "s1-grd":
                # Filter C-band SAR collection
                col = (ee.ImageCollection("COPERNICUS/S1_GRD")
                       .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
                       .filter(ee.Filter.eq("instrumentMode", "IW"))
                       .sort("system:time_start", False))
                img = col.first().select("VV")
                vis = {"min": -25, "max": 0}
                map_id = img.getMapId(vis)
                return {
                    "dataset_id": dataset_id,
                    "status": "LIVE",
                    "tile_url": map_id["tile_fetcher"].url_format,
                    "mapid": map_id["mapid"],
                    "source": "COPERNICUS/S1_GRD via Google Earth Engine"
                }
            else:
                demo_prov = DemoSatelliteProvider()
                return await demo_prov.get_tile_url(dataset_id, bbox)

        except Exception as e:
            logger.error(f"Error generating Earth Engine tile URL: {str(e)}")
            demo_prov = DemoSatelliteProvider()
            res = await demo_prov.get_tile_url(dataset_id, bbox)
            res["status"] = "ERROR_FALLBACK"
            res["error_detail"] = str(e)
            return res
