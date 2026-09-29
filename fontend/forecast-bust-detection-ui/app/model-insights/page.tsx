"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import {
  BrainCircuit,
  Sliders,
  Sparkles,
  Info,
  Calendar,
  CloudRain,
  Compass,
  Activity,
  ArrowRightLeft,
  HelpCircle,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCard } from "@/components/data/metric-card"
import { FeatureImportanceChart } from "@/components/data/feature-importance-chart"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { getFeatureImportance, getShapImportance } from "@/lib/api"
import { MODEL_FEATURES, MODEL_INFO } from "@/lib/config"

const FEATURE_ICONS: Record<string, any> = {
  lead_day: Calendar,
  forecast_rain_mm: CloudRain,
  longitude: Compass,
  latitude: Compass,
  spatial_gradient: Activity,
  forecast_change_mm: ArrowRightLeft,
}

const FEATURE_METEOROLOGICAL_ROLE: Record<string, string> = {
  lead_day:
    "Primary error driver in SHAP analysis. Predictability decays non-linearly across the 10-day medium range horizon due to atmospheric chaos.",
  forecast_rain_mm:
    "Second most influential feature. Extreme or heavy rainfall forecasts exhibit higher variance and susceptibility to displacement busts.",
  longitude:
    "Captures longitudinal gradients in monsoon moisture transport between the Arabian Sea branch and Bay of Bengal low-pressure systems.",
  latitude:
    "Encodes the meridional position relative to the Indian Monsoon Trough (18°N–28°N) where convective clustering frequently shifts.",
  spatial_gradient:
    "Measures localized spatial steepness of precipitation. High gradient boundaries signify sharp frontal edges prone to spatial displacement errors.",
  forecast_change_mm:
    "Measures forecast volatility between consecutive lead horizons. Sharp revisions signal instability in numerical ensemble guidance.",
}

const shapChartConfig: ChartConfig = {
  mean_abs_shap: { label: "Mean |SHAP| value", color: "var(--primary)" },
}

export default function ModelInsightsPage() {
  const { data: featureImportance, isLoading: featLoading } = useSWR(
    "/feature-importance",
    getFeatureImportance,
  )
  const { data: shapImportance, isLoading: shapLoading } = useSWR(
    "/shap-importance",
    getShapImportance,
  )

  const [activeTab, setActiveTab] = useState<"shap" | "gain">("shap")

  const sortedShap = useMemo(() => {
    return [...(shapImportance ?? [])].sort((a, b) => b.mean_abs_shap - a.mean_abs_shap)
  }, [shapImportance])

  const sortedFeat = useMemo(() => {
    return [...(featureImportance ?? [])].sort((a, b) => b.importance - a.importance)
  }, [featureImportance])

  const topShap = sortedShap[0]?.label ?? "Lead Day"
  const topGain = sortedFeat[0]?.label ?? "Longitude"

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Interpretability"
          title="Model Insights & Feature Importance"
          description="Transparent analysis of the 6 features driving LightGBM forecast bust predictions, combining tree split importance with game-theoretic SHAP (SHapley Additive exPlanations) values."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <BrainCircuit className="size-3 mr-1.5 inline" />
                Explainable AI (XAI)
              </Badge>
              <Badge variant="secondary" className="font-mono-tight">
                6 Features
              </Badge>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {/* Metric summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard
            label="Top SHAP Feature"
            value={0.5887}
            decimals={4}
            description={`${topShap} (Highest overall impact)`}
            tone="high"
          />
          <MetricCard
            label="Top Tree Splits"
            value={1950}
            decimals={0}
            description={`${topGain} (Most frequent splits)`}
          />
          <MetricCard
            label="Feature Dimension"
            value={6}
            decimals={0}
            description="Engineered atmospheric signals"
          />
          <MetricCard
            label="Model Family"
            value={100}
            suffix="%"
            decimals={0}
            description={`${MODEL_INFO.name} (Gradient Boosting)`}
            tone="low"
          />
        </div>

        {/* Feature Importance & SHAP Visualizations */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* SHAP Importance Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    SHAP Value Attribution
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Mean absolute SHAP value: average magnitude of each feature&apos;s push on predicted bust probability.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-secondary/50 font-mono-tight">
                  /shap-importance
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {shapLoading ? (
                <Skeleton className="h-72 w-full rounded-md" />
              ) : (
                <ChartContainer config={shapChartConfig} className="h-72 w-full">
                  <BarChart data={sortedShap} layout="vertical" margin={{ left: 8, right: 24, top: 10, bottom: 10 }}>
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      domain={[0, 0.7]}
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
                          formatter={(value) => `${Number(value).toFixed(4)} mean |SHAP|`}
                        />
                      }
                    />
                    <Bar
                      dataKey="mean_abs_shap"
                      fill="var(--primary)"
                      radius={4}
                      barSize={18}
                    />
                  </BarChart>
                </ChartContainer>
              )}
              <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>
                  <strong>Lead Day</strong> (0.5887) and <strong>Forecast Rainfall</strong> (0.5469) produce the largest continuous shifts in bust risk.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tree Split Gain Card */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    Global Feature Importance (Tree Splits)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Normalized decision-tree split frequency across all boosted trees in the final model.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] bg-secondary/50 font-mono-tight">
                  /feature-importance
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {featLoading ? (
                <Skeleton className="h-72 w-full rounded-md" />
              ) : (
                <FeatureImportanceChart data={sortedFeat} />
              )}
              <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Info className="size-3.5 text-primary shrink-0" />
                <span>
                  <strong>Spatial coordinates</strong> (Longitude &amp; Latitude) appear in 43% of total tree splits to partition regional climatology.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Feature Catalog & Meteorological Analysis */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Compass className="size-4 text-primary" />
              Feature Definitions &amp; Atmospheric Dynamics
            </CardTitle>
            <CardDescription className="text-xs">
              Complete breakdown of the 6 inputs ingested by the model and why they are meteorologically informative.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/40">
                  <TableRow>
                    <TableHead className="w-[180px] font-semibold text-foreground">Feature Name</TableHead>
                    <TableHead className="w-[100px] font-semibold text-foreground">Unit</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-foreground">Mean |SHAP|</TableHead>
                    <TableHead className="w-[120px] text-right font-semibold text-foreground">Importance</TableHead>
                    <TableHead className="font-semibold text-foreground">Meteorological Interpretation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MODEL_FEATURES.map((feat) => {
                    const IconComp = FEATURE_ICONS[feat.key] || HelpCircle
                    const shapItem = shapImportance?.find((s) => s.feature === feat.key)
                    const featItem = featureImportance?.find((f) => f.key === feat.key)

                    return (
                      <TableRow key={feat.key}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-secondary text-primary">
                              <IconComp className="size-3.5" />
                            </span>
                            <div>
                              <div className="text-sm font-semibold text-foreground">{feat.label}</div>
                              <div className="font-mono-tight text-[11px] text-muted-foreground">{feat.key}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono-tight text-xs">{feat.unit}</TableCell>
                        <TableCell className="text-right font-mono-tight text-xs font-semibold text-foreground">
                          {shapItem ? shapItem.mean_abs_shap.toFixed(4) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono-tight text-xs text-muted-foreground">
                          {featItem ? `${(featItem.importance * 100).toFixed(1)}%` : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground leading-relaxed">
                          {FEATURE_METEOROLOGICAL_ROLE[feat.key] || feat.description}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Scientific Context Disclaimer */}
        <div className="rounded-lg border border-border bg-secondary/30 p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Info className="size-4 text-primary" />
            Statistical Association vs. Atmospheric Causation
          </h3>
          <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
            SHAP importance scores quantify how much each input variable influenced the LightGBM decision trees on the held-out historical test run. While these alignments correlate strongly with known meteorological mechanisms (e.g., predictability loss with lead time, convection placement errors), they represent <strong>statistical attribution</strong> learned from data, not mathematical proof of atmospheric causality.
          </p>
        </div>
      </div>
    </div>
  )
}
