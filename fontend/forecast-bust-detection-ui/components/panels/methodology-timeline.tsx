const STEPS = [
  { n: "01", title: "Data", detail: "GEFS retrospective forecast" },
  { n: "02", title: "Reference", detail: "IMERG precipitation reference" },
  { n: "03", title: "Matching", detail: "Forecast/reference spatial and temporal matching" },
  { n: "04", title: "Error", detail: "Absolute rainfall error" },
  { n: "05", title: "Bust Definition", detail: "Training-derived high-error threshold" },
  { n: "06", title: "Features", detail: "Rainfall + temporal + spatial + lead-time features" },
  { n: "07", title: "Model", detail: "LightGBM classifier" },
  { n: "08", title: "Evaluation", detail: "Held-out historical forecast run" },
  { n: "09", title: "Visualization", detail: "Grid-level risk map and historical replay" },
]

export function MethodologyTimeline() {
  return (
    <ol className="relative flex flex-col gap-0">
      {STEPS.map((step, i) => (
        <li key={step.n} className="relative flex gap-5 pb-8 last:pb-0">
          {i < STEPS.length - 1 && (
            <span className="absolute left-[19px] top-10 h-full w-px bg-border" aria-hidden />
          )}
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono-tight text-xs font-semibold text-primary">
            {step.n}
          </span>
          <div className="pt-1.5">
            <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
