import { MapPinIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { RiskBadge } from "@/components/data/risk-badge"
import { ForecastReferenceChart } from "@/components/data/forecast-reference-chart"
import { MODEL_FEATURES } from "@/lib/config"
import type { GridCell } from "@/lib/types"

export function LocationDetails({ cell }: { cell: GridCell | null }) {
  if (!cell) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full items-center justify-center p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MapPinIcon />
              </EmptyMedia>
              <EmptyTitle>No location selected</EmptyTitle>
              <EmptyDescription>Click any grid cell on the map to inspect its forecast bust risk.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    )
  }

  const signals: Record<string, number> = {
    forecast_rain_mm: cell.forecastRainMm,
    forecast_change_mm: cell.forecastChangeMm,
    spatial_gradient: cell.spatialGradient,
    lead_day: cell.leadDay,
  }

  return (
    <Card className="h-full overflow-y-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm">
          Selected Location
          <RiskBadge level={cell.riskLevel} />
        </CardTitle>
        <p className="font-mono-tight text-xs text-muted-foreground">
          {cell.latitude.toFixed(2)}°N, {cell.longitude.toFixed(2)}°E · Lead Day {cell.leadDay}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Bust Probability</p>
            <p className="mt-1 font-mono-tight text-3xl font-semibold tabular-nums">
              {cell.bustProbability.toFixed(0)}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Prototype Confidence</p>
            <p className="mt-1 font-mono-tight text-3xl font-semibold tabular-nums">
              {cell.prototypeConfidence.toFixed(0)}
              <span className="text-lg text-muted-foreground">%</span>
            </p>
          </div>
        </div>

        <ForecastReferenceChart
          forecastRainMm={cell.forecastRainMm}
          referenceRainMm={cell.referenceRainMm}
          absoluteErrorMm={cell.absoluteErrorMm}
        />

        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Model-Associated Signals
          </span>
          <div className="flex flex-col gap-1.5">
            {MODEL_FEATURES.filter((f) => f.key in signals).map((feature) => (
              <div key={feature.key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{feature.label}</span>
                <span className="font-mono-tight font-medium text-foreground">
                  {signals[feature.key].toFixed(feature.unit === "days" ? 0 : 2)} {feature.unit !== "days" ? feature.unit : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] leading-snug text-muted-foreground">
            These are model-associated signals, not confirmed causal drivers of forecast bust risk.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
