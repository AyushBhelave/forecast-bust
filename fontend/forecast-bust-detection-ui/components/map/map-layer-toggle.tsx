"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { MapLayer } from "@/components/map/forecast-map"

const OPTIONS: { value: MapLayer; label: string }[] = [
  { value: "bust", label: "Bust Probability" },
  { value: "rainfall", label: "Forecast Rainfall" },
  { value: "confidence", label: "Prototype Confidence" },
  { value: "error", label: "Absolute Error" },
]

export function MapLayerToggle({ value, onChange }: { value: MapLayer; onChange: (v: MapLayer) => void }) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as MapLayer)}
      className="flex-wrap justify-start"
    >
      {OPTIONS.map((opt) => (
        <ToggleGroupItem key={opt.value} value={opt.value} className="text-xs">
          {opt.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
