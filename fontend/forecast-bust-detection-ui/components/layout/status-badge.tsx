import { cn } from "cn"

interface StatusBadgeProps {
  label: string
  tone?: "neutral" | "info" | "success" | "warning"
  dot?: boolean
  className?: string
}

const toneClasses: Record<Required<StatusBadgeProps>["tone"], string> = {
  neutral: "border-border text-muted-foreground",
  info: "border-primary/30 text-primary bg-primary/10",
  success: "border-risk-low/30 text-risk-low bg-risk-low/10",
  warning: "border-risk-medium/30 text-risk-medium bg-risk-medium/10",
}

const dotClasses: Record<Required<StatusBadgeProps>["tone"], string> = {
  neutral: "bg-muted-foreground",
  info: "bg-primary",
  success: "bg-risk-low",
  warning: "bg-risk-medium",
}

export function StatusBadge({ label, tone = "neutral", dot = true, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dotClasses[tone])} aria-hidden />}
      {label}
    </span>
  )
}
