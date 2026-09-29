"""
API Test Suite for AI-Based Forecast Bust Detection Backend
Run with: pytest backend/test_api.py -v
"""

import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model_loaded"] is True
    assert data["records_count"] > 0
    assert "LightGBM" in data["model_type"] or "LGBM" in data["model_type"]

def test_metadata_endpoint():
    response = client.get("/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "LightGBM"
    assert "domain" in data
    assert data["domain"]["latMin"] == 18.0
    assert data["domain"]["latMax"] == 28.0
    assert "features" in data
    assert "forecast_rain_mm" in data["features"]
    assert "metrics" in data
    assert data["metrics"]["roc_auc"] == 0.7816

def test_dates_endpoint():
    response = client.get("/dates")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    # Check first item contains expected keys
    first = data[0]
    assert "date" in first
    assert "runId" in first
    assert "role" in first

def test_leads_endpoint():
    response = client.get("/leads")
    assert response.status_code == 200
    leads = response.json()
    assert leads == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

def test_summary_endpoint():
    response = client.get("/summary?valid_date=2019-09-01&lead_day=1")
    assert response.status_code == 200
    data = response.json()
    assert "meanBustProbability" in data
    assert "meanPrototypeConfidence" in data
    assert "totalCells" in data
    assert data["totalCells"] == 2501
    assert data["leadDay"] == 1

def test_grid_endpoint():
    response = client.get("/grid?valid_date=2019-09-01&lead_day=1")
    assert response.status_code == 200
    cells = response.json()
    assert isinstance(cells, list)
    assert len(cells) == 2501
    first = cells[0]
    assert "latitude" in first
    assert "longitude" in first
    assert "bustProbability" in first
    assert "prototypeConfidence" in first
    assert "riskLevel" in first
    assert first["riskLevel"] in ["low", "medium", "high"]

def test_cell_endpoint():
    response = client.get("/cell?valid_date=2019-09-01&lead_day=1&latitude=18.0&longitude=75.0")
    assert response.status_code == 200
    cell = response.json()
    assert round(cell["latitude"], 1) == 18.0
    assert round(cell["longitude"], 1) == 75.0
    assert "forecastRainMm" in cell
    assert "referenceRainMm" in cell
    assert "absoluteErrorMm" in cell

def test_cell_missing_params():
    response = client.get("/cell?valid_date=2019-09-01&lead_day=1")
    assert response.status_code == 400

def test_predictions_endpoint():
    response = client.get("/predictions?lead_day=1&limit=10")
    assert response.status_code == 200
    preds = response.json()
    assert len(preds) <= 10

def test_feature_importance_endpoint():
    response = client.get("/feature-importance")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 6
    keys = [i["key"] for i in items]
    assert "forecast_rain_mm" in keys

def test_shap_importance_endpoint():
    response = client.get("/shap-importance")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 6

def test_model_comparison_endpoint():
    response = client.get("/model-comparison")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 2
    models = [i["Model"] for i in items]
    assert "LightGBM" in models
    assert "XGBoost" in models

def test_live_predict_endpoint():
    payload = {
        "forecast_rain_mm": 25.0,
        "forecast_change_mm": 5.0,
        "spatial_gradient": 12.0,
        "lead_day": 5,
        "latitude": 22.0,
        "longitude": 80.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "bust_probability" in data
    assert "prototype_confidence" in data
    assert "risk_level" in data
    assert data["risk_level"] in ["low", "medium", "high"]
    assert data["model_type"] == "LightGBM"
