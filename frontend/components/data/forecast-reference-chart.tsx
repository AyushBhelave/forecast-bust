"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

const chartConfig: ChartConfig = {
  forecast: { label: "Forecast Rainfall", color: "var(--forecast)" },
  reference: { label: "Reference Rainfall (IMERG)", color: "var(--reference)" },
}

interface ForecastReferenceChartProps {
  forecastRainMm: number
  referenceRainMm: number
  absoluteErrorMm: number
}

export function ForecastReferenceChart({
  forecastRainMm,
  referenceRainMm,
  absoluteErrorMm,
}: ForecastReferenceChartProps) {
  const data = [
    { name: "Rainfall (mm)", forecast: forecastRainMm, reference: referenceRainMm },
  ]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Forecast vs. Reference
        </span>
        <span className="font-mono-tight text-xs text-muted-foreground">
          Abs. error <span className="font-semibold text-foreground">{absoluteErrorMm.toFixed(1)} mm</span>
        </span>
      </div>
      <ChartContainer config={chartConfig} className="h-32 w-full">
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 12 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="forecast" fill="var(--color-forecast)" radius={4} barSize={18} />
          <Bar dataKey="reference" fill="var(--color-reference)" radius={4} barSize={18} />
        </BarChart>
      </ChartContainer>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: "var(--forecast)" }} />
          Forecast
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: "var(--reference)" }} />
          Reference
        </span>
      </div>
    </div>
  )
}
