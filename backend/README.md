# AI-Based Forecast Bust Detection - Backend API
**Problem Statement ID: 26079 (MoES / NCMRWF / IMD)**  
**Framework:** FastAPI + Python 3.10+  
**Model:** LightGBM Classifier (`model/final_lightgbm_model.pkl`)  
**Data Provenance:** NOAA GEFSv12 Reforecast & NASA GPM IMERG Final Daily V07/V07B (0.25° grid)

---

## 1. Quick Start

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Start Local Development Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation (Interactive Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)  
Alternative ReDoc: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 2. API Endpoints

### System & Health
* **`GET /health`**
  * Verifies backend status, LightGBM model loading, and dataset record count.
  * Response:
    ```json
    {
      "status": "ok",
      "model_loaded": true,
      "model_type": "LGBMClassifier",
      "records_count": 25010,
      "mode": "live"
    }
    ```

### Metadata & Provenance
* **`GET /metadata`**
  * Returns domain bounds (18–28°N, 75–90°E), resolution (0.25°), model metrics, and feature list.
* **`GET /dates`**
  * Returns historical run dates for selection (e.g., `2019-09-01` held-out test run).
* **`GET /leads`**
  * Returns forecast lead horizons `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`.

### Predictions & Grid Replay
* **`GET /summary?valid_date=2019-09-01&lead_day=1`**
  * Returns aggregate metrics across all 2,501 grid cells:
    * `meanBustProbability` (0–100%)
    * `meanPrototypeConfidence` (0–100%)
    * `bustCellCount` (High risk cells count)
    * `bustCellPct` (% of cells with bust risk ≥ 60%)
    * `meanForecastRainMm` & `meanAbsoluteErrorMm`
* **`GET /grid?valid_date=2019-09-01&lead_day=1`**
  * Returns full 2,501 spatial grid cells with both camelCase (`latitude`, `longitude`, `bustProbability`, `prototypeConfidence`, `forecastRainMm`, `referenceRainMm`, `absoluteErrorMm`, `riskLevel`) and snake_case properties.
* **`GET /cell?valid_date=2019-09-01&lead_day=1&latitude=18.0&longitude=75.0`**
  * Returns exact or nearest spatial grid point diagnostic information.
* **`GET /predictions?valid_date=2019-09-01&lead_day=1&risk_level=high&limit=50`**
  * Filterable predictions endpoint supporting `risk_level`, `min_bust_probability`, `search` (lat/lon), and pagination.

### Model Analytics & Explainability
* **`GET /feature-importance`**
  * Global feature importances normalized for dashboard visualization.
* **`GET /shap-importance`**
  * Mean absolute SHAP values indicating directional feature sensitivity.
* **`GET /model-comparison`**
  * Benchmark evaluation comparing LightGBM vs XGBoost on the held-out test run.

### Live Machine Learning Inference
* **`POST /predict`**
  * Runs real-time inference using the in-memory LightGBM model.
  * Request Body:
    ```json
    {
      "forecast_rain_mm": 24.5,
      "forecast_change_mm": 3.2,
      "spatial_gradient": 11.0,
      "lead_day": 4,
      "latitude": 21.5,
      "longitude": 81.25
    }
    ```
  * Response:
    ```json
    {
      "bust_probability": 68.4,
      "prototype_confidence": 31.6,
      "risk_level": "high",
      "model_type": "LightGBM"
    }
    ```

---

## 3. Running API Tests

Run the full automated pytest suite:
```bash
pytest backend/test_api.py -v
```
All 13 integration tests validate response schemas, CORS headers, model predictions, and error handling.
