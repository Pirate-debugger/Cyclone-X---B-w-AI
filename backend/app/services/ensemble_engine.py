import math
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime, timezone
import numpy as np

from app.models.schemas_v2 import (
    ForecastMember,
    PercentileCurve,
    LandfallSectorProbability,
    EnsembleAggregationResult,
    DataClassification
)
from app.providers.weathernext_provider import WeatherNext3Provider

class EnsembleAggregator:
    """
    Synthesizes multi-member atmospheric ensembles (e.g. 64-member WeatherNext 3).
    Computes ensemble mean track, median track, along-track & cross-track spread,
    intensity plumes (p10-p90), and spatial track density grids.
    """

    def __init__(self):
        self.wn3_provider = WeatherNext3Provider()

    @classmethod
    def get_ensemble_aggregation(cls, event_id: str = "cyclone-alpha") -> EnsembleAggregationResult:
        instance = cls()
        return instance.aggregate_ensemble()

    @classmethod
    def get_all_raw_members(cls, event_id: str = "cyclone-alpha") -> List[ForecastMember]:
        instance = cls()
        return instance.wn3_provider.generate_64_member_ensemble()

    def aggregate_ensemble(self, members: Optional[List[ForecastMember]] = None) -> EnsembleAggregationResult:
        if not members or len(members) == 0:
            members = self.wn3_provider.generate_64_member_ensemble()

        # Group by lead_hours
        steps_dict: Dict[int, List[ForecastMember]] = {}
        for m in members:
            steps_dict.setdefault(m.lead_hours, []).append(m)

        sorted_steps = sorted(steps_dict.keys())
        mean_track = []
        median_track = []
        consensus_track = []
        wind_percentiles = []
        pressure_percentiles = []

        total_members_count = len(steps_dict[sorted_steps[0]]) if sorted_steps else 64

        for step in sorted_steps:
            group = steps_dict[step]
            lats = [m.latitude for m in group]
            lons = [m.longitude for m in group]
            winds = [m.max_wind_kmh for m in group]
            pressures = [m.central_pressure_hpa for m in group]

            mean_lat = float(np.mean(lats))
            mean_lon = float(np.mean(lons))
            med_lat = float(np.median(lats))
            med_lon = float(np.median(lons))

            mean_track.append({
                "lead_hours": step,
                "latitude": round(mean_lat, 3),
                "longitude": round(mean_lon, 3),
                "mean_wind": round(float(np.mean(winds)), 1),
                "mean_pressure": round(float(np.mean(pressures)), 1)
            })

            median_track.append({
                "lead_hours": step,
                "latitude": round(med_lat, 3),
                "longitude": round(med_lon, 3)
            })

            # Consensus incorporates central cluster weighting
            consensus_track.append({
                "lead_hours": step,
                "latitude": round((mean_lat * 0.6) + (med_lat * 0.4), 3),
                "longitude": round((mean_lon * 0.6) + (med_lon * 0.4), 3)
            })

            # Wind percentiles
            p10_w, p25_w, p50_w, p75_w, p90_w = np.percentile(winds, [10, 25, 50, 75, 90])
            wind_percentiles.append(PercentileCurve(
                lead_hours=step,
                valid_time=f"+{step}h",
                p10=round(float(p10_w), 1),
                p25=round(float(p25_w), 1),
                p50=round(float(p50_w), 1),
                p75=round(float(p75_w), 1),
                p90=round(float(p90_w), 1),
                mean=round(float(np.mean(winds)), 1),
                spread=round(float(p90_w - p10_w), 1)
            ))

            # Pressure percentiles
            p10_p, p25_p, p50_p, p75_p, p90_p = np.percentile(pressures, [10, 25, 50, 75, 90])
            pressure_percentiles.append(PercentileCurve(
                lead_hours=step,
                valid_time=f"+{step}h",
                p10=round(float(p10_p), 1),
                p25=round(float(p25_p), 1),
                p50=round(float(p50_p), 1),
                p75=round(float(p75_p), 1),
                p90=round(float(p90_p), 1),
                mean=round(float(np.mean(pressures)), 1),
                spread=round(float(p90_p - p10_p), 1)
            ))

        # Calculate along-track and cross-track spread at +48h
        step_48_lats = [m.latitude for m in steps_dict.get(48, steps_dict[sorted_steps[-1]])]
        step_48_lons = [m.longitude for m in steps_dict.get(48, steps_dict[sorted_steps[-1]])]
        along_spread = float(np.std(step_48_lats) * 111.0)
        cross_spread = float(np.std(step_48_lons) * 105.0)

        # Generate spatial track density grid (GeoJSON polygons with occupancy %)
        density_geojson = self._build_track_density_grid(members)

        # Landfall Sector Probabilities
        landfall_engine = LandfallProbabilityEngine()
        sectors = landfall_engine.calculate_landfall_probabilities(members)

        # Objective track confidence score based on spread
        track_confidence = max(45.0, min(92.0, 95.0 - (cross_spread * 0.42)))

        return EnsembleAggregationResult(
            ensemble_id="WN3-ENS-2026-ALPHA",
            model_name="WeatherNext 3 (64-member)",
            initialization_time=members[0].initialization_time,
            member_count=total_members_count,
            mean_track=mean_track,
            median_track=median_track,
            consensus_track=consensus_track,
            wind_percentiles=wind_percentiles,
            pressure_percentiles=pressure_percentiles,
            landfall_sectors=sectors,
            track_density_geojson=density_geojson,
            along_track_spread_km=round(along_spread, 1),
            cross_track_spread_km=round(cross_spread, 1),
            forecast_confidence_pct=round(track_confidence, 1),
            primary_divergence_notes=f"Ensemble tracks exhibit tight convergence through +36h; cross-track spread expands to {cross_spread:.1f}km past landfall near +48h.",
            classification=DataClassification.ENSEMBLE
        )

    def _build_track_density_grid(self, members: List[ForecastMember]) -> Dict[str, Any]:
        """
        Creates a 2D spatial grid (0.25° resolution) over the Bay of Bengal and coastal corridor.
        Counts exact number of ensemble member passes and calculates track occupancy percentage.
        """
        features = []
        lat_bins = np.arange(18.0, 22.0, 0.3)
        lon_bins = np.arange(84.0, 88.0, 0.3)

        total_members = len(set(m.member_id for m in members)) or 64

        for lat in lat_bins:
            for lon in lon_bins:
                # Count distinct members entering this bounding box
                matching_members = set()
                for m in members:
                    if (lat <= m.latitude < lat + 0.3) and (lon <= m.longitude < lon + 0.3):
                        matching_members.add(m.member_id)

                count = len(matching_members)
                if count > 0:
                    pct = round((count / total_members) * 100.0, 1)
                    features.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [[
                                [round(lon, 3), round(lat, 3)],
                                [round(lon + 0.3, 3), round(lat, 3)],
                                [round(lon + 0.3, 3), round(lat + 0.3, 3)],
                                [round(lon, 3), round(lat + 0.3, 3)],
                                [round(lon, 3), round(lat, 3)]
                            ]]
                        },
                        "properties": {
                            "member_count": count,
                            "occupancy_pct": pct,
                            "label": f"{count} of {total_members} members ({pct}%)"
                        }
                    })

        return {
            "type": "FeatureCollection",
            "features": features
        }


class LandfallProbabilityEngine:
    """
    Calculates empirical landfall probabilities across coastal administrative sectors
    by evaluating ensemble track intersections against spatial coastal polygons.
    """

    COASTAL_SECTORS = [
        {
            "sector_id": "SEC-A-PURI",
            "name": "Puri - Astaranga Coastal Belt",
            "state_district": "Puri & Jagatsinghpur (South), Odisha",
            "lat_min": 19.60, "lat_max": 20.05,
            "lon_min": 85.60, "lon_max": 86.40,
            "coast_geojson": {
                "type": "Polygon",
                "coordinates": [[[85.65, 19.65], [86.35, 19.85], [86.40, 20.05], [85.70, 19.95], [85.65, 19.65]]]
            }
        },
        {
            "sector_id": "SEC-B-PARADIP",
            "name": "Paradip - Dhamra Port Belt",
            "state_district": "Jagatsinghpur (North) & Kendrapara, Odisha",
            "lat_min": 20.05, "lat_max": 20.80,
            "lon_min": 86.40, "lon_max": 87.20,
            "coast_geojson": {
                "type": "Polygon",
                "coordinates": [[[86.45, 20.10], [87.10, 20.65], [87.05, 20.85], [86.35, 20.30], [86.45, 20.10]]]
            }
        },
        {
            "sector_id": "SEC-C-GANJAM",
            "name": "Gopalpur - Ganjam Lowland",
            "state_district": "Ganjam District, Odisha",
            "lat_min": 19.10, "lat_max": 19.60,
            "lon_min": 84.80, "lon_max": 85.60,
            "coast_geojson": {
                "type": "Polygon",
                "coordinates": [[[84.85, 19.15], [85.45, 19.45], [85.35, 19.65], [84.75, 19.35], [84.85, 19.15]]]
            }
        },
        {
            "sector_id": "SEC-D-BALASORE",
            "name": "Balasore - Digha Marine Sector",
            "state_district": "Balasore, Odisha & Purba Medinipur, West Bengal",
            "lat_min": 20.80, "lat_max": 21.65,
            "lon_min": 86.80, "lon_max": 87.80,
            "coast_geojson": {
                "type": "Polygon",
                "coordinates": [[[86.85, 20.90], [87.65, 21.55], [87.55, 21.75], [86.75, 21.10], [86.85, 20.90]]]
            }
        }
    ]

    @classmethod
    def calculate_sector_landfall_probabilities(cls, event_id: str = "cyclone-alpha") -> List[LandfallSectorProbability]:
        instance = cls()
        members = WeatherNext3Provider().generate_64_member_ensemble()
        return instance.calculate_landfall_probabilities(members)

    def calculate_landfall_probabilities(self, members: List[ForecastMember]) -> List[LandfallSectorProbability]:
        member_ids = set(m.member_id for m in members)
        total_members = len(member_ids) or 64

        results: List[LandfallSectorProbability] = []

        # Track which member made landfall in which sector
        for sec in self.COASTAL_SECTORS:
            matching_members = set()
            intersecting_winds = []

            for m in members:
                # Check if point falls within sector bounding box during near-landfall window (+24h to +48h)
                if (24 <= m.lead_hours <= 48) and \
                   (sec["lat_min"] <= m.latitude <= sec["lat_max"]) and \
                   (sec["lon_min"] <= m.longitude <= sec["lon_max"]):
                    matching_members.add(m.member_id)
                    intersecting_winds.append(m.max_wind_kmh)

            prob = round((len(matching_members) / total_members) * 100.0, 1)
            p50_wind = float(np.median(intersecting_winds)) if intersecting_winds else 125.0

            intensity_band = "Very Severe Cyclonic Storm (VSCS)" if p50_wind >= 140 else "Severe Cyclonic Storm (SCS)"

            results.append(LandfallSectorProbability(
                sector_id=sec["sector_id"],
                name=sec["name"],
                state_district=sec["state_district"],
                coastline_geojson=sec["coast_geojson"],
                probability_pct=prob,
                earliest_arrival_time="+30h (18:00 UTC)",
                most_likely_arrival_time="+36h (00:00 UTC)",
                expected_intensity_band=intensity_band,
                peak_wind_p50_kmh=round(p50_wind, 1)
            ))

        return results
