# CYCLONE-X V2 — MODEL CARDS SPECIFICATION

This document details the meteorological, artificial intelligence, and physical hazard models integrated into the **CYCLONE-X** Disaster Intelligence Platform in accordance with Section 84 of the engineering specification.

---

## 1. WeatherNext 3 Global NWP Fusion Model

### Model Overview
- **Model Name:** WeatherNext 3
- **Developer / Provider:** Google DeepMind / Google Research Weather Intelligence
- **Model Type:** Deep generative atmospheric forecast ensemble fused with physical reanalysis
- **Version:** 3.1-Operational-Preview
- **License / Access:** Google Cloud Approved Allowlist / Enterprise Research Agreement
- **Ensemble Size:** 64 perturbed members
- **Spatial Resolution:** 0.25° × 0.25° (~28 km at equator) global grid
- **Vertical Resolution:** 37 pressure levels (1000 hPa to 1 hPa)
- **Temporal Resolution:** 6-hourly output steps from T+0h to T+240h (10-day forecast horizon)

### Atmospheric Variables & Units
All variables are strictly normalized at ingestion:
| Parameter | Raw Unit | Normalized Unit | Description |
| :--- | :--- | :--- | :--- |
| `2m_temperature` | Kelvin (K) | Celsius (°C) | Surface ambient temperature |
| `10m_wind_u`, `10m_wind_v` | m/s | km/h | 10-meter zonal & meridional wind velocity |
| `total_precipitation` | meters (m) | millimeters (mm) | 6h & 24h accumulated rainfall |
| `mean_sea_level_pressure` | Pa | hPa (mbar) | Sea-level barometric pressure |
| `sea_surface_temperature` | Kelvin (K) | Celsius (°C) | Oceanic thermal boundary layer |

### Intended Use
- Probabilistic cyclone track and intensity dispersion analysis.
- Extraction of meteorological percentile plumes ($p10, p25, p50, p75, p90$) for early warning.
- Grid-level boundary condition input for high-resolution coastal inundation and rainfall exceedance modeling.

### Non-Intended Use
- Not a replacement for local national meteorological services (e.g. IMD / JTWC) official storm advisories.
- Should not be used for hyper-local microclimate turbulence (< 5 km) without downscaling.

### Known Limitations
- May exhibit slight spatial under-dispersion in rapid intensification (RI) scenarios over warm oceanic eddies (> 30°C SST).
- Landfall timing uncertainty expands beyond T+72h; cross-track spread should be reviewed alongside official consensus.

---

## 2. WeatherNext Cyclones (Vortex-Centric AI Model)

### Model Overview
- **Model Name:** WeatherNext Cyclones (Vortex Focus)
- **Architecture:** Spherical Graph Neural Network (GNN) specialized on tropical cyclone vortex dynamics
- **Model Size:** 180M parameters (Full) / 45M parameters (WeatherNext Cyclones Mini)
- **Inference Mode:** Asynchronous background worker (`CycloneInferenceWorker`) with Redis/PostGIS caching
- **Horizon:** T+0h to T+120h (5-day storm trajectory)
- **Input Features:** 6-hourly operational GFS/ECMWF analysis, SST anomalies, upper-level wind shear, 850 hPa relative vorticity.

### Output Metrics
- Storm center coordinate tracks $[Lat, Lon]$.
- Maximum sustained surface wind speed ($V_{max}$ in km/h).
- Minimum central barometric pressure ($P_{min}$ in hPa).
- Asymmetric wind radii: 34-knot ($R_{34}$), 50-knot ($R_{50}$), and 64-knot ($R_{64}$) in km across 4 quadrants.

### Intended Use
- Rapid track scenario generation and landfall window bounding.
- Probabilistic landfall sector estimation across coastal zones.

### Scientific Honesty Note
When running in offline demo mode, outputs are generated via calibrated physics-based ensemble proxies derived from historical cyclone tracks (Fani, Amphan, Mocha) rather than claiming synthetic predictions as verified live ML inference.

---

## 3. ECMWF Integrated Forecasting System (IFS 0.25°)

### Model Overview
- **Provider:** European Centre for Medium-Range Weather Forecasts (ECMWF)
- **Model Type:** Deterministic and Ensemble Numerical Weather Prediction (NWP)
- **Cycle Initialization:** 00Z, 06Z, 12Z, 18Z
- **Resolution:** 0.25° (~28 km)
- **Role in CYCLONE-X:** Serves as a baseline benchmark in the Multi-Model Consensus Engine.

---

## 4. Multi-Model Consensus Engine

### Methodology
- Rather than declaring an arbitrary "model winner", the platform computes:
  1. **Centroid Consensus Track:** Weighted average trajectory across official IMD track, WeatherNext Cyclones, and ECMWF IFS.
  2. **Inter-Model Track Spread:** Maximum pairwise Haversine distance at each forecast step (km).
  3. **Inter-Model Intensity Spread:** Standard deviation of peak wind speed forecasts across models.
  4. **Confidence Assessment:** Fuses inter-model agreement with ensemble member spread into an objective confidence score ($0-100\%$).
