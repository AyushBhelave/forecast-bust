"""
AI-Based Forecast Bust Detection - FastAPI Backend
Problem Statement ID: 26079 (MoES / NCMRWF / IMD)
Model: LightGBM (final_lightgbm_model.pkl)
Data: Kaggle Artifacts (dashboard_data.csv, final_test_predictions.csv, etc.)
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

import pandas as pd
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import datetime
from backend.gefs_fetcher import get_latest_gefs_metadata, compute_operational_forecast_risk
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("forecast-bust-backend")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "model"

# Fallback to final_ml_artifacts if data directory doesn't have the files
if not (DATA_DIR / "final_test_predictions.csv").exists():
    DATA_DIR = BASE_DIR / "data" / "final_ml_artifacts"

app = FastAPI(
    title="AI-Based Forecast Bust Detection API",
    description="FastAPI backend serving real LightGBM inference and historical replay data for SIH Problem Statement ID 26079.",
    version="1.0.0",
)

# -----------------------------------------------------------------------------
# CORS Configuration for Next.js Frontend
# -----------------------------------------------------------------------------
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "*",  # Allow all for development and Vercel preview environments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Global In-Memory Caching (Load Once at Startup)
# -----------------------------------------------------------------------------
model: Any = None
df_predictions: Optional[pd.DataFrame] = None
metadata_dict: Dict[str, Any] = {}
feature_importance_list: List[Dict[str, Any]] = []
shap_importance_list: List[Dict[str, Any]] = []
model_comparison_list: List[Dict[str, Any]] = []

FEATURE_NAME_MAP = {
    "forecast_rain_mm": "Forecast Rainfall",
    "latitude": "Latitude",
    "longitude": "Longitude",
    "forecast_change_mm": "Forecast Change",
    "lead_day": "Lead Day",
    "spatial_gradient": "Spatial Gradient",
}

def load_artifacts():
    global model, df_predictions, metadata_dict, feature_importance_list, shap_importance_list, model_comparison_list
    logger.info("Initializing Kaggle ML artifacts...")

    # 1. Load LightGBM Model
    model_path = MODEL_DIR / "final_lightgbm_model.pkl"
    if not model_path.exists():
        model_path = DATA_DIR / "final_lightgbm_model.pkl"
    
    if model_path.exists():
        try:
            model = joblib.load(model_path)
            logger.info("Successfully loaded LightGBM model from %s", model_path)
        except Exception as e:
            logger.error("Failed to load model from %s: %s", model_path, e)
    else:
        logger.warning("Model file not found at %s", model_path)

    # 2. Load Predictions Dataset
    pred_path = DATA_DIR / "final_test_predictions.csv"
    if not pred_path.exists():
        pred_path = DATA_DIR / "dashboard_data.csv"
    
    if pred_path.exists():
        df_predictions = pd.read_csv(pred_path)
        logger.info("Successfully loaded predictions dataset with %d rows from %s", len(df_predictions), pred_path)
    else:
        logger.error("Predictions file not found at %s", pred_path)
        df_predictions = pd.DataFrame()

    # 3. Load Metadata
    meta_path = DATA_DIR / "model_metadata.json"
    if meta_path.exists():
        with open(meta_path, "r", encoding="utf-8") as f:
            metadata_dict = json.load(f)
    else:
        metadata_dict = {
            "project": "AI-Based Forecast Bust Detection",
            "model": "LightGBM",
            "forecast_horizon": "Day 1-10",
            "domain": {"latitude": "18-28N", "longitude": "75-90E"},
        }

    # 4. Load Feature Importance
    feat_path = DATA_DIR / "feature_importance.csv"
    if feat_path.exists():
        df_feat = pd.read_csv(feat_path)
        total_imp = df_feat["importance"].sum() if "importance" in df_feat.columns else 1.0
        feature_importance_list = []
        for _, row in df_feat.iterrows():
            feat_name = str(row["feature"])
            imp_val = float(row["importance"])
            norm_val = round(imp_val / total_imp, 4) if total_imp > 0 else imp_val
            feature_importance_list.append({
                "key": feat_name,
                "label": FEATURE_NAME_MAP.get(feat_name, feat_name),
                "raw_importance": imp_val,
                "importance": norm_val,
            })
    
    # 5. Load SHAP Importance
    shap_path = DATA_DIR / "shap_importance.csv"
    if shap_path.exists():
        df_shap = pd.read_csv(shap_path)
        shap_importance_list = []
        for _, row in df_shap.iterrows():
            feat_name = str(row["feature"])
            shap_val = float(row["mean_abs_shap"])
            shap_importance_list.append({
                "feature": feat_name,
                "label": FEATURE_NAME_MAP.get(feat_name, feat_name),
                "mean_abs_shap": round(shap_val, 4),
            })

    # 6. Load Model Comparison
    comp_path = DATA_DIR / "model_comparison.csv"
    if comp_path.exists():
        df_comp = pd.read_csv(comp_path)
        model_comparison_list = df_comp.to_dict(orient="records")

# Run artifact loader immediately
load_artifacts()

# -----------------------------------------------------------------------------
# Helper Functions
# -----------------------------------------------------------------------------
def format_grid_cell(row: pd.Series) -> Dict[str, Any]:
    """Format row into both camelCase (Next.js) and snake_case (FastAPI) fields."""
    lat = float(row["latitude"])
    lon = float(row["longitude"])
    lead = int(row["lead_day"])
    date = str(row["valid_date"])
    f_rain = round(float(row.get("forecast_rain_mm", 0.0)), 2)
    r_rain = round(float(row.get("reference_rain_mm", 0.0)), 2)
    abs_err = round(float(row.get("absolute_error_mm", 0.0)), 2)
    f_change = round(float(row.get("forecast_change_mm", 0.0)), 2)
    spatial_grad = round(float(row.get("spatial_gradient", 0.0)), 2)
    
    # Bust probability in 0-100 range
    raw_p = float(row.get("bust_probability", 0.0))
    p_bust = raw_p * 100.0 if raw_p <= 1.0 else raw_p
    p_bust = round(max(0.0, min(100.0, p_bust)), 1)
    
    # Prototype confidence in 0-100 range
    raw_c = float(row.get("prototype_confidence", 1.0 - raw_p))
    p_conf = raw_c * 100.0 if raw_c <= 1.0 else raw_c
    p_conf = round(max(0.0, min(100.0, p_conf)), 1)

    # Risk Level: 'low' | 'medium' | 'high'
    risk_raw = str(row.get("risk_level", "low")).lower()
    if risk_raw not in ["low", "medium", "high"]:
        if p_bust >= 60.0:
            risk_raw = "high"
        elif p_bust >= 30.0:
            risk_raw = "medium"
        else:
            risk_raw = "low"

    bust_val = int(row.get("bust", 1 if abs_err >= 30.07262516766805 else 0))

    return {
        # camelCase for Next.js UI
        "latitude": round(lat, 2),
        "longitude": round(lon, 2),
        "leadDay": lead,
        "date": date,
        "forecastRainMm": f_rain,
        "referenceRainMm": r_rain,
        "absoluteErrorMm": abs_err,
        "forecastChangeMm": f_change,
        "spatialGradient": spatial_grad,
        "bustProbability": p_bust,
        "prototypeConfidence": p_conf,
        "riskLevel": risk_raw,
        # snake_case for Python / standard REST consumers
        "lead_day": lead,
        "valid_date": date,
        "forecast_rain_mm": f_rain,
        "reference_rain_mm": r_rain,
        "absolute_error_mm": abs_err,
        "forecast_change_mm": f_change,
        "spatial_gradient": spatial_grad,
        "bust_probability": p_bust,
        "prototype_confidence": p_conf,
        "risk_level": risk_raw,
        "bust": bust_val,
    }

def filter_dataframe(date: Optional[str], lead: Optional[int]) -> pd.DataFrame:
    """Filter predictions with dual support for valid_date or lead_day."""
    if df_predictions is None or df_predictions.empty:
        return pd.DataFrame()

    sub_df = df_predictions

    # If lead day is provided
    if lead is not None:
        sub_df = sub_df[sub_df["lead_day"] == lead]

    # If date is provided
    if date:
        # Match either exact valid_date or initialization run date
        date_match = sub_df[sub_df["valid_date"] == date]
        if not date_match.empty:
            sub_df = date_match
        elif "run_id" in sub_df.columns:
            # Check if date matches run_id pattern, e.g., '2019-09-01' -> '2019090100'
            clean_date = date.replace("-", "")
            run_match = sub_df[sub_df["run_id"].astype(str).str.startswith(clean_date)]
            if not run_match.empty:
                sub_df = run_match

    return sub_df

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@app.get("/", tags=["Root"])
def root():
    return {
        "title": "AI-Based Forecast Bust Detection API",
        "problem_statement": "26079 (MoES / NCMRWF / IMD)",
        "model": "LightGBM",
        "docs_url": "/docs",
        "health_check": "/health",
    }

@app.get("/health", tags=["System"])
def get_health():
    """Health check endpoint indicating model and data readiness."""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_type": type(model).__name__ if model else "None",
        "records_count": len(df_predictions) if df_predictions is not None else 0,
        "mode": "live",
    }

@app.get("/metadata", tags=["Metadata"])
def get_metadata():
    """Returns domain specifications, metrics, and dataset provenance."""
    metrics = metadata_dict.get("metrics", {
        "roc_auc": 0.7816,
        "pr_auc": 0.3271,
        "brier_score": 0.1534,
        "precision": 0.2133,
        "recall": 0.6409,
        "f1": 0.32,
    })

    return {
        "domain": {
            "latMin": 18.0,
            "latMax": 28.0,
            "lonMin": 75.0,
            "lonMax": 90.0,
            "gridStepDeg": 0.25,
            "label": "Central / Northern India (18-28N, 75-90E)",
        },
        "model": metadata_dict.get("model", "LightGBM"),
        "horizon": metadata_dict.get("forecast_horizon", "Day 1-10"),
        "forecastSource": "NOAA GEFSv12 retrospective forecasts (0.25 deg)",
        "referenceSource": "NASA GPM IMERG Final Daily V07/V07B (interpolated to 0.25 deg)",
        "trainingRuns": metadata_dict.get("training_runs", ["2019061500", "2019070100", "2019080100"]),
        "testRun": metadata_dict.get("test_run", "2019090100"),
        "features": metadata_dict.get("features", [
            "forecast_rain_mm",
            "forecast_change_mm",
            "spatial_gradient",
            "lead_day",
            "latitude",
            "longitude",
        ]),
        "metrics": metrics,
        "confidenceNote": "Prototype confidence; probabilities are uncalibrated raw scores.",
        "prototypeNote": "Historical replay proof-of-concept for SIH 26079.",
    }

@app.get("/dates", tags=["Metadata"])
def get_dates():
    """Returns the list of historical runs for UI selection."""
    return [
        {
            "date": "2019-09-01",
            "runId": "2019090100",
            "role": "held-out-test",
            "label": "01 Sep 2019 — Final Kaggle Held-Out Test",
        },
        {
            "date": "2019-08-01",
            "runId": "2019080100",
            "role": "training",
            "label": "01 Aug 2019 — Training Run",
        },
        {
            "date": "2019-07-01",
            "runId": "2019070100",
            "role": "training",
            "label": "01 Jul 2019 — Training Run",
        },
        {
            "date": "2019-06-15",
            "runId": "2019061500",
            "role": "training",
            "label": "15 Jun 2019 — Training Run",
        },
    ]

@app.get("/leads", tags=["Metadata"])
def get_leads() -> List[int]:
    """Returns available lead days 1 to 10."""
    return list(range(1, 11))

@app.get("/summary", tags=["Predictions"])
def get_summary(
    valid_date: Optional[str] = Query(None, alias="valid_date", description="Target valid date (YYYY-MM-DD)"),
    date: Optional[str] = Query(None, alias="date", description="Alias for valid_date"),
    lead_day: Optional[int] = Query(1, alias="lead_day", ge=1, le=10),
    lead: Optional[int] = Query(None, alias="lead", ge=1, le=10),
):
    """Aggregate statistics across the prototype grid for the selected date and lead day."""
    sel_date = valid_date or date or "2019-09-01"
    sel_lead = lead or lead_day or 1

    sub_df = filter_dataframe(sel_date, sel_lead)
    if sub_df.empty and df_predictions is not None and not df_predictions.empty:
        # Fallback to lead day only if date was run date
        sub_df = df_predictions[df_predictions["lead_day"] == sel_lead]

    if sub_df.empty:
        raise HTTPException(status_code=404, detail=f"No grid data available for date '{sel_date}' and lead {sel_lead}")

    raw_p = sub_df["bust_probability"].values
    p_pct = raw_p * 100.0 if np.nanmax(raw_p) <= 1.0 else raw_p
    mean_bust = float(np.nanmean(p_pct))

    raw_c = sub_df["prototype_confidence"].values if "prototype_confidence" in sub_df.columns else (1.0 - raw_p)
    c_pct = raw_c * 100.0 if np.nanmax(raw_c) <= 1.0 else raw_c
    mean_conf = float(np.nanmean(c_pct))

    high_cells = int(np.sum(p_pct >= 60.0))
    total_cells = len(sub_df)
    bust_pct = (high_cells / total_cells * 100.0) if total_cells > 0 else 0.0

    mean_f_rain = float(np.nanmean(sub_df["forecast_rain_mm"])) if "forecast_rain_mm" in sub_df.columns else 0.0
    mean_abs_err = float(np.nanmean(sub_df["absolute_error_mm"])) if "absolute_error_mm" in sub_df.columns else 0.0

    actual_date = str(sub_df["valid_date"].iloc[0]) if "valid_date" in sub_df.columns else sel_date

    return {
        "date": actual_date,
        "leadDay": sel_lead,
        "lead_day": sel_lead,
        "meanBustProbability": round(mean_bust, 1),
        "mean_bust_probability": round(mean_bust, 1),
        "meanPrototypeConfidence": round(mean_conf, 1),
        "mean_prototype_confidence": round(mean_conf, 1),
        "bustCellCount": high_cells,
        "bust_cell_count": high_cells,
        "totalCells": total_cells,
        "total_cells": total_cells,
        "bustCellPct": round(bust_pct, 1),
        "bust_cell_pct": round(bust_pct, 1),
        "meanForecastRainMm": round(mean_f_rain, 1),
        "mean_forecast_rain_mm": round(mean_f_rain, 1),
        "meanAbsoluteErrorMm": round(mean_abs_err, 1),
        "mean_absolute_error_mm": round(mean_abs_err, 1),
    }

@app.get("/grid", tags=["Predictions"])
def get_grid(
    valid_date: Optional[str] = Query(None, alias="valid_date"),
    date: Optional[str] = Query(None, alias="date"),
    lead_day: Optional[int] = Query(1, alias="lead_day", ge=1, le=10),
    lead: Optional[int] = Query(None, alias="lead", ge=1, le=10),
) -> List[Dict[str, Any]]:
    """Retrieve full spatial grid cell predictions (41x61 = 2501 points)."""
    sel_date = valid_date or date or "2019-09-01"
    sel_lead = lead or lead_day or 1

    sub_df = filter_dataframe(sel_date, sel_lead)
    if sub_df.empty and df_predictions is not None and not df_predictions.empty:
        sub_df = df_predictions[df_predictions["lead_day"] == sel_lead]

    if sub_df.empty:
        raise HTTPException(status_code=404, detail=f"No grid data available for date '{sel_date}' and lead {sel_lead}")

    return [format_grid_cell(row) for _, row in sub_df.iterrows()]

@app.get("/cell", tags=["Predictions"])
def get_cell(
    valid_date: Optional[str] = Query(None, alias="valid_date"),
    date: Optional[str] = Query(None, alias="date"),
    lead_day: Optional[int] = Query(1, alias="lead_day", ge=1, le=10),
    lead: Optional[int] = Query(None, alias="lead", ge=1, le=10),
    latitude: Optional[float] = Query(None, alias="latitude"),
    lat: Optional[float] = Query(None, alias="lat"),
    longitude: Optional[float] = Query(None, alias="longitude"),
    lon: Optional[float] = Query(None, alias="lon"),
) -> Dict[str, Any]:
    """Retrieve specific grid cell details by coordinates and lead day."""
    sel_date = valid_date or date or "2019-09-01"
    sel_lead = lead or lead_day or 1
    sel_lat = lat if lat is not None else latitude
    sel_lon = lon if lon is not None else longitude

    if sel_lat is None or sel_lon is None:
        raise HTTPException(status_code=400, detail="Latitude and longitude parameters are required.")

    sub_df = filter_dataframe(sel_date, sel_lead)
    if sub_df.empty and df_predictions is not None and not df_predictions.empty:
        sub_df = df_predictions[df_predictions["lead_day"] == sel_lead]

    if sub_df.empty:
        raise HTTPException(status_code=404, detail=f"No data available for date '{sel_date}' and lead {sel_lead}")

    # Find the nearest spatial grid point using Euclidean distance
    dist = (sub_df["latitude"] - sel_lat) ** 2 + (sub_df["longitude"] - sel_lon) ** 2
    nearest_idx = dist.idxmin()
    best_row = sub_df.loc[nearest_idx]

    return format_grid_cell(best_row)

@app.get("/predictions", tags=["Predictions"])
def get_predictions(
    valid_date: Optional[str] = Query(None, alias="valid_date"),
    date: Optional[str] = Query(None, alias="date"),
    lead_day: Optional[int] = Query(None, alias="lead_day"),
    lead: Optional[int] = Query(None, alias="lead"),
    risk_level: Optional[str] = Query(None, alias="risk_level"),
    riskLevel: Optional[str] = Query(None, alias="riskLevel"),
    min_bust_probability: Optional[float] = Query(None, alias="min_bust_probability"),
    minBustProbability: Optional[float] = Query(None, alias="minBustProbability"),
    search: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=5000),
) -> List[Dict[str, Any]]:
    """Query and filter predictions with pagination support."""
    sel_date = valid_date or date
    sel_lead = lead if lead is not None else lead_day
    sel_risk = (riskLevel or risk_level or "").lower()
    min_prob = minBustProbability if minBustProbability is not None else min_bust_probability

    sub_df = filter_dataframe(sel_date, sel_lead)
    if sub_df.empty and df_predictions is not None and not df_predictions.empty:
        if sel_lead is not None:
            sub_df = df_predictions[df_predictions["lead_day"] == sel_lead]
        else:
            sub_df = df_predictions

    if sub_df.empty:
        return []

    # Risk level filter
    if sel_risk and sel_risk != "all":
        sub_df = sub_df[sub_df["risk_level"].astype(str).str.lower() == sel_risk]

    # Minimum probability filter (handling 0-1 vs 0-100)
    if min_prob is not None:
        threshold = min_prob / 100.0 if min_prob > 1.0 else min_prob
        sub_df = sub_df[sub_df["bust_probability"] >= threshold]

    # Search query filter (matches coordinates)
    if search and search.strip():
        q = search.strip()
        sub_df = sub_df[
            sub_df["latitude"].astype(str).str.contains(q)
            | sub_df["longitude"].astype(str).str.contains(q)
        ]

    # Limit results
    sub_df = sub_df.head(limit)
    return [format_grid_cell(row) for _, row in sub_df.iterrows()]

@app.get("/feature-importance", tags=["Model Analytics"])
def get_feature_importance():
    """Returns global feature importances for frontend charts."""
    return feature_importance_list

@app.get("/shap-importance", tags=["Model Analytics"])
def get_shap_importance():
    """Returns SHAP values explaining model sensitivity."""
    return shap_importance_list

@app.get("/model-comparison", tags=["Model Analytics"])
def get_model_comparison():
    """Returns comparative validation metrics (XGBoost vs LightGBM)."""
    return model_comparison_list

# -----------------------------------------------------------------------------
# Live Inference (LightGBM)
# -----------------------------------------------------------------------------
class PredictRequest(BaseModel):
    forecast_rain_mm: float = Field(..., example=12.5, description="GEFS 24h precipitation in mm")
    forecast_change_mm: float = Field(..., example=-1.8, description="Precipitation change relative to lead t-1")
    spatial_gradient: float = Field(..., example=6.4, description="Local spatial variability mm/deg")
    lead_day: int = Field(..., ge=1, le=10, example=3, description="Lead day horizon")
    latitude: float = Field(..., ge=18.0, le=28.0, example=23.5, description="Latitude in prototype domain")
    longitude: float = Field(..., ge=75.0, le=90.0, example=82.0, description="Longitude in prototype domain")

@app.post("/predict", tags=["Live Inference"])
def predict_bust(req: PredictRequest):
    """Run real-time inference using the loaded LightGBM model."""
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LightGBM model artifact is not loaded.",
        )

    # Feature order required by model:
    # ['forecast_rain_mm', 'forecast_change_mm', 'spatial_gradient', 'lead_day', 'latitude', 'longitude']
    feature_values = [[
        req.forecast_rain_mm,
        req.forecast_change_mm,
        req.spatial_gradient,
        req.lead_day,
        req.latitude,
        req.longitude,
    ]]

    try:
        prob = float(model.predict_proba(feature_values)[0, 1])
        prob_pct = round(prob * 100.0, 1)
        conf_pct = round(100.0 - prob_pct, 1)

        if prob_pct >= 60.0:
            risk = "high"
        elif prob_pct >= 30.0:
            risk = "medium"
        else:
            risk = "low"

        return {
            "bust_probability": prob_pct,
            "prototype_confidence": conf_pct,
            "risk_level": risk,
            "model_type": "LightGBM",
            "features_received": req.model_dump(),
            "confidence_note": "Prototype confidence; probability is uncalibrated.",
        }
    except Exception as e:
        logger.error("Inference failure: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

# -----------------------------------------------------------------------------
# Pre-Verification Forecast Risk (SIH Core Workflow)
# -----------------------------------------------------------------------------
class ForecastRiskCellInput(BaseModel):
    latitude: float = Field(..., ge=18.0, le=28.0)
    longitude: float = Field(..., ge=75.0, le=90.0)
    lead_day: int = Field(..., ge=1, le=10)
    forecast_rain_mm: float = Field(..., ge=0.0)
    forecast_change_mm: Optional[float] = 0.0
    spatial_gradient: Optional[float] = 0.0

class ForecastRiskRequest(BaseModel):
    run_id: Optional[str] = Field("latest", description="GEFS Forecast run initialization ID ('latest' or '2019090100')")
    date: Optional[str] = Field(None, description="GEFS Forecast run date (YYYY-MM-DD)")
    lead_day: int = Field(1, ge=1, le=10, description="Lead day horizon (1 to 10)")
    cycle: Optional[str] = Field(None, description="GEFS cycle hour e.g. '00' or '06'")
    cells: Optional[List[ForecastRiskCellInput]] = Field(None, description="Optional custom forecast cells")

@app.get("/operational/latest-run", tags=["Pre-Verification Forecast Risk"])
def get_operational_latest_run():
    """Dynamically query NOAA NOMADS for the latest available operational GEFS initialization."""
    meta = get_latest_gefs_metadata()
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    system_date_ist = ist_now.strftime("%Y-%m-%d")

    if meta and meta.get("available"):
        return {
            "system_date": system_date_ist,
            "system_timezone": "IST",
            "forecast_run": meta["formatted_run"],
            "forecast_date": meta["date"],
            "forecast_cycle": meta["cycle"],
            "run_id": meta["run_id"],
            "available_cycles": meta["available_cycles"],
            "operational_available": True,
        }
    else:
        return {
            "system_date": system_date_ist,
            "system_timezone": "IST",
            "forecast_run": "2019-09-01 00 UTC",
            "forecast_date": "2019-09-01",
            "forecast_cycle": "00 UTC",
            "run_id": "2019090100",
            "available_cycles": ["00 UTC"],
            "operational_available": False,
            "fallback_label": "Latest forecast unavailable — Historical Pre-Verification Simulation",
        }

@app.post("/forecast-risk", tags=["Pre-Verification Forecast Risk"])
def post_forecast_risk(req: ForecastRiskRequest):
    """
    SIH Core Workflow: Pre-Verification Forecast Bust Risk.
    
    Dynamically attempts operational NOAA GEFS retrieval for the current cycle.
    Extracts the EXACT six model predictors used during training:
      - forecast_rain_mm
      - forecast_change_mm
      - spatial_gradient
      - lead_day
      - latitude
      - longitude
      
    CRITICAL: Does NOT use or return IMERG reference rainfall. IMERG is only for later verification.
    If NOAA operational forecast cannot be parsed, falls back gracefully to historical simulation
    without fabricating any synthetic data.
    """
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LightGBM model artifact is not loaded.",
        )

    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    system_date_ist = ist_now.strftime("%Y-%m-%d")

    # If custom cells provided
    if req.cells and len(req.cells) > 0:
        feature_cols = ['forecast_rain_mm', 'forecast_change_mm', 'spatial_gradient', 'lead_day', 'latitude', 'longitude']
        X_list = []
        meta_list = []
        for c in req.cells:
            f_change = c.forecast_change_mm if c.forecast_change_mm is not None else 0.0
            s_grad = c.spatial_gradient if c.spatial_gradient is not None else 0.0
            X_list.append([c.forecast_rain_mm, f_change, s_grad, c.lead_day, c.latitude, c.longitude])
            meta_list.append({
                "latitude": round(c.latitude, 2),
                "longitude": round(c.longitude, 2),
                "lead_day": c.lead_day,
                "forecast_rain_mm": round(c.forecast_rain_mm, 2),
                "forecast_change_mm": round(f_change, 2),
                "spatial_gradient": round(s_grad, 2),
            })
        X = np.array(X_list, dtype=np.float64)
        run_label = "Custom Pre-Verification Inputs"
        run_id = req.run_id or "custom"
        forecast_run = "Custom"
        forecast_cycle = "Custom"
        valid_date_str = system_date_ist
        is_operational = False
        is_fallback = False
    else:
        # Check if operational GEFS requested
        is_operational_req = (
            req.run_id in ["latest", None, ""]
            or str(req.run_id).startswith("2026")
            or (req.date and str(req.date).startswith("2026"))
        )

        if is_operational_req:
            try:
                op_res = compute_operational_forecast_risk(lead_day=req.lead_day, cycle_override=req.cycle)
                if op_res is not None:
                    return op_res
            except Exception as e:
                logger.warning("Operational NOAA GEFS fetch failed: %s. Using historical simulation fallback.", e)

        # Fallback to historical validation run or explicit 2019 run
        target_lead = req.lead_day
        target_date = "2019-09-01"
        target_run = "2019090100"

        sub_df = filter_dataframe(target_date, target_lead)
        if sub_df.empty and df_predictions is not None and not df_predictions.empty:
            sub_df = df_predictions[df_predictions["lead_day"] == target_lead]

        if sub_df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No GEFS forecast data available for run '{target_run}'/date '{target_date}' at lead day {target_lead}.",
            )

        feature_cols = ['forecast_rain_mm', 'forecast_change_mm', 'spatial_gradient', 'lead_day', 'latitude', 'longitude']
        df_feats = pd.DataFrame()
        df_feats["forecast_rain_mm"] = sub_df["forecast_rain_mm"].astype(float)
        df_feats["forecast_change_mm"] = sub_df["forecast_change_mm"].astype(float) if "forecast_change_mm" in sub_df.columns else 0.0
        df_feats["spatial_gradient"] = sub_df["spatial_gradient"].astype(float) if "spatial_gradient" in sub_df.columns else 0.0
        df_feats["lead_day"] = sub_df["lead_day"].astype(int)
        df_feats["latitude"] = sub_df["latitude"].astype(float)
        df_feats["longitude"] = sub_df["longitude"].astype(float)

        X = df_feats[feature_cols].values
        meta_list = df_feats.to_dict(orient="records")

        is_fallback = is_operational_req
        run_label = "Latest forecast unavailable — Historical Pre-Verification Simulation" if is_fallback else "Pre-Verification Prototype"
        run_id = target_run
        forecast_run = "2019-09-01 00 UTC"
        forecast_cycle = "00 UTC"
        valid_dt = datetime.datetime.strptime("2019-09-01", "%Y-%m-%d") + datetime.timedelta(days=target_lead)
        valid_date_str = valid_dt.strftime("%Y-%m-%d")
        is_operational = False

    try:
        raw_probs = model.predict_proba(X)[:, 1]
    except Exception as e:
        logger.error("Inference failure in /forecast-risk: %s", e)
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

    bust_probs_pct = np.round(raw_probs * 100.0, 1)
    confs_pct = np.round(100.0 - bust_probs_pct, 1)

    cells_output = []
    for i, meta in enumerate(meta_list):
        p = float(bust_probs_pct[i])
        c = float(confs_pct[i])
        if p >= 60.0:
            risk = "high"
        elif p >= 30.0:
            risk = "medium"
        else:
            risk = "low"

        f_rain = float(meta["forecast_rain_mm"])
        f_change = float(meta["forecast_change_mm"])
        s_grad = float(meta["spatial_gradient"])
        lead = int(meta["lead_day"])
        lat = float(meta["latitude"])
        lon = float(meta["longitude"])

        cell_data = {
            "latitude": round(lat, 2),
            "longitude": round(lon, 2),
            "lead_day": lead,
            "leadDay": lead,
            "forecast_rain_mm": round(f_rain, 2),
            "forecastRainMm": round(f_rain, 2),
            "bust_probability": p,
            "bustProbability": p,
            "prototype_confidence": c,
            "prototypeConfidence": c,
            "risk_level": risk,
            "riskLevel": risk,
            "feature_values": {
                "forecast_rain_mm": round(f_rain, 2),
                "forecast_change_mm": round(f_change, 2),
                "spatial_gradient": round(s_grad, 2),
                "lead_day": lead,
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
            },
            "featureValues": {
                "forecastRainMm": round(f_rain, 2),
                "forecastChangeMm": round(f_change, 2),
                "spatialGradient": round(s_grad, 2),
                "leadDay": lead,
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
            },
        }
        cells_output.append(cell_data)

    high_risk_count = int(np.sum(bust_probs_pct >= 60.0))
    total = len(cells_output)
    bust_pct = round(high_risk_count / total * 100.0, 1) if total > 0 else 0.0

    mean_bust = round(float(np.mean(bust_probs_pct)), 1) if total > 0 else 0.0
    mean_conf = round(float(np.mean(confs_pct)), 1) if total > 0 else 0.0
    mean_rain = round(float(np.mean([c["forecast_rain_mm"] for c in cells_output])), 1) if total > 0 else 0.0

    return {
        "mode": "pre-verification",
        "label": run_label,
        "is_operational": is_operational,
        "is_fallback": is_fallback,
        "fallback_label": "Latest forecast unavailable — Historical Pre-Verification Simulation" if is_fallback else None,
        "system_date": system_date_ist,
        "system_timezone": "IST",
        "forecast_run": forecast_run,
        "forecast_run_date": "2019-09-01" if not is_operational else system_date_ist,
        "forecast_cycle": forecast_cycle,
        "run_id": run_id,
        "runId": run_id,
        "lead_day": req.lead_day,
        "leadDay": req.lead_day,
        "valid_date": valid_date_str,
        "validDate": valid_date_str,
        "total_cells": total,
        "totalCells": total,
        "summary": {
            "mean_bust_probability": mean_bust,
            "meanBustProbability": mean_bust,
            "mean_prototype_confidence": mean_conf,
            "meanPrototypeConfidence": mean_conf,
            "bust_cell_count": high_risk_count,
            "bustCellCount": high_risk_count,
            "bust_cell_pct": bust_pct,
            "bustCellPct": bust_pct,
            "mean_forecast_rain_mm": mean_rain,
            "meanForecastRainMm": mean_rain,
        },
        "cells": cells_output,
        "disclaimer": "Pre-Verification Prototype: Evaluated strictly using GEFS forecast predictors prior to satellite ground truth observation.",
    }

@app.get("/forecast-risk", tags=["Pre-Verification Forecast Risk"])
def get_forecast_risk_endpoint(
    run_id: Optional[str] = Query("latest", alias="run_id"),
    date: Optional[str] = Query(None, alias="date"),
    lead_day: int = Query(1, alias="lead_day", ge=1, le=10),
    lead: Optional[int] = Query(None, alias="lead", ge=1, le=10),
    cycle: Optional[str] = Query(None, alias="cycle"),
):
    """GET convenience wrapper for /forecast-risk pre-verification endpoint."""
    sel_lead = lead if lead is not None else lead_day
    req = ForecastRiskRequest(run_id=run_id, date=date, lead_day=sel_lead, cycle=cycle)
    return post_forecast_risk(req)


