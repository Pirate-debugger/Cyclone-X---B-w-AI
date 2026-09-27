# CYCLONE-X Risk Modeling Methodology

## Physical Basis, Thresholds & Scientific Assumptions

### 1. Transparent Equation Architecture

All risk scoring in CYCLONE-X is deterministic, transparent, and driven by versioned configuration (`config/risk_config.yaml`). The platform does not use opaque deep learning black-boxes for life-safety calculations.

The primary composite decision-support metric is defined as:

$$\text{Risk}_{\text{overall}} = w_h \cdot H + w_e \cdot E + w_v \cdot V$$

Where default prototype policy weights are:
- $w_h = 0.50$ (Physical Hazard Intensity)
- $w_e = 0.30$ (Critical Asset & Demographic Exposure)
- $w_v = 0.20$ (Geospatial & Structural Vulnerability)

All weights are configurable by authorized administrators.

---

### 2. Hazard Modeling ($H$)

$$H = w_{\text{wind}} \cdot H_{\text{wind}} + w_{\text{rain}} \cdot H_{\text{rain}} + w_{\text{surge}} \cdot H_{\text{surge}}$$

Default weights: $w_{\text{wind}} = 0.40$, $w_{\text{rain}} = 0.30$, $w_{\text{surge}} = 0.30$.

#### A. Wind Hazard ($H_{\text{wind}}$)
Modeled using a **Modified Rankine Vortex** based on sustained surface winds ($V_{\max}$) and Radius of Maximum Winds ($R_{\max} \approx 35\text{ km}$):

$$V(r) = \begin{cases} 
V_{\max} \cdot \left(\frac{r}{R_{\max}}\right) & r \le R_{\max} \\
V_{\max} \cdot \left(\frac{R_{\max}}{r}\right)^{0.55} & r > R_{\max} 
\end{cases}$$

Normalized against IMD/Saffir-Simpson cyclone classification boundaries:
- Gale Force threshold ($62\text{ km/h}$): $H_{\text{wind}} \ge 40$
- Super Cyclone onset ($222\text{ km/h}$): $H_{\text{wind}} \ge 90$

#### B. Precipitation Hazard ($H_{\text{rain}}$)
Cumulative 24-hour rainfall modeled via exponential radial decay and calibrated against IMD warning thresholds:
- Moderate rain ($64.5\text{ mm}$): $H_{\text{rain}} = 35$
- Extremely heavy rain ($204.5\text{ mm}$): $H_{\text{rain}} = 80$
- Exceptional inundation ceiling ($350\text{ mm}$): $H_{\text{rain}} = 100$

#### C. Coastal Inundation Proxy ($H_{\text{surge}}$)
In the absence of an official hydrodynamic bulletin, CYCLONE-X computes a **Scenario Inundation Proxy**:

$$D_{\text{inundation}} = \max\left(0, S \cdot \exp\left(-\frac{d_{\text{coast}}}{\lambda}\right) - z_{\text{elev}}\right)$$

Where $S$ is the scenario storm surge height ($2.2\text{ m}$ baseline), $d_{\text{coast}}$ is the distance to open coast, $\lambda = 12\text{ km}$ is the coastal attenuation constant, and $z_{\text{elev}}$ is the NASADEM terrain elevation.

---

### 3. Exposure Modeling ($E$)

1. **Asset Criticality**: Predefined prototype policy scores ($0-100$):
   - Hospitals & Regional Trauma Centers: $95-98$
   - Power Generation & Grid Substations: $90-95$
   - Major Evacuation Bridges: $85-88$
   - Arterial Evacuation Highways: $80-85$
   - Emergency Cyclone Shelters: $90-92$
   - Municipal Water Pumping Stations: $90$

2. **Demographic Stratification**: Uses 100m gridded WorldPop population layers intersected with modeled risk polygons to quantify populations under Low, Moderate, High, and Severe threats.

---

### 4. Vulnerability Modeling ($V$)

Combines low-elevation coastal susceptibility ($<5\text{m}$ ASL) and shoreline proximity ($<15\text{km}$), mitigated by verified asset resilience factors such as elevated backup generators and secondary power circuits.

---

### 5. Multi-dimensional Confidence Model ($C$)

Confidence is computed independently of AI:

$$C = 0.35 \cdot C_{\text{completeness}} + 0.25 \cdot C_{\text{freshness}} + 0.20 \cdot C_{\text{temporal}} + 0.20 \cdot C_{\text{spatial}}$$

Transparent penalty deductions are applied and explicitly itemized in the UI for:
- Missing hydrodynamic surge forecast ($-15\%$)
- Satellite observations older than 6 hours ($-12\%$)
- Un-downscaled global numerical weather forecast grids ($-8\%$)
