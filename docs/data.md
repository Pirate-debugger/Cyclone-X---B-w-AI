# CYCLONE-X V2 — DATA CATALOG & PROVENANCE SPECIFICATION

This catalog specifies every geospatial, atmospheric, elevation, infrastructure, and population dataset utilized within the **CYCLONE-X** platform in accordance with Section 85 of the master specification.

---

## 1. Earth Observation & Satellite Layers

### Sentinel-1 Synthetic Aperture Radar (SAR) GRD
- **Provider:** European Space Agency (ESA) Copernicus Program / Google Earth Engine
- **Sensor:** C-band Synthetic Aperture Radar (SAR) (5.405 GHz)
- **Bands:** VV (Vertical transmit, Vertical receive) and VH (Vertical transmit, Horizontal receive)
- **Spatial Resolution:** 10 meters / pixel
- **Temporal Resolution:** 6 to 12 days revisit cycle
- **Latency:** ~3 hours (Near Real-Time NRT)
- **License:** Open Access (Copernicus Sentinel Data Policy)
- **Usage:** Pre-event vs. post-event specular reflectance thresholding to extract satellite-observed water-change signals and coastal inundation footprint.
- **Labeling Rule:** Always displayed as `OBSERVED SATELLITE CHANGE`, never as unverified confirmed structural damage.

### Sentinel-2 Multi-Spectral Instrument (MSI)
- **Provider:** European Space Agency (ESA) Copernicus Program
- **Bands:** B2 (Blue), B3 (Green), B4 (Red), B8 (NIR), B11/B12 (SWIR)
- **Spatial Resolution:** 10m (VNIR) / 20m (SWIR)
- **Temporal Resolution:** 5 days revisit
- **Usage:** Post-storm flood validation, sediment plume monitoring, and coastal erosion analysis.

### NASADEM Global Elevation Model
- **Provider:** NASA JPL / USGS
- **Spatial Resolution:** 1 arc-second (~30 meters)
- **Vertical Accuracy:** ±5 meters linear error
- **License:** Public Domain
- **Usage:** High-resolution digital elevation model (DEM) for topographic inundation thresholds, drainage slope analysis, and asset elevation indexing.

---

## 2. Demographic & Human Exposure Datasets

### WorldPop Global High-Resolution Population Count
- **Provider:** WorldPop Research Group, University of Southampton
- **Spatial Resolution:** 100 meters (3 arc-seconds)
- **Dataset Year:** 2024 / 2025 projection
- **License:** Creative Commons Attribution 4.0 International (CC-BY 4.0)
- **Usage:** Spatial aggregation of vulnerable residents intersecting hazard exceedance polygons ($>100\text{ km/h wind}, >200\text{ mm rain}, >0.5\text{ m surge}$).
- **Attribution:** "WorldPop (www.worldpop.org - School of Geography and Environmental Science, University of Southampton; Department of Geography and Geosciences, University of Louisville; 2024)."

### Global Human Settlement Layer (GHSL)
- **Provider:** European Commission Joint Research Centre (JRC)
- **Layers:** GHS-BUILT-S (Built-up surface) and GHS-POP
- **Spatial Resolution:** 100 meters
- **Usage:** Validation of built infrastructure density and urban fringe expansion.

---

## 3. Historical Storm Trajectories & Verification

### International Best Track Archive for Climate Stewardship (IBTrACS)
- **Provider:** NOAA National Centers for Environmental Information (NCEI)
- **Coverage:** Global tropical cyclone best-tracks from 1848 to present
- **Temporal Resolution:** 3-hourly and 6-hourly interpolated best-track fixes
- **License:** Public Domain / NOAA Open Data
- **Usage:** Ground truth for backtesting and objective model forecast verification (Cyclone Fani 2019, Amphan 2020, Mocha 2023).

---

## 4. Critical Lifeline Infrastructure Schema

Every infrastructure asset record in CYCLONE-X includes comprehensive physical, operational, and data provenance attributes:

```json
{
  "id": "INFRA-HOSP-001",
  "name": "District Headquarters Hospital, Puri",
  "type": "hospital",
  "criticality": 95,
  "capacity": 380,
  "geometry": { "type": "Point", "coordinates": [85.8245, 19.8134] },
  "elevation_m": 6.2,
  "coastal_distance_km": 1.4,
  "backup_power": "AVAILABLE (72h Diesel Genset + Solar Hybrid)",
  "flood_protection": "REINFORCED_PLINTH_0.8M",
  "redundancy": "HIGH",
  "road_access": "PRIMARY_HIGHWAY_NH316",
  "population_served": 280000,
  "source": "State Health Resource Directorate & OpenStreetMap Contributors",
  "last_verified": "2026-06-15",
  "data_quality_pct": 94.0
}
```

---

## 5. Classification Taxonomy & Traceability (Section 5)
Every data record displayed on the frontend or returned via API is stamped with its exact classification:
1. `OBSERVATION` — Real physical instrument data (AWS, Doppler radar, satellite).
2. `FORECAST` — Forward deterministic prediction from operational NWP.
3. `ENSEMBLE` — Multi-member perturbed probabilistic simulations.
4. `HISTORICAL` — Retrospective post-season reanalysis (e.g. IBTrACS).
5. `MODEL_OUTPUT` — Secondary spatial processing (e.g. hazard grid, consensus).
6. `SCENARIO` — What-If parameter exploration.
7. `AI_INTERPRETATION` — Gemini copilot explanations and briefings.
8. `OFFICIAL_ADVISORY` — Approved human-reviewed early warning statements.
9. `DEMO` — Offline calibrated sandbox simulation.
