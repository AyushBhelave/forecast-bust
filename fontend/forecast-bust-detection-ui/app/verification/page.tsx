"use client"

import useSWR from "swr"
import { ShieldCheck, BarChart3, CheckCircle2, AlertTriangle, Layers, Award } from "lucide-react"
import { PageHeader } from "@/components/layout/page-header"
import { MetricCard } from "@/components/data/metric-card"
import { VerificationPanel } from "@/components/panels/verification-panel"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMetadata, getModelComparison } from "@/lib/api"
import { VALIDATION_METRICS, MODEL_INFO } from "@/lib/config"

export default function VerificationPage() {
  const { data: metadata, isLoading: metaLoading } = useSWR("/metadata", getMetadata)
  const { data: comparison, isLoading: compLoading } = useSWR("/model-comparison", getModelComparison)

  const metrics = metadata?.metrics ?? {
    roc_auc: VALIDATION_METRICS.rocAuc,
    pr_auc: VALIDATION_METRICS.prAuc,
    brier_score: VALIDATION_METRICS.brierScore,
    precision: VALIDATION_METRICS.precision,
    recall: VALIDATION_METRICS.recall,
    f1: VALIDATION_METRICS.f1,
  }

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-8">
        <PageHeader
          eyebrow="Held-Out Evaluation"
          title="Model Verification & Benchmark Metrics"
          description="Evaluation of the LightGBM forecast bust detection classifier on the strictly held-out historical forecast run (2019-09-01). All metrics shown reflect unseen test conditions with zero training data leakage."
          actions={
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                <CheckCircle2 className="size-3 mr-1.5 inline" />
                Zero Data Leakage
              </Badge>
              <Badge variant="secondary" className="font-mono-tight">
                Run: {MODEL_INFO.testRun}
              </Badge>
            </div>
          }
        />
      </div>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8">
        {/* Core Metric Cards */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Held-Out Test Metrics ({MODEL_INFO.name})
            </h2>
            <span className="text-xs text-muted-foreground font-mono-tight">
              Evaluated on 25,010 grid points (Day 1–10)
            </span>
          </div>

          {metaLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <MetricCard
                label="ROC-AUC"
                value={metrics.roc_auc}
                decimals={4}
                description="Discrimination capability (0.50 = random)"
                tone="low"
              />
              <MetricCard
                label="PR-AUC"
                value={metrics.pr_auc}
                decimals={4}
                description="Precision-Recall curve for rare events"
              />
              <MetricCard
                label="Recall"
                value={metrics.recall * 100}
                suffix="%"
                decimals={1}
                description="64.1% of true busts caught"
                tone="low"
              />
              <MetricCard
                label="Precision"
                value={metrics.precision * 100}
                suffix="%"
                decimals={1}
                description="Operational sensitivity trade-off"
              />
              <MetricCard
                label="F1 Score"
                value={metrics.f1}
                decimals={2}
                description="Harmonic mean of precision & recall"
              />
              <MetricCard
                label="Brier Score"
                value={metrics.brier_score}
                decimals={4}
                description="Probability error (0 = perfect)"
              />
            </div>
          )}
        </div>

        {/* Model Comparison Table */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  Candidate Model Comparison
                </CardTitle>
                <CardDescription className="text-xs">
                  Comparative performance on the 2019-09-01 held-out test dataset across 10 lead days.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit text-[11px] bg-secondary/50">
                Source: data/model_comparison.csv
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {compLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader className="bg-secondary/40">
                    <TableRow>
                      <TableHead className="font-semibold text-foreground">Model Architecture</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">ROC-AUC</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">PR-AUC</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Brier Score</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Recall</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Precision</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">F1 Score</TableHead>
                      <TableHead className="text-center font-semibold text-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(comparison ?? [
                      {
                        Model: "LightGBM",
                        "ROC-AUC": 0.7816,
                        "PR-AUC": 0.3271,
                        "Brier Score": 0.1534,
                        Recall: 0.6409,
                        Precision: 0.2133,
                        F1: 0.3200,
                      },
                      {
                        Model: "XGBoost",
                        "ROC-AUC": 0.7671,
                        "PR-AUC": 0.3149,
                        "Brier Score": 0.1223,
                        Recall: 0.5062,
                        Precision: 0.2418,
                        F1: 0.3273,
                      },
                    ]).map((row) => {
                      const isSelected = row.Model === "LightGBM"
                      return (
                        <TableRow
                          key={row.Model}
                          className={isSelected ? "bg-primary/[0.04] font-medium" : ""}
                        >
                          <TableCell className="font-semibold flex items-center gap-2">
                            {isSelected && <Award className="size-4 text-primary" />}
                            {row.Model}
                          </TableCell>
                          <TableCell className="text-right font-mono-tight">
                            {Number(row["ROC-AUC"]).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono-tight">
                            {Number(row["PR-AUC"]).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono-tight">
                            {Number(row["Brier Score"]).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono-tight font-semibold text-primary">
                            {(Number(row["Recall"]) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono-tight">
                            {(Number(row["Precision"]) * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right font-mono-tight">
                            {Number(row["F1"]).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-center">
                            {isSelected ? (
                              <Badge className="bg-primary text-primary-foreground text-[10px]">
                                Selected Model
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                Benchmark
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 rounded-lg bg-secondary/30 p-3.5 border border-border text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Why LightGBM was selected:</strong> In weather forecast bust detection, missing a major forecast failure has high real-world consequences for disaster mitigation and water management. LightGBM delivers a substantially higher <strong>Recall of 64.1%</strong> compared to XGBoost&apos;s 50.6% (+13.5% absolute capture rate of true bust events) while also achieving superior <strong>ROC-AUC (0.7816)</strong> and <strong>PR-AUC (0.3271)</strong> on imbalanced data.
            </div>
          </CardContent>
        </Card>

        {/* Verification Split Panel */}
        <VerificationPanel />

        {/* Technical Definition & Calibration Details */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Forecast Bust Definition & Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                A <strong className="text-foreground">forecast bust</strong> is formally defined when the absolute difference between GEFS forecast rainfall and IMERG satellite rainfall reference exceeds the <strong>90th percentile of historical errors</strong> in the training corpus:
              </p>
              <div className="rounded-md border border-border bg-secondary/40 p-3 font-mono-tight text-xs text-foreground">
                Bust = 1 &nbsp;if&nbsp; |GEFS - IMERG| &ge; 30.07262516766805 mm (30.07 mm), &nbsp;else 0
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Class Balance:</strong> Approximately 12.8% of grid cells across the monsoon dataset qualify as forecast busts.</li>
                <li><strong>Probability Mapping:</strong> The model generates continuous probability scores between 0% and 100%, segmented into Low (&lt;30%), Medium (30–60%), and High (&ge;60%) risk tiers.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Calibration & Scientific Integrity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                In alignment with scientific integrity guidelines:
              </p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>
                  <strong className="text-foreground">Raw Tree Probabilities:</strong> Model outputs are uncalibrated decision tree leaf posteriors. They are explicitly labeled as <span className="font-semibold text-foreground">&quot;Prototype Confidence&quot;</span> in the dashboard rather than true frequentist probabilities.
                </li>
                <li>
                  <strong className="text-foreground">Non-Monotonic Curves:</strong> Confidence is not artificially forced into a monotonically decreasing curve over lead days. Lead day 7 or 8 can legitimately demonstrate lower bust probability than lead day 4 if large-scale synoptic regimes stabilize.
                </li>
                <li>
                  <strong className="text-foreground">No Synthetic Data:</strong> All metrics presented here originate directly from Kaggle model artifacts and the test run matrix.
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
