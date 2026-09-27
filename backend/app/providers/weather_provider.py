import json
import time
from pathlib import Path
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.core.logging import logger
from app.models.schemas import WeatherData, StationWeather, HourlyWeather
from app.providers.base import WeatherProvider

class DemoWeatherProvider(WeatherProvider):
    """Loads normalized coastal weather forecasts from demo files."""
    
    def __init__(self, demo_dir: Path = settings.DEMO_DATA_PATH):
        self.demo_dir = demo_dir

    async def get_forecast(self, latitude: float, longitude: float, event_id: Optional[str] = None) -> WeatherData:
        weather_file = self.demo_dir / "weather.json"
        if not weather_file.exists():
            return WeatherData(
                event_id=event_id or "DEMO-TC-2026-ALPHA",
                source="Simulated Demo Weather",
                retrieved_at="2026-09-27T00:00:00Z",
                valid_until="2026-09-27T06:00:00Z",
                freshness="DEMO DATA",
                confidence=85.0,
                stations=[]
            )
        with open(weather_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return WeatherData(**data)


class OpenMeteoWeatherProvider(WeatherProvider):
    """Live ECMWF weather forecast via Open-Meteo API with in-memory caching."""
    
    def __init__(self, base_url: str = settings.OPEN_METEO_BASE_URL, cache_ttl_sec: int = 900):
        self.base_url = base_url
        self.cache_ttl_sec = cache_ttl_sec
        self._cache: Dict[str, Any] = {}

    async def get_forecast(self, latitude: float, longitude: float, event_id: Optional[str] = None) -> WeatherData:
        cache_key = f"{round(latitude, 2)}_{round(longitude, 2)}"
        now = time.time()
        
        # Check cache
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["timestamp"] < self.cache_ttl_sec:
                logger.info(f"Returning cached weather forecast for ({latitude}, {longitude})")
                return entry["data"]

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m",
            "models": "ecmwf_ifs025",
            "forecast_days": 3
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(self.base_url, params=params)
                resp.raise_for_status()
                payload = resp.json()

            hourly_data = payload.get("hourly", {})
            times = hourly_data.get("time", [])[:24]
            temps = hourly_data.get("temperature_2m", [])
            humidities = hourly_data.get("relative_humidity_2m", [])
            precips = hourly_data.get("precipitation", [])
            pressures = hourly_data.get("surface_pressure", [])
            winds = hourly_data.get("wind_speed_10m", [])
            gusts = hourly_data.get("wind_gusts_10m", [])
            dirs = hourly_data.get("wind_direction_10m", [])

            hours: list[HourlyWeather] = []
            for i in range(len(times)):
                hours.append(HourlyWeather(
                    timestamp=times[i] + ":00Z",
                    wind_speed_kmh=winds[i] if i < len(winds) and winds[i] is not None else 0.0,
                    wind_gust_kmh=gusts[i] if i < len(gusts) and gusts[i] is not None else 0.0,
                    wind_direction_deg=int(dirs[i]) if i < len(dirs) and dirs[i] is not None else 0,
                    precipitation_mm=precips[i] if i < len(precips) and precips[i] is not None else 0.0,
                    pressure_hpa=pressures[i] if i < len(pressures) and pressures[i] is not None else 1013.0,
                    temperature_c=temps[i] if i < len(temps) and temps[i] is not None else 25.0,
                    relative_humidity_pct=humidities[i] if i < len(humidities) and humidities[i] is not None else 80.0
                ))

            result = WeatherData(
                event_id=event_id or "LIVE-EVENT",
                source="ECMWF IFS 0.25° via Open-Meteo API",
                retrieved_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                valid_until=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now + 21600)),
                freshness="LIVE FORECAST",
                confidence=92.0,
                stations=[
                    StationWeather(
                        station_id=f"ECMWF-{round(latitude, 2)}-{round(longitude, 2)}",
                        name=f"Point ({round(latitude, 2)}°N, {round(longitude, 2)}°E)",
                        latitude=latitude,
                        longitude=longitude,
                        hourly=hours
                    )
                ]
            )

            # Store in cache
            self._cache[cache_key] = {"timestamp": now, "data": result}
            return result

        except Exception as e:
            logger.error(f"Live weather fetch failed: {str(e)}. Falling back to demo data.")
            # Fall back safely
            fallback_provider = DemoWeatherProvider()
            return await fallback_provider.get_forecast(latitude, longitude, event_id)
