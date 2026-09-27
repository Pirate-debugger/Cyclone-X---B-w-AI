from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import APIResponse, ResponseMeta, DataClassification
from app.providers.satellite_provider import EarthEngineProvider, DemoSatelliteProvider

router = APIRouter(prefix="/earth-engine", tags=["Google Earth Engine & Satellite"])

ee_provider = EarthEngineProvider()

@router.get("/layers")
async def get_layers():
    """Lists available Google Earth Engine and satellite datasets with status, resolution, and freshness."""
    datasets = await ee_provider.get_available_datasets()
    return APIResponse(
        data=datasets,
        meta=ResponseMeta(
            source="Google Earth Engine Multi-Sensor Catalog",
            freshness="MULTI-TEMPORAL",
            data_classification=DataClassification.OBSERVATION
        )
    )

@router.get("/layers/{dataset_id}/tile")
async def get_layer_tile(
    dataset_id: str,
    min_lat: Optional[float] = Query(None),
    min_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None)
):
    """Retrieves or generates an XYZ tile URL for the specified Earth Engine layer."""
    bbox = [min_lon, min_lat, max_lon, max_lat] if all(v is not None for v in [min_lat, min_lon, max_lat, max_lon]) else None
    tile_info = await ee_provider.get_tile_url(dataset_id, bbox)
    
    return APIResponse(
        data=tile_info,
        meta=ResponseMeta(
            source=tile_info.get("source", "Google Earth Engine"),
            freshness=tile_info.get("freshness", "OBSERVATION"),
            data_classification=DataClassification.OBSERVATION
        )
    )
