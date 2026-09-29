# CYCLONE-X — Map Engine Complete Audit & Repair Plan

**Date:** September 2026  
**Auditors:** Geospatial GIS Architecture & MapLibre Engineering Team  
**Status:** AUDIT COMPLETED — IMPLEMENTING COMPLETE REPAIR  

---

## 1. Executive Summary & Audit Scope

A comprehensive audit was performed across:
- `frontend/components/MapContainer.tsx`
- `frontend/app/page.tsx`
- `frontend/lib/api.ts`
- `frontend/lib/types.ts`
- `backend/app/services/hazard_field_engine.py`
- `backend/app/services/route_risk_engine.py`
- `backend/app/providers/satellite_provider.py`
- `backend/app/providers/`
- `public/maplibre-gl-worker.mjs` and `public/maplibre-gl-shared.mjs`
- `next.config.ts`, `Dockerfile`, `package.json`, and backend test suite.

The primary map stack is:
$$\text{MapLibre GL JS 6.11.2} + \text{OpenFreeMap (Liberty)} + \text{CYCLONE-X Overlays} + \text{Google Earth Engine / SAR}$$
Zero Google Maps API keys and Zero CARTO API keys are required for core operations.

---

## 2. Identified Deficiencies & Root Causes

### A. Style Values & Backend Bug
- **Bug in `hazard_field_engine.py`:** Line 156 contained `"fill_opacity": 25`. MapLibre GL JS specifications mandate that `fill-opacity` must be a scalar float within the interval $[0.0, 1.0]$. Values $> 1.0$ cause style parser errors or render corrupt polygons.
- **Frontend Lack of Normalization:** `MapContainer.tsx` directly bound `'fill-opacity': ['get', 'fill_opacity']` without checking or clamping values.

### B. Map Style Replacement & Layer Destruction
- **`setStyle()` Anti-Pattern:** When changing basemaps or triggering offline mode, `map.setStyle()` was called without a lifecycle rehydration manager (`MapLayerManager`). Calling `setStyle()` destroys all runtime sources and layers in MapLibre GL JS.
- **No Layer Registry:** Layer visibility was partially hardcoded inside a `switch(activeMode)` statement instead of a unified, declarative `LayerRegistry` with `setLayerVisibility(id, visible)`.
- **Mode Switching Isolation:** Mode switching (`TRACK`, `ENSEMBLE`, `WIND`, `RAINFALL`, `FLOOD`, `IMPACT`, `INFRASTRUCTURE`, `POPULATION`, `SATELLITE`, `FORECAST CHANGE`, `ROUTE RISK`) must NEVER call `map.setStyle()`; they are purely overlay presets.

### C. Missing & Incomplete Modes
- **POPULATION Mode:** The `POPULATION` button was present in UI, but no underlying data source, raster layer, or polygon grid was registered.
- **SATELLITE Mode:** No actual satellite imagery layer was attached. Needs dedicated `satellite-raster-source` and `satellite-raster-layer` backed by Google Earth Engine / Sentinel-1 SAR endpoints with clean unconfigured fallbacks.
- **FORECAST CHANGE Mode:** Did not exist in the map layer registry. Needs delta tracks and landfall shift lines comparing previous vs. current forecast runs.

### D. Route Risk Geometry Mismatch & Hardcoded Fallbacks
- **Property Mismatch:** Backend returns `route_geojson` (GeoJSON Feature with `geometry.coordinates` in `[lon, lat]`), whereas frontend checked `route_geometry`.
- **Hardcoded Coordinates:** Frontend lines 814–818 had hardcoded synthetic coordinates for Bhubaneswar to Puri, violating the rule that LIVE mode must never display synthetic routes.

### E. Hardcoded Geographic Defaults & Missing Context
- **Puri Hardcoding:** Map center was statically fixed to `[86.2, 19.8]` with no dynamic bounds computation.
- **Context Isolation:** `selectedState` and `selectedDistrict` in `page.tsx` were not passed to `MapContainer`, preventing camera updates when selecting Gujarat, Tamil Nadu, Andhra Pradesh, or West Bengal.
- **Camera Bounds:** Centroids were averaged using arithmetic mean instead of `maplibregl.LngLatBounds`.

### F. Popup Security & Event Listener Memory Leaks
- **XSS Vulnerability:** Popups used unescaped `setHTML()` with raw properties (`props.name`, `props.action`, `props.admin_area`).
- **Duplicate Event Handlers:** Click handlers were re-bound inside reactive `useEffect` hooks without cleanup (`map.off()`), multiplying listeners on every state update.

### G. Infrastructure Risk Fallbacks
- Lines 653–659 in `MapContainer.tsx` silently defaulted to `60%`, `80%`, `70%`, `45%`, `92.5%` when asset impact probabilities were missing, instead of showing `N/A` or `DATA UNAVAILABLE`.

### H. Local Offline Basemap
- The offline style was an empty `#080d1a` dark rectangle with no geographic features. It must include bundled offline GeoJSON geometries for India's coastline, states, and major coastal ports/districts.

---

## 3. Complete Architectural Repair Plan

1. **Backend Patch:** Fix `fill_opacity: 25` $\to$ `0.25` in `hazard_field_engine.py` and ensure `route_geojson` is always canonical GeoJSON.
2. **`MapLayerManager`:** Centralized class managing source registration, layer registration, data updates, clean removals, and rehydration across `load`, `style.load`, and `styledata` events.
3. **GeoJSON Validator & Safe Opacity Normalizer:** Clamp opacity to $[0.0, 1.0]$, validate coordinates within $[-180, 180]$ and $[-90, 90]$, discard malformed features without dropping valid ones.
4. **Automatic Camera (`LngLatBounds`):** Implement `fitToEvent()`, `fitToTrack()`, `fitToHotspot()`, `fitToInfrastructure()`, `fitToDistrict()`, `fitToRoute()`, and state-level bounds for India coastal states.
5. **Mode Presets & Visibility:** 11 distinct modes configuring layer visibility via `setLayoutProperty` with existence checks; zero calls to `setStyle()`.
6. **Real Overlays:**
   - Population density grid (`population-source`, `population-fill`).
   - Satellite raster (`satellite-raster-source`, `satellite-raster-layer`) connected to Earth Engine/Sentinel-1 tiles.
   - Forecast change comparison (`forecast-change-source`, `forecast-change-line`).
   - Clustered infrastructure (`cluster: true`, `clusterRadius: 40`).
7. **Secure Popups & Interaction Registry:** `escapeHtml()` sanitization, single interaction attachment lifecycle with `map.off()` cleanup.
8. **India Offline Basemap:** Bundled high-accuracy India coastline and coastal state boundaries embedded directly into `LOCAL_OFFLINE_STYLE`.
9. **Time Slider:** `NOW`, `+6h`, `+12h`, `+24h`, `+36h`, `+48h`, `+72h` lead-time filter.
10. **Verification:** Unit tests and end-to-end browser testing.
