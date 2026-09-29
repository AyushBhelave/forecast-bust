"use client"

import { motion } from "framer-motion"
import { CloudRainIcon, CheckCheckIcon, TriangleAlertIcon, ShieldAlertIcon, ArrowRightIcon } from "lucide-react"

const FLOW = [
  { icon: CloudRainIcon, label: "Forecast" },
  { icon: CheckCheckIcon, label: "Verification" },
  { icon: TriangleAlertIcon, label: "Error" },
  { icon: ShieldAlertIcon, label: "Bust Detection" },
]

const STEPS = [
  { n: "1", title: "Forecast", detail: "A medium-range GEFS rainfall forecast is issued for a lead day." },
  { n: "2", title: "Historical verification", detail: "Past forecasts are compared against IMERG rainfall to measure actual error." },
  { n: "3", title: "AI learning", detail: "A Random Forest model learns patterns associated with unusually large errors." },
  { n: "4", title: "Bust-risk prediction", detail: "The model estimates bust probability before verification data exists." },
]

export function ProblemSolution() {
  return (
    <section className="border-b border-border bg-secondary/[0.15]">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-risk-medium">The Problem</span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Not every forecast error is equally important.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Some forecasts miss by a small margin. Others miss badly enough to matter — for planning, response,
              and downstream decisions. Today, that difference is only visible after verification, once it&apos;s
              too late to act on it.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background/60 p-4">
              {FLOW.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2">
                    <step.icon className="size-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                  </div>
                  {i < FLOW.length - 1 && <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-primary">The Solution</span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Predict the probability of an unusually large forecast error before verification.
            </h2>

            <ol className="relative mt-2 flex flex-col gap-0">
              {STEPS.map((step, i) => (
                <li key={step.n} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && (
                    <motion.span
                      className="absolute left-[15px] top-8 w-px bg-gradient-to-b from-primary/50 to-transparent"
                      initial={{ height: 0 }}
                      whileInView={{ height: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.15 }}
                    />
                  )}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono-tight text-xs font-semibold text-primary">
                    {step.n}
                  </span>
                  <div className="pt-1">
                    <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
