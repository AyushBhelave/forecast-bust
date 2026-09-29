import { API_BASE_URL, USE_MOCK_DATA, MODEL_FEATURES, MODEL_INFO, PROTOTYPE_DOMAIN } from "./config"
import {
  getMockGrid,
  getMockCell,
  getMockSummary,
  getMockDates,
  FEATURE_IMPORTANCE_MOCK,
} from "./mock-data"
import type { GridCell, GridSummary, HealthResponse, MetadataResponse, PredictionFilters } from "./types"
import type { HistoricalRun } from "./config"

/**
 * API integration layer.
 *
 * When NEXT_PUBLIC_USE_MOCK_DATA is "true" (default for this UI-only build),
 * every function below returns deterministic local fixtures from
 * lib/mock-data.ts instead of calling the network. Set it to "false" and
 * point NEXT_PUBLIC_API_BASE_URL at a running FastAPI backend implementing
 * the matching routes to go live — no component code needs to change.
 */

class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  let res: Response
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    })
  } catch (err) {
    throw new ApiError(`Unable to reach backend at ${API_BASE_URL}. ${(err as Error).message}`)
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status}) for ${path}`, res.status)
  }
  return (await res.json()) as T
}

export async function getHealth(): Promise<HealthResponse> {
  if (USE_MOCK_DATA) {
    return { status: "ok", mode: "mock", backendReachable: false }
  }
  try {
    const data = await request<{ status: string }>("/health")
    return { status: "ok", mode: "live", backendReachable: true, message: data.status }
  } catch (err) {
    return {
      status: "error",
      mode: "live",
      backendReachable: false,
      message: (err as Error).message,
    }
  }
}

export async function getMetadata(): Promise<MetadataResponse> {
  if (USE_MOCK_DATA) {
    return {
      domain: {
        latMin: PROTOTYPE_DOMAIN.latMin,
        latMax: PROTOTYPE_DOMAIN.latMax,
        lonMin: PROTOTYPE_DOMAIN.lonMin,
        lonMax: PROTOTYPE_DOMAIN.lonMax,
        gridStepDeg: PROTOTYPE_DOMAIN.gridStepDeg,
      },
      model: MODEL_INFO.name,
      horizon: MODEL_INFO.horizon,
      forecastSource: MODEL_INFO.forecastSource,
      referenceSource: MODEL_INFO.referenceSource,
      trainingRuns: MODEL_INFO.trainingRuns,
      testRun: MODEL_INFO.testRun,
      features: MODEL_FEATURES.map((f) => f.key),
    }
  }
  return request<MetadataResponse>("/metadata")
}

export async function getDates(): Promise<HistoricalRun[]> {
  if (USE_MOCK_DATA) return getMockDates()
  return request<HistoricalRun[]>("/dates")
}

export async function getLeads(): Promise<number[]> {
  if (USE_MOCK_DATA) return Array.from({ length: 10 }, (_, i) => i + 1)
  return request<number[]>("/leads")
}

export async function getSummary(date: string, leadDay: number): Promise<GridSummary> {
  if (USE_MOCK_DATA) return getMockSummary(date, leadDay)
  return request<GridSummary>(`/summary?date=${date}&lead_day=${leadDay}`)
}

export async function getGrid(date: string, leadDay: number): Promise<GridCell[]> {
  if (USE_MOCK_DATA) return getMockGrid(date, leadDay)
  return request<GridCell[]>(`/grid?date=${date}&lead_day=${leadDay}`)
}

export async function getCell(
  date: string,
  leadDay: number,
  latitude: number,
  longitude: number,
): Promise<GridCell> {
  if (USE_MOCK_DATA) return getMockCell(date, leadDay, latitude, longitude)
  return request<GridCell>(`/cell?date=${date}&lead_day=${leadDay}&lat=${latitude}&lon=${longitude}`)
}

export async function getPredictions(filters: PredictionFilters): Promise<GridCell[]> {
  const date = filters.date
  const leadDay = filters.leadDay
  if (!date || !leadDay) return []
  const cells = await getGrid(date, leadDay)
  return cells.filter((c) => {
    if (filters.riskLevel && c.riskLevel !== filters.riskLevel) return false
    if (filters.minBustProbability && c.bustProbability < filters.minBustProbability) return false
    return true
  })
}

export async function getFeatureImportance(): Promise<FeatureImportanceItem[]> {
  if (USE_MOCK_DATA) {
    return FEATURE_IMPORTANCE_MOCK.map((item) => ({
      key: item.key,
      label: item.label,
      raw_importance: Math.round(item.importance * 9000),
      importance: item.importance,
    }))
  }
  return request<FeatureImportanceItem[]>("/feature-importance")
}

export async function getShapImportance(): Promise<ShapImportanceItem[]> {
  if (USE_MOCK_DATA) {
    return [
      { feature: "lead_day", label: "Lead Day", mean_abs_shap: 0.5887 },
      { feature: "forecast_rain_mm", label: "Forecast Rainfall", mean_abs_shap: 0.5469 },
      { feature: "longitude", label: "Longitude", mean_abs_shap: 0.4099 },
      { feature: "latitude", label: "Latitude", mean_abs_shap: 0.3855 },
      { feature: "spatial_gradient", label: "Spatial Gradient", mean_abs_shap: 0.3702 },
      { feature: "forecast_change_mm", label: "Forecast Change", mean_abs_shap: 0.2851 },
    ]
  }
  return request<ShapImportanceItem[]>("/shap-importance")
}

export async function getModelComparison(): Promise<ModelComparisonItem[]> {
  if (USE_MOCK_DATA) {
    return [
      {
        Model: "XGBoost",
        "ROC-AUC": 0.7671,
        "PR-AUC": 0.3149,
        "Brier Score": 0.1223,
        Precision: 0.2418,
        Recall: 0.5062,
        F1: 0.3273,
      },
      {
        Model: "LightGBM",
        "ROC-AUC": 0.7816,
        "PR-AUC": 0.3271,
        "Brier Score": 0.1534,
        Precision: 0.2133,
        Recall: 0.6409,
        F1: 0.3200,
      },
    ]
  }
  return request<ModelComparisonItem[]>("/model-comparison")
}

export interface OperationalRunInfo {
  system_date: string
  system_timezone: string
  forecast_run: string
  forecast_date: string
  forecast_cycle: string
  run_id: string
  available_cycles: string[]
  operational_available: boolean
  fallback_label?: string
}

export async function getOperationalLatestRun(): Promise<OperationalRunInfo> {
  return request<OperationalRunInfo>("/operational/latest-run")
}

export async function postForecastRisk(
  runId: string,
  leadDay: number,
  date?: string,
  cycle?: string
): Promise<ForecastRiskResponse> {
  if (USE_MOCK_DATA) {
    const grid = getMockGrid(date || "2019-09-01", leadDay)
    const cells: ForecastRiskCell[] = grid.map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
      leadDay: c.leadDay,
      forecastRainMm: c.forecastRainMm,
      bustProbability: c.bustProbability,
      prototypeConfidence: c.prototypeConfidence,
      riskLevel: c.riskLevel,
      featureValues: {
        forecastRainMm: c.forecastRainMm,
        forecastChangeMm: c.forecastChangeMm,
        spatialGradient: c.spatialGradient,
        leadDay: c.leadDay,
        latitude: c.latitude,
        longitude: c.longitude,
      },
    }))
    const highCount = cells.filter((c) => c.riskLevel === "high").length
    const meanBust = cells.reduce((a, c) => a + c.bustProbability, 0) / (cells.length || 1)
    const meanConf = cells.reduce((a, c) => a + c.prototypeConfidence, 0) / (cells.length || 1)
    const meanRain = cells.reduce((a, c) => a + c.forecastRainMm, 0) / (cells.length || 1)
    return {
      mode: "pre-verification",
      label: "Pre-Verification Prototype",
      runId,
      leadDay,
      validDate: "2026-10-03",
      systemDate: "2026-09-29",
      forecastRun: "2026-09-29 06 UTC",
      forecastCycle: "06 UTC",
      isOperational: true,
      totalCells: cells.length,
      summary: {
        meanBustProbability: Math.round(meanBust * 10) / 10,
        meanPrototypeConfidence: Math.round(meanConf * 10) / 10,
        bustCellCount: highCount,
        bustCellPct: Math.round((highCount / (cells.length || 1)) * 1000) / 10,
        meanForecastRainMm: Math.round(meanRain * 10) / 10,
      },
      cells,
      disclaimer:
        "Pre-Verification Prototype: Evaluated strictly using GEFS forecast predictors prior to satellite ground truth observation.",
    }
  }

  return request<ForecastRiskResponse>("/forecast-risk", {
    method: "POST",
    body: JSON.stringify({ run_id: runId, lead_day: leadDay, date, cycle }),
  })
}

export { ApiError }


