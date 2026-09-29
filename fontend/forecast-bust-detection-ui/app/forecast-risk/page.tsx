"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  Radio,
  ShieldAlert,
  Gauge,
  CloudRain,
  Grid3x3,
  CalendarClock,
  Compass,
  Activity,
  ArrowRightLeft,
  Layers,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Satellite,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCard } from "@/components/data/metric-card"
import { RiskBadge } from "@/components/data/risk-badge"
import { RiskLegend } from "@/components/data/risk-legend"
import { LeadSelector } from "@/components/data/lead-selector"
import { ForecastMap, type MapLayer } from "@/components/map/forecast-map"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { postForecastRisk, getOperationalLatestRun } from "@/lib/api"
import {
  BUST_THRESHOLD_MM,
  BUST_THRESHOLD_DISPLAY,
} from "@/lib/config"
import type { GridCell, ForecastRiskCell } from "@/lib/types"

function getValidDate(runDateStr: string, leadDays: number): string {
  try {
    const cleanDate = runDateStr.includes(" ") ? runDateStr.split(" ")[0] : runDateStr
    const [y, m, d] = cleanDate.split("-").map(Number)
    const dateObj = new Date(Date.UTC(y, m - 1, d))
    dateObj.setUTCDate(dateObj.getUTCDate() + leadDays)
    return dateObj.toISOString().slice(0, 10)
  } catch {
    return runDateStr
  }
}

export default function ForecastRiskPage() {
  const [selectedRunMode, setSelectedRunMode] = useState<"operational" | "historical">("operational")
  const [selectedCycle, setSelectedCycle] = useState<string>("06")
  const [leadDay, setLeadDay] = useState(1)
  const [layer, setLayer] = useState<MapLayer>("bust")
  const [selectedCell, setSelectedCell] = useState<ForecastRiskCell | null>(null)

  // 1. Fetch dynamic latest operational GEFS metadata from NOAA/NOMADS
  const { data: opInfo } = useSWR("/operational/latest-run", getOperationalLatestRun, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  // System Date in IST
  const systemDate = opInfo?.system_date ?? new Date().toISOString().slice(0, 10)

  // Operational vs Historical Run ID & Dates
  const isOperationalMode = selectedRunMode === "operational"
  const activeRunId = isOperationalMode ? (opInfo?.run_id ?? "latest") : "2019090100"
  const activeDate = isOperationalMode ? (opInfo?.forecast_date ?? systemDate) : "2019-09-01"
  const activeCycle = isOperationalMode ? (selectedCycle || opInfo?.forecast_cycle?.replace(" UTC", "") || "06") : "00"

  // 2. Fetch real-time LightGBM inference from POST /forecast-risk (ZERO IMERG reference data)
  const swrKey = `/forecast-risk?run_id=${activeRunId}&lead_day=${leadDay}&cycle=${activeCycle}&date=${activeDate}`
  const { data, isLoading } = useSWR(
    swrKey,
    () => postForecastRisk(activeRunId, leadDay, activeDate, activeCycle),
    { revalidateOnFocus: false },
  )

  const summary = data?.summary
  const cells = data?.cells ?? []
  const isFallback = data?.isFallback ?? false
  const forecastRun = data?.forecastRun ?? (isOperationalMode ? `${activeDate} ${activeCycle} UTC` : "2019-09-01 00 UTC")
  const forecastCycle = data?.forecastCycle ?? `${activeCycle} UTC`

  // Computed valid target date for the active lead horizon: run_date + leadDay
  const validDate = useMemo(() => {
    if (data?.validDate) return data.validDate
    return getValidDate(activeDate, leadDay)
  }, [data?.validDate, activeDate, leadDay])

  // Convert to GridCell shape for the ForecastMap
  const mapCells: GridCell[] = useMemo(() => {
    return cells.map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
      leadDay: c.leadDay,
      date: validDate,
      forecastRainMm: c.forecastRainMm,
      referenceRainMm: 0,
      absoluteErrorMm: 0,
      forecastChangeMm: c.featureValues.forecastChangeMm,
      spatialGradient: c.featureValues.spatialGradient,
      bustProbability: c.bustProbability,
      prototypeConfidence: c.prototypeConfidence,
      riskLevel: c.riskLevel,
    }))
  }, [cells, validDate])

  // Selected cell formatted
  const activeSelected = useMemo(() => {
    if (!selectedCell) return null
    const match = cells.find(
      (c) => c.latitude === selectedCell.latitude && c.longitude === selectedCell.longitude,
    )
    return match ?? selectedCell
  }, [selectedCell, cells])

  // Peak elevated risk cell across the domain for current lead day
  const peakCell = useMemo(() => {
    if (!cells.length) return null
    return [...cells].sort((a, b) => b.bustProbability - a.bustProbability)[0]
  }, [cells])

  // Target evaluated in the prominent alert banner: either user-clicked cell or domain peak risk
  const alertTarget = activeSelected || peakCell
  const isHighRisk = alertTarget ? alertTarget.bustProbability >= 60.0 : false
  const isMedRisk = alertTarget
    ? alertTarget.bustProbability >= 30.0 && alertTarget.bustProbability < 60.0
    : false
  const isElevated = isHighRisk || isMedRisk

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Pre-Verification Prototype"
          title="Pre-Verification Forecast Bust Risk"
          description="Pre-Verification Prototype evaluated strictly on GEFS numerical weather predictions BEFORE IMERG satellite precipitation observations are recorded. Flags forecast bust probability across the 10-day horizon with zero reference ground truth."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Radio className="size-3 mr-1.5 inline animate-pulse text-primary" />
                Pre-Verification Prototype
              </Badge>
              <Badge variant="secondary" className="font-mono-tight">
                No IMERG Reference Ingested
              </Badge>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Date separation & dynamic NOAA operational status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/40 px-4 py-2.5 border border-border text-xs text-muted-foreground shadow-xs">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-primary" />
            <span>
              <strong>Current System Date:</strong>{" "}
              <span className="font-mono-tight font-semibold text-foreground">{systemDate} (IST)</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <span>
              <strong>Forecast Run:</strong>{" "}
              <span className="font-mono-tight font-semibold text-foreground">{forecastRun}</span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              <strong>Forecast Cycle:</strong>{" "}
              <span className="font-mono-tight font-semibold text-foreground">{forecastCycle}</span>
            </span>
            <span className="text-muted-foreground/50">·</span>
            <span>
              <strong>Valid Date:</strong>{" "}
              <span className="font-mono-tight font-semibold text-primary">{validDate}</span>{" "}
              <span className="text-muted-foreground">(Day {leadDay})</span>
            </span>

            {isFallback ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
              >
                Latest forecast unavailable — Historical Pre-Verification Simulation
              </Badge>
            ) : isOperationalMode ? (
              <Badge
                variant="outline"
                className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              >
                NOAA NOMADS Operational GEFS
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
              >
                Historical Pre-Verification Simulation
              </Badge>
            )}
          </div>
        </div>

        {/* Fallback Banner if operational NOAA GEFS could not be parsed */}
        {isFallback && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/[0.08] p-4 text-xs text-foreground flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="size-4 text-amber-600 shrink-0" />
              <div>
                <strong className="text-amber-800 dark:text-amber-300">
                  Latest forecast unavailable — Historical Pre-Verification Simulation
                </strong>
                <p className="text-muted-foreground mt-0.5 text-[11px]">
                  Real-time GRIB parsing from NOAA NOMADS was temporarily unreachable. To prevent generating fabricated
                  weather data, the system automatically engaged the verified 2019-09-01 historical simulation run.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-700 font-mono-tight shrink-0">
              Run: 2019-09-01 00 UTC
            </Badge>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROMINENT ALERT BANNER: FORECAST BUST RISK DETECTED */}
        {/* ========================================================================= */}
        {alertTarget && (
          <div
            className={`rounded-xl border p-5 shadow-sm transition-all ${
              isHighRisk
                ? "border-red-500/50 bg-red-500/[0.08] text-foreground ring-1 ring-red-500/20"
                : isMedRisk
                  ? "border-amber-500/50 bg-amber-500/[0.08] text-foreground ring-1 ring-amber-500/20"
                  : "border-emerald-500/40 bg-emerald-500/[0.05] text-foreground"
            }`}
          >
            {/* Banner Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div
                  className={`flex size-10 items-center justify-center rounded-lg shrink-0 ${
                    isHighRisk
                      ? "bg-red-600 text-white animate-pulse"
                      : isMedRisk
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-600 text-white"
                  }`}
                >
                  {isHighRisk ? (
                    <ShieldAlert className="size-5" />
                  ) : isMedRisk ? (
                    <AlertTriangle className="size-5" />
                  ) : (
                    <CheckCircle2 className="size-5" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight text-foreground uppercase">
                      {isElevated ? "FORECAST BUST RISK DETECTED" : "FORECAST RISK NOMINAL"}
                    </h2>
                    <Badge
                      className={
                        isHighRisk
                          ? "bg-red-600 text-white hover:bg-red-700 uppercase font-mono-tight text-[11px]"
                          : isMedRisk
                            ? "bg-amber-600 text-white hover:bg-amber-700 uppercase font-mono-tight text-[11px]"
                            : "bg-emerald-600 text-white uppercase font-mono-tight text-[11px]"
                      }
                    >
                      {isHighRisk ? "HIGH RISK (≥60%)" : isMedRisk ? "MEDIUM RISK (30–60%)" : "LOW RISK (<30%)"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activeSelected
                      ? `Alert for selected point (${activeSelected.latitude.toFixed(2)}°N, ${activeSelected.longitude.toFixed(2)}°E)`
                      : `Domain peak bust risk identified at ${peakCell?.latitude.toFixed(2)}°N, ${peakCell?.longitude.toFixed(2)}°E`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <Badge variant="outline" className="bg-background/80 border-border font-mono-tight">
                  Pre-Verification Prototype
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-background/80 border-amber-500/40 text-amber-700 dark:text-amber-400 font-mono-tight"
                >
                  Prototype alert threshold — not operationally validated
                </Badge>
              </div>
            </div>

            {/* Explicit Future Alert Highlight for elevated bust risk */}
            {isHighRisk && (
              <div className="mt-3.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-red-600 animate-pulse shrink-0" />
                  <span className="font-bold text-red-700 dark:text-red-400 text-sm">
                    Potential bust window: {validDate}, Day {alertTarget.leadDay}
                  </span>
                </div>
                <div className="text-[11px] font-mono-tight text-red-700 dark:text-red-300">
                  Target Valid Date: {validDate} ({alertTarget.leadDay * 24}h Horizon)
                </div>
              </div>
            )}

            {/* Scientific context note */}
            <p className="mt-2 text-[11px] text-muted-foreground italic leading-relaxed">
              *The model is predicting the probability of an unusually large forecast error (|Error| &ge; {BUST_THRESHOLD_MM.toFixed(2)} mm) for that FUTURE VALID PERIOD. It evaluates forecast uncertainty prior to verification and does not predict the exact date a weather bust will happen.
            </p>

            {/* Primary Alert Fields */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 text-xs">
              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Forecast Run
                </span>
                <div className="mt-1 font-mono-tight font-semibold text-foreground truncate" title={forecastRun}>
                  {forecastRun}
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Forecast Cycle
                </span>
                <div className="mt-1 font-mono-tight font-semibold text-foreground truncate">
                  {forecastCycle}
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Lead Day
                </span>
                <div className="mt-1 font-mono-tight font-semibold text-foreground">
                  Day {alertTarget.leadDay} ({alertTarget.leadDay * 24}h)
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Valid Date
                </span>
                <div className="mt-1 font-mono-tight font-semibold text-primary font-bold">{validDate}</div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Coordinates
                </span>
                <div
                  className="mt-1 font-mono-tight font-semibold text-foreground truncate"
                  title={`${alertTarget.latitude.toFixed(2)}°N, ${alertTarget.longitude.toFixed(2)}°E`}
                >
                  {alertTarget.latitude.toFixed(1)}°N, {alertTarget.longitude.toFixed(1)}°E
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Bust Probability
                </span>
                <div
                  className={`mt-1 font-mono-tight font-bold text-base ${
                    isHighRisk ? "text-red-600" : isMedRisk ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {alertTarget.bustProbability.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Prototype Conf.
                </span>
                <div className="mt-1 font-mono-tight font-bold text-base text-foreground">
                  {alertTarget.prototypeConfidence.toFixed(1)}%
                </div>
              </div>

              <div className="rounded-lg bg-background/80 border border-border/60 p-2.5">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Risk Level
                </span>
                <div className="mt-1">
                  <RiskBadge level={alertTarget.riskLevel} />
                </div>
              </div>
            </div>

            {/* Model-Associated Signals Breakdown */}
            <div className="mt-4 rounded-lg bg-background/70 border border-border/60 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <span>Model-associated signals</span>
                <span className="font-mono-tight font-normal text-[10px] text-muted-foreground/80">
                  Trained Bust Threshold: {BUST_THRESHOLD_DISPLAY} (|Error| &ge; {BUST_THRESHOLD_MM.toFixed(2)} mm)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">lead_day:</span>
                  <span className="font-mono-tight font-semibold text-foreground">
                    Day {alertTarget.leadDay} ({alertTarget.leadDay * 24}h Horizon)
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">forecast_rain_mm:</span>
                  <span className="font-mono-tight font-semibold text-foreground">
                    {alertTarget.featureValues.forecastRainMm.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">forecast_change_mm:</span>
                  <span className="font-mono-tight font-semibold text-foreground">
                    {alertTarget.featureValues.forecastChangeMm > 0 ? "+" : ""}
                    {alertTarget.featureValues.forecastChangeMm.toFixed(2)} mm
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-muted-foreground text-[11px]">spatial_gradient:</span>
                  <span className="font-mono-tight font-semibold text-foreground">
                    {alertTarget.featureValues.spatialGradient.toFixed(2)} mm/°
                  </span>
                </div>
              </div>
            </div>

            {/* Recommended Action Footer */}
            <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-border/40 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground">
                <span className="size-2 rounded-full bg-primary" />
                <span>Recommended action: Review forecast / consider increased uncertainty.</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Zero IMERG reference rainfall ingested. Verification available in{" "}
                <Link href="/replay" className="underline font-medium hover:text-foreground">
                  Historical Replay
                </Link>
                .
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="glass-panel flex flex-col gap-4 rounded-lg p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            {/* Run Mode Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                GEFS Run Source
              </span>
              <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedRunMode("operational")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                    isOperationalMode
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Satellite className="size-3 text-emerald-600" />
                  NOAA Operational ({opInfo?.forecast_date ?? "Today"})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRunMode("historical")}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-medium transition-colors ${
                    !isOperationalMode
                      ? "bg-background text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Database className="size-3 text-amber-600" />
                  Historical Simulation (2019-09-01)
                </button>
              </div>
            </div>

            {/* Cycle Selector if Operational */}
            {isOperationalMode && opInfo?.available_cycles && opInfo.available_cycles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Forecast Cycle
                </span>
                <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1 text-xs">
                  {opInfo.available_cycles.map((cycStr) => {
                    const digit = cycStr.replace(" UTC", "").trim()
                    const active = (selectedCycle || "06") === digit
                    return (
                      <button
                        key={cycStr}
                        type="button"
                        onClick={() => setSelectedCycle(digit)}
                        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
                          active
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cycStr}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Lead Day Horizon */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Lead Day Horizon
                </span>
                <span className="font-mono-tight text-[11px] font-semibold text-primary">
                  Valid: {validDate}
                </span>
              </div>
              <LeadSelector value={leadDay} onChange={setLeadDay} />
            </div>
          </div>

          {/* Map Layer Selector (Pre-Verification layers only - no error layer!) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Map Visualization Layer
            </span>
            <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-1">
              <button
                type="button"
                onClick={() => setLayer("bust")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  layer === "bust"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bust Probability
              </button>
              <button
                type="button"
                onClick={() => setLayer("confidence")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  layer === "confidence"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Confidence
              </button>
              <button
                type="button"
                onClick={() => setLayer("rainfall")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  layer === "rainfall"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                GEFS Rainfall
              </button>
            </div>
          </div>
        </div>

        {/* KPI Grid */}
        {isLoading || !summary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              label="Mean Bust Risk"
              value={summary.meanBustProbability}
              suffix="%"
              icon={ShieldAlert}
              tone={
                summary.meanBustProbability >= 30
                  ? "high"
                  : summary.meanBustProbability >= 15
                    ? "medium"
                    : "low"
              }
              description="Averaged across 2,501 cells"
            />
            <MetricCard
              label="Prototype Confidence"
              value={summary.meanPrototypeConfidence}
              suffix="%"
              icon={Gauge}
              description="100 - P(bust)"
            />
            <MetricCard
              label="Elevated Risk Cells"
              value={summary.bustCellPct}
              suffix="%"
              decimals={1}
              icon={Grid3x3}
              description={`${summary.bustCellCount} cells classified High Risk`}
              tone={summary.bustCellPct >= 15 ? "high" : "low"}
            />
            <MetricCard
              label="Mean Forecast Rain"
              value={summary.meanForecastRainMm}
              suffix=" mm"
              icon={CloudRain}
              description="GEFS 24h accumulated total"
            />
            <MetricCard
              label="Lead Horizon"
              value={leadDay}
              suffix=" Days"
              decimals={0}
              icon={CalendarClock}
              description={`Day ${leadDay} → Valid: ${validDate}`}
            />
          </div>
        )}

        {/* Map & Cell Details Layout */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Spatial Grid Map */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                  Spatial Bust Risk Surface (Full India Basemap)
                </span>
                <Badge variant="outline" className="text-[10px] font-mono-tight">
                  2,501 Points (0.25°)
                </Badge>
              </div>
              <RiskLegend />
            </div>

            <div className="h-[520px] w-full">
              <ForecastMap
                cells={mapCells}
                loading={isLoading}
                layer={layer}
                selected={activeSelected as any}
                onSelectCell={(c) => {
                  const orig = cells.find(
                    (cell) => cell.latitude === c.latitude && cell.longitude === c.longitude,
                  )
                  setSelectedCell(orig ?? null)
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-muted-foreground px-1">
              <span>
                <strong>Supported Model Domain:</strong> 18.0°–28.0°N, 75.0°–90.0°E (Central &amp; Eastern India)
              </span>
              <span>Click any grid point on the map to evaluate its location-specific alert</span>
            </div>
          </div>

          {/* Selected Location Details Panel */}
          <div className="h-full">
            {!activeSelected ? (
              <Card className="h-full">
                <CardContent className="flex h-full min-h-[400px] items-center justify-center p-6 text-center">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <MapPin className="size-6 text-muted-foreground" />
                      </EmptyMedia>
                      <EmptyTitle className="text-sm font-semibold">No grid point selected</EmptyTitle>
                      <EmptyDescription className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                        Click on any 0.25° grid cell on the map to inspect its real-time pre-verification features.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full overflow-y-auto border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                      <MapPin className="size-4 text-primary" />
                      Selected Grid Point
                    </CardTitle>
                    <RiskBadge level={activeSelected.riskLevel} />
                  </div>
                  <CardDescription className="font-mono-tight text-xs">
                    {activeSelected.latitude.toFixed(2)}°N, {activeSelected.longitude.toFixed(2)}°E · Lead Day{" "}
                    {activeSelected.leadDay} (Valid: {validDate})
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {/* Probability scores */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Bust Probability
                      </span>
                      <div className="mt-1 font-mono-tight text-2xl font-bold tabular-nums text-foreground">
                        {activeSelected.bustProbability.toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Prototype Conf.
                      </span>
                      <div className="mt-1 font-mono-tight text-2xl font-bold tabular-nums text-foreground">
                        {activeSelected.prototypeConfidence.toFixed(0)}
                        <span className="text-sm font-normal text-muted-foreground ml-0.5">%</span>
                      </div>
                    </div>
                  </div>

                  {/* GEFS Forecast Rainfall Volume */}
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CloudRain className="size-3.5 text-primary" />
                        GEFS Forecast Rainfall
                      </span>
                      <span className="font-mono-tight font-semibold text-foreground text-sm">
                        {activeSelected.forecastRainMm.toFixed(1)} mm
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      24h predicted accumulation at this spatial point for Lead Day {activeSelected.leadDay} (Valid: {validDate}).
                    </div>
                  </div>

                  {/* 6 Features Ingested by LightGBM */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Model Feature Ingestion (6 Predictors)
                    </span>
                    <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2 text-xs">
                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CloudRain className="size-3 text-primary" /> Forecast Rainfall
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          {activeSelected.featureValues.forecastRainMm.toFixed(2)} mm
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <ArrowRightLeft className="size-3 text-primary" /> Forecast Change (Δt)
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          {activeSelected.featureValues.forecastChangeMm > 0 ? "+" : ""}
                          {activeSelected.featureValues.forecastChangeMm.toFixed(2)} mm
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="size-3 text-primary" /> Spatial Gradient
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          {activeSelected.featureValues.spatialGradient.toFixed(2)} mm/°
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <CalendarClock className="size-3 text-primary" /> Lead Day Horizon
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          Day {activeSelected.featureValues.leadDay}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Compass className="size-3 text-primary" /> Latitude
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          {activeSelected.featureValues.latitude.toFixed(2)}°N
                        </span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Compass className="size-3 text-primary" /> Longitude
                        </span>
                        <span className="font-mono-tight font-semibold text-foreground">
                          {activeSelected.featureValues.longitude.toFixed(2)}°E
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pre-verification status note */}
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3 text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground flex items-center gap-1 mb-1">
                      <AlertTriangle className="size-3 text-amber-500" />
                      Ground Truth Observation Pending
                    </strong>
                    IMERG satellite precipitation data has not yet been recorded for future valid date {validDate}. Reference
                    rainfall and absolute error will be computed during post-hoc verification in{" "}
                    <strong>Historical Replay</strong> mode.
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Workflow Comparison Card */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Pre-Verification vs. Historical Replay Workflow
            </CardTitle>
            <CardDescription className="text-xs">
              Clear scientific distinction between operational prediction mode and verification mode
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Radio className="size-4 text-primary" />
                Pre-Verification Mode (This Page)
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Operates prior to ground-truth observations. The LightGBM classifier ingests raw GEFS forecasts and
                outputs spatial bust risk and prototype confidence scores to advise operational meteorologists before
                extreme events occur.
              </p>
              <div className="rounded bg-secondary/50 p-2 font-mono-tight text-[10px] text-foreground border border-border/50">
                GEFS Forecast → Feature Extraction → LightGBM Inference → Bust Risk Alert
              </div>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Historical Replay Mode (/replay)
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Operates after ground truth is observed. Compares the original GEFS forecast against NASA IMERG satellite
                reference rainfall, calculates actual absolute error (|Forecast - Reference|), and verifies whether the
                model correctly anticipated the bust.
              </p>
              <div className="rounded bg-secondary/50 p-2 font-mono-tight text-[10px] text-foreground border border-border/50">
                GEFS Forecast + IMERG Reference → Absolute Error → Verification Scoring
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
