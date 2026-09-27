# CYCLONE-X V2 — PROBABILISTIC RISK MODEL SPECIFICATION

This document details the mathematical formulation, multi-hazard decomposition, asset fragility curves, and uncertainty propagation rules in **Risk Model V2** (Section 30, 86).

---

## 1. Core Proposition & Philosophy
Unlike legacy single-scalar models that compress atmospheric complexity into an arbitrary number like "Risk: 82", **Risk Model V2** implements a decoupled, probabilistic pipeline:

$$\text{Risk} = f(\text{Hazard}, \text{Exposure}, \text{Vulnerability}, \text{Impact Probability})$$

$$\text{Expected Loss} = P(\text{Threshold Exceeded}) \times \text{Consequence}$$

---

## 2. Hazard Field Decomposition ($H$)
Rather than assuming a uniform circle around the cyclone eye, physical hazard fields are gridded and evaluated across multiple components:

### 2.1 Wind Hazard Field ($H_{wind}$)
- **Operational Grid:** Surface 10-meter maximum sustained wind ($V_{10}$ in km/h) and peak gusts ($V_{gust}$).
- **Parametric Fallback (Holland Vortex Profile):**
  $$V(r) = \left[ \frac{B}{\rho} \left(\frac{R_{max}}{r}\right)^B (P_{env} - P_c) e^{-(R_{max}/r)^B} + \left(\frac{r f}{2}\right)^2 \right]^{1/2} - \frac{r f}{2}$$
  *Disclosed on UI as `PARAMETRIC PROXY` whenever NWP grid is unavailable.*
- **Normalization:**
  $$H_{wind} = \min\left(100, \left(\frac{V_{max}}{220}\right)^{1.35} \times 100\right)$$

### 2.2 Rainfall Hazard Field ($H_{rain}$)
- **Accumulation Windows:** 6-hour, 24-hour, and 72-hour gridded precipitation fields.
- **Exceedance Thresholds:**
  $$P(\text{Rain}_{24h} > 100\text{ mm}), \quad P(\text{Rain}_{24h} > 200\text{ mm}), \quad P(\text{Rain}_{24h} > 300\text{ mm})$$
- **Normalization:**
  $$H_{rain} = \min\left(100, \left(\frac{R_{24h}}{300}\right) \times 100\right)$$

### 2.3 Coastal Water Level & Inundation Decomposition ($H_{flood}$)
Inundation is strictly partitioned into distinct physical drivers:
$$\text{Total Water Level (TWL)} = \text{Tide}_{astronomical} + \text{Surge}_{meteorological} + \text{Wave Setup} + \text{Rainfall Runoff}$$

1. **Official Hydrodynamic Product:** Coupled ADCIRC/SLOSH coastal surge grids when INCOIS/NOAA feeds are available.
2. **Topographic Inundation Proxy:** Hydro-enforced bathtub and planar slope model over NASADEM 30m.
3. **Satellite Observed Change:** Sentinel-1 SAR backscatter specular drop (> 3 dB attenuation).

---

## 3. Asset-Level Impact Probabilities ($P_{impact}$)
For every critical infrastructure asset $i$ and each of the 64 ensemble forecast members $m \in \{1 \dots 64\}$:
1. Determine local wind speed $V_{i,m}$, rainfall $R_{i,m}$, and water level $Z_{i,m}$.
2. Evaluate fragility thresholds:
   - Wind threshold: $V_{thresh} = 100\text{ km/h}$ (hospitals), $120\text{ km/h}$ (substations).
   - Rain threshold: $R_{thresh} = 150\text{ mm}$ (24h).
   - Inundation threshold: $Z_{thresh} = \text{Elevation}_i + \text{Plinth}_i$.
3. Compute empirical ensemble exceedance frequencies:
   $$P_{wind, i} = \frac{1}{64} \sum_{m=1}^{64} \mathbb{I}(V_{i,m} \ge V_{thresh, i})$$
   $$P_{rain, i} = \frac{1}{64} \sum_{m=1}^{64} \mathbb{I}(R_{i,m} \ge R_{thresh, i})$$
   $$P_{flood, i} = \frac{1}{64} \sum_{m=1}^{64} \mathbb{I}(Z_{i,m} \ge Z_{thresh, i})$$
   $$P_{combined, i} = 1 - (1 - P_{wind, i})(1 - P_{rain, i})(1 - P_{flood, i})$$

---

## 4. Cascading Infrastructure Network Graph
Infrastructure assets are organized as a directed dependency graph $G = (V, E)$:
- **Substation** $\to$ **Water Treatment Plant** $\to$ **General Hospital**
- **Bridge Failure** $\to$ **Road Connectivity Severance** $\to$ **Emergency Access Delay**

When an upstream node experiences $P_{combined} > 0.60$, downstream dependencies are flagged with:
`MODELLED CASCADING IMPACT (NOT CONFIRMED PHYSICAL FAILURE)`

---

## 5. Early Action Prioritization Formula
Priority actions for emergency response commanders are ranked dynamically by:

$$\text{Priority Score} = P_{combined} \times \text{Criticality} \times \left(1 + \frac{1}{\max(1, T_{lead})}\right) \times \left(1 - \text{Preparedness Factor}\right)$$

Where:
- $T_{lead}$: Time to impact in hours ($12\text{h} \dots 72\text{h}$).
- $\text{Preparedness Factor}$: Backup generator status ($+0.25$), flood plinth ($+0.20$).
- Output categories: `IMMEDIATE ACTION (<12h)`, `HIGH PRIORITY (12-24h)`, `MONITOR (24-48h)`.
