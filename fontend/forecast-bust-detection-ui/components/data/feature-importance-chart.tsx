"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"

interface FeatureImportanceChartProps {
  data: { key: string; label: string; importance: number }[]
}

const chartConfig: ChartConfig = {
  importance: { label: "Relative importance", color: "var(--primary)" },
}

export function FeatureImportanceChart({ data }: FeatureImportanceChartProps) {
  const sorted = [...data].sort((a, b) => b.importance - a.importance)

  return (
    <ChartContainer config={chartConfig} className="h-72 w-full">
      <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid horizontal={false} stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, "dataMax"]}
          tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
            />
          }
        />
        <Bar dataKey="importance" fill="var(--color-importance)" radius={4} barSize={18} />
      </BarChart>
    </ChartContainer>
  )
}
