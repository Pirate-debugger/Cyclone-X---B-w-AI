from typing import Optional, List
from fastapi import APIRouter, HTTPException, UploadFile, File, Query, Depends
from shapely.geometry import shape
import json
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, InfrastructureAsset, InfrastructureType
from app.providers.infrastructure_provider import GeoJSONInfrastructureProvider
from app.core.security import require_role, UserRole

router = APIRouter(prefix="/infrastructure", tags=["Critical Infrastructure"])

infra_provider = GeoJSONInfrastructureProvider()

@router.get("")
async def get_infrastructure(
    min_lat: Optional[float] = Query(None),
    min_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None)
):
    """Returns critical infrastructure assets with spatial bounding box filter support."""
    if all(v is not None for v in [min_lat, min_lon, max_lat, max_lon]):
        assets = await infra_provider.get_assets_by_bbox(min_lat, min_lon, max_lat, max_lon)
    else:
        assets = await infra_provider.get_all_assets()

    return APIResponse(
        data=assets,
        meta=ResponseMeta(
            source="Critical Infrastructure Asset Inventory",
            data_classification=DataClassification.OBSERVATION
        )
    )

@router.post("")
async def create_asset(
    asset: InfrastructureAsset,
    user=Depends(require_role(UserRole.OPERATOR))
):
    """Allows authorized operators to create a new critical infrastructure asset."""
    infra_provider.add_asset(asset)
    return APIResponse(
        data={"message": f"Asset '{asset.name}' added successfully", "asset": asset},
        meta=ResponseMeta(source="Operator Manual Registry", data_classification=DataClassification.OBSERVATION)
    )

@router.post("/upload")
async def upload_infrastructure_geojson(
    file: UploadFile = File(...),
    user=Depends(require_role(UserRole.OPERATOR))
):
    """Validates and imports custom GeoJSON infrastructure files."""
    try:
        content = await file.read()
        raw = json.loads(content.decode("utf-8"))
        features = raw.get("features", [])
        
        added_count = 0
        for feat in features:
            props = feat.get("properties", {})
            geom = feat.get("geometry", {})
            geom_shape = shape(geom)
            if not geom_shape.is_valid:
                continue

            asset = InfrastructureAsset(
                id=props.get("id", f"UPLOAD-{added_count+1}"),
                name=props.get("name", "Uploaded Asset"),
                type=InfrastructureType(props.get("type", "government_facility")),
                criticality=props.get("criticality", 75),
                capacity=props.get("capacity"),
                administrative_area=props.get("administrative_area", "Custom Sector"),
                elevation_m=float(props.get("elevation_m", 10.0)),
                distance_to_coast_km=float(props.get("distance_to_coast_km", 5.0)),
                geometry=geom,
                source=f"Uploaded: {file.filename}",
                data_classification="CUSTOM DATA",
                last_verified="2026-09-27"
            )
            infra_provider.add_asset(asset)
            added_count += 1

        return APIResponse(
            data={"imported_count": added_count, "filename": file.filename},
            meta=ResponseMeta(source="GeoJSON Upload Handler")
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"GeoJSON validation failed: {str(e)}")
