"use client"

import {
  GitCommit,
  Database,
  Satellite,
  Compass,
  Calculator,
  Workflow,
  Cpu,
  Layers,
  CheckCircle,
  Binary,
  ArrowRight,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { MethodologyTimeline } from "@/components/panels/methodology-timeline"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PROTOTYPE_DOMAIN, MODEL_INFO } from "@/lib/config"

const PIPELINE_STAGES = [
  {
    step: "01",
    title: "NWP Ensemble Guidance",
    source: "NOAA GEFSv12",
    icon: Database,
    description:
      "Retrospective 24-hour accumulated rainfall forecasts from the Global Ensemble Forecast System across lead days 1 to 10 at 0.25° horizontal resolution.",
    tech: "GEFS Retrospective · 0.25° Grid · Day 1–10",
  },
  {
    step: "02",
    title: "Satellite Ground Truth",
    source: "NASA GPM IMERG",
    icon: Satellite,
    description:
      "Multi-satellite precipitation calibration from IMERG Final Daily V07/V07B, serving as the high-accuracy observational reference.",
    tech: "IMERG Final Daily · Gauge-Calibrated · Daily Total",
  },
  {
    step: "03",
    title: "Domain Regridding",
    source: "Bilinear Interpolation",
    icon: Compass,
    description:
      `Spatial co-registration onto the common 0.25° prototype domain (${PROTOTYPE_DOMAIN.latMin}–${PROTOTYPE_DOMAIN.latMax}°N, ${PROTOTYPE_DOMAIN.lonMin}–${PROTOTYPE_DOMAIN.lonMax}°E), creating 2,501 matching points per day.`,
    tech: "41 × 61 = 2,501 Grid Points / Lead Day",
  },
  {
    step: "04",
    title: "Error Derivation",
    source: "Absolute Deviation",
    icon: Calculator,
    description:
      "Grid-level absolute forecast error computed as |GEFS_rain - IMERG_rain| in millimeters for each valid date and lead time.",
    tech: "|Forecast - Reference| (mm)",
  },
  {
    step: "05",
    title: "Bust Thresholding",
    source: "90th Percentile",
    icon: Binary,
    description:
      "A forecast bust is defined when absolute error exceeds the 90th percentile of training errors (30.07262516766805 mm). Creates binary target y ∈ {0, 1}.",
    tech: "Bust Threshold = 30.07 mm (Top 10% Errors)",
  },
  {
    step: "06",
    title: "Feature Engineering",
    source: "6 Predictors",
    icon: Layers,
    description:
      "Extraction of forecast precipitation, lead time, spatial gradients (neighbor variability), temporal forecast changes, and geographic coordinates.",
    tech: "Rain + Change + Gradient + Lead + Lat + Lon",
  },
  {
    step: "07",
    title: "LightGBM Classifier",
    source: "Gradient Boosted Trees",
    icon: Cpu,
    description:
      "LightGBM decision trees trained with class weighting to handle imbalanced bust occurrences (~12.8% positive rate) and maximize detection recall.",
    tech: "LightGBM · Scale Pos Weight · GBDT",
  },
  {
    step: "08",
    title: "Held-Out Evaluation",
    source: "Unseen Test Run",
    icon: CheckCircle,
    description:
      "Strict evaluation on the 2019-09-01 forecast run (25,010 predictions) yielding 0.7816 ROC-AUC and 64.1% recall on unseen test conditions.",
    tech: "Zero Leakage · 2019090100 Test Matrix",
  },
]

export default function MethodologyPage() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Scientific Workflow"
          title="Methodology & Data Pipeline"
          description="The complete end-to-end scientific methodology transforming raw GEFS forecasts and NASA IMERG satellite observations into actionable grid-level bust probability estimates."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <Workflow className="size-3 mr-1.5 inline" />
                8-Stage Pipeline
              </Badge>
              <Badge variant="secondary" className="font-mono-tight">
                Problem Statement ID: 26079
              </Badge>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {/* Pipeline visual flow cards */}
        <div>
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Workflow className="size-4 text-primary" />
              End-to-End Pipeline: GEFS → IMERG → Error → Features → LightGBM → Bust Probability
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every stage preserves meteorological provenance without synthetic augmentation.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE_STAGES.map((stage, idx) => {
              const IconComp = stage.icon
              return (
                <Card key={stage.step} className="border-border relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-3 right-3 text-2xl font-black text-muted-foreground/15 font-mono-tight select-none">
                    {stage.step}
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="p-1.5 rounded-md bg-primary/10 text-primary">
                        <IconComp className="size-4" />
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 font-normal">
                        {stage.source}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-semibold">{stage.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                      {stage.description}
                    </p>
                    <div className="rounded bg-secondary/50 px-2 py-1 text-[11px] font-mono-tight text-foreground/80 border border-border/50">
                      {stage.tech}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Detailed Timeline & Mathematical Formulation */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Timeline and deep dive */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <GitCommit className="size-4 text-primary" />
                  Detailed Methodological Milestones
                </CardTitle>
                <CardDescription className="text-xs">
                  Sequential phases followed from raw netCDF/GRIB data acquisition to web dashboard deployment.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <MethodologyTimeline />
              </CardContent>
            </Card>

            {/* Mathematical Formulas Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="size-4 text-primary" />
                  Mathematical Formulations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <div className="font-semibold text-foreground mb-1">1. Absolute Grid Error</div>
                  <div className="rounded bg-secondary/40 p-2.5 font-mono-tight border border-border text-foreground">
                    e(lat, lon, t) = | R_GEFS(lat, lon, t) - R_IMERG(lat, lon, t) |
                  </div>
                  <p className="mt-1 text-muted-foreground text-[11px]">
                    Computed cell-by-cell across the 2,501 spatial coordinates for each lead day t ∈ [1, 10].
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-foreground mb-1">2. Binary Forecast Bust Definition</div>
                  <div className="rounded bg-secondary/40 p-2.5 font-mono-tight border border-border text-foreground">
                    Bust(lat, lon, t) = 1 &nbsp;if&nbsp; e(lat, lon, t) &ge; &tau;_90 &nbsp;(30.07262516766805 mm), &nbsp;else 0
                  </div>
                  <p className="mt-1 text-muted-foreground text-[11px]">
                    The threshold &tau;_90 was calibrated solely on the training runs to prevent test set data leakage.
                  </p>
                </div>

                <div>
                  <div className="font-semibold text-foreground mb-1">3. Spatial Gradient Feature</div>
                  <div className="rounded bg-secondary/40 p-2.5 font-mono-tight border border-border text-foreground">
                    &nabla;R(lat, lon) = &radic;[ (&part;R/&part;lat)&sup2; + (&part;R/&part;lon)&sup2; ] &nbsp;(mm/deg)
                  </div>
                  <p className="mt-1 text-muted-foreground text-[11px]">
                    Computed using central differences over 3×3 cell stencils, representing convective steepness.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar summary */}
          <div className="space-y-6">
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Dataset Provenance Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Forecast Model</span>
                  <span className="font-medium text-foreground">{MODEL_INFO.forecastSource}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Reference Truth</span>
                  <span className="font-medium text-foreground">{MODEL_INFO.referenceSource}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Domain</span>
                  <span className="font-medium text-foreground">{PROTOTYPE_DOMAIN.label}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Resolution</span>
                  <span className="font-medium text-foreground">0.25° × 0.25° (28 km approx.)</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Grid Dimensions</span>
                  <span className="font-medium text-foreground">41 Lat × 61 Lon = 2,501 cells</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Training Horizon</span>
                  <span className="font-medium text-foreground">3 runs (75,030 samples)</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-muted-foreground">Held-Out Test</span>
                  <span className="font-medium text-foreground">1 run (25,010 samples)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-primary/[0.03]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Prototype Scope &amp; Focus</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p>
                  This system is designed specifically as a <strong>post-processing decision support layer</strong> atop numerical weather prediction systems.
                </p>
                <p>
                  Rather than attempting to re-simulate fluid dynamics, it statistically flags spatial grid pockets where the NWP model has historically produced outsized rainfall discrepancies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
