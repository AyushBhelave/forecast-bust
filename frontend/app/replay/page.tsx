"use client"

import { useState } from "react"
import useSWR from "swr"
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/layout/status-badge"
import { KPIGrid } from "@/components/data/kpi-grid"
import { DateSelector } from "@/components/data/date-selector"
import { LeadSelector } from "@/components/data/lead-selector"
import { LocationDetails } from "@/components/data/location-details"
import { ForecastMap, type MapLayer } from "@/components/map/forecast-map"
import { MapLegend } from "@/components/map/map-legend"
import { MapLayerToggle } from "@/components/map/map-layer-toggle"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { getGrid, getSummary } from "@/lib/api"
import { HISTORICAL_RUNS } from "@/lib/config"
import type { GridCell } from "@/lib/types"

export default function ReplayPage() {
  const [date, setDate] = useState(HISTORICAL_RUNS[0].date)
  const [leadDay, setLeadDay] = useState(1)
  const [layer, setLayer] = useState<MapLayer>("bust")
  const [selected, setSelected] = useState<GridCell | null>(null)

  const gridKey = `/grid?date=${date}&lead=${leadDay}`
  const {
    data: cells,
    isLoading: cellsLoading,
    error: cellsError,
    mutate: refetchGrid,
  } = useSWR(gridKey, () => getGrid(date, leadDay))

  const summaryKey = `/summary?date=${date}&lead=${leadDay}`
  const { data: summary, isLoading: summaryLoading } = useSWR(summaryKey, () => getSummary(date, leadDay))

  function handleReset() {
    setDate(HISTORICAL_RUNS[0].date)
    setLeadDay(1)
    setLayer("bust")
    setSelected(null)
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Historical Replay"
          title="Historical Forecast Replay"
          description="Replay historical forecast conditions and inspect where the model identifies elevated bust risk."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono-tight text-xs font-semibold">
                HISTORICAL VALIDATION
              </Badge>
              <StatusBadge label="Prototype" tone="warning" />
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        {/* Control bar */}
        <div className="glass-panel flex flex-col gap-4 rounded-lg p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Historical Run
              </span>
              <DateSelector value={date} onChange={setDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Region</span>
              <div className="flex h-9 items-center rounded-md border border-border bg-secondary/30 px-3 font-mono-tight text-sm text-foreground">
                Prototype Region · 18–28°N, 75–90°E
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcwIcon data-icon="inline-start" />
            Reset
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Lead Day — Day 1 through Day 10
          </span>
          <LeadSelector value={leadDay} onChange={setLeadDay} />
        </div>

        {/* KPI bar */}
        <KPIGrid summary={summary} loading={summaryLoading} />

        {cellsError && (
          <Alert variant="destructive">
            <TriangleAlertIcon />
            <AlertTitle>Unable to load grid data</AlertTitle>
            <AlertDescription>
              <span>{(cellsError as Error).message}</span>
              <Button variant="outline" size="sm" className="mt-2 w-fit" onClick={() => refetchGrid()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Main layout: map + insight panel */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <MapLayerToggle value={layer} onChange={setLayer} />
              <div className="w-40">
                <MapLegend layer={layer} />
              </div>
            </div>
            <ForecastMap
              cells={cells ?? []}
              loading={cellsLoading}
              layer={layer}
              selected={selected}
              onSelectCell={setSelected}
            />
            <p className="text-[11px] text-muted-foreground">
              0.25° prototype GEFS grid over the central/eastern India domain. Hover a cell to preview, click to
              inspect. Historical replay reflects a past forecast run — not a live forecast.
            </p>
          </div>

          <div className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]">
            <LocationDetails cell={selected} />
          </div>
        </div>
      </div>
    </div>
  )
}
