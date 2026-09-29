import type { RiskLevel } from "./config"

export interface GridCell {
  latitude: number
  longitude: number
  leadDay: number
  date: string
  forecastRainMm: number
  referenceRainMm: number
  absoluteErrorMm: number
  forecastChangeMm: number
  spatialGradient: number
  bustProbability: number // 0-100
  prototypeConfidence: number // 0-100
  riskLevel: RiskLevel
}

export interface GridSummary {
  date: string
  leadDay: number
  meanBustProbability: number
  meanPrototypeConfidence: number
  bustCellCount: number
  totalCells: number
  bustCellPct: number
  meanForecastRainMm: number
  meanAbsoluteErrorMm: number
}

export interface HealthResponse {
  status: "ok" | "error"
  mode: "live" | "mock"
  backendReachable: boolean
  message?: string
}

export interface ValidationMetrics {
  roc_auc: number
  pr_auc: number
  brier_score: number
  precision: number
  recall: number
  f1: number
}

export interface MetadataResponse {
  domain: {
    latMin: number
    latMax: number
    lonMin: number
    lonMax: number
    gridStepDeg: number
    label?: string
  }
  model: string
  horizon: string
  forecastSource: string
  referenceSource: string
  trainingRuns: string[]
  testRun: string
  features: string[]
  metrics?: ValidationMetrics
  confidenceNote?: string
  prototypeNote?: string
}

export interface FeatureImportanceItem {
  key: string
  label: string
  raw_importance: number
  importance: number
}

export interface ShapImportanceItem {
  feature: string
  label: string
  mean_abs_shap: number
}

export interface ModelComparisonItem {
  Model: string
  "ROC-AUC": number
  "PR-AUC": number
  "Brier Score": number
  Precision: number
  Recall: number
  F1: number
  [key: string]: any
}

export interface PredictionFilters {
  date?: string
  leadDay?: number
  minBustProbability?: number
  riskLevel?: RiskLevel
  search?: string
}

export interface ForecastRiskCell {
  latitude: number
  longitude: number
  leadDay: number
  forecastRainMm: number
  bustProbability: number
  prototypeConfidence: number
  riskLevel: RiskLevel
  featureValues: {
    forecastRainMm: number
    forecastChangeMm: number
    spatialGradient: number
    leadDay: number
    latitude: number
    longitude: number
  }
}

export interface ForecastRiskSummary {
  meanBustProbability: number
  meanPrototypeConfidence: number
  bustCellCount: number
  bustCellPct: number
  meanForecastRainMm: number
}

export interface ForecastRiskResponse {
  mode: string
  label: string
  isOperational?: boolean
  isFallback?: boolean
  fallbackLabel?: string | null
  systemDate?: string
  systemTimezone?: string
  forecastRun?: string
  forecastRunDate?: string
  forecastCycle?: string
  runId: string
  leadDay: number
  validDate?: string
  totalCells: number
  summary: ForecastRiskSummary
  cells: ForecastRiskCell[]
  disclaimer: string
}


