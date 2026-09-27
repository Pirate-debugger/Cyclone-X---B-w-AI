import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "subsystems" in data

def test_mode_endpoint():
    res = client.get("/api/mode")
    assert res.status_code == 200
    assert res.json()["success"] is True

def test_events_endpoint():
    res = client.get("/api/events")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1
    assert data["data"][0]["event_id"] == "DEMO-TC-2026-ALPHA"

def test_track_endpoint():
    res = client.get("/api/events/DEMO-TC-2026-ALPHA/track")
    assert res.status_code == 200
    data = res.json()["data"]
    assert "observed_track" in data
    assert "forecast_track" in data
    assert len(data["forecast_track"]) > 0

def test_risk_endpoints():
    # Overview
    res = client.get("/api/risk")
    assert res.status_code == 200
    assert res.json()["data"]["overall_metrics"]["overall_risk_score"] > 50

    # Hotspots GeoJSON
    res_hotspots = client.get("/api/risk/hotspots")
    assert res_hotspots.status_code == 200
    geo = res_hotspots.json()["data"]
    assert geo["type"] == "FeatureCollection"
    assert len(geo["features"]) >= 1

    # Infrastructure Risk
    res_infra = client.get("/api/risk/infrastructure")
    assert res_infra.status_code == 200
    assert len(res_infra.json()["data"]) >= 5

def test_scenario_run():
    payload = {
        "event_id": "DEMO-TC-2026-ALPHA",
        "wind_multiplier": 1.2,
        "rain_multiplier": 1.3,
        "surge_scenario_m": 2.5
    }
    res = client.post("/api/scenarios/run", json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert "delta" in data
    assert data["simulated"]["overall_risk"] >= data["baseline"]["overall_risk"]

def test_ai_copilot_fallback():
    payload = {
        "query": "Why is Puri zone evaluated as severe risk?",
        "event_id": "DEMO-TC-2026-ALPHA"
    }
    res = client.post("/api/ai/explain", json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["risk_score"] > 50
    assert len(data["primary_drivers"]) >= 1
    assert "Puri" in data["summary"] or "risk" in data["summary"].lower()

def test_reports_generation():
    res = client.post("/api/reports/generate", json={"event_id": "DEMO-TC-2026-ALPHA"})
    assert res.status_code == 200
    report_id = res.json()["data"]["report_id"]
    
    # Export CSV
    res_csv = client.get(f"/api/reports/{report_id}/export?format=csv")
    assert res_csv.status_code == 200
    assert "HOTSPOT" in res_csv.text

    # Export PDF
    res_pdf = client.get(f"/api/reports/{report_id}/export?format=pdf")
    assert res_pdf.status_code == 200
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert len(res_pdf.content) > 1000
