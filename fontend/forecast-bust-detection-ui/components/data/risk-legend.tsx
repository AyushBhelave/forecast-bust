import { RISK_BUCKETS } from "@/lib/config"

const GRADIENT = "linear-gradient(90deg, var(--risk-low), var(--risk-medium), var(--risk-high))"

export function RiskLegend({ title = "Bust Probability" }: { title?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
      <div className="h-2 w-full rounded-full" style={{ backgroundImage: GRADIENT }} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{RISK_BUCKETS.low.min}%</span>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
        <span>100%</span>
      </div>
    </div>
  )
}
