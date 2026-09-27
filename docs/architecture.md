# CYCLONE-X System Architecture

## AI-Powered Cyclone Impact & Infrastructure Vulnerability Intelligence Platform

### 1. Executive Summary & Core Philosophy

**CYCLONE-X** is an operational decision-support command center engineered for national and regional emergency management authorities across the Bay of Bengal and coastal APAC.

Unlike standard weather tracking websites that merely display isobar lines and animated radar loops, CYCLONE-X bridges the critical operational gap:

$$\text{Numerical Meteorological Forecast} \longrightarrow \text{Geospatial Hazard} \longrightarrow \text{Critical Infrastructure Vulnerability} \longrightarrow \text{Actionable Human-Approved Directives}$$

Every data point in CYCLONE-X strictly maintains **scientific honesty**, exposing provenance, freshness, confidence, and explicit scientific classifications (`OBSERVATION`, `FORECAST`, `HISTORICAL`, `MODEL_OUTPUT`, `SCENARIO`, `AI_INTERPRETATION`).

---

### 2. High-Level Architecture Diagram

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

### 3. Data Ingestion & Provider Architecture

The platform isolates provider-specific formats behind standardized Abstract Base Classes:

1. **CycloneTrackProvider**:
   - `DemoCycloneProvider`: Supplies complete simulated cyclonic scenarios (`DEMO CYCLONE ALPHA`) for standalone and offline operations.
   - `IBTrACSProvider`: Ingests NOAA International Best Track Archive for historical verification.
   - `OfficialForecastIngestionProvider`: Normalizes incoming RSMC bulletins without fabricating uncertainty cones.

2. **WeatherProvider**:
   - `OpenMeteoWeatherProvider`: Connects to ECMWF IFS 0.25° model endpoints with an automated 15-minute in-memory cache to eliminate redundant egress requests.
   - `DemoWeatherProvider`: Provides reproducible hourly atmospheric profiles for coastal observatories.

3. **SatelliteProvider & Google Earth Engine**:
   - Runs strictly **server-side** to safeguard cloud service-account credentials.
   - Features dynamic fallback to cached tile previews when GCP/EE credentials are unconfigured.
   - Manages Sentinel-1 C-band SAR GRD, NASA NASADEM (30m), JRC Global Surface Water, and Dynamic World (10m).

4. **StormSurgeProvider**:
   - Implements strict scientific transparency: distinguishes official INCOIS hydrodynamic bulletins from our **Scenario Inundation Proxy**.

---

### 4. Risk Computation Flow

The Risk Engine calculates transparent composite scores:

$$\text{Overall Risk} = 0.50 \times \text{Hazard} + 0.30 \times \text{Exposure} + 0.20 \times \text{Vulnerability}$$

- **Hazard Sub-factors**:
  $$\text{Hazard} = 0.40 \times H_{\text{wind}} + 0.30 \times H_{\text{rain}} + 0.30 \times H_{\text{inundation}}$$
- **Exposure Factors**: Evaluates infrastructure criticality ($0-100$) and WorldPop gridded demographic density.
- **Vulnerability Factors**: Evaluates low elevation ($<5\text{m}$ NASADEM), coastal proximity ($<15\text{km}$), and facility backup generators.
- **Categorical Risk Bands**:
  - `0 - 24`: LOW
  - `25 - 49`: MODERATE
  - `50 - 74`: HIGH
  - `75 - 100`: SEVERE

---

### 5. AI Reasoning & Multimodal Guardrails

- Powered by official `google-genai` SDK using `gemini-3.7-flash` (or `gemini-3.8-flash`).
- Gemini never calculates risk scores independently or generates evacuation orders automatically.
- Structured evidence is injected via prompt context.
- System instruction mandates distinguishing `OBSERVED`, `FORECAST`, `MODEL_OUTPUT`, and `SCENARIO`.
- Deterministic backend fallback ensures 100% functionality even with zero internet or unconfigured API keys.
