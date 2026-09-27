# CYCLONE-X

## AI-Powered Cyclone Impact & Infrastructure Vulnerability Intelligence Platform

[![Python](https://img.shields.io/badge/Python-3.12%2B%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16%20(App%20Router)-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Google GenAI SDK](https://img.shields.io/badge/Google_GenAI-Gemini%203.7%2F3.8-4285F4.svg)](https://ai.google.dev/)
[![Google Earth Engine](https://img.shields.io/badge/Earth_Engine-Satellite%20Intelligence-34A853.svg)](https://earthengine.google.com/)
[![License](https://img.shields.io/badge/License-Apache%202.0-orange.svg)](LICENSE)

> **IMPORTANT SCIENTIFIC NOTICE**: CYCLONE-X is a decision-support prototype platform designed for authorized emergency management personnel. All outputs are modeled approximations and decision-support guidance — **not official government warnings or automated evacuation orders**.

---

## 1. Project Overview

During severe cyclonic events in the Bay of Bengal and coastal APAC (such as Odisha, Andhra Pradesh, West Bengal, and Bangladesh), disaster managers are inundated with numerical weather bulletins and satellite imagery. However, standard weather applications only display isobar contours, satellite cloud loops, or wind gust forecasts.

**CYCLONE-X** bridges the operational gap between meteorological forecasting and civil protection:

1. **Ingests Forecast Tracks** and separates them strictly from **Historical Best Tracks** (NOAA IBTrACS).
2. **Ingests Numerical Weather Forecasts** (ECMWF IFS 0.25° via Open-Meteo).
3. **Integrates Google Earth Engine** satellite and terrain datasets (Copernicus Sentinel-1 C-band SAR, NASA NASADEM 30m, JRC Global Surface Water, Dynamic World 10m, WorldPop 100m, GHSL Built-Up).
4. **Transparent Hazard Engine**: Models Wind Hazard (Modified Rankine Vortex), 24h Precipitation, and Coastal Surge Inundation Proxy.
5. **Critical Infrastructure Intersection**: Evaluates risk across Hospitals, Power Substations, Cyclone Shelters, Bridges, Roads, and Water Facilities using PostGIS.
6. **Transparent 0–100 Risk Engine**: Weighted formulation ($0.50 \times \text{Hazard} + 0.30 \times \text{Exposure} + 0.20 \times \text{Vulnerability}$) configured in `config/risk_config.yaml`.
7. **Spatial Hotspot Identification**: Gridded geographic detection ranking priority evacuation and resource staging zones.
8. **What-If Scenario Simulator**: Interactive multipliers for wind, rainfall, surge proxy, and track shifts to stress-test compound failure.
9. **Grounded Gemini Multimodal AI Copilot**: Uses the official Google GenAI SDK with structured evidence injection, strict factuality guardrails, and deterministic backend fallbacks.
10. **Multilingual Advisory Center**: Human-in-the-loop workflow (`DRAFT → REVIEW → APPROVE → SEND`) with translations in English, Hindi, Odia, Telugu, and Bengali.
11. **Publication-Ready Incident Briefings**: Instant export to PDF (via ReportLab), CSV, JSON, and GeoJSON.
12. **100% Offline Zero-Credential DEMO MODE**: Seamless startup with simulated `DEMO CYCLONE ALPHA` data, switching cleanly to `LIVE FEED` when credentials are supplied.

---

## 2. System Architecture

```
+-------------------------------------------------------------------------------------------------+
|                                    CYCLONE-X COMMAND CENTER UI                                  |
|                 (Next.js App Router, React 19, TypeScript, Tailwind CSS, MapLibre GL)           |
+-------------------------------------------------------------------------------------------------+
          |                                      |                                    |
          | REST / JSON                          | GeoJSON & Vector Tiles             | Server Actions / SSE
          v                                      v                                    v
+-------------------------------------------------------------------------------------------------+
|                                      FASTAPI BACKEND RUNTIME                                     |
|  +------------------+  +-------------------+  +------------------+  +------------------------+  |
|  | Request Logging  |  | RBAC & Security   |  | API Router Layer |  | Versioned Risk Config  |  |
|  | & Traceability   |  | (Viewer/Op/Admin) |  | (10 Core Modules)|  | (risk_config.yaml)    |  |
|  +------------------+  +-------------------+  +------------------+  +------------------------+  |
+-------------------------------------------------------------------------------------------------+
          |                                      |                                    |
          v                                      v                                    v
+-----------------------+              +-----------------------+            +---------------------+
| DATA PROVIDER LAYER   |              | RISK & HAZARD ENGINE  |            | REASONING & ALERTS  |
| • DemoCycloneProvider |              | • HazardEngine        |            | • GeminiService     |
| • IBTrACSProvider     |              |   (Wind, Rain, Surge) |            |   (Google GenAI SDK)|
| • OpenMeteo ECMWF     |              | • ExposureEngine      |            | • AlertService      |
| • EarthEngineService  |              |   (Population, Assets)|            |   (Human-in-the-loop|
| • INCOIS Surge /      |              | • VulnerabilityEngine |            |   Approval Workflow)|
|   Scenario Proxy      |              |   (Elevation, Distance|            | • ReportService     |
| • GeoJSONInfraProvider|              | • ConfidenceEngine    |            |   (PDF, CSV, JSON)  |
| • DryRunNotification  |              | • ScenarioEngine      |            +---------------------+
+-----------------------+              +-----------------------+                       |
          |                                      |                                     |
          v                                      v                                     v
+-------------------------------------------------------------------------------------------------+
|                                    PERSISTENCE & STORAGE                                        |
|   • PostgreSQL 16 + PostGIS (Production Spatial Storage) / SQLite + Shapely Spatial Layer       |
|   • Versioned Config: config/risk_config.yaml                                                   |
|   • Demo Dataset Repository: /data/demo/                                                        |
+-------------------------------------------------------------------------------------------------+
```

---

## 3. Core Features & Capabilities

| Module | Operational Capability | Data Distinction |
| :--- | :--- | :--- |
| **Command Center** | Single-pane-of-glass overview with real-time metrics, interactive MapLibre GL map, Context Brief, and Top Priority Zones table. | `MODEL_OUTPUT` |
| **Cyclone Monitor** | Interactive forecast step timeline slider (`+0h`, `+6h`, `+12h`, `+18h Landfall`, `+24h`, `+36h`, `+48h`, `+72h`), comparing observed tracks with forward forecast cones. | `OBSERVATION` vs `FORECAST` |
| **Risk Analysis** | Transparent formula and active weights inspection ($50\%$ Hazard, $30\%$ Exposure, $20\%$ Vulnerability), multi-dimensional data confidence breakdown ($74\%$). | `MODEL_OUTPUT` |
| **Infrastructure** | Critical asset inventory (District Hospitals, 400kV Substations, Cyclone Shelters, Bridges) with elevation, primary threat, and nearest backup facility. | `OBSERVATION` |
| **Scenario Simulator** | Real-time stress-testing with sliders for wind ($0.5\times-2.0\times$), rain ($0.5\times-2.5\times$), surge ($0-6\text{m}$), and track shifts, generating Before vs After vs Delta comparisons. | `SCENARIO` |
| **Alert Center** | 4-stage human clearance workflow (`DRAFT → REVIEW → APPROVE → DISPATCH`) with multilingual translations in English, Hindi, Odia, Telugu, and Bengali. | `MODEL_OUTPUT` |
| **AI Copilot** | Gemini multimodal reasoning using official `google-genai` SDK with strict scientific guardrails and satellite C-band SAR feature classification (`OBSERVED`, `POSSIBLE`, `UNKNOWN`). | `AI_INTERPRETATION` |
| **Incident Reports** | Publication-grade executive briefing generator with direct export to PDF, CSV, JSON, and GeoJSON. | `MODEL_OUTPUT` |
| **Data Sources** | Attribution registry detailing providers, resolution, temporal coverage, and Google Earth Engine live setup guide. | `OBSERVATION` |
| **Settings** | Operational mode toggle (`DEMO` vs `LIVE`), model selector (`gemini-3.7-flash` / `3.8`), role-based clearance switcher, and risk weight sliders. | `SYSTEM` |

---

## 4. Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router) with React 19 & TypeScript
- **Styling**: Tailwind CSS v4 with dark command-center aesthetic
- **Geospatial Mapping**: MapLibre GL v6 with CartoDB Dark raster/vector tiles
- **Icons**: Lucide React
- **Data Flow**: Custom typed API client with offline caching

### Backend
- **Framework**: FastAPI with Pydantic v2 & Pydantic-Settings
- **Geospatial Processing**: Shapely 2.1 & NumPy
- **Satellite & Earth Engine**: `earthengine-api` (server-side authentication)
- **AI & Multimodal**: Google GenAI SDK (`google-genai` 2.25+)
- **Report Generation**: ReportLab 5.0 (PDF generation) & Pillow
- **Configuration**: Versioned YAML (`risk_config.yaml`)

---

## 5. Dataset Attribution & Sources

| Dataset | Provider | Usage in CYCLONE-X | License |
| :--- | :--- | :--- | :--- |
| **NOAA IBTrACS v04r00** | NOAA / NCEI | Historical cyclone best-track validation | Public Domain |
| **ECMWF IFS 0.25°** | ECMWF via Open-Meteo | Hourly wind speed, gusts, 24h precipitation, surface pressure | Open Data |
| **Copernicus Sentinel-1** | ESA via Earth Engine | 10m C-band SAR radar for all-weather flood change detection | CC-BY 3.0 |
| **NASA NASADEM 30m** | NASA LP DAAC | Digital Elevation Model for coastal terrain susceptibility | Public Domain |
| **JRC Surface Water** | European Commission | 38-year permanent and seasonal surface water baseline | ODbL |
| **WorldPop Global 100m** | University of Southampton | Demographic exposure estimation across risk tiers | CC-BY 4.0 |
| **GHSL Built-Up** | European Commission JRC | Spatial concentration of built human settlements | Open Data |

---

## 6. Environment Configuration (`.env.example`)

```bash
# Application Mode: 'demo' (offline simulated data) or 'live' (real API queries)
APP_MODE=demo
DEBUG=true

# Server Configuration
HOST=0.0.0.0
PORT=8000
NEXT_PUBLIC_API_URL=http://localhost:8000

# Database Configuration (PostGIS for production Docker)
DATABASE_URL=postgresql://cyclonex:cyclonex_secret@db:5432/cyclonex_db

# Google Gemini AI Configuration
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.7-flash

# Google Earth Engine Configuration
GOOGLE_CLOUD_PROJECT=
EARTH_ENGINE_PROJECT=
GOOGLE_APPLICATION_CREDENTIALS=

# Weather Service Configuration
WEATHER_PROVIDER=open-meteo
OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1/forecast

# Map Provider
MAP_PROVIDER=carto-dark
```

---

## 7. How to Run Locally

### Prerequisites
- Python 3.12+ (or 3.13 / 3.14)
- Node.js 18+ and npm

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/cyclone-x.git
cd cyclone-x
```

### Step 2: Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend API server
# Windows PowerShell:
$env:PYTHONPATH="backend"; uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Linux/macOS:
PYTHONPATH=backend uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API and Swagger docs will be live at `http://localhost:8000/docs`.

### Step 3: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
The Command Center dashboard will be accessible at `http://localhost:3000`.

---

## 8. Docker Deployment

To launch the full production environment with PostgreSQL 16 + PostGIS, FastAPI backend, and Next.js frontend:

```bash
docker compose up --build -d
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- PostGIS Database: `localhost:5432`

---

## 9. Testing & Quality Assurance

CYCLONE-X includes automated unit and integration tests covering the HazardEngine, ExposureEngine, VulnerabilityEngine, ConfidenceEngine, ScenarioEngine, and all FastAPI endpoints:

```bash
# Run pytest test suite
$env:PYTHONPATH="backend"; .venv\Scripts\pytest -v tests
```
Result: **12 passed in 2.5s**.

---

## 10. Role-Based Access Control (RBAC)

Pre-seeded demo credentials for testing:
- **Viewer** (`role:viewer`): Read-only observation of tracks, layers, and telemetry.
- **Operator** (`role:operator`): Can run what-if scenarios, draft advisories, and approve alerts.
- **Admin** (`role:admin`): Can override prototype policy weights and manage critical assets.

---

## 11. Scientific Honesty & Limitations

- **Prototype Decision Support**: All risk scores ($0-100$) are prototype decision-support approximations and not officially certified government forecasts.
- **Scenario Surge Proxy**: In the absence of an official INCOIS hydrodynamic surge bulletin, coastal inundation is evaluated via a topographic proxy and clearly labeled as such.
- **Demographic Projections**: Population exposure uses WorldPop 100m gridded projections, not real-time census tallies.
- **Zero Hallucination Guardrails**: Gemini AI receives grounded structured context from the backend and is forbidden from inventing coordinates, wind speeds, or casualties.

---

## 12. License

Apache 2.0 License. Developed for disaster-risk resilience and decision support across the Bay of Bengal and coastal APAC.
