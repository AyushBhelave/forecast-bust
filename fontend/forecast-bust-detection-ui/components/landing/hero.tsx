import Link from "next/link"
import { ArrowRightIcon, MapIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/layout/status-badge"
import { HeroVisual } from "@/components/landing/hero-visual"

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label="Historical Replay Prototype" tone="info" />
            <span className="font-mono-tight text-xs text-muted-foreground">GEFS × IMERG × Machine Learning</span>
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              AI-Based Forecast Bust Detection
            </h1>
            <p className="text-lg font-medium text-foreground/90">
              Detecting high-risk forecast failures before verification.
            </p>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
              An AI-driven historical replay prototype for identifying unusually large rainfall forecast errors
              across a medium-range forecast horizon.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/replay">
                Explore Historical Replay
                <ArrowRightIcon data-icon="inline-end" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/bust-risk">
                <MapIcon data-icon="inline-start" />
                View AI Risk Map
              </Link>
            </Button>
          </div>

          <div className="mt-2 rounded-lg border border-border bg-secondary/25 p-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Why this matters — </span>
              Weather forecast errors can grow substantially as lead time increases. This system highlights
              locations and lead days where forecast uncertainty risk is unusually elevated, based on historical
              replay of past forecast runs. It does not guarantee improved forecasting outcomes.
            </p>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  )
}
