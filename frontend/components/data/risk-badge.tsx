import { cn } from "cn"
import type { RiskLevel } from "@/lib/config"

const STYLES: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low ring-1 ring-risk-low/30",
  medium: "bg-risk-medium/15 text-risk-medium ring-1 ring-risk-medium/30",
  high: "bg-risk-high/15 text-risk-high ring-1 ring-risk-high/30",
}

const LABELS: Record<RiskLevel, string> = { low: "Low", medium: "Medium", high: "High" }

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        STYLES[level],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {LABELS[level]}
    </span>
  )
}
