from typing import List, Dict, Any, Optional
from shapely.geometry import shape, Point, Polygon
from app.core.config import settings
from app.models.schemas import (
    RiskBand,
    HotspotZone,
    InfrastructureAsset,
    InfrastructureRiskAssessment,
    RiskOverview,
    PopulationExposure
)
from app.services.hazard_engine import HazardEngine
from app.services.exposure_engine import ExposureEngine
from app.services.vulnerability_engine import VulnerabilityEngine
from app.services.confidence_engine import ConfidenceEngine
from app.geospatial.hazard_spatial import (
    haversine_distance_km,
    calculate_radial_wind_speed,
    calculate_radial_rainfall_mm,
    calculate_surge_inundation_depth
)

class RiskEngine:
    """Core synthesis engine computing Hazard, Exposure, Vulnerability, Overall Risk, and Hotspots."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or settings.load_risk_config()
        self.risk_weights = self.config.get("risk_weights", {"hazard": 0.50, "exposure": 0.30, "vulnerability": 0.20})
        self.hazard_engine = HazardEngine(self.config)
        self.exposure_engine = ExposureEngine()
        self.vulnerability_engine = VulnerabilityEngine(self.config)
        self.confidence_engine = ConfidenceEngine(self.config)

    def determine_risk_band(self, score: int) -> RiskBand:
        """Maps 0-100 numerical risk score to categorical band."""
        if score <= 24:
            return RiskBand.LOW
        elif score <= 49:
            return RiskBand.MODERATE
        elif score <= 74:
            return RiskBand.HIGH
        else:
            return RiskBand.SEVERE

    def assess_infrastructure_risk(
        self,
        assets: List[InfrastructureAsset],
        cyclone_lat: float = 19.9,
        cyclone_lon: float = 85.8,
        max_wind_kmh: float = 160.0,
        peak_rain_mm: float = 220.0,
        surge_height_m: float = 2.2
    ) -> List[InfrastructureRiskAssessment]:
        """Calculates granular risk scores and threats for all critical infrastructure assets."""
        assessments: List[InfrastructureRiskAssessment] = []

        for asset in assets:
            geom = asset.geometry.model_dump()
            coords = geom.get("coordinates")
            
            # Extract representative coordinate
            if geom.get("type") == "Point":
                lon, lat = coords[0], coords[1]
            elif geom.get("type") == "LineString":
                mid_pt = coords[len(coords) // 2]
                lon, lat = mid_pt[0], mid_pt[1]
            else:
                lon, lat = 85.8, 19.8

            # Sample physical hazard values at asset location
            w_speed = calculate_radial_wind_speed(lat, lon, cyclone_lat, cyclone_lon, max_wind_kmh)
            r_mm = calculate_radial_rainfall_mm(lat, lon, cyclone_lat, cyclone_lon, peak_rain_mm)
            inund_m = calculate_surge_inundation_depth(asset.elevation_m, asset.distance_to_coast_km, surge_height_m)

            hazard_res = self.hazard_engine.calculate_combined_hazard(w_speed, r_mm, inund_m, surge_height_m)
            h_score = hazard_res["combined_hazard_score"]

            e_score = self.exposure_engine.calculate_asset_exposure_score(asset, h_score)
            v_score = self.vulnerability_engine.calculate_asset_vulnerability(asset)

            # Risk equation
            w_h = self.risk_weights.get("hazard", 0.50)
            w_e = self.risk_weights.get("exposure", 0.30)
            w_v = self.risk_weights.get("vulnerability", 0.20)
            
            r_score = int(round(h_score * w_h + e_score * w_e + v_score * w_v))
            r_score = max(0, min(100, r_score))
            r_band = self.determine_risk_band(r_score)

            # Determine primary threat
            if inund_m > 0.4 and asset.distance_to_coast_km < 6.0:
                threat = f"Coastal Surge Inundation ({inund_m:.1f}m flood depth)"
            elif w_speed > 130.0:
                threat = f"Severe Gale/Storm Wind ({int(w_speed)} km/h)"
            else:
                threat = f"Heavy Precipitation ({int(r_mm)} mm/24h)"

            # Nearest lower-risk alternative for hospitals
            alt_facility = None
            if asset.type.value in ["hospital", "primary_health_centre"]:
                if r_score >= 75:
                    alt_facility = "AIIMS Bhubaneswar Regional Trauma Centre (Elevation: 38m, Inland Corridor)"
                else:
                    alt_facility = "Facility designated as primary receiving hospital"

            assessments.append(InfrastructureRiskAssessment(
                asset_id=asset.id,
                name=asset.name,
                type=asset.type,
                criticality=asset.criticality,
                hazard_score=h_score,
                exposure_score=e_score,
                vulnerability_score=v_score,
                risk_score=r_score,
                risk_band=r_band,
                primary_threat=threat,
                elevation_m=asset.elevation_m,
                distance_to_coast_km=asset.distance_to_coast_km,
                geometry=asset.geometry,
                nearest_shelter_or_backup=alt_facility
            ))

        # Sort by highest risk first
        assessments.sort(key=lambda a: a.risk_score, reverse=True)
        return assessments

    def compute_risk_overview(
        self,
        event_id: str,
        hotspots: List[HotspotZone],
        infrastructure: List[InfrastructureRiskAssessment],
        confidence_breakdown: Any,
        population_exposure: PopulationExposure
    ) -> RiskOverview:
        """Synthesizes executive level risk metrics."""
        avg_risk = int(round(sum(h.risk_score for h in hotspots) / max(1, len(hotspots))))
        avg_hazard = int(round(sum(h.hazard_score for h in hotspots) / max(1, len(hotspots))))
        avg_exp = int(round(sum(h.exposure_score for h in hotspots) / max(1, len(hotspots))))
        avg_vuln = int(round(sum(h.vulnerability_score for h in hotspots) / max(1, len(hotspots))))

        return RiskOverview(
            event_id=event_id,
            model_version=self.config.get("model_version", "CYCLONE-X Risk Engine v1.0"),
            disclaimer=self.config.get("disclaimer", "Prototype decision-support output — not an official warning."),
            data_classification="MODEL_OUTPUT",
            calculated_at="2026-09-27T00:30:00Z",
            weights=self.risk_weights,
            overall_metrics={
                "overall_risk_score": avg_risk,
                "risk_band": self.determine_risk_band(avg_risk).value,
                "hazard_score": avg_hazard,
                "exposure_score": avg_exp,
                "vulnerability_score": avg_vuln,
                "confidence_score": confidence_breakdown.score,
                "data_type": "MODEL_OUTPUT",
                "primary_threat_window": "2026-09-27T12:00:00Z to 2026-09-28T06:00:00Z",
                "closest_approach_time": "2026-09-27T18:00:00Z (Landfall)",
                "closest_approach_area": "Puri - Astaranga Coastal Belt"
            },
            confidence_breakdown=confidence_breakdown,
            population_exposure=population_exposure,
            top_priority_zones=hotspots
        )
