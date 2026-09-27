from fastapi import APIRouter, Query
from app.core.config import settings
from app.models.schemas import APIResponse, ResponseMeta, DataClassification
from app.providers.weather_provider import OpenMeteoWeatherProvider, DemoWeatherProvider

router = APIRouter(prefix="/weather", tags=["Weather Forecast"])

weather_provider = OpenMeteoWeatherProvider() if settings.APP_MODE == "live" else DemoWeatherProvider()

@router.get("")
async def get_weather(
    latitude: float = Query(19.813, description="Target latitude (default: Puri Coastal Obs)"),
    longitude: float = Query(85.831, description="Target longitude"),
    event_id: str = Query("DEMO-TC-2026-ALPHA")
):
    """Returns normalized hourly weather forecast (wind speed, gusts, precipitation, pressure)."""
    forecast = await weather_provider.get_forecast(latitude, longitude, event_id)
    return APIResponse(
        data=forecast,
        meta=ResponseMeta(
            source=forecast.source,
            freshness=forecast.freshness,
            confidence=forecast.confidence,
            data_classification=DataClassification.FORECAST
        )
    )

@router.get("/track")
async def get_weather_track(event_id: str = Query("DEMO-TC-2026-ALPHA")):
    """Bridge endpoint for track data under weather prefix."""
    from app.providers.cyclone_provider import DemoCycloneProvider, IBTrACSProvider
    if "HIST" in event_id:
        track = await IBTrACSProvider().get_track(event_id)
    else:
        track = await DemoCycloneProvider().get_track(event_id)
    return APIResponse(
        data=track,
        meta=ResponseMeta(
            source=track.source,
            data_classification=DataClassification.FORECAST if track.forecast_track else DataClassification.HISTORICAL
        )
    )

