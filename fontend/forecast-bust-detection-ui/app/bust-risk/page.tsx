"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { SearchIcon, ArrowUpDownIcon } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCard } from "@/components/data/metric-card"
import { RiskBadge } from "@/components/data/risk-badge"
import { RiskLegend } from "@/components/data/risk-legend"
import { DateSelector } from "@/components/data/date-selector"
import { LeadSelector } from "@/components/data/lead-selector"
import { ForecastMap } from "@/components/map/forecast-map"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getGrid } from "@/lib/api"
import { HISTORICAL_RUNS } from "@/lib/config"
import type { GridCell, RiskLevel } from "@/lib/types"

type SortKey = "bustProbability" | "prototypeConfidence" | "absoluteErrorMm"

export default function BustRiskPage() {
  const [date, setDate] = useState(HISTORICAL_RUNS[0].date)
  const [leadDay, setLeadDay] = useState(1)
  const [search, setSearch] = useState("")
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [sortKey, setSortKey] = useState<SortKey>("bustProbability")
  const [sortDesc, setSortDesc] = useState(true)

  const { data: cells, isLoading } = useSWR(`/grid?date=${date}&lead=${leadDay}`, () => getGrid(date, leadDay))

  const filtered = useMemo(() => {
    let rows = cells ?? []
    if (riskFilter !== "all") rows = rows.filter((c) => c.riskLevel === riskFilter)
    if (search.trim()) {
      const q = search.trim()
      rows = rows.filter((c) => `${c.latitude}`.includes(q) || `${c.longitude}`.includes(q))
    }
    return [...rows].sort((a, b) => (sortDesc ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]))
  }, [cells, riskFilter, search, sortKey, sortDesc])

  const highest = useMemo(() => [...(cells ?? [])].sort((a, b) => b.bustProbability - a.bustProbability).slice(0, 5), [cells])
  const lowest = useMemo(() => [...(cells ?? [])].sort((a, b) => a.bustProbability - b.bustProbability).slice(0, 5), [cells])

  const stats = useMemo(() => {
    const rows = cells ?? []
    if (rows.length === 0) return null
    const bustCells = rows.filter((c) => c.riskLevel === "high").length
    return {
      bustPct: (bustCells / rows.length) * 100,
      meanBust: rows.reduce((a, c) => a + c.bustProbability, 0) / rows.length,
      meanConfidence: rows.reduce((a, c) => a + c.prototypeConfidence, 0) / rows.length,
    }
  }, [cells])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Bust Risk"
          title="Forecast Bust Risk"
          description="Spatial and tabular view of grid-level bust probability, prototype confidence, and error for the selected historical run and lead day."
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
        <div className="glass-panel flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Historical Run
              </span>
              <DateSelector value={date} onChange={setDate} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Lead Day</span>
              <LeadSelector value={leadDay} onChange={setLeadDay} />
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MetricCard label="Bust Cell Percentage" value={stats.bustPct} suffix="%" description="Share of grid cells classified High risk" />
            <MetricCard label="Mean Bust Probability" value={stats.meanBust} suffix="%" description="Averaged across the full prototype grid" />
            <MetricCard label="Mean Prototype Confidence" value={stats.meanConfidence} suffix="%" description="Not a calibrated probability" />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-3">
            <ForecastMap cells={cells ?? []} loading={isLoading} layer="bust" selected={null} onSelectCell={() => {}} />
          </div>
          <div className="flex flex-col gap-4">
            <RiskLegend />
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Highest-Risk Cells</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {highest.map((c, i) => (
                  <RiskRow key={i} cell={c} />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lowest-Risk Cells</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {lowest.map((c, i) => (
                  <RiskRow key={i} cell={c} />
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-sm">Grid Cell Detail</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search lat/lon..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 w-44 pl-8 text-xs"
                />
              </div>
              <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
                <SelectTrigger size="sm" className="w-32">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All risk</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Latitude</TableHead>
                    <TableHead>Longitude</TableHead>
                    <TableHead className="text-right">Forecast (mm)</TableHead>
                    <TableHead className="text-right">Reference (mm)</TableHead>
                    <SortableHead label="Error (mm)" active={sortKey === "absoluteErrorMm"} desc={sortDesc} onClick={() => toggleSort("absoluteErrorMm")} />
                    <SortableHead label="Bust Probability" active={sortKey === "bustProbability"} desc={sortDesc} onClick={() => toggleSort("bustProbability")} />
                    <SortableHead label="Confidence" active={sortKey === "prototypeConfidence"} desc={sortDesc} onClick={() => toggleSort("prototypeConfidence")} />
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 60).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono-tight">{c.latitude.toFixed(2)}°N</TableCell>
                      <TableCell className="font-mono-tight">{c.longitude.toFixed(2)}°E</TableCell>
                      <TableCell className="text-right font-mono-tight">{c.forecastRainMm.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono-tight">{c.referenceRainMm.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono-tight">{c.absoluteErrorMm.toFixed(1)}</TableCell>
                      <TableCell className="text-right font-mono-tight">{c.bustProbability.toFixed(0)}%</TableCell>
                      <TableCell className="text-right font-mono-tight">{c.prototypeConfidence.toFixed(0)}%</TableCell>
                      <TableCell>
                        <RiskBadge level={c.riskLevel} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {!isLoading && filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No grid cells match the current filters.</p>
            )}
            {!isLoading && filtered.length > 60 && (
              <p className="pt-3 text-center text-[11px] text-muted-foreground">
                Showing 60 of {filtered.length} matching cells.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function RiskRow({ cell }: { cell: GridCell }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-secondary/20 px-3 py-2 text-xs">
      <span className="font-mono-tight text-muted-foreground">
        {cell.latitude.toFixed(1)}°N, {cell.longitude.toFixed(1)}°E
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono-tight font-medium text-foreground">{cell.bustProbability.toFixed(0)}%</span>
        <RiskBadge level={cell.riskLevel} />
      </div>
    </div>
  )
}

function SortableHead({
  label,
  active,
  desc,
  onClick,
}: {
  label: string
  active: boolean
  desc: boolean
  onClick: () => void
}) {
  return (
    <TableHead className="text-right">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-right text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        <ArrowUpDownIcon className={`size-3 ${active ? "text-primary" : ""}`} data-state={active ? (desc ? "desc" : "asc") : undefined} />
      </button>
    </TableHead>
  )
}
