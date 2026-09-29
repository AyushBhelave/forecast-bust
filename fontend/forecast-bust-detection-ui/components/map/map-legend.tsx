import type { MapLayer } from "@/components/map/forecast-map"

const LEGEND: Record<
  MapLayer,
  { title: string; gradient: string; low: string; high: string }
> = {
  bust: {
    title: "Bust Probability",
    gradient: "linear-gradient(90deg, #3f8f7a, #d9a441, #d9534f, #8f2e2b)",
    low: "0%",
    high: "100%",
  },
  confidence: {
    title: "Prototype Confidence",
    gradient: "linear-gradient(90deg, #1e2a3a, #356e8c, #6fc2e8)",
    low: "0%",
    high: "100%",
  },
  rainfall: {
    title: "Forecast Rainfall",
    gradient: "linear-gradient(90deg, #1c2433, #2b5f8a, #4fa8d8, #8b7fd6)",
    low: "0 mm",
    high: "140+ mm",
  },
  error: {
    title: "Absolute Error",
    gradient: "linear-gradient(90deg, #232a36, #d9a441, #d9534f, #7f1d1d)",
    low: "0 mm",
    high: "40+ mm",
  },
}

export function MapLegend({ layer }: { layer: MapLayer }) {
  const config = LEGEND[layer]
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{config.title}</span>
      <div className="h-2 w-full rounded-full" style={{ backgroundImage: config.gradient }} />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{config.low}</span>
        <span>{config.high}</span>
      </div>
    </div>
  )
}
