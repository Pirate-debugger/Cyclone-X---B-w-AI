from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Query, HTTPException
from app.models.schemas import APIResponse, ResponseMeta, DataClassification
from app.geospatial.india_geography import IndiaGeographyRegistry

router = APIRouter(prefix="/geography", tags=["India Geography & Administrative Gazetteer"])

@router.get("/states")
async def get_states():
    """Returns list of supported Indian coastal states and union territories (Section 9 & 52)."""
    states = IndiaGeographyRegistry.get_states()
    return APIResponse(
        data=states,
        meta=ResponseMeta(
            source="India National Geospatial Administrative Registry",
            data_classification=DataClassification.OBSERVATION
        )
    )

@router.get("/states/{code}")
async def get_state_detail(code: str):
    """Returns detailed administrative profile and district boundaries for a state."""
    state = IndiaGeographyRegistry.get_state(code)
    if not state:
        raise HTTPException(status_code=404, detail=f"State with code '{code}' not found in registry.")
    return APIResponse(
        data=state,
        meta=ResponseMeta(
            source="India National Geospatial Administrative Registry",
            data_classification=DataClassification.OBSERVATION
        )
    )

@router.get("/hierarchy")
async def get_hierarchy():
    """Returns full Country -> State -> District -> City/Block administrative tree."""
    tree = IndiaGeographyRegistry.get_hierarchy()
    return APIResponse(
        data=tree,
        meta=ResponseMeta(
            source="India National Administrative Boundary Registry",
            data_classification=DataClassification.OBSERVATION
        )
    )

@router.get("/search")
async def search_gazetteer(
    q: str = Query(..., description="Search term for state, district, city, block, or 'lat,lon' coordinates"),
    state: Optional[str] = Query(None, description="Optional state code to filter search (e.g. OD, WB, AP, TN)")
):
    """
    Non-Google Local Gazetteer Location Search (Section 10).
    Searches administrative areas, coastal blocks, and parses coordinates locally.
    """
    results = IndiaGeographyRegistry.search_gazetteer(query=q, state_code=state)
    return APIResponse(
        data={
            "query": q,
            "count": len(results),
            "results": results
        },
        meta=ResponseMeta(
            source="Local PostGIS / Administrative India Gazetteer (Zero External API Dependency)",
            data_classification=DataClassification.OBSERVATION
        )
    )
