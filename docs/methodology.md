# AI-Based Forecast Bust Detection for Medium-Range Weather Forecasts
## Scientific Methodology & System Architecture (SIH Problem ID: 26079)

---

### 1. Executive Summary
Medium-range numerical weather prediction (NWP) models (Day 1 to Day 10) frequently exhibit severe localized drop-offs in forecast skill, commonly known as **"Forecast Busts."** In monsoon regions, such large quantitative precipitation forecast (QPF) errors mislead disaster management authorities, flood control planners, and agricultural communities.

This project delivers a **Historical-Replay Decision Support Prototype** that leverages machine learning to anticipate when a medium-range rainfall forecast is likely to suffer an anomalously large error before verification observations arrive.

---

### 2. Spatial & Temporal Domain
* **Geographical Domain**: $18^\circ\text{N} - 28^\circ\text{N}$, $75^\circ\text{E} - 90^\circ\text{E}$ (Central and Northern India Monsoon Core Zone).
* **Grid Resolution**: $0.25^\circ \times 0.25^\circ$ (41 latitude points $\times$ 61 longitude points = 2,501 spatial grid cells).
* **Forecast Horizon**: Day 1 to Day 10 ($24$-hour accumulated precipitation windows).
* **Historical Initialization Runs**:
  * Training: `2019-06-15 00:00 UTC` and `2019-07-01 00:00 UTC`
  * Held-Out Test: `2019-08-01 00:00 UTC`
  * Dataset Scale: $75,030$ matched spatiotemporal samples.

---

### 3. Data Sources & Spatial Harmonization
1. **Forecast Source**:
   * **NOAA GEFSv12 (Global Ensemble Forecast System v12)** reforecast archive.
   * Parameter: 24-hour total precipitation (`apcp_sfc`).
2. **Ground Truth / Reference Source**:
   * **NASA GPM IMERG (Global Precipitation Measurement Integrated Multi-satellitE Retrievals for GPM)** Final Daily V07/V07B.
3. **Spatial Regridding**:
   * GPM IMERG native $0.1^\circ \times 0.1^\circ$ resolution was mapped onto the GEFS $0.25^\circ \times 0.25^\circ$ target grid using `xarray` linear conservative-equivalent bilinear interpolation.

---

### 4. Mathematical Formulation of Forecast Bust
For each spatial grid point $(i, j)$ and lead day $t \in [1, 10]$:
$$\text{Absolute Error}(i, j, t) = |F(i, j, t) - R(i, j, t)|$$
where $F$ is the forecasted 24h precipitation (mm) and $R$ is the reference IMERG rainfall (mm).

A **Forecast Bust** is defined as an error exceeding the empirical 90th percentile threshold computed over the training set:
$$\text{Threshold}_{\text{bust}} = P_{90}(\text{Absolute Error}_{\text{train}}) = 28.68\text{ mm}$$

$$\text{Bust Target } Y(i, j, t) = \begin{cases} 1 & \text{if } |F(i, j, t) - R(i, j, t)| \ge 28.68\text{ mm} \\ 0 & \text{otherwise} \end{cases}$$

---

### 5. Feature Engineering
The model operates strictly on **prior and forecast-available signals** (never using future reference rainfall):
1. **`forecast_rain_mm`**: The predicted 24h accumulated rainfall volume.
2. **`forecast_change_mm`**: Temporal difference in forecast between consecutive lead intervals ($\Delta F_{t} = F_t - F_{t-1}$).
3. **`spatial_gradient`**: Local spatial variation calculated as the standard deviation or gradient across neighboring 8-grid cells ($\nabla F(x, y)$).
4. **`lead_day`**: Lead forecast horizon in days ($1 \le t \le 10$).
5. **`latitude` & `longitude`**: Spatial coordinates accounting for topographical and regional monsoon convective variability.

---

### 6. Model Training & Evaluation
* **Algorithm**: `RandomForestClassifier` (optimized for non-linear interactions and class imbalance).
* **Held-Out Test Set Metrics (`2019080100` run)**:
  * **ROC-AUC**: `0.7148` (discriminative capability across probability thresholds; distinctly reported and NOT confused with simple accuracy).
  * **PR-AUC**: `0.3903` (crucial metric under severe target imbalance: ~10% positive bust prevalence).
  * **Brier Score**: `0.1552` (quadratic probability penalty assessing forecast reliability).
  * **Precision**: `0.2924`
  * **Recall**: `0.5700` (captures over 57% of extreme bust events).
  * **F1-Score**: `0.3866`

---

### 7. Prototype Confidence & Risk Categorization
* **Bust Probability ($P_{\text{bust}}$)**: Direct model probability output $P(Y=1 | X)$.
* **Prototype Confidence**:
  $$\text{Confidence}_{\text{prototype}} = 100 \times (1 - P_{\text{bust}})$$
  *Note: Explicitly designated as "Prototype Confidence" because post-hoc calibration (e.g. Isotonic Regression / Platt Scaling) requires expanded historical validation cohorts.*
* **Risk Categorization (Visual Prototype Buckets)**:
  * **Low Risk**: $0\% \le P_{\text{bust}} < 30\%$ (High Forecast Trust)
  * **Moderate Risk**: $30\% \le P_{\text{bust}} < 60\%$ (Advisory Caution)
  * **High Risk**: $60\% \le P_{\text{bust}} \le 100\%$ (High Bust Probability - Flag for Manual Forecaster Review)

---

### 8. Explainability Framework
Rather than black-box outputs, global feature importance from the trained model shows:
* **Forecast Rainfall Amount** ($26.9\%$ importance): Strongest indicator; extreme QPF predictions carry higher intrinsic variance.
* **Geographical Location** ($31.6\%$ combined Lat/Lon): Convective hotspots and terrain boundaries dictate forecast uncertainty.
* **Forecast Change Across Lead Times** ($14.8\%$): Run-to-run / lead-to-lead flip-flops indicate NWP instability.
* **Lead Day Horizon** ($13.5\%$): Chaos amplification with increasing forecast horizons.
* **Spatial Rainfall Gradient** ($13.2\%$): Sharp precipitation boundaries denote convective parameterization sensitivity.

All explanations are phrased with scientific caution: *"The model associates higher bust risk with..."* avoiding misleading causal claims.
