import os
import urllib.request
import struct
import re
import datetime
import numpy as np
from scipy.interpolate import RegularGridInterpolator
import joblib

CACHE_DIR = os.path.join(os.path.dirname(__file__), "gefs_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "model", "final_lightgbm_model.pkl")
_lgbm_model = None

def get_model():
    global _lgbm_model
    if _lgbm_model is None and os.path.exists(MODEL_PATH):
        try:
            _lgbm_model = joblib.load(MODEL_PATH)
        except Exception as e:
            print("Error loading model in gefs_fetcher:", e)
    return _lgbm_model

def get_latest_gefs_metadata():
    """Dynamically query NOAA NOMADS for the latest available operational GEFS run."""
    base_url = "https://nomads.ncep.noaa.gov/pub/data/nccf/com/gens/prod/"
    try:
        req = urllib.request.Request(base_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=6) as resp:
            content = resp.read().decode('utf-8')
            folders = sorted(re.findall(r'href="gefs\.([0-9]{8})/"', content))
            if not folders:
                return None
            latest_date_str = folders[-1]
            
            c_url = f"{base_url}gefs.{latest_date_str}/"
            c_req = urllib.request.Request(c_url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(c_req, timeout=6) as c_resp:
                c_content = c_resp.read().decode('utf-8')
                cycles = sorted(re.findall(r'href="([0-9]{2})/"', c_content))
                latest_cycle = cycles[-1] if cycles else "00"
                run_date = f"{latest_date_str[:4]}-{latest_date_str[4:6]}-{latest_date_str[6:8]}"
                return {
                    "available": True,
                    "date": run_date,
                    "date_digits": latest_date_str,
                    "cycle": f"{latest_cycle} UTC",
                    "cycle_digits": latest_cycle,
                    "run_id": f"{latest_date_str}{latest_cycle}",
                    "formatted_run": f"{run_date} {latest_cycle} UTC",
                    "available_cycles": [f"{c} UTC" for c in cycles]
                }
    except Exception as e:
        return {"available": False, "error": str(e)}

def fetch_and_decode_grib(run_digits: str, cycle_digits: str, lead_day: int):
    """Download operational GEFS GRIB2 message from NOAA NOMADS and decode to 41x61 grid."""
    cache_file = os.path.join(CACHE_DIR, f"{run_digits}_{cycle_digits}_f{lead_day*24:03d}.npy")
    if os.path.exists(cache_file):
        try:
            return np.load(cache_file)
        except Exception:
            pass

    f_hour = f"{lead_day * 24:03d}"
    url = f"https://nomads.ncep.noaa.gov/cgi-bin/filter_gefs_atmos_0p50a.pl?file=geavg.t{cycle_digits}z.pgrb2a.0p50.f{f_hour}&lev_surface=on&var_APCP=on&subregion=&toplat=28&leftlon=75&rightlon=90&bottomlat=18&dir=%2Fgefs.{run_digits}%2F{cycle_digits}%2Fatmos%2Fpgrb2ap5"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = resp.read()

    off = 16
    sec5 = sec7 = None
    while off < len(data) - 4:
        if data[off:off+4] == b'7777':
            break
        sec_len, sec_num = struct.unpack('>IB', data[off:off+5])
        content = data[off+5:off+sec_len]
        if sec_num == 5:
            sec5 = content
        elif sec_num == 7:
            sec7 = content
        off += sec_len

    if sec5 is None or sec7 is None:
        raise ValueError("Could not parse GRIB2 sections 5 and 7 from NOMADS filter response")

    R = struct.unpack('>f', sec5[6:10])[0]
    E = struct.unpack('>h', sec5[10:12])[0]
    D = struct.unpack('>h', sec5[12:14])[0]
    nbits = sec5[14]
    
    if nbits == 0:
        vals = np.full(651, R / (10.0 ** D))
    else:
        bit_str = ''.join(f'{b:08b}' for b in sec7)
        vals = [
            (R + int(bit_str[i*nbits:(i+1)*nbits], 2) * (2.0 ** E)) / (10.0 ** D)
            for i in range(651)
        ]
        vals = np.array(vals)

    grid_2d = vals.reshape(21, 31)
    grid_2d_asc = np.flipud(grid_2d) # ascending latitude 18N to 28N
    lats_asc = np.linspace(18.0, 28.0, 21)
    lons_asc = np.linspace(75.0, 90.0, 31)

    interp = RegularGridInterpolator((lats_asc, lons_asc), grid_2d_asc, method='linear', bounds_error=False, fill_value=0.0)

    target_lats = np.linspace(18.0, 28.0, 41)
    target_lons = np.linspace(75.0, 90.0, 61)
    grid_lat, grid_lon = np.meshgrid(target_lats, target_lons, indexing='ij')

    points = np.stack([grid_lat.ravel(), grid_lon.ravel()], axis=-1)
    rain_2501 = interp(points).reshape(41, 61)
    rain_2501 = np.maximum(0.0, rain_2501)

    try:
        np.save(cache_file, rain_2501)
    except Exception:
        pass

    return rain_2501

def compute_operational_forecast_risk(lead_day: int = 1, cycle_override: str = None):
    """
    Run pre-verification inference on dynamic operational NOAA GEFS.
    Strictly uses GEFS forecast features (NO IMERG reference).
    """
    meta = get_latest_gefs_metadata()
    if not meta or not meta.get("available"):
        return None

    run_digits = meta["date_digits"]
    cycle_digits = cycle_override or meta["cycle_digits"]
    run_date_str = meta["date"]

    try:
        rain_curr = fetch_and_decode_grib(run_digits, cycle_digits, lead_day)
    except Exception as e:
        print(f"Error fetching GEFS for lead {lead_day}:", e)
        return None

    # Compute forecast_change_mm
    if lead_day > 1:
        try:
            rain_prev = fetch_and_decode_grib(run_digits, cycle_digits, lead_day - 1)
            f_change = rain_curr - rain_prev
        except Exception:
            f_change = np.zeros_like(rain_curr)
    else:
        f_change = np.zeros_like(rain_curr)

    # Compute spatial gradient (gradient magnitude across 0.25° grid)
    gy, gx = np.gradient(rain_curr, 0.25, 0.25)
    s_grad = np.sqrt(gx**2 + gy**2)

    # Calculate valid target date: run_date + lead_day
    run_dt = datetime.datetime.strptime(run_date_str, "%Y-%m-%d")
    valid_dt = run_dt + datetime.timedelta(days=lead_day)
    valid_date_str = valid_dt.strftime("%Y-%m-%d")

    # Target grid points
    target_lats = np.linspace(18.0, 28.0, 41)
    target_lons = np.linspace(75.0, 90.0, 61)
    grid_lat, grid_lon = np.meshgrid(target_lats, target_lons, indexing='ij')

    # Features: ['forecast_rain_mm', 'forecast_change_mm', 'spatial_gradient', 'lead_day', 'latitude', 'longitude']
    X = np.column_stack([
        rain_curr.ravel(),
        f_change.ravel(),
        s_grad.ravel(),
        np.full(2501, lead_day),
        grid_lat.ravel(),
        grid_lon.ravel()
    ])

    model = get_model()
    if model is None:
        raise ValueError("LightGBM model not loaded")

    raw_probs = model.predict_proba(X)[:, 1]
    bust_probs_pct = np.round(raw_probs * 100.0, 1)
    confs_pct = np.round(100.0 - bust_probs_pct, 1)

    cells_output = []
    for i in range(2501):
        p = float(bust_probs_pct[i])
        c = float(confs_pct[i])
        if p >= 60.0:
            risk = "high"
        elif p >= 30.0:
            risk = "medium"
        else:
            risk = "low"

        f_rain = float(rain_curr.ravel()[i])
        f_chg = float(f_change.ravel()[i])
        s_g = float(s_grad.ravel()[i])
        lat = float(grid_lat.ravel()[i])
        lon = float(grid_lon.ravel()[i])

        cell_data = {
            "latitude": round(lat, 2),
            "longitude": round(lon, 2),
            "lead_day": lead_day,
            "leadDay": lead_day,
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
                "forecast_change_mm": round(f_chg, 2),
                "spatial_gradient": round(s_g, 2),
                "lead_day": lead_day,
                "latitude": round(lat, 2),
                "longitude": round(lon, 2),
            },
            "featureValues": {
                "forecastRainMm": round(f_rain, 2),
                "forecastChangeMm": round(f_chg, 2),
                "spatialGradient": round(s_g, 2),
                "leadDay": lead_day,
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

    # System date in IST (UTC+5:30)
    utc_now = datetime.datetime.now(datetime.timezone.utc)
    ist_now = utc_now + datetime.timedelta(hours=5, minutes=30)
    system_date_ist = ist_now.strftime("%Y-%m-%d")

    return {
        "mode": "pre-verification",
        "label": "Pre-Verification Prototype",
        "is_operational": True,
        "is_fallback": False,
        "system_date": system_date_ist,
        "system_timezone": "IST",
        "forecast_run": f"{run_date_str} {cycle_digits} UTC",
        "forecast_run_date": run_date_str,
        "forecast_cycle": f"{cycle_digits} UTC",
        "run_id": f"{run_digits}{cycle_digits}",
        "runId": f"{run_digits}{cycle_digits}",
        "lead_day": lead_day,
        "leadDay": lead_day,
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
        "disclaimer": "Pre-Verification Prototype: Evaluated strictly using NOAA GEFS forecast predictors prior to satellite ground truth observation.",
    }

if __name__ == "__main__":
    result = compute_operational_forecast_risk(1)
    if result:
        print("Operational prediction successful!")
        print("Forecast Run:", result["forecast_run"])
        print("Valid Date:", result["valid_date"])
        print("System Date:", result["system_date"])
        print("Summary:", result["summary"])
    else:
        print("Failed to compute operational forecast risk.")
