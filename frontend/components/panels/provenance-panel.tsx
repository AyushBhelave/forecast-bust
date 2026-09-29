import { MODEL_INFO, PROTOTYPE_DOMAIN } from "@/lib/config"

const ROWS = [
  { label: "Forecast source", value: MODEL_INFO.forecastSource },
  { label: "Reference source", value: MODEL_INFO.referenceSource },
  {
    label: "Prototype domain",
    value: `${PROTOTYPE_DOMAIN.latMin}–${PROTOTYPE_DOMAIN.latMax}°N, ${PROTOTYPE_DOMAIN.lonMin}–${PROTOTYPE_DOMAIN.lonMax}°E`,
  },
  { label: "Forecast horizon", value: MODEL_INFO.horizon },
  { label: "Model", value: MODEL_INFO.family },
  { label: "Prototype status", value: "Historical Replay Proof-of-Concept" },
]

export function ProvenancePanel() {
  return (
    <div className="glass-panel rounded-lg p-6">
      <h3 className="text-sm font-semibold text-foreground">Data Sources &amp; Provenance</h3>
      <dl className="mt-4 divide-y divide-border">
        {ROWS.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-medium text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
