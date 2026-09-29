"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { getMockGrid } from "@/lib/mock-data"

/**
 * Abstract prototype-region risk visualization for the landing hero.
 * Built from the same deterministic grid fixture used elsewhere in the app —
 * not a live feed, not a real-time weather product. Purely illustrative.
 */
export function HeroVisual() {
  const cells = useMemo(() => getMockGrid("2019-08-01", 4).filter((_, i) => i % 3 === 0), [])

  const lonMin = 75
  const lonMax = 90
  const latMin = 18
  const latMax = 28

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-secondary/20">
      <div className="absolute inset-0 grid-overlay opacity-40" />

      {/* horizon glow */}
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" preserveAspectRatio="none">
        {cells.map((cell, i) => {
          const x = ((cell.longitude - lonMin) / (lonMax - lonMin)) * 100
          const y = 100 - ((cell.latitude - latMin) / (latMax - latMin)) * 100
          const color =
            cell.riskLevel === "high"
              ? "var(--risk-high)"
              : cell.riskLevel === "medium"
                ? "var(--risk-medium)"
                : "var(--risk-low)"
          return (
            <motion.circle
              key={i}
              cx={x}
              cy={y}
              r={cell.riskLevel === "high" ? 1.6 : 1.1}
              fill={color}
              initial={{ opacity: 0.15 }}
              animate={{ opacity: [0.15, cell.riskLevel === "high" ? 0.9 : 0.5, 0.15] }}
              transition={{
                duration: 3 + (i % 5) * 0.4,
                repeat: Number.POSITIVE_INFINITY,
                delay: (i % 7) * 0.3,
                ease: "easeInOut",
              }}
            />
          )
        })}
      </svg>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-border/60 bg-background/70 px-4 py-2.5 backdrop-blur-sm">
        <span className="font-mono-tight text-[10px] uppercase tracking-wide text-muted-foreground">
          18–28°N · 75–90°E
        </span>
        <span className="flex items-center gap-1.5 font-mono-tight text-[10px] uppercase tracking-wide text-muted-foreground">
          <span className="size-1.5 rounded-full bg-risk-high" />
          Elevated bust risk
        </span>
      </div>
    </div>
  )
}
