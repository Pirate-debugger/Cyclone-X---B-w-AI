# CYCLONE-X V2

## AI-Powered Probabilistic Cyclone Forecasting, Impact & Infrastructure Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.12%2B%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-PostGIS%2016-336791.svg)](https://postgis.net/)
[![Google GenAI SDK](https://img.shields.io/badge/Google_GenAI-Gemini%203.7%2F3.8-4285F4.svg)](https://ai.google.dev/)
[![Google Earth Engine](https://img.shields.io/badge/Earth_Engine-Satellite%20Intelligence-34A853.svg)](https://earthengine.google.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)](LICENSE)

> **CORE PROPOSITION**: *"From atmospheric forecast to infrastructure-level impact probability."*  
> **OPERATIONAL PIPELINE**: `PREDICT` &rarr; `SIMULATE` &rarr; `LOCALIZE` &rarr; `PRIORITIZE` &rarr; `EXPLAIN` &rarr; `ACT`

---

## 1. System Overview

During severe cyclonic events in the Bay of Bengal and coastal APAC (Odisha, Andhra Pradesh, West Bengal, Bangladesh), disaster authorities are inundated with raw isobar charts and cloud loops. However, emergency operations commanders do not need another generic wind app — they need to know **which hospital will lose power**, **which bridge will be submerged**, and **what percentage of ensemble members predict catastrophic coastal inundation**.

**CYCLONE-X V2** transforms atmospheric numerical forecasting and vortex-centric AI into actionable, asset-level impact intelligence:

1. **WeatherNext 3 NWP Adapter**: Ingests 64-member deep atmospheric ensembles with strict SI unit normalization ($K \to ^\circ\text{C}, m \to mm, m/s \to km/h, Pa \to hPa$).
2. **WeatherNext Cyclones (AI Model)**: Vortex-specialized neural trajectory and intensity prediction with asynchronous background worker execution (`CycloneInferenceWorker`).
3. **Multi-Model Consensus Engine**: Objective verification comparing Official IMD/RSMC tracks, WeatherNext Cyclones, and ECMWF IFS 0.25° without picking an arbitrary "winner".
4. **Landfall Probability Engine**: Discretizes coastlines into sectors (Puri-Astaranga, Paradip-Dhamra, Gopalpur-Ganjam, Balasore-Digha) and calculates empirical member landfall probabilities.
5. **Gridded Spatial Hazard Fields**: Gridded wind core footprints ($V_{10}$, gusts), rainfall accumulation exceedances ($P(\text{rain} > 100\text{mm}), P(\text{rain} > 200\text{mm})$), and three-way water level decomposition (astronomical tide + meteorological storm surge + wave setup).
6. **Infrastructure Impact Probability Engine**: Evaluates individual asset-level fragility across 64 ensemble members: $P(\text{wind}), P(\text{rain}), P(\text{flood}), P(\text{combined})$.
7. **Cascading Lifeline Network Graph**: Models interdependent failure propagation (substation outage &rarr; water pump failure &rarr; hospital operational degradation).
8. **Forecast Run Evolution**: Tracks cycle-by-cycle revisions (00Z &rarr; 06Z &rarr; 12Z &rarr; 18Z), calculating track shift in kilometers, intensity revisions, and landfall acceleration.
9. **Scientific Backtesting & Verification**: Benchmarks models against historical cyclone best-tracks from NOAA IBTrACS (Cyclone Fani 2019, Amphan 2020, Mocha 2023) using Brier Scores and Continuous Ranked Probability Scores (CRPS).
10. **Early Response Action Prioritization**: Ranks prioritized civil protection interventions (backup generator inspection, shelter stocking, medical pre-staging) for authorized incident commanders.
11. **Grounded Gemini AI Copilot V2**: Tool-calling decision-support agent equipped with 14 deterministic backend inspection tools and strict factuality guardrails.
12. **Multilingual Advisory Workflow**: Human-in-the-loop lifecycle (`DRAFT &rarr; REVIEW &rarr; APPROVE &rarr; DISPATCH`) supporting English, Hindi, Odia, Telugu, and Bengali with strict server-side RBAC.

---

## 2. Advanced Architecture

```
                                CYCLONE-X V2
                     GLOBAL DISASTER INTELLIGENCE PLATFORM

               ┌───────────────────────────────────────────────┐
               │              Observation Layer                │
               │  Sentinel-1 SAR / Sentinel-2 / AWS / IBTrACS  │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │               Forecast Layer                  │
               │ WeatherNext 3 / WeatherNext Cyclones / ECMWF  │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │           Ensemble Fusion Layer               │
               │   64-Member Ensembles / Spread / Consensus    │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │            Hazard Field Engine                │
               │ Wind Footprint / Gridded Rain / Tide + Surge  │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │        Exposure & Vulnerability Engine        │
               │  WorldPop 100m / Lifelines / Fragility Curves │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │       Impact Probability & Risk Engine        │
               │   P(Wind) / P(Rain) / P(Flood) / Cascading    │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │              Decision Support                 │
               │   What-If Scenarios / Early Actions / Alerts  │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────▼───────────────────────┐
               │        Grounded Gemini AI Copilot V2          │
               │     14 Deterministic Backend Tools & Schema   │
               └───────────────────────────────────────────────┘
```

---

## 3. Enterprise Data Classification Layers (Section 5)

Every record displayed on the frontend or served via API is explicitly stamped with its scientific data classification:

| Classification | Meaning & Display Badge | Scientific Rule |
| :--- | :--- | :--- |
| `OBSERVATION` | Ground-truth measurements | Instrument-observed telemetry (AWS, Radar, Sentinel-1 SAR). |
| `FORECAST` | Operational deterministic runs | Forward NWP model predictions (IMD / ECMWF deterministic). |
| `ENSEMBLE` | Perturbed multi-member spread | 64-member WeatherNext 3 dispersion and percentile plumes. |
| `HISTORICAL` | Validated reanalysis | Post-season ground truth from NOAA IBTrACS for backtesting. |
| `MODEL_OUTPUT` | Gridded spatial fields | Calculated hazard cores, spatial track density grids. |
| `SCENARIO` | What-If simulations | Parameter perturbations; **prominently marked as not official**. |
| `AI_INTERPRETATION` | Gemini reasoning outputs | Multimodal synthesis strictly grounded in backend evidence. |
| `OFFICIAL_ADVISORY` | Approved civil defense alerts | Human-reviewed and authorized warnings. |
| `DEMO` | Offline sandbox data | Calibrated simulation; zero external dependencies. |

---

## 4. Interactive Map Modes (10 Modes)

The CYCLONE-X Command Center UI features 10 specialized geospatial modes:
1. `TRACK`: Official IMD forecast track, cone of uncertainty, and historical observations.
2. `ENSEMBLE`: 64 individual perturbed member tracks rendered with lead-time color gradients.
3. `DENSITY`: Spatial track density heatmap displaying member occupancy fraction (e.g. *"48 of 64 members (75.0%)"*).
4. `WIND`: Gridded wind core footprints ($>100\text{ km/h}, >140\text{ km/h}, >180\text{ km/h}$).
5. `RAINFALL`: Precipitation exceedance probabilities ($P(\text{rain} > 100\text{mm}), P(\text{rain} > 200\text{mm})$).
6. `FLOOD`: Three-way decomposed water level (astronomical tide + storm surge + wave setup).
7. `IMPACT`: Asset-level multi-hazard impact probability heatmap.
8. `INFRASTRUCTURE`: Critical lifeline nodes (hospitals, substations, shelters, bridges) with real-time risk cards.
9. `POPULATION`: Spatial distribution of vulnerable citizens exposed to severe hazard thresholds.
10. `FORECAST CHANGE`: Visual comparison between current (18Z) and previous (12Z) forecast runs showing track shifts.

---

## 5. Security & Role-Based Access Control (RBAC)

The platform enforces strict server-side RBAC across 4 operational tiers:
- **`VIEWER`** (Level 1): Read-only observation of tracks, maps, and generated briefs.
- **`OPERATOR`** (Level 2): Viewer rights + What-If scenario execution and alert drafting.
- **`REVIEWER`** (Level 3): Operator rights + Formal scientific review and approval of advisory drafts.
- **`ADMIN`** (Level 4): Reviewer rights + Dispatch authorization and data source configuration.

> **Zero Hardcoded Secrets**: All credentials and API keys have been audited and eliminated. Carto retina basemaps and simulated demo feeds load with zero configuration.

---

## 6. Quickstart Guide

### Option A: Local Development (FastAPI + Next.js)

#### 1. Clone & Setup Backend
```bash
git clone https://github.com/Pirate-debugger/Cyclone-X---B-w-AI.git
cd Cyclone-X---B-w-AI

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Initialize database schema & demo seed data
python backend/app/db/init_db.py

# Launch FastAPI Backend (Port 8000)
uvicorn app.main:app --app-dir backend --reload --port 8000
```

#### 2. Setup Frontend
```bash
cd frontend

# Install Node modules
npm install

# Start Next.js Development Server (Port 3000)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Command Center.

---

### Option B: Docker Compose (Full Stack with PostgreSQL + PostGIS)

```bash
docker-compose up --build -d
```
Services initialized:
- `backend`: FastAPI runtime on port 8000
- `frontend`: Next.js web application on port 3000
- `db`: PostgreSQL 16 with PostGIS extension on port 5432
- `cache`: Redis 7 on port 6379

---

## 7. Automated Testing Suite

The repository includes a comprehensive 20-test automated suite covering API endpoints, risk calculation, scientific ensemble bounds, unit normalizations, scenario immutability, and RBAC enforcement:

```bash
pytest -v
```

```
tests/test_api_endpoints.py::test_health_endpoint PASSED
tests/test_api_endpoints.py::test_mode_endpoint PASSED
tests/test_api_endpoints.py::test_events_endpoint PASSED
tests/test_api_endpoints.py::test_track_endpoint PASSED
tests/test_api_endpoints.py::test_risk_endpoints PASSED
tests/test_api_endpoints.py::test_scenario_run PASSED
tests/test_api_endpoints.py::test_ai_copilot_fallback PASSED
tests/test_api_endpoints.py::test_reports_generation PASSED
tests/test_risk_engine.py::test_hazard_engine_normalization PASSED
tests/test_risk_engine.py::test_confidence_engine PASSED
tests/test_risk_engine.py::test_vulnerability_engine PASSED
tests/test_risk_engine.py::test_risk_engine_banding PASSED
tests/test_v2_scientific_engine.py::test_ensemble_aggregation_probabilities PASSED
tests/test_v2_scientific_engine.py::test_ensemble_members_data_integrity PASSED
tests/test_v2_scientific_engine.py::test_weathernext_unit_normalization PASSED
tests/test_v2_scientific_engine.py::test_model_consensus_no_arbitrary_winner PASSED
tests/test_v2_scientific_engine.py::test_scenario_immutability_and_disclaimer PASSED
tests/test_v2_scientific_engine.py::test_asset_impact_probabilities PASSED
tests/test_v2_scientific_engine.py::test_forecast_evolution_temporal_revision PASSED
tests/test_v2_scientific_engine.py::test_rbac_alert_review_and_dispatch PASSED

======================= 20 passed in 2.66s =======================
```

---

## 8. Technical Documentation
- **[Model Cards Specification](docs/models.md)**: WeatherNext 3, WeatherNext Cyclones, ECMWF IFS 0.25°, Consensus Engine.
- **[Data Catalog & Provenance](docs/data.md)**: Sentinel-1 SAR, Sentinel-2 MSI, NASADEM 30m, WorldPop, IBTrACS.
- **[Risk Model V2 Specification](docs/risk_model_v2.md)**: Mathematical formulations, hazard decomposition, fragility curves.
- **[Security Audit Report](docs/security_audit.md)**: Secret elimination audit, RBAC enforcement, credential management.

---

## 9. Scientific Disclaimer & Intended Use
CYCLONE-X is a disaster-risk decision-support system intended for authorized emergency planning and meteorological evaluation. It does not replace official bulletins from national meteorological agencies (e.g. IMD, RSMC New Delhi, JTWC, WMO). Modeled scenario simulations and AI copilot interpretations must always undergo human review before public civil protection advisories are authorized.
