"use client"

import useSWR from "swr"
import { RadioIcon, DatabaseIcon, LoaderIcon } from "lucide-react"
import { cn } from "cn"
import { getHealth } from "@/lib/api"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * Reflects the ACTUAL frontend/backend connection state — never faked.
 * In mock mode it always reports "Demo Data Mode". In live mode it pings
 * the configured FastAPI backend's /health route and reports the real result.
 */
export function ConnectionStatus() {
  const { data, isLoading } = useSWR("health", getHealth, {
    refreshInterval: 30_000,
    revalidateOnFocus: false,
  })

  if (isLoading || !data) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <LoaderIcon className="size-3 animate-spin" />
        Checking backend…
      </span>
    )
  }

  const isDemo = data.mode === "mock"
  const isLive = data.mode === "live" && data.backendReachable

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
            isDemo && "border-border text-muted-foreground",
            isLive && "border-risk-low/30 bg-risk-low/10 text-risk-low",
            !isDemo && !isLive && "border-risk-high/30 bg-risk-high/10 text-risk-high",
          )}
        >
          {isDemo ? (
            <DatabaseIcon data-icon="inline-start" className="size-3" />
          ) : (
            <RadioIcon data-icon="inline-start" className="size-3" />
          )}
          {isDemo ? "Demo Data Mode" : isLive ? "API Connected" : "Backend Unreachable"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">
        {isDemo
          ? "NEXT_PUBLIC_USE_MOCK_DATA is enabled. The UI renders deterministic local fixtures, not live model output."
          : isLive
            ? "Connected to the configured FastAPI backend."
            : `Could not reach the backend. ${data.message ?? ""}`}
      </TooltipContent>
    </Tooltip>
  )
}
