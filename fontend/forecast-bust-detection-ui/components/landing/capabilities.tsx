import { RadarIcon, MapPinnedIcon, HistoryIcon, GitCompareArrowsIcon, BrainCircuitIcon, GaugeIcon } from "lucide-react"

const CAPABILITIES = [
  {
    icon: RadarIcon,
    title: "Medium-range forecast monitoring",
    detail: "Tracks GEFS retrospective rainfall forecasts across the Day 1–10 horizon for the prototype domain.",
  },
  {
    icon: MapPinnedIcon,
    title: "Spatial bust-risk detection",
    detail: "Estimates bust probability at each 0.25° grid cell across the central/eastern India prototype region.",
  },
  {
    icon: HistoryIcon,
    title: "Day 1–10 historical replay",
    detail: "Replays past forecast runs lead day by lead day to inspect how risk patterns evolve historically.",
  },
  {
    icon: GitCompareArrowsIcon,
    title: "Forecast vs reference verification",
    detail: "Compares forecast rainfall against IMERG reference rainfall to quantify absolute error.",
  },
  {
    icon: BrainCircuitIcon,
    title: "Model explainability",
    detail: "Surfaces global feature importance so the model's learned signals are inspectable, not opaque.",
  },
  {
    icon: GaugeIcon,
    title: "Validation metrics",
    detail: "Reports ROC-AUC, PR-AUC, Brier score, precision, recall and F1 on a held-out historical run.",
  },
]

export function Capabilities() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="max-w-2xl">
          <span className="text-[11px] font-medium uppercase tracking-wide text-primary">Key Capabilities</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            What the prototype actually does
          </h2>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="glass-panel rounded-lg p-5 transition-colors hover:border-primary/30"
            >
              <cap.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{cap.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cap.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
