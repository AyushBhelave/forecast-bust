/**
 * Small, dependency-free multi-stop color interpolation used for map layers.
 * Optimized for the LIGHT sky-blue scientific weather dashboard theme.
 * Colors are vivid enough to read clearly on a white/pale-blue background.
 */

type Stop = [number, string]

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "")
  const bigint = Number.parseInt(clean, 16)
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function interpolateStops(value: number, stops: Stop[]): string {
  if (value <= stops[0][0]) return stops[0][1]
  if (value >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]

  for (let i = 0; i < stops.length - 1; i++) {
    const [v0, c0] = stops[i]
    const [v1, c1] = stops[i + 1]
    if (value >= v0 && value <= v1) {
      const t = (value - v0) / (v1 - v0)
      const [r0, g0, b0] = hexToRgb(c0)
      const [r1, g1, b1] = hexToRgb(c1)
      const r = Math.round(lerp(r0, r1, t))
      const g = Math.round(lerp(g0, g1, t))
      const b = Math.round(lerp(b0, b1, t))
      return `rgb(${r}, ${g}, ${b})`
    }
  }
  return stops[stops.length - 1][1]
}

// Bust probability 0-100: teal green → amber → coral red
// All hues vivid enough on a pale-blue map background
export const BUST_PROBABILITY_STOPS: Stop[] = [
  [0,   "#2e9e80"],  // confident teal green
  [30,  "#d97d18"],  // amber orange
  [60,  "#d9453b"],  // coral red
  [100, "#9b1515"],  // deep crimson
]

// Prototype confidence 0-100: low=muted → high=vibrant ocean blue
export const CONFIDENCE_STOPS: Stop[] = [
  [0,   "#a5b8cc"],  // muted grey-blue (low confidence)
  [50,  "#3a7fbf"],  // medium steel blue
  [100, "#0f4c8a"],  // deep ocean blue (high confidence)
]

// Rainfall 0-~140mm: light sky → deep indigo
export const RAINFALL_STOPS: Stop[] = [
  [0,   "#c8e4f6"],  // very pale sky blue (dry)
  [20,  "#5ba3d8"],  // sky blue
  [60,  "#2060b0"],  // ocean blue (moderate)
  [140, "#4d3490"],  // deep indigo (heavy)
]

// Absolute error 0-~40mm: soft yellow → fiery orange → dark red
export const ERROR_STOPS: Stop[] = [
  [0,   "#c8e4f6"],  // calm (low error)
  [10,  "#e8b640"],  // amber (moderate error)
  [25,  "#d9453b"],  // coral red (large error)
  [40,  "#7a1010"],  // dark crimson (extreme bust)
]

export function riskColor(bustProbability: number) {
  return interpolateStops(bustProbability, BUST_PROBABILITY_STOPS)
}

export function confidenceColor(confidence: number) {
  return interpolateStops(confidence, CONFIDENCE_STOPS)
}

export function rainfallColor(mm: number) {
  return interpolateStops(mm, RAINFALL_STOPS)
}

export function errorColor(mm: number) {
  return interpolateStops(mm, ERROR_STOPS)
}
