"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

interface MetricCardProps {
  label: string
  value: number
  suffix?: string
  decimals?: number
  description?: string
  icon?: LucideIcon
  tone?: "default" | "low" | "medium" | "high"
  className?: string
}

const toneText: Record<Required<MetricCardProps>["tone"], string> = {
  default: "text-foreground",
  low: "text-risk-low",
  medium: "text-risk-medium",
  high: "text-risk-high",
}

/** Animates a numeric value on mount/update for a subtle, non-distracting count transition. */
function useCountUp(target: number, decimals: number) {
  const [value, setValue] = useState(target)
  const prevTarget = useRef(target)

  useEffect(() => {
    if (prevTarget.current === target) return
    const from = prevTarget.current
    const to = target
    prevTarget.current = target
    const duration = 500
    const start = performance.now()

    let raf: number
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setValue(from + (to - from) * eased)
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return Number(value.toFixed(decimals))
}

export function MetricCard({
  label,
  value,
  suffix = "",
  decimals = 1,
  description,
  icon: Icon,
  tone = "default",
  className,
}: MetricCardProps) {
  const animated = useCountUp(value, decimals)

  return (
    <div className={cn("glass-panel rounded-lg p-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {Icon && <Icon className="size-3.5 text-muted-foreground" />}
      </div>
      <div className={cn("mt-2 font-mono-tight text-2xl font-semibold tabular-nums", toneText[tone])}>
        {animated}
        {suffix}
      </div>
      {description && <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{description}</p>}
    </div>
  )
}
