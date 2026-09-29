import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.hazard_field_engine import HazardFieldEngine
from app.services.route_risk_engine import RouteRiskEngine
from app.core.config import settings

client = TestClient(app)

def test_hazard_field_opacity_normalization():
    """Validates that all hazard features have fill_opacity in [0.0, 1.0] and line 156 bug is resolved."""
    engine = HazardFieldEngine()
    geojson = engine.get_spatial_hazard_geojson("DEMO-TC-2026-ALPHA")
    
    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) > 0
    
    for f in geojson["features"]:
        props = f["properties"]
        assert "fill_opacity" in props
        opacity = props["fill_opacity"]
        assert isinstance(opacity, (int, float))
        # Critical assertion: must be strictly in [0.0, 1.0] and never 25 or percentage scalar
        assert 0.0 <= opacity <= 1.0, f"Invalid fill_opacity {opacity} for {props.get('hazard_type')}"
        if props.get("hazard_type") == "WIND_50KT":
            assert opacity == 0.25, f"WIND_50KT fill_opacity was {opacity}, expected 0.25"

def test_route_risk_canonical_geojson_output():
    """Validates route engine returns canonical GeoJSON feature with coordinates in [lon, lat]."""
    engine = RouteRiskEngine()
    assessment = engine.compute_route_risk_sync(
        origin_lat=20.2961,
        origin_lon=85.8245,
        dest_lat=19.8135,
        dest_lon=85.8312,
        origin_name="Bhubaneswar EOC",
        dest_name="Puri Hospital"
    )

    assert assessment.route_geojson is not None
    assert assessment.route_geojson["type"] == "Feature"
    geom = assessment.route_geojson["geometry"]
    assert geom["type"] == "LineString"
    assert len(geom["coordinates"]) >= 2

    # Check coordinate order: longitude ~85.8, latitude ~19.8 - 20.3
    first_pt = geom["coordinates"][0]
    assert 80.0 <= first_pt[0] <= 90.0, f"Expected longitude in [80, 90], got {first_pt[0]}"
    assert 15.0 <= first_pt[1] <= 25.0, f"Expected latitude in [15, 25], got {first_pt[1]}"

    # Validate alternative_geojson
    assert assessment.alternative_geojson is not None
    assert assessment.alternative_geojson["type"] == "Feature"
    alt_geom = assessment.alternative_geojson["geometry"]
    assert alt_geom["type"] == "LineString"
    assert len(alt_geom["coordinates"]) >= 2

def test_route_risk_live_mode_no_synthetic_geometry(monkeypatch):
    """Strict Rule: In LIVE mode, routing service failure must NOT return synthetic coordinates."""
    monkeypatch.setattr(settings, "APP_MODE", "live")
    engine = RouteRiskEngine()
    # Force provider failure
    engine.provider = "valhalla"
    engine.valhalla_url = "http://127.0.0.1:9999" # invalid port

    assessment = engine.compute_route_risk_sync(
        origin_lat=20.2961,
        origin_lon=85.8245,
        dest_lat=19.8135,
        dest_lon=85.8312
    )

    assert assessment.route_provider == "UNAVAILABLE"
    assert assessment.route_geojson["features"] == [] or assessment.route_geojson.get("geometry", {}).get("coordinates") is None
    assert "ROUTE PROVIDER UNAVAILABLE" in assessment.disclaimer

def test_route_risk_endpoint_with_event_id():
    """Tests the FastAPI routes/risk endpoint with event_id propagation."""
    resp = client.post("/api/v2/routes/risk", json={
        "origin_lat": 20.2961,
        "origin_lon": 85.8245,
        "dest_lat": 19.8135,
        "dest_lon": 85.8312,
        "origin_name": "Bhubaneswar State EOC",
        "dest_name": "District Hospital, Puri",
        "event_id": "DEMO-TC-2026-ALPHA"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert "route_geojson" in data["data"]
    assert "alternative_geojson" in data["data"]
