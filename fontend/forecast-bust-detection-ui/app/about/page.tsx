"use client"

import {
  FileText,
  Server,
  Cloud,
  ShieldCheck,
  AlertTriangle,
  Globe2,
  CheckCircle2,
  Layers,
  Terminal,
} from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { ProvenancePanel } from "@/components/panels/provenance-panel"
import { ScientificLimitations } from "@/components/panels/scientific-limitations"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PROTOTYPE_DOMAIN, MODEL_INFO, HISTORICAL_RUNS } from "@/lib/config"

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="System Overview"
          title="About the Forecast Bust Prototype"
          description="Proof-of-concept AI decision-support platform designed for Smart India Hackathon (SIH) Problem Statement ID: 26079 (Ministry of Earth Sciences / NCMRWF / IMD)."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="size-3 mr-1.5 inline" />
                SIH Problem Statement: 26079
              </Badge>
              <Badge variant="secondary" className="font-mono-tight">
                v1.0.0-prototype
              </Badge>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {/* Project Context & Mission */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe2 className="size-4 text-primary" />
                Problem Statement ID: 26079
              </CardTitle>
              <CardDescription className="text-xs">
                AI-Based Forecast Bust Detection for Medium-Range Weather Forecasts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                Numerical Weather Prediction (NWP) models operated by national meteorological agencies (such as NCMRWF and IMD) provide indispensable guidance across India. However, during active monsoon conditions, localized forecasts occasionally suffer from severe errors—termed <strong className="text-foreground">&quot;forecast busts&quot;</strong>—where predicted rainfall diverges drastically from ground observations.
              </p>
              <p>
                This prototype demonstrates how secondary machine learning classifiers (trained on historical forecast errors and physical atmospheric predictors) can identify when and where an upcoming forecast is at elevated risk of busting.
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-600" />
                Key Capabilities Demonstrated
              </CardTitle>
              <CardDescription className="text-xs">
                Verified functionality in this interactive prototype
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong className="text-foreground">Historical Replay:</strong> Step-by-step spatial exploration across Day 1–10 horizons for 4 real monsoon runs.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong className="text-foreground">Grid-Level Bust Probability:</strong> 0.25° resolution risk surface indicating probability of error &ge; 30.07262516766805 mm (30.07 mm).</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong className="text-foreground">Transparent Confidence:</strong> Clear distinction between raw model confidence and operational certainty.</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span><strong className="text-foreground">Live Inference Backend:</strong> FastAPI backend delivering real-time LightGBM inference and CSV querying.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Provenance Panel */}
        <ProvenancePanel />

        {/* Full-Stack Technical Architecture */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              Full-Stack Architecture
            </CardTitle>
            <CardDescription className="text-xs">
              Component hierarchy and data integration flow
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2 text-xs">
            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Server className="size-4 text-primary" />
                FastAPI Backend (Port 8000)
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• <strong>Framework:</strong> Python 3.14 + FastAPI (high performance asynchronous REST).</li>
                <li>• <strong>Model Serving:</strong> Pre-loads <code className="text-foreground bg-secondary px-1 py-0.5 rounded">final_lightgbm_model.pkl</code> into memory at startup.</li>
                <li>• <strong>Dataset Queries:</strong> In-memory pandas indexing of Kaggle test matrix (25,010 rows).</li>
                <li>• <strong>Endpoints:</strong> <code className="text-foreground">/health</code>, <code className="text-foreground">/metadata</code>, <code className="text-foreground">/summary</code>, <code className="text-foreground">/grid</code>, <code className="text-foreground">/cell</code>, <code className="text-foreground">/feature-importance</code>, <code className="text-foreground">/shap-importance</code>, <code className="text-foreground">/predict</code>.</li>
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Terminal className="size-4 text-primary" />
                Next.js Frontend (Port 3000)
              </div>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>• <strong>Framework:</strong> Next.js 16 (App Router) + TypeScript + React 19.</li>
                <li>• <strong>Styling:</strong> Tailwind CSS with custom scientific sky-blue weather theme tokens.</li>
                <li>• <strong>Data Layer:</strong> Stale-While-Revalidate (SWR) fetching with automatic caching.</li>
                <li>• <strong>Visuals:</strong> Interactive HTML5 Canvas Mercator spatial grid, D3-Geo projections, Recharts bar charts, and Shadcn UI components.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Scientific Limitations Panel */}
        <ScientificLimitations />

        {/* Operational Deployment Roadmap */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="size-4 text-primary" />
              Requirements for Operational Production Deployment
            </CardTitle>
            <CardDescription className="text-xs">
              Steps necessary to transition from this proof-of-concept into an operational IMD / NCMRWF forecasting pipeline
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-lg border border-border bg-secondary/20 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground">1. Operational NWP Ingestion</div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Direct automated ingestion of 00Z / 12Z operational GFS and NCUM runs from NCMRWF High Performance Computing (HPC) clusters via real-time message brokers.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground">2. Multi-Decadal Calibration</div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Training across 10+ years of monsoon seasons with Isotonic Regression or Platt scaling to calibrate raw tree probabilities into true statistical likelihoods.
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/20 p-3.5 space-y-1.5">
              <div className="font-semibold text-foreground">3. Radar &amp; Gauge Integration</div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Incorporating real-time Doppler Weather Radar (DWR) composites and dense automatic weather station (AWS) surface telemetry alongside satellite precipitation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
