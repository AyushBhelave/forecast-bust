import { HISTORICAL_RUNS } from "@/lib/config"

export function VerificationPanel() {
  const training = HISTORICAL_RUNS.filter((r) => r.role === "training")
  const test = HISTORICAL_RUNS.find((r) => r.role === "held-out-test")

  return (
    <div className="glass-panel rounded-lg p-6">
      <h3 className="text-sm font-semibold text-foreground">Training &amp; Held-Out Evaluation</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        The held-out run was excluded entirely from training so validation reflects unseen forecast conditions.
      </p>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-lg border border-border bg-secondary/30 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Training Runs</p>
          <div className="mt-2 flex flex-col gap-1.5">
            {training.map((r) => (
              <div key={r.date} className="font-mono-tight text-sm text-foreground">
                {r.runId}
                <span className="ml-2 text-xs text-muted-foreground">({r.date})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 px-2 text-muted-foreground sm:rotate-0">
          <span className="hidden text-2xl sm:block">→</span>
          <span className="text-2xl sm:hidden">↓</span>
          <span className="text-[10px] uppercase tracking-wide">LightGBM</span>
        </div>

        <div className="flex-1 rounded-lg border border-primary/30 bg-primary/[0.06] p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-primary">Held-Out Test Run</p>
          <div className="mt-2 font-mono-tight text-sm text-foreground">
            {test?.runId}
            <span className="ml-2 text-xs text-muted-foreground">({test?.date})</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-secondary/20 p-4">
        <p className="text-xs font-semibold text-foreground">Why held-out testing?</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          The final historical run ({test?.date ?? "2019-09-01"}) was kept completely separate from model training to evaluate performance on
          unseen atmospheric conditions. All validation metrics reported on this platform are computed on this
          held-out run only — never on data the model was trained with, preventing data leakage.
        </p>
      </div>
    </div>
  )
}
