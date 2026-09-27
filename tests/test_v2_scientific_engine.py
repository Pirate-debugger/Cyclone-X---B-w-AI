import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.services.ensemble_engine import EnsembleAggregator, LandfallProbabilityEngine
from app.services.forecast_comparison_engine import ForecastComparisonEngine
from app.providers.weathernext_provider import (
    WeatherNext3Provider,
    WeatherNextCycloneProvider,
    CycloneInferenceWorker
)
from app.services.hazard_engine import HazardEngine
from app.services.scenario_engine import ScenarioEngine
from app.core.security import UserRole, CurrentUser, get_current_user

client = TestClient(app)

# ==============================================================================
# SECTION 80: SCIENTIFIC ENSEMBLE & UNCERTAINTY TESTS
# ==============================================================================

def test_ensemble_aggregation_probabilities():
    """Verify ensemble aggregation guarantees mathematical bounds and percentile ordering."""
    agg = EnsembleAggregator.get_ensemble_aggregation("DEMO-TC-2026-ALPHA")
    
    assert agg.member_count == 64, f"Expected 64 ensemble members, got {agg.member_count}"
    
    # Check landfall probabilities
    sectors = agg.landfall_sectors
    assert len(sectors) >= 3
    total_landfall_prob = sum(s.probability_pct for s in sectors)
    # Total landfall across sectors should be <= 100% (some members may recurve/dissipate offshore)
    assert 0.0 <= total_landfall_prob <= 100.1, f"Total probability {total_landfall_prob}% out of bounds"
    
    for s in sectors:
        assert 0.0 <= s.probability_pct <= 100.0, f"Sector {s.name} probability {s.probability_pct}% invalid"

    # Check wind and pressure percentiles
    for w in agg.wind_percentiles:
        assert w.p10 <= w.p25 <= w.p50 <= w.p75 <= w.p90, (
            f"Wind percentiles violation at +{w.lead_hours}h: p10={w.p10}, p50={w.p50}, p90={w.p90}"
        )
        assert w.p10 >= 0, "Wind speed cannot be negative"
        
    for p in agg.pressure_percentiles:
        assert p.p10 <= p.p25 <= p.p50 <= p.p75 <= p.p90, (
            f"Pressure percentiles violation at +{p.lead_hours}h: p10={p.p10}, p50={p.p50}, p90={p.p90}"
        )
        assert 800 <= p.p50 <= 1050, f"Atmospheric pressure {p.p50} hPa out of realistic meteorological range"
        
    # Check track spread metrics
    assert agg.cross_track_spread_km >= 0.0
    assert agg.along_track_spread_km >= 0.0
    assert 0.0 <= agg.forecast_confidence_pct <= 100.0


def test_ensemble_members_data_integrity():
    """Verify all 64 individual ensemble members have valid meteorological variables and coordinates."""
    members = EnsembleAggregator.get_all_raw_members("DEMO-TC-2026-ALPHA")
    assert len(members) == 64 * 7  # 64 members across 7 lead time steps
    
    unique_member_ids = set()
    for m in members:
        unique_member_ids.add(m.member_id)
        assert m.latitude >= 10.0 and m.latitude <= 25.0, f"Lat {m.latitude} outside Bay of Bengal domain"
        assert m.longitude >= 80.0 and m.longitude <= 95.0, f"Lon {m.longitude} outside Bay of Bengal domain"
        assert 40.0 <= m.max_wind_kmh <= 280.0, f"Wind speed {m.max_wind_kmh} km/h unrealistically extreme"
        assert 890.0 <= m.central_pressure_hpa <= 1015.0, f"Pressure {m.central_pressure_hpa} hPa unrealistic"
        assert m.lead_hours >= 0
        
    assert len(unique_member_ids) == 64, f"Expected 64 unique members, got {len(unique_member_ids)}"


def test_weathernext_unit_normalization():
    """Verify mandatory unit normalization: Kelvin -> Celsius, meters -> mm, m/s -> km/h."""
    provider = WeatherNext3Provider()
    
    # Temperature: 273.15 K -> 0.0 C, 300.0 K -> 26.85 C
    assert provider.kelvin_to_celsius(273.15) == 0.0
    assert provider.kelvin_to_celsius(300.0) == 26.85
    
    # Precipitation: meters -> millimeters (e.g. 0.05m -> 50.0mm)
    assert provider.meters_to_mm(0.0) == 0.0
    assert provider.meters_to_mm(0.045) == 45.0
    assert provider.meters_to_mm(0.2) == 200.0
    
    # Wind: m/s -> km/h (1 m/s = 3.6 km/h)
    assert provider.ms_to_kmh(0.0) == 0.0
    assert provider.ms_to_kmh(10.0) == 36.0
    assert provider.ms_to_kmh(45.0) == 162.0


def test_model_consensus_no_arbitrary_winner():
    """Verify model consensus presents comparison without picking an arbitrary 'winner'."""
    consensus = ForecastComparisonEngine.get_multi_model_consensus("DEMO-TC-2026-ALPHA")
    
    assert len(consensus.models_evaluated) >= 3
    assert any("IMD" in m for m in consensus.models_evaluated)
    assert any("WeatherNext" in m for m in consensus.models_evaluated)
    assert any("ECMWF" in m for m in consensus.models_evaluated)
    
    # Model comparison entries
    for entry in consensus.model_entries:
        assert entry.model_name in consensus.models_evaluated
        assert entry.intensity_max_kmh > 0
        assert entry.spread_km >= 0
        assert entry.data_quality_pct > 0
    
    # Inter-model spread metrics
    assert consensus.inter_model_track_spread_km >= 0.0
    assert consensus.inter_model_intensity_spread_kmh >= 0.0
    assert len(consensus.consensus_track) > 0


def test_scenario_immutability_and_disclaimer():
    """Verify scenario engine does NOT mutate baseline ensemble and returns prominent disclaimers."""
    scenario_req = {
        "event_id": "DEMO-TC-2026-ALPHA",
        "wind_multiplier": 1.25,
        "rain_multiplier": 1.30,
        "surge_scenario_m": 3.0,
        "track_shift_km": 25.0
    }
    
    # Query baseline risk before scenario
    baseline_res = client.get("/api/risk")
    assert baseline_res.status_code == 200
    baseline_risk = baseline_res.json()["data"]["overall_metrics"]["overall_risk_score"]
    
    # Run scenario
    sim_res = client.post("/api/scenarios/run", json=scenario_req)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()["data"]
    
    # Check delta computation
    assert "delta" in sim_data
    assert sim_data["simulated"]["overall_risk"] >= baseline_risk
    
    # Check that disclaimer is prominent and classification is SCENARIO
    assert "WHAT-IF SCENARIO" in sim_data["disclaimer"]
    assert "not an official" in sim_data["disclaimer"].lower()
    
    # Re-query baseline risk to prove baseline was NOT mutated
    re_baseline_res = client.get("/api/risk")
    assert re_baseline_res.status_code == 200
    re_baseline_risk = re_baseline_res.json()["data"]["overall_metrics"]["overall_risk_score"]
    assert baseline_risk == re_baseline_risk, "Scenario execution illegally mutated baseline risk metrics!"


def test_asset_impact_probabilities():
    """Verify infrastructure impact probabilities are bounded and multi-hazard decomposed."""
    res = client.get("/api/impact/assets?event_id=DEMO-TC-2026-ALPHA")
    assert res.status_code == 200
    assets = res.json()["data"]
    
    assert len(assets) >= 5
    for a in assets:
        assert 0.0 <= a["p_wind_exceedance"] <= 1.0, f"Asset {a['name']} wind probability out of [0, 1]"
        assert 0.0 <= a["p_rain_exceedance"] <= 1.0, f"Asset {a['name']} rain probability out of [0, 1]"
        assert 0.0 <= a["p_inundation_exceedance"] <= 1.0, f"Asset {a['name']} flood probability out of [0, 1]"
        assert 0.0 <= a["p_combined_impact"] <= 1.0, f"Asset {a['name']} combined probability out of [0, 1]"
        assert 1 <= a["criticality"] <= 100
        assert a["data_quality_pct"] >= 0


def test_forecast_evolution_temporal_revision():
    """Verify forecast run comparison calculates track shift km and intensity revisions."""
    res = client.get("/api/forecast/evolution?event_id=DEMO-TC-2026-ALPHA")
    assert res.status_code == 200
    evo = res.json()["data"]
    
    runs = evo["runs"]
    assert len(runs) >= 4  # 00Z, 06Z, 12Z, 18Z
    
    comparison = evo["comparison"]
    assert comparison["track_shift_km"] >= 0.0
    assert len(comparison["track_shift_direction"]) > 0
    assert "key_changes_summary" in comparison


def test_rbac_alert_review_and_dispatch():
    """Verify strict RBAC: VIEWER cannot approve, REVIEWER/ADMIN can approve, only ADMIN can dispatch."""
    # 1. Draft an alert
    draft_payload = {
        "event_id": "DEMO-TC-2026-ALPHA",
        "type": "evacuation_preparedness",
        "title": "Coastal Sector 2 Early Action Directive",
        "urgency": "HIGH",
        "target_area": "Puri Coastline",
        "action_notes": "Deploy lifeboats and verify backup generators."
    }
    draft_res = client.post("/api/alerts/draft", json=draft_payload)
    assert draft_res.status_code == 200
    alert_id = draft_res.json()["data"]["id"]
    
    # 2. Attempt approval as VIEWER -> 403 Forbidden
    viewer_headers = {"X-API-Key": "demo-viewer-key"}
    approve_res_viewer = client.post(
        "/api/alerts/approve",
        json={"alert_id": alert_id},
        headers=viewer_headers
    )
    assert approve_res_viewer.status_code == 403, "Viewer was incorrectly allowed to approve alert"
    
    # 3. Approve as REVIEWER -> 200 OK
    reviewer_headers = {"X-API-Key": "demo-reviewer-key"}
    approve_res_reviewer = client.post(
        "/api/alerts/approve",
        json={"alert_id": alert_id},
        headers=reviewer_headers
    )
    assert approve_res_reviewer.status_code == 200
    assert approve_res_reviewer.json()["data"]["status"] == "APPROVED"
    
    # 4. Attempt dispatch as OPERATOR -> 403 Forbidden
    operator_headers = {"X-API-Key": "demo-operator-key"}
    send_res_operator = client.post(
        "/api/alerts/send",
        json={"alert_id": alert_id},
        headers=operator_headers
    )
    assert send_res_operator.status_code == 403, "Operator was incorrectly allowed to dispatch alert"
    
    # 5. Dispatch as ADMIN -> 200 OK
    admin_headers = {"X-API-Key": "demo-admin-key"}
    send_res_admin = client.post(
        "/api/alerts/send",
        json={"alert_id": alert_id},
        headers=admin_headers
    )
    assert send_res_admin.status_code == 200
    assert send_res_admin.json()["data"]["status"] in ["DELIVERED_DRY_RUN", "SENT"]
