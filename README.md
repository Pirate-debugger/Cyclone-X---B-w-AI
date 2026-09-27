# CYCLONE-X V3

## GOOGLE-NATIVE AI + PROBABILISTIC WEATHER + DISASTER IMPACT INTELLIGENCE

[![Python](https://img.shields.io/badge/Python-3.12%2B%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black.svg)](https://nextjs.org/)
[![Gemini 3.8 Flash](https://img.shields.io/badge/Google_AI-Gemini%203.8%20Flash-4285F4.svg)](https://ai.google.dev/)
[![Vertex AI](https://img.shields.io/badge/Vertex_AI-Impact%20Intelligence-EA4335.svg)](https://cloud.google.com/vertex-ai)
[![Google Earth Engine](https://img.shields.io/badge/Earth_Engine-Satellite%20Change%20Detection-34A853.svg)](https://earthengine.google.com/)
[![Google Maps Platform](https://img.shields.io/badge/Google_Maps-Routes%20%26%20Geocoding-FBBC04.svg)](https://developers.google.com/maps)
[![BigQuery](https://img.shields.io/badge/BigQuery-Analytics%20Warehouse-4285F4.svg)](https://cloud.google.com/bigquery)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28.svg)](https://firebase.google.com/)
[![Cloud Run](https://img.shields.io/badge/Cloud_Run-Serverless%20Containers-24C1E0.svg)](https://cloud.google.com/run)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)](LICENSE)

> **CORE PRODUCT OBJECTIVE**:
> `FORECAST` &rarr; `UNCERTAINTY` &rarr; `HAZARD` &rarr; `EXPOSURE` &rarr; `IMPACT PROBABILITY` &rarr; `INFRASTRUCTURE PRIORITY` &rarr; `AI EXPLANATION` &rarr; `HUMAN-REVIEWED ACTION`

---

## 1. System Architecture Blueprint

```
                 ┌──────────────────────┐
                 │      GEMINI 3.8      │
                 │   AI COPILOT / AGENT │
                 └──────────┬───────────┘
                            │
                     Tool Calling
                            │
     ┌──────────────────────┼──────────────────────┐
     │                      │                      │
 Vertex AI              BigQuery             Firebase
 Impact Model           Analytics             Auth/RT
     │                      │                      │
     └──────────────────────┼──────────────────────┘
                            │
                    CYCLONE-X API
                      Cloud Run
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
   Google Maps          Earth Engine        Cloud Storage
   Routes/Geo           WeatherNext         Raster/Zarr
   Geocoding            Satellite
        │                   │
        └──────────────┬────┘
                       │
              PostGIS / Cloud SQL
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
         IMD        INCOIS      ISRO/Bhuvan
      OFFICIAL      OCEAN       INDIAN GEO
       FORECAST     SURGE        DATA
```

---

## 2. Product Philosophy & Non-Negotiables

CYCLONE-X is **not a generic consumer weather app** or a decorative dashboard. It is an enterprise-grade disaster operations command center built natively on the Google Cloud and meteorological data ecosystem for emergency managers, civil defense commissioners, and critical infrastructure operators.

### Meteorological Separation & Strict Provenance
- **`OFFICIAL IMD`**: National authority forecast bulletins, cones, and advisories from the India Meteorological Department are ingested without modification. AI never alters official numbers or replaces official warnings.
- **`EXPERIMENTAL AI FORECAST`**: WeatherNext 3 64-member ensembles and WeatherNext Cyclones neural predictions are prominently marked: *"EXPERIMENTAL AI FORECAST — Not an official government warning"*.
- **`INCOIS`**: Marine ocean surge and tidal predictions are ingested from authorized feeds; if unconfigured, the system transparently reports `INCOIS NOT CONFIGURED` rather than fabricating synthetic ocean dynamics.
- **`ISRO / Bhuvan`**: Ingests Indian spatial datasets, flood recurrence, and administrative lifelines with license and source attribution.

---

## 3. Google-Native Technology Ecosystem

| Google Component | Role & Architecture Implementation | Operational Benefit |
| :--- | :--- | :--- |
| **Gemini 3.8 Flash** | 19 deterministic operational tools, multimodal vision analysis (`OBSERVED`, `POSSIBLE`, `UNKNOWN`), multilingual contextual polish. | Natural language reasoning strictly grounded in backend spatial evidence. |
| **Vertex AI** | `VertexAIImpactProvider` predicting conditioned failure probabilities ($P(\text{wind}), P(\text{rain}), P(\text{flood}), P(\text{combined})$) + `VertexTrainingPipeline` (`RESEARCH / NOT YET TRAINED`). | Translates atmospheric hazards into asset-specific vulnerability predictions. |
| **Google Earth Engine** | Server-side Sentinel-1 SAR C-band pre/post water change analysis labeled `SATELLITE-DERIVED CHANGE SIGNAL`. | Cloud-penetrating radar flood assessment during active storms. |
| **Google Maps Platform** | `@googlemaps/js-api-loader` v2, dark command center styling, 12 operational map modes, Google Routes API hazard intersection, Google Maps Weather API. | High-performance operational mapping with emergency route accessibility analysis. |
| **BigQuery** | Partitioned & clustered data warehouse: `cyclonex_raw`, `cyclonex_curated`, `cyclonex_analytics`, `cyclonex_ml`. | Large-scale cyclone historical archive, ensemble backtesting, and ML dataset aggregation. |
| **Firebase Auth & Firestore** | Firebase Admin token verification in FastAPI with 4-tier RBAC (`VIEWER`, `OPERATOR`, `SCIENTIFIC_REVIEWER`, `ADMIN`) + real-time incident state. | Secure government-grade role enforcement independent of client state. |
| **Cloud Run** | Containerized microservices (Frontend, API, Async Worker Jobs) with Cloud Build CI/CD. | Scalable serverless execution with decoupling of heavy inference. |
| **Google Speech & TTS** | Voice Command Center: Speech-to-Text &rarr; Gemini intent routing &rarr; deterministic tools &rarr; Text-to-Speech playback. | Hands-free operator control for Emergency Operations Centers. |
| **Cloud Translation API** | Translation into Hindi, Odia, Telugu, and Bengali with immutable translation provenance (engine, timestamp, reviewer sign-off). | Vernacular emergency communication across coastal Indian districts. |
| **Secret Manager** | Zero hardcoded tokens or API credentials across git, logs, and frontend builds. | Bank-grade credential security and audit compliance. |

---

## 4. The 19-Tool Grounded Gemini Copilot

Gemini 3.8 Flash never hallucinates numbers or invents coordinates. It acts as an autonomous reasoning supervisor over deterministic backend tools:

1. `get_current_event()`: Active cyclone state, basin, and metadata.
2. `get_official_imd_forecast()`: Official IMD bulletin, cyclone track, and warning level.
3. `get_weathernext_forecast()`: WeatherNext 3 64-member ensemble summary.
4. `get_forecast_ensemble()`: Raw multi-member perturbed tracks and spread.
5. `get_landfall_probability()`: Spatial coastal sector landfall exceedances.
6. `get_forecast_evolution()`: Run-to-run temporal revisions (00Z &rarr; 06Z &rarr; 12Z &rarr; 18Z).
7. `get_weather_context()`: Google Maps Weather API local telemetry.
8. `get_rainfall_probability()`: Gridded precipitation threshold exceedances ($P > 100\text{mm}, P > 200\text{mm}$).
9. `get_wind_probability()`: Gridded core wind exceedances ($P > 100\text{ km/h}, P > 140\text{ km/h}$).
10. `get_inundation_probability()`: Tide + storm surge + wave setup decomposition.
11. `get_infrastructure_risk()`: Critical lifelines (hospitals, power, water, bridges).
12. `get_population_exposure()`: WorldPop density intersected with hazard polygons.
13. `get_satellite_observation()`: Sentinel-1 SAR C-band water change detection.
14. `get_data_health()`: Provider telemetry, latency, and freshness status.
15. `compare_forecast_models()`: Multi-model consensus (IMD vs WeatherNext vs ECMWF).
16. `run_scenario()`: Parameter-perturbed What-If simulations with baseline deltas.
17. `get_route_risk()`: Google Routes API intersection with flood and wind hazards.
18. `get_verification_metrics()`: Historical IBTrACS backtesting and Brier scores.
19. `generate_incident_brief()`: Structured multilingual operational briefing.

---

## 5. Command Center Geospatial Modes (12 Modes)

The Google Maps Platform container supports 12 operational geospatial modes:
1. `OFFICIAL TRACK`: IMD track, cone of uncertainty, and observed best track.
2. `64-MBR ENSEMBLE`: WeatherNext 3 ensemble tracks with lead-time color gradients.
3. `TRACK DENSITY`: Spatial track density heatmap showing ensemble convergence.
4. `WIND PROBABILITY`: Gridded wind core footprints ($>100\text{ km/h}, >140\text{ km/h}$).
5. `RAIN EXCEEDANCE`: Precipitation exceedance probabilities ($P > 100\text{mm}, P > 200\text{mm}$).
6. `SURGE INUNDATION`: Decomposed total water level (tide + storm surge + wave setup).
7. `IMPACT PROBABILITY`: Multi-hazard asset fragility curves from Vertex AI.
8. `INFRASTRUCTURE`: Critical lifelines (hospitals, substations, ports, telecom).
9. `POPULATION`: Gridded density of vulnerable citizens in hazard zones.
10. `SATELLITE`: Earth Engine Sentinel-1 SAR water-change overlay.
11. `FORECAST CHANGE`: Temporal delta between successive forecast cycles.
12. `ROUTE RISK`: Evacuation corridor accessibility and critical bridge exposure.

---

## 6. Voice Command Center & Multilingual Advisories

### Voice Flow (Speech-to-Text &rarr; Gemini &rarr; Text-to-Speech)
```
Operator Voice: "Show severe-risk hospitals in Vizag."
  ↓
Google Speech-to-Text transcribes audio
  ↓
Gemini 3.8 Flash classifies intent & routes to `get_infrastructure_risk`
  ↓
CYCLONE-X PostGIS retrieves spatial hospital assets
  ↓
Gemini synthesizes grounded explanation
  ↓
Google Text-to-Speech synthesizes spoken audio response
```

### Multilingual Emergency Advisories
- Supports **English, Hindi (हिन्दी), Odia (ଓଡ଼ିଆ), Telugu (తెలుగు), and Bengali (বাংলা)**.
- Integrated with **Cloud Translation API v3** with contextual validation by Gemini.
- Every advisory stores immutable provenance: `source_language`, `target_language`, `advisory_id`, `translation_engine`, `translation_timestamp`, and `human_review_status`.
- **Zero auto-dispatch**: Public alerts follow a mandatory 4-stage lifecycle: `DRAFT` &rarr; `REVIEW` &rarr; `APPROVE` &rarr; `DISPATCH (DRY RUN)`.

---

## 7. Quickstart Guide

### Option A: Local Development

#### 1. Setup Backend
```bash
git clone https://github.com/Pirate-debugger/Cyclone-X---B-w-AI.git
cd Cyclone-X---B-w-AI

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .\.venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Launch FastAPI Backend (Port 8000)
uvicorn app.main:app --app-dir backend --reload --port 8000
```

#### 2. Setup Frontend
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js Development Server (Port 3000)
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Command Center.

---

### Option B: Cloud Run Deployment

Deploy the entire stack to Google Cloud with a single script:
```bash
chmod +x deploy/cloud_run_setup.sh
./deploy/cloud_run_setup.sh
```

Or trigger automated CI/CD via Cloud Build:
```bash
gcloud builds submit --config=cloudbuild.yaml .
```

---

## 8. Automated Testing Suite

The repository includes a comprehensive 31-test automated suite covering API endpoints, risk calculation, scientific ensemble bounds, unit normalizations, scenario immutability, and full Google-native integration:

```bash
pytest -v
```

```
tests/test_api_endpoints.py::test_health_endpoint PASSED                 [  3%]
tests/test_api_endpoints.py::test_mode_endpoint PASSED                   [  6%]
tests/test_api_endpoints.py::test_events_endpoint PASSED                 [  9%]
tests/test_api_endpoints.py::test_track_endpoint PASSED                  [ 12%]
tests/test_api_endpoints.py::test_risk_endpoints PASSED                  [ 16%]
tests/test_api_endpoints.py::test_scenario_run PASSED                    [ 19%]
tests/test_api_endpoints.py::test_ai_copilot_fallback PASSED             [ 22%]
tests/test_api_endpoints.py::test_reports_generation PASSED              [ 25%]
tests/test_risk_engine.py::test_hazard_engine_normalization PASSED       [ 29%]
tests/test_risk_engine.py::test_confidence_engine PASSED                 [ 32%]
tests/test_risk_engine.py::test_vulnerability_engine PASSED              [ 35%]
tests/test_risk_engine.py::test_risk_engine_banding PASSED               [ 38%]
tests/test_v2_scientific_engine.py::test_ensemble_aggregation_probabilities PASSED [ 41%]
tests/test_v2_scientific_engine.py::test_ensemble_members_data_integrity PASSED [ 45%]
tests/test_v2_scientific_engine.py::test_weathernext_unit_normalization PASSED [ 48%]
tests/test_v2_scientific_engine.py::test_model_consensus_no_arbitrary_winner PASSED [ 51%]
tests/test_v2_scientific_engine.py::test_scenario_immutability_and_disclaimer PASSED [ 54%]
tests/test_v2_scientific_engine.py::test_asset_impact_probabilities PASSED [ 58%]
tests/test_v2_scientific_engine.py::test_forecast_evolution_temporal_revision PASSED [ 61%]
tests/test_v2_scientific_engine.py::test_rbac_alert_review_and_dispatch PASSED [ 64%]
tests/test_v3_google_native.py::test_google_compliance_endpoint PASSED   [ 67%]
tests/test_v3_google_native.py::test_imd_official_provider PASSED        [ 70%]
tests/test_v3_google_native.py::test_imd_api_endpoint PASSED             [ 74%]
tests/test_v3_google_native.py::test_route_risk_engine PASSED            [ 77%]
tests/test_v3_google_native.py::test_vertex_impact_provider_prediction PASSED [ 80%]
tests/test_v3_google_native.py::test_vertex_pipeline_status PASSED       [ 83%]
tests/test_v3_google_native.py::test_bigquery_analytics_overview PASSED  [ 87%]
tests/test_v3_google_native.py::test_bhuvan_datasets_catalog PASSED      [ 90%]
tests/test_v3_google_native.py::test_gemini_copilot_v2_19_tools PASSED   [ 93%]
tests/test_v3_google_native.py::test_gemini_multimodal_vision PASSED     [ 96%]
tests/test_v3_google_native.py::test_multilingual_translation_service PASSED [100%]

======================== 31 passed in 6.29s ========================
```

---

## 9. Scientific Disclaimer & Intended Use
CYCLONE-X is a disaster-risk decision-support system intended for authorized emergency planning and meteorological evaluation. It does not replace official bulletins from national meteorological agencies (e.g. IMD, RSMC New Delhi, JTWC, WMO). Modeled scenario simulations and AI copilot interpretations must always undergo human review before public civil protection advisories are authorized.
