"use client"

import { Gauge, ShieldAlert, Grid3x3, CloudRain, TriangleAlert, CalendarClock } from "lucide-react"
import { MetricCard } from "@/components/data/metric-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { GridSummary } from "@/lib/types"

export function KPIGrid({ summary, loading }: { summary?: GridSummary; loading?: boolean }) {
  if (loading || !summary) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-lg" />
        ))}
      </div>
    )
  }

  const bustTone = summary.bustCellPct >= 30 ? "high" : summary.bustCellPct >= 12 ? "medium" : "low"

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard
        label="Mean Bust Probability"
        value={summary.meanBustProbability}
        suffix="%"
        icon={ShieldAlert}
        tone={bustTone}
      />
      <MetricCard label="Prototype Confidence" value={summary.meanPrototypeConfidence} suffix="%" icon={Gauge} />
      <MetricCard
        label="Bust Cells"
        value={summary.bustCellPct}
        suffix="%"
        decimals={1}
        icon={Grid3x3}
        description={`${summary.bustCellCount} of ${summary.totalCells} cells`}
        tone={bustTone}
      />
      <MetricCard label="Mean Forecast Rainfall" value={summary.meanForecastRainMm} suffix=" mm" icon={CloudRain} />
      <MetricCard
        label="Mean Absolute Error"
        value={summary.meanAbsoluteErrorMm}
        suffix=" mm"
        icon={TriangleAlert}
      />
      <MetricCard label="Lead Day" value={summary.leadDay} suffix="" decimals={0} icon={CalendarClock} />
    </div>
  )
}
