from fastapi import APIRouter, HTTPException, Query
from app.models.schemas import APIResponse, ResponseMeta, DataClassification, TrackCollection
from app.providers.cyclone_provider import DemoCycloneProvider, IBTrACSProvider

router = APIRouter(prefix="/events", tags=["Cyclone Events & Tracks"])

demo_provider = DemoCycloneProvider()
ibtracs_provider = IBTrACSProvider()

@router.get("")
async def get_events(mode: str = Query("active", description="active or historical")):
    """Returns active cyclone events or historical cyclones."""
    if mode == "historical":
        events = await ibtracs_provider.get_active_events()
    else:
        events = await demo_provider.get_active_events()

    return APIResponse(
        data=events,
        meta=ResponseMeta(
            source="Cyclone Track Provider",
            freshness="ACTIVE",
            data_classification=DataClassification.HISTORICAL if mode == "historical" else DataClassification.OBSERVATION
        )
    )

@router.get("/{event_id}")
async def get_event(event_id: str):
    """Returns details for a specific cyclone event."""
    event = await demo_provider.get_event_by_id(event_id)
    if not event:
        event = await ibtracs_provider.get_event_by_id(event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Cyclone event '{event_id}' not found")
        
    return APIResponse(
        data=event,
        meta=ResponseMeta(
            source=event.source,
            freshness="CURRENT CYCLE",
            data_classification=event.data_classification
        )
    )

@router.get("/{event_id}/track")
async def get_track(event_id: str):
    """Returns complete track containing both observed best track and forecast track points."""
    if "HIST" in event_id:
        track = await ibtracs_provider.get_track(event_id)
    else:
        track = await demo_provider.get_track(event_id)

    return APIResponse(
        data=track,
        meta=ResponseMeta(
            source=track.source,
            freshness="UPDATED AT 00Z",
            data_classification=DataClassification.FORECAST if track.forecast_track else DataClassification.HISTORICAL
        )
    )

@router.get("/{event_id}/forecast")
async def get_forecast_points(event_id: str):
    """Returns only forward forecast track points with uncertainty cone radii."""
    track = await demo_provider.get_track(event_id)
    return APIResponse(
        data={
            "event_id": event_id,
            "forecast_track": track.forecast_track,
            "cone_available": True,
            "disclaimer": "Prototype decision-support output — not an official warning."
        },
        meta=ResponseMeta(
            source=track.source,
            data_classification=DataClassification.FORECAST
        )
    )
