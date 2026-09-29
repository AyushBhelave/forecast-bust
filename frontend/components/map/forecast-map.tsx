"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import * as d3geo from "d3-geo"
import useSWR from "swr"
import { ZoomInIcon, ZoomOutIcon, RotateCcwIcon, LocateFixedIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { PROTOTYPE_DOMAIN } from "@/lib/config"
import type { GridCell } from "@/lib/types"
import { riskColor, confidenceColor, rainfallColor, errorColor } from "@/lib/color-scales"

export type MapLayer = "bust" | "confidence" | "rainfall" | "error"

interface ForecastMapProps {
  cells: GridCell[]
  loading?: boolean
  layer: MapLayer
  selected: GridCell | null
  onSelectCell: (cell: GridCell) => void
}

const PADDING = 28

function colorForLayer(cell: GridCell, layer: MapLayer): string {
  switch (layer) {
    case "bust":
      return riskColor(cell.bustProbability)
    case "confidence":
      return confidenceColor(cell.prototypeConfidence)
    case "rainfall":
      return rainfallColor(cell.forecastRainMm)
    case "error":
      return errorColor(cell.absoluteErrorMm)
  }
}

function boundaryFeature() {
  const { latMin, latMax, lonMin, lonMax } = PROTOTYPE_DOMAIN
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [lonMin, latMin],
        [lonMax, latMin],
        [lonMax, latMax],
        [lonMin, latMax],
        [lonMin, latMin],
      ],
    ],
  }
}

function indiaBoundsFeature() {
  return {
    type: "Polygon" as const,
    coordinates: [
      [
        [68.0, 7.5],
        [97.5, 7.5],
        [97.5, 37.0],
        [68.0, 37.0],
        [68.0, 7.5],
      ],
    ],
  }
}

async function fetchGeoJson(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to load basemap")
  return res.json()
}

export function ForecastMap({ cells, loading, layer, selected, onSelectCell }: ForecastMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 800, height: 560 })
  const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 })
  const [hovered, setHovered] = useState<GridCell | null>(null)
  const [outsideHover, setOutsideHover] = useState<{ lat: number; lon: number } | null>(null)
  const [outsideAlert, setOutsideAlert] = useState<{ lat: number; lon: number } | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const dragState = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)

  const { data: basemap } = useSWR("/data/india-states.json", fetchGeoJson)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setSize({ width: Math.max(width, 280), height: Math.max(height, 360) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Fit projection to full India basemap
  const projection = useMemo(() => {
    const proj = d3geo.geoMercator()
    const fitTarget = basemap?.features?.length ? basemap : indiaBoundsFeature()
    proj.fitExtent(
      [
        [PADDING, PADDING],
        [size.width - PADDING, size.height - PADDING],
      ],
      fitTarget as any,
    )
    return proj
  }, [size.width, size.height, basemap])

  const pathGenerator = useMemo(() => d3geo.geoPath(projection), [projection])

  const cellStep = PROTOTYPE_DOMAIN.gridStepDeg

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr
    canvas.style.width = `${size.width}px`
    canvas.style.height = `${size.height}px`
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size.width, size.height)

    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.k, transform.k)

    // 1. Full India Basemap
    ctx.fillStyle = "rgba(209, 225, 242, 0.35)"
    ctx.strokeStyle = "rgba(80, 120, 170, 0.45)"
    ctx.lineWidth = 1 / transform.k
    if (basemap?.features) {
      for (const feature of basemap.features) {
        const path = new Path2D(pathGenerator(feature) || "")
        ctx.fill(path)
        ctx.stroke(path)
      }
    }

    // 2. Prototype Domain Boundary (18-28N, 75-90E)
    ctx.strokeStyle = "rgba(14, 116, 144, 0.85)"
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 2 / transform.k
    const boundaryPath = new Path2D(pathGenerator(boundaryFeature() as any) || "")
    ctx.stroke(boundaryPath)
    ctx.setLineDash([])

    // 3. Grid cells ONLY within currently supported model domain (18-28N, 75-90E)
    const [x0, y0] = projection([PROTOTYPE_DOMAIN.lonMin, PROTOTYPE_DOMAIN.latMin]) || [0, 0]
    const [x1, y1] = projection([PROTOTYPE_DOMAIN.lonMin + cellStep, PROTOTYPE_DOMAIN.latMin]) || [0, 0]
    const cellPxWidth = Math.abs(x1 - x0)

    for (const cell of cells) {
      // Strictly ignore any coordinates outside the prototype domain
      if (
        cell.latitude < PROTOTYPE_DOMAIN.latMin ||
        cell.latitude > PROTOTYPE_DOMAIN.latMax ||
        cell.longitude < PROTOTYPE_DOMAIN.lonMin ||
        cell.longitude > PROTOTYPE_DOMAIN.lonMax
      ) {
        continue
      }

      const p = projection([cell.longitude, cell.latitude])
      if (!p) continue
      const [cx, cy] = p
      const half = cellPxWidth / 2 + 0.25
      const isSelected = selected?.latitude === cell.latitude && selected?.longitude === cell.longitude
      const isHovered = hovered?.latitude === cell.latitude && hovered?.longitude === cell.longitude

      ctx.fillStyle = colorForLayer(cell, layer)
      ctx.globalAlpha = isHovered || isSelected ? 1 : 0.85
      ctx.fillRect(cx - half, cy - half, half * 2, half * 2)
      ctx.globalAlpha = 1

      if (isSelected) {
        ctx.strokeStyle = "#1e3a5f"
        ctx.lineWidth = 2.5 / transform.k
        ctx.strokeRect(cx - half, cy - half, half * 2, half * 2)
      } else if (isHovered) {
        ctx.strokeStyle = "rgba(30, 58, 100, 0.8)"
        ctx.lineWidth = 1.5 / transform.k
        ctx.strokeRect(cx - half, cy - half, half * 2, half * 2)
      }
    }

    ctx.restore()
  }, [basemap, cells, pathGenerator, projection, size, transform, layer, hovered, selected, cellStep])

  useEffect(() => {
    draw()
  }, [draw])

  const localPoint = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return null
      const x = clientX - rect.left
      const y = clientY - rect.top
      // invert pan/zoom
      const baseX = (x - transform.x) / transform.k
      const baseY = (y - transform.y) / transform.k
      return { x, y, baseX, baseY }
    },
    [transform],
  )

  const cellAt = useCallback(
    (baseX: number, baseY: number): GridCell | null => {
      const lonlat = projection.invert?.([baseX, baseY])
      if (!lonlat) return null
      const [lon, lat] = lonlat
      let closest: GridCell | null = null
      let closestDist = Number.POSITIVE_INFINITY
      for (const cell of cells) {
        const dLat = cell.latitude - lat
        const dLon = cell.longitude - lon
        const dist = dLat * dLat + dLon * dLon
        if (dist < closestDist) {
          closestDist = dist
          closest = cell
        }
      }
      if (closest && Math.abs(closest.latitude - lat) <= cellStep && Math.abs(closest.longitude - lon) <= cellStep) {
        return closest
      }
      return null
    },
    [cells, projection, cellStep],
  )

  function handlePointerDown(e: React.PointerEvent) {
    dragState.current = { startX: e.clientX, startY: e.clientY, moved: false }
  }

  function handlePointerMove(e: React.PointerEvent) {
    const pt = localPoint(e.clientX, e.clientY)
    if (!pt) return
    setPointer({ x: pt.x, y: pt.y })

    if (dragState.current) {
      const dx = e.clientX - dragState.current.startX
      const dy = e.clientY - dragState.current.startY
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        dragState.current.moved = true
        setTransform((t) => ({ ...t, x: t.x + e.movementX, y: t.y + e.movementY }))
      }
      return
    }

    const cell = cellAt(pt.baseX, pt.baseY)
    setHovered(cell)

    if (!cell && projection.invert) {
      const lonlat = projection.invert([pt.baseX, pt.baseY])
      if (lonlat) {
        const [lon, lat] = lonlat
        // If within approximate India coordinates but outside prototype domain 18-28N, 75-90E
        if (lat >= 8.0 && lat <= 36.0 && lon >= 68.0 && lon <= 97.0) {
          const isOutside =
            lat < PROTOTYPE_DOMAIN.latMin ||
            lat > PROTOTYPE_DOMAIN.latMax ||
            lon < PROTOTYPE_DOMAIN.lonMin ||
            lon > PROTOTYPE_DOMAIN.lonMax
          if (isOutside) {
            setOutsideHover({ lat, lon })
          } else {
            setOutsideHover(null)
          }
        } else {
          setOutsideHover(null)
        }
      } else {
        setOutsideHover(null)
      }
    } else {
      setOutsideHover(null)
    }
  }

  function handlePointerUp(e: React.PointerEvent) {
    const wasDrag = dragState.current?.moved
    dragState.current = null
    if (wasDrag) return
    const pt = localPoint(e.clientX, e.clientY)
    if (!pt) return
    const cell = cellAt(pt.baseX, pt.baseY)
    if (cell) {
      onSelectCell(cell)
    } else if (projection.invert) {
      const lonlat = projection.invert([pt.baseX, pt.baseY])
      if (lonlat) {
        const [lon, lat] = lonlat
        if (
          lat < PROTOTYPE_DOMAIN.latMin ||
          lat > PROTOTYPE_DOMAIN.latMax ||
          lon < PROTOTYPE_DOMAIN.lonMin ||
          lon > PROTOTYPE_DOMAIN.lonMax
        ) {
          setOutsideAlert({ lat, lon })
          setTimeout(() => setOutsideAlert(null), 4000)
        }
      }
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12
    setTransform((t) => {
      const k = Math.min(6, Math.max(1, t.k * delta))
      const x = px - ((px - t.x) / t.k) * k
      const y = py - ((py - t.y) / t.k) * k
      return { k, x, y }
    })
  }

  function zoomBy(factor: number) {
    setTransform((t) => {
      const k = Math.min(6, Math.max(1, t.k * factor))
      const cx = size.width / 2
      const cy = size.height / 2
      const x = cx - ((cx - t.x) / t.k) * k
      const y = cy - ((cy - t.y) / t.k) * k
      return { k, x, y }
    })
  }

  function focusDomain() {
    if (!projection) return
    const [xMin, yMax] = projection([PROTOTYPE_DOMAIN.lonMin, PROTOTYPE_DOMAIN.latMin]) || [0, 0]
    const [xMax, yMin] = projection([PROTOTYPE_DOMAIN.lonMax, PROTOTYPE_DOMAIN.latMax]) || [0, 0]
    const dW = Math.abs(xMax - xMin)
    const dH = Math.abs(yMax - yMin)
    if (dW === 0 || dH === 0) return
    const cX = (xMin + xMax) / 2
    const cY = (yMin + yMax) / 2
    const scale = Math.min((size.width - 60) / dW, (size.height - 60) / dH)
    const k = Math.max(1, Math.min(scale, 4.0))
    const cx = size.width / 2
    const cy = size.height / 2
    setTransform({ k, x: cx - cX * k, y: cy - cY * k })
  }

  function resetView() {
    setTransform({ k: 1, x: 0, y: 0 })
  }

  return (
    <div ref={containerRef} className="relative h-full min-h-[420px] w-full overflow-hidden rounded-lg border border-border bg-[#ddeaf7]">
      {loading && <Skeleton className="absolute inset-0 z-10 rounded-lg" />}
      <canvas
        ref={canvasRef}
        className="size-full cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          setHovered(null)
          setPointer(null)
          dragState.current = null
        }}
        onWheel={handleWheel}
        role="img"
        aria-label="Interactive forecast bust risk map showing full India basemap with predictions active in 18 to 28 degrees North, 75 to 90 degrees East"
      />

      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1 rounded-md border border-border bg-background/85 px-2.5 py-1.5 text-[10px] text-muted-foreground backdrop-blur-sm shadow-xs">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-cyan-600 inline-block animate-pulse" />
          Full India Basemap
        </span>
        <span>Active Model Domain: 18°–28°N, 75°–90°E ({cells.length} cells)</span>
        <span className="text-[9px] text-muted-foreground/80 italic">Unmonitored outside bounding box (zero fabricated values)</span>
      </div>

      <div className="absolute right-3 top-3 flex flex-col gap-1">
        <Button size="icon-sm" variant="secondary" onClick={() => zoomBy(1.3)} aria-label="Zoom in">
          <ZoomInIcon />
        </Button>
        <Button size="icon-sm" variant="secondary" onClick={() => zoomBy(1 / 1.3)} aria-label="Zoom out">
          <ZoomOutIcon />
        </Button>
        <Button size="icon-sm" variant="secondary" onClick={focusDomain} aria-label="Focus model domain" title="Focus 18-28°N, 75-90°E Domain">
          <LocateFixedIcon />
        </Button>
        <Button size="icon-sm" variant="secondary" onClick={resetView} aria-label="Reset to full India" title="Reset to Full India View">
          <RotateCcwIcon />
        </Button>
      </div>

      {outsideAlert && (
        <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-30 flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/15 p-3 text-xs text-foreground backdrop-blur-md shadow-md animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            <div>
              <strong className="text-amber-800 dark:text-amber-300 font-semibold">
                Prediction not supported by current prototype.
              </strong>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Location ({outsideAlert.lat.toFixed(2)}°N, {outsideAlert.lon.toFixed(2)}°E) is outside the trained 18–28°N, 75–90°E prototype domain.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOutsideAlert(null)}
            className="rounded p-1 text-muted-foreground hover:bg-amber-500/20 hover:text-foreground text-[10px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {outsideHover && pointer && !hovered && (
        <div
          className="pointer-events-none absolute z-20 min-w-[210px] rounded-md border border-amber-500/30 bg-popover/95 p-2.5 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(pointer.x + 14, size.width - 230),
            top: Math.min(pointer.y + 14, size.height - 90),
          }}
        >
          <div className="font-mono-tight text-[11px] text-muted-foreground">
            {outsideHover.lat.toFixed(2)}°N, {outsideHover.lon.toFixed(2)}°E
          </div>
          <div className="mt-1 font-semibold text-amber-700 dark:text-amber-400 text-[11px]">
            Prediction not supported by current prototype.
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            Model domain: 18–28°N, 75–90°E
          </div>
        </div>
      )}

      {hovered && pointer && (
        <div
          className="pointer-events-none absolute z-20 min-w-[160px] rounded-md border border-border bg-popover/95 p-2.5 text-xs shadow-lg backdrop-blur-sm"
          style={{
            left: Math.min(pointer.x + 14, size.width - 180),
            top: Math.min(pointer.y + 14, size.height - 120),
          }}
        >
          <div className="font-mono-tight text-[11px] text-muted-foreground">
            {hovered.latitude.toFixed(2)}°N, {hovered.longitude.toFixed(2)}°E
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Bust probability</span>
            <span className="font-mono-tight font-semibold text-foreground">{hovered.bustProbability.toFixed(0)}%</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Prototype confidence</span>
            <span className="font-mono-tight font-semibold text-foreground">{hovered.prototypeConfidence.toFixed(0)}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
