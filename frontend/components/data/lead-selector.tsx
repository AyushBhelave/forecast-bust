"use client"

import { cn } from "cn"
import { LEAD_DAYS } from "@/lib/config"

export function LeadSelector({ value, onChange }: { value: number; onChange: (day: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Forecast Lead Day
      </span>
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-border bg-secondary/30 p-1">
        {LEAD_DAYS.map((day) => {
          const active = day === value
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(day)}
              aria-pressed={active}
              className={cn(
                "flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md px-2 text-xs font-medium tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
