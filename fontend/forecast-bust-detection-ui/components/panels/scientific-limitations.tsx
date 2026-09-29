import { TriangleAlertIcon } from "lucide-react"

const LIMITATIONS = [
  {
    title: "Small historical sample",
    detail: "The model is trained and validated on four historical GEFS runs (three training, one held-out test). While sufficient for a proof-of-concept prototype, this is not a statistically exhaustive multi-decade sample.",
  },
  {
    title: "Prototype-only calibration status",
    detail: "Output probabilities are not calibrated. All confidence values are labeled \"Prototype Confidence,\" not calibrated probability.",
  },
  {
    title: "Linear interpolation regridding",
    detail: "IMERG reference rainfall was regridded onto the GEFS grid using linear interpolation, which can smooth localized rainfall extremes.",
  },
  {
    title: "Not an operational forecasting system",
    detail: "This is a historical replay proof-of-concept. It does not run in real time, is not integrated with IMD/NCMRWF, and issues no operational guidance.",
  },
  {
    title: "No causal interpretation",
    detail: "Feature importance reflects statistical association learned by the model, not a causal explanation of why forecasts fail.",
  },
  {
    title: "Future validation required",
    detail: "Broader validation across more seasons, years, and regions is required before any claim of general reliability.",
  },
]

export function ScientificLimitations() {
  return (
    <div className="rounded-lg border border-risk-medium/25 bg-risk-medium/[0.04] p-5">
      <div className="flex items-center gap-2">
        <TriangleAlertIcon className="size-4 text-risk-medium" />
        <h3 className="text-sm font-semibold text-foreground">Scientific Limitations</h3>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Presented transparently — these limitations define the boundaries of what this prototype can responsibly claim.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {LIMITATIONS.map((item) => (
          <div key={item.title} className="rounded-md border border-border bg-secondary/25 p-3">
            <p className="text-xs font-medium text-foreground">{item.title}</p>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
