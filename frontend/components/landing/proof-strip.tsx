import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { VALIDATION_METRICS, HISTORICAL_RUNS } from "@/lib/config"

const STATS = [
  { label: "ROC-AUC", value: VALIDATION_METRICS.rocAuc.toFixed(4) },
  { label: "PR-AUC", value: VALIDATION_METRICS.prAuc.toFixed(4) },
  { label: "Brier Score", value: VALIDATION_METRICS.brierScore.toFixed(4) },
  { label: "F1 Score", value: VALIDATION_METRICS.f1.toFixed(4) },
]

export function ProofStrip() {
  const testRun = HISTORICAL_RUNS.find((r) => r.role === "held-out-test")

  return (
    <section className="border-b border-border bg-secondary/[0.15]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Validated on held-out run {testRun?.date}
            </span>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              This is backed by real held-out evaluation, not a mock UI.
            </h2>
            <Button asChild variant="link" className="h-auto self-start px-0 text-primary">
              <Link href="/verification">
                See full verification report
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-background/60 px-4 py-3 text-center">
                <div className="font-mono-tight text-xl font-semibold text-foreground">{stat.value}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
