import { PROTOTYPE_DOMAIN, HISTORICAL_RUNS, riskLevelFromProbability } from "./config"
import type { GridCell, GridSummary } from "./types"

/**
 * Deterministic mock data layer for UI development.
 *
 * This module NEVER represents real scientific output. Values are generated
 * from seeded pseudo-random functions so the same (date, leadDay, lat, lon)
 * always produces the same value in a session — useful for a stable demo —
 * but they are illustrative only, not real GEFS/IMERG/model results.
 *
 * Per project rules: confidence must NOT show a fabricated monotonic
 * decrease from Day 1 to Day 10. Day-to-day variation below is intentionally
 * non-monotonic (small seeded jitter around a stable band).
 */

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// mulberry32 seeded PRNG
function rngFromSeed(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededRandom(...parts: (string | number)[]): number {
  const seed = hashSeed(parts.join("|"))
  return rngFromSeed(seed)()
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, decimals = 1) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

export function latRange(): number[] {
  const out: number[] = []
  for (let lat = PROTOTYPE_DOMAIN.latMin; lat <= PROTOTYPE_DOMAIN.latMax + 1e-6; lat += PROTOTYPE_DOMAIN.gridStepDeg) {
    out.push(round(lat, 2))
  }
  return out
}

export function lonRange(): number[] {
  const out: number[] = []
  for (let lon = PROTOTYPE_DOMAIN.lonMin; lon <= PROTOTYPE_DOMAIN.lonMax + 1e-6; lon += PROTOTYPE_DOMAIN.gridStepDeg) {
    out.push(round(lon, 2))
  }
  return out
}

/**
 * Simulates a broad monsoon-like rainfall gradient across the domain so the
 * visualization has spatial structure, rather than pure noise.
 */
function baseRainfallField(lat: number, lon: number, date: string, leadDay: number): number {
  const r1 = seededRandom(date, "field-a", Math.round(lat * 4), Math.round(lon * 4))
  const r2 = seededRandom(date, "field-b", leadDay)
  // Southwest-to-northeast gradient plus a moving pseudo "wet band"
  const wetBandCenter = PROTOTYPE_DOMAIN.lonMin + ((leadDay * 1.3 + r2 * 4) % (PROTOTYPE_DOMAIN.lonMax - PROTOTYPE_DOMAIN.lonMin))
  const distFromBand = Math.abs(lon - wetBandCenter)
  const bandEffect = Math.max(0, 34 - distFromBand * 4)
  const latEffect = clamp((28 - lat) * 2.1, 0, 22)
  const noise = r1 * 18
  return clamp(bandEffect + latEffect + noise, 0, 140)
}

function computeCell(lat: number, lon: number, date: string, leadDay: number): GridCell {
  const forecastRainMm = round(baseRainfallField(lat, lon, date, leadDay), 1)

  const prevForecast = round(baseRainfallField(lat, lon, date, Math.max(1, leadDay - 1)), 1)
  const forecastChangeMm = round(forecastRainMm - prevForecast, 1)

  // Local spatial gradient approximated from neighbor jitter (illustrative only).
  const neighborJitter = seededRandom(date, "grad", lat, lon, leadDay) * 12
  const spatialGradient = round(Math.abs(forecastChangeMm) * 0.4 + neighborJitter, 1)

  // Reference "observed" rainfall diverges from forecast with a lead-day-scaled
  // error envelope plus a rare, larger "bust" jitter — not a monotonic trend.
  const errorEnvelope = 6 + leadDay * 1.15
  const errorNoise = (seededRandom(date, "err", lat, lon, leadDay) - 0.42) * errorEnvelope
  const bustRoll = seededRandom(date, "burst", lat, lon, leadDay)
  const bustKick = bustRoll > 0.86 ? errorEnvelope * (1.6 + bustRoll) : 0
  const referenceRainMm = round(clamp(forecastRainMm + errorNoise + bustKick, 0, 160), 1)
  const absoluteErrorMm = round(Math.abs(forecastRainMm - referenceRainMm), 1)

  // Bust probability: informed by error magnitude + forecast volatility + gradient,
  // squashed into 0-100 with a logistic-like curve. This is illustrative, not the
  // real trained model output.
  const z =
    -1.9 +
    absoluteErrorMm * 0.09 +
    Math.abs(forecastChangeMm) * 0.045 +
    spatialGradient * 0.03 +
    (leadDay - 5) * 0.03
  const logistic = 1 / (1 + Math.exp(-z))
  const bustProbability = round(clamp(logistic * 100, 1, 98), 1)

  // Prototype confidence: intentionally NOT a monotonic function of lead day.
  // Held near the model's overall validated performance band with small,
  // cell- and day-seeded jitter in both directions.
  const confidenceJitter = (seededRandom(date, "conf", lat, lon, leadDay) - 0.5) * 26
  const prototypeConfidence = round(clamp(58 + confidenceJitter, 22, 88), 1)

  return {
    latitude: round(lat, 2),
    longitude: round(lon, 2),
    leadDay,
    date,
    forecastRainMm,
    referenceRainMm,
    absoluteErrorMm,
    forecastChangeMm,
    spatialGradient,
    bustProbability,
    prototypeConfidence,
    riskLevel: riskLevelFromProbability(bustProbability),
  }
}

const gridCache = new Map<string, GridCell[]>()

export function getMockGrid(date: string, leadDay: number): GridCell[] {
  const key = `${date}:${leadDay}`
  const cached = gridCache.get(key)
  if (cached) return cached

  const lats = latRange()
  const lons = lonRange()
  const cells: GridCell[] = []
  for (const lat of lats) {
    for (const lon of lons) {
      cells.push(computeCell(lat, lon, date, leadDay))
    }
  }
  gridCache.set(key, cells)
  return cells
}

export function getMockCell(date: string, leadDay: number, latitude: number, longitude: number): GridCell {
  return computeCell(latitude, longitude, date, leadDay)
}

export function getMockSummary(date: string, leadDay: number): GridSummary {
  const cells = getMockGrid(date, leadDay)
  const totalCells = cells.length
  const bustCellCount = cells.filter((c) => c.riskLevel === "high").length
  const sum = (fn: (c: GridCell) => number) => cells.reduce((acc, c) => acc + fn(c), 0)

  return {
    date,
    leadDay,
    meanBustProbability: round(sum((c) => c.bustProbability) / totalCells, 1),
    meanPrototypeConfidence: round(sum((c) => c.prototypeConfidence) / totalCells, 1),
    bustCellCount,
    totalCells,
    bustCellPct: round((bustCellCount / totalCells) * 100, 1),
    meanForecastRainMm: round(sum((c) => c.forecastRainMm) / totalCells, 1),
    meanAbsoluteErrorMm: round(sum((c) => c.absoluteErrorMm) / totalCells, 1),
  }
}

export function getMockDates() {
  return HISTORICAL_RUNS
}

/**
 * Illustrative only — the connected FastAPI backend is expected to expose the
 * trained model's real feature importances. These mock values exist purely so
 * the Model Insights UI has something to render in demo data mode, and must
 * never be presented as an actual trained-model result.
 */
export const FEATURE_IMPORTANCE_MOCK = [
  { key: "forecast_rain_mm", label: "Forecast Rainfall", importance: 0.312 },
  { key: "forecast_change_mm", label: "Forecast Change", importance: 0.238 },
  { key: "spatial_gradient", label: "Spatial Gradient", importance: 0.191 },
  { key: "lead_day", label: "Lead Day", importance: 0.146 },
  { key: "latitude", label: "Latitude", importance: 0.068 },
  { key: "longitude", label: "Longitude", importance: 0.045 },
]
