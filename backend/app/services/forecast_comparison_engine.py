import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.models.schemas_v2 import (
    ModelComparisonEntry,
    MultiModelConsensus,
    ForecastRunComparison,
    DataClassification
)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance in kilometers between two points on Earth."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

class ForecastComparisonEngine:
    """
    Evaluates multi-model forecast consensus and forecast run evolution.
    Strictly avoids declaring a 'winner' model; presents objective spread,
    consensus tracks, and empirical verification benchmarks.
    """

    @staticmethod
    def get_multi_model_consensus(event_id: str = "cyclone-alpha") -> MultiModelConsensus:
        """
        Synthesizes tracks from Official IMD, WeatherNext Cyclones (DeepMind),
        and ECMWF IFS into a multi-model consensus with inter-model spread metrics.
        """
        # IMD Official RSMC Track (Lead hours 0, 12, 24, 36, 48, 72)
        imd_points = [
            {"lead_hours": 0, "lat": 16.8, "lon": 86.4, "max_wind_kmh": 135, "pressure_hpa": 978},
            {"lead_hours": 12, "lat": 17.5, "lon": 86.2, "max_wind_kmh": 145, "pressure_hpa": 972},
            {"lead_hours": 24, "lat": 18.3, "lon": 86.0, "max_wind_kmh": 160, "pressure_hpa": 964},
            {"lead_hours": 36, "lat": 19.1, "lon": 85.9, "max_wind_kmh": 175, "pressure_hpa": 955},
            {"lead_hours": 48, "lat": 19.8, "lon": 85.8, "max_wind_kmh": 165, "pressure_hpa": 960},
            {"lead_hours": 72, "lat": 20.9, "lon": 85.6, "max_wind_kmh": 110, "pressure_hpa": 984}
        ]

        # WeatherNext Cyclones Track (Google DeepMind AI Ensemble Median)
        weathernext_points = [
            {"lead_hours": 0, "lat": 16.82, "lon": 86.38, "max_wind_kmh": 138, "pressure_hpa": 976},
            {"lead_hours": 12, "lat": 17.55, "lon": 86.22, "max_wind_kmh": 148, "pressure_hpa": 970},
            {"lead_hours": 24, "lat": 18.36, "lon": 86.08, "max_wind_kmh": 165, "pressure_hpa": 961},
            {"lead_hours": 36, "lat": 19.22, "lon": 86.02, "max_wind_kmh": 180, "pressure_hpa": 950},
            {"lead_hours": 48, "lat": 19.95, "lon": 85.98, "max_wind_kmh": 168, "pressure_hpa": 958},
            {"lead_hours": 72, "lat": 21.05, "lon": 85.82, "max_wind_kmh": 115, "pressure_hpa": 982}
        ]

        # ECMWF IFS 0.25deg High-Resolution Baseline
        ecmwf_points = [
            {"lead_hours": 0, "lat": 16.78, "lon": 86.42, "max_wind_kmh": 132, "pressure_hpa": 980},
            {"lead_hours": 12, "lat": 17.48, "lon": 86.25, "max_wind_kmh": 142, "pressure_hpa": 974},
            {"lead_hours": 24, "lat": 18.25, "lon": 86.12, "max_wind_kmh": 155, "pressure_hpa": 967},
            {"lead_hours": 36, "lat": 19.05, "lon": 86.08, "max_wind_kmh": 170, "pressure_hpa": 958},
            {"lead_hours": 48, "lat": 19.72, "lon": 86.05, "max_wind_kmh": 160, "pressure_hpa": 963},
            {"lead_hours": 72, "lat": 20.80, "lon": 85.90, "max_wind_kmh": 105, "pressure_hpa": 986}
        ]

        # Build GeoJSON Linestrings for each model
        def to_geojson(pts):
            return {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[p["lon"], p["lat"]] for p in pts]
                },
                "properties": {
                    "points": pts
                }
            }

        entries = [
            ModelComparisonEntry(
                model_name="Official IMD / RSMC",
                track_geojson=to_geojson(imd_points),
                intensity_max_kmh=175.0,
                landfall_window="T+44h to T+48h (Puri Sector)",
                spread_km=42.0,
                freshness_minutes=18,
                data_quality_pct=96.5,
                historical_24h_error_km=68.4,
                historical_48h_error_km=112.1
            ),
            ModelComparisonEntry(
                model_name="WeatherNext Cyclones (64-mbr AI)",
                track_geojson=to_geojson(weathernext_points),
                intensity_max_kmh=180.0,
                landfall_window="T+43h to T+47h (Puri-Astaranga Sector)",
                spread_km=36.5,
                freshness_minutes=8,
                data_quality_pct=98.2,
                historical_24h_error_km=52.3,
                historical_48h_error_km=89.6
            ),
            ModelComparisonEntry(
                model_name="ECMWF IFS 0.25°",
                track_geojson=to_geojson(ecmwf_points),
                intensity_max_kmh=170.0,
                landfall_window="T+46h to T+50h (Chilika-Puri Sector)",
                spread_km=48.0,
                freshness_minutes=42,
                data_quality_pct=94.0,
                historical_24h_error_km=61.2,
                historical_48h_error_km=98.4
            )
        ]

        # Calculate consensus centroid track across all 3 models at each step
        consensus_pts = []
        lead_steps = [0, 12, 24, 36, 48, 72]
        step_spreads = []

        for idx, step in enumerate(lead_steps):
            lats = [imd_points[idx]["lat"], weathernext_points[idx]["lat"], ecmwf_points[idx]["lat"]]
            lons = [imd_points[idx]["lon"], weathernext_points[idx]["lon"], ecmwf_points[idx]["lon"]]
            winds = [imd_points[idx]["max_wind_kmh"], weathernext_points[idx]["max_wind_kmh"], ecmwf_points[idx]["max_wind_kmh"]]
            pressures = [imd_points[idx]["pressure_hpa"], weathernext_points[idx]["pressure_hpa"], ecmwf_points[idx]["pressure_hpa"]]

            mean_lat = sum(lats) / 3.0
            mean_lon = sum(lons) / 3.0
            mean_wind = sum(winds) / 3.0
            mean_press = sum(pressures) / 3.0

            # compute pairwise distance spread
            d12 = haversine_distance(lats[0], lons[0], lats[1], lons[1])
            d13 = haversine_distance(lats[0], lons[0], lats[2], lons[2])
            d23 = haversine_distance(lats[1], lons[1], lats[2], lons[2])
            max_spread = max(d12, d13, d23)
            step_spreads.append(max_spread)

            consensus_pts.append({
                "lead_hours": step,
                "lat": round(mean_lat, 3),
                "lon": round(mean_lon, 3),
                "max_wind_kmh": round(mean_wind, 1),
                "central_pressure_hpa": round(mean_press, 1),
                "model_spread_km": round(max_spread, 1)
            })

        avg_track_spread = round(sum(step_spreads) / len(step_spreads), 1)
        avg_wind_spread = round(max([e.intensity_max_kmh for e in entries]) - min([e.intensity_max_kmh for e in entries]), 1)

        confidence_summary = (
            f"High inter-model consensus through T+36h (spatial spread < 25 km). "
            f"Models exhibit slight divergence near landfall (T+44h to T+48h), with WeatherNext Cyclones "
            f"tracking 14 km east of IMD consensus, and ECMWF favoring a slightly slower translation speed."
        )

        return MultiModelConsensus(
            initialization_time=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:00:00Z"),
            models_evaluated=["Official IMD / RSMC", "WeatherNext Cyclones (64-mbr AI)", "ECMWF IFS 0.25°"],
            model_entries=entries,
            consensus_track=consensus_pts,
            inter_model_track_spread_km=avg_track_spread,
            inter_model_intensity_spread_kmh=avg_wind_spread,
            confidence_assessment=confidence_summary,
            classification=DataClassification.MODEL_OUTPUT
        )

    @staticmethod
    def get_forecast_evolution(event_id: str = "cyclone-alpha") -> Dict[str, Any]:
        """
        Compares successive forecast runs (00Z, 06Z, 12Z, 18Z) to highlight
        run-to-run consistency, track shift vector, and intensity revisions.
        """
        runs = [
            {
                "run_id": "RUN-20260926-00Z",
                "cycle": "00Z",
                "init_time": "2026-09-26T00:00:00Z",
                "landfall_sector": "Gopalpur - Chilika",
                "landfall_lat": 19.30,
                "landfall_lon": 85.05,
                "peak_wind_kmh": 165,
                "central_pressure_hpa": 962,
                "impact_area_sqkm": 14200
            },
            {
                "run_id": "RUN-20260926-06Z",
                "cycle": "06Z",
                "init_time": "2026-09-26T06:00:00Z",
                "landfall_sector": "Chilika - Puri",
                "landfall_lat": 19.55,
                "landfall_lon": 85.45,
                "peak_wind_kmh": 170,
                "central_pressure_hpa": 958,
                "impact_area_sqkm": 15600
            },
            {
                "run_id": "RUN-20260926-12Z",
                "cycle": "12Z",
                "init_time": "2026-09-26T12:00:00Z",
                "landfall_sector": "Puri Coast",
                "landfall_lat": 19.78,
                "landfall_lon": 85.80,
                "peak_wind_kmh": 175,
                "central_pressure_hpa": 955,
                "impact_area_sqkm": 16800
            },
            {
                "run_id": "RUN-20260926-18Z",
                "cycle": "18Z",
                "init_time": "2026-09-26T18:00:00Z",
                "landfall_sector": "Puri - Astaranga Sector",
                "landfall_lat": 19.82,
                "landfall_lon": 85.85,
                "peak_wind_kmh": 180,
                "central_pressure_hpa": 950,
                "impact_area_sqkm": 17400
            }
        ]

        curr = runs[-1]
        prev = runs[-2]

        shift_km = haversine_distance(prev["landfall_lat"], prev["landfall_lon"], curr["landfall_lat"], curr["landfall_lon"])
        intensity_delta = curr["peak_wind_kmh"] - prev["peak_wind_kmh"]
        area_delta_pct = round(((curr["impact_area_sqkm"] - prev["impact_area_sqkm"]) / prev["impact_area_sqkm"]) * 100, 1)

        comparison = ForecastRunComparison(
            current_run_id=curr["run_id"],
            previous_run_id=prev["run_id"],
            model="WeatherNext Cyclones Multi-Cycle",
            track_shift_km=round(shift_km, 1),
            track_shift_direction="Northeast (+7 km)",
            intensity_revision_kmh=float(intensity_delta),
            landfall_time_shift_hours=-1.5,
            high_risk_area_change_pct=area_delta_pct,
            key_changes_summary=(
                f"Between 12Z and 18Z cycles, projected landfall stabilized near Puri-Astaranga (+{round(shift_km, 1)} km NE shift). "
                f"Peak wind revised upward by +{intensity_delta} km/h (950 hPa central pressure). "
                f"Estimated landfall accelerated by ~1.5 hours, expanding severe impact zone by +{area_delta_pct}%."
            )
        )

        return {
            "runs": runs,
            "all_runs": runs,
            "latest_run": curr,
            "previous_run": prev,
            "comparison": comparison.model_dump(),
            "classification": DataClassification.MODEL_OUTPUT.value
        }
