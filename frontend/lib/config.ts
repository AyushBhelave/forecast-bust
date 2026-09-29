/**
 * Central, non-fabricated configuration for the Forecast Bust AI prototype.
 * These values reflect the actual scope of the historical replay prototype.
 * Do not add operational claims, invented metrics, or fake trends here.
 */

export const PROTOTYPE_DOMAIN = {
  latMin: 18,
  latMax: 28,
  lonMin: 75,
  lonMax: 90,
  gridStepDeg: 0.25,
  label: "Central / Eastern India (prototype domain)",
} as const

export const LEAD_DAYS = Array.from({ length: 10 }, (_, i) => i + 1) // Day 1 - Day 10

export type RunRole = "training" | "held-out-test"

export interface HistoricalRun {
  date: string // YYYY-MM-DD
  runId: string // e.g. 2019061500
  role: RunRole
  label: string
}

export const HISTORICAL_RUNS: HistoricalRun[] = [
  { date: "2019-09-01", runId: "2019090100", role: "held-out-test", label: "01 Sep 2019 — Final Kaggle Held-Out Test" },
  { date: "2019-08-01", runId: "2019080100", role: "training", label: "01 Aug 2019 — Training Run" },
  { date: "2019-07-01", runId: "2019070100", role: "training", label: "01 Jul 2019 — Training Run" },
  { date: "2019-06-15", runId: "2019061500", role: "training", label: "15 Jun 2019 — Training Run" },
]

export const MODEL_INFO = {
  name: "LightGBM",
  family: "LightGBM (Gradient Boosted Decision Trees)",
  forecastSource: "GEFS retrospective forecasts",
  referenceSource: "IMERG Final precipitation (linearly regridded)",
  trainingRuns: ["2019061500", "2019070100", "2019080100"],
  testRun: "2019090100",
  horizon: "Day 1 – Day 10 (medium-range)",
} as const

export const MODEL_FEATURES = [
  {
    key: "forecast_rain_mm",
    label: "Forecast Rainfall",
    unit: "mm",
    description: "GEFS-forecast accumulated rainfall at the grid cell for the given lead day.",
  },
  {
    key: "forecast_change_mm",
    label: "Forecast Change",
    unit: "mm",
    description: "Change in forecast rainfall relative to the previous lead day, indicating forecast volatility.",
  },
  {
    key: "spatial_gradient",
    label: "Spatial Gradient",
    unit: "mm/°",
    description: "Local spatial variability of forecast rainfall across neighboring grid cells.",
  },
  {
    key: "lead_day",
    label: "Lead Day",
    unit: "days",
    description: "Forecast lead time, from Day 1 to Day 10.",
  },
  {
    key: "latitude",
    label: "Latitude",
    unit: "°N",
    description: "Grid cell latitude within the prototype domain.",
  },
  {
    key: "longitude",
    label: "Longitude",
    unit: "°E",
    description: "Grid cell longitude within the prototype domain.",
  },
] as const

/**
 * Validated metrics from the held-out test run (2019-09-01) from Kaggle LightGBM model.
 * These are the ONLY metrics this prototype claims. Never invent new ones.
 */
export const VALIDATION_METRICS = {
  rocAuc: 0.7816,
  prAuc: 0.3271,
  brierScore: 0.1534,
  precision: 0.2133,
  recall: 0.6409,
  f1: 0.3200,
} as const

export const BUST_THRESHOLD_MM = 30.07262516766805 // Actual trained 90th percentile threshold from final training run
export const BUST_THRESHOLD_DISPLAY = "30.07 mm"

export const RISK_BUCKETS = {
  low: { min: 0, max: 30, label: "Low" },
  medium: { min: 30, max: 60, label: "Medium" },
  high: { min: 60, max: 100, label: "High" },
} as const

export type RiskLevel = keyof typeof RISK_BUCKETS

export function riskLevelFromProbability(probabilityPct: number): RiskLevel {
  if (probabilityPct >= RISK_BUCKETS.high.min) return "high"
  if (probabilityPct >= RISK_BUCKETS.medium.min) return "medium"
  return "low"
}

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA !== "false"
