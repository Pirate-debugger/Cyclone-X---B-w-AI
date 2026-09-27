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
