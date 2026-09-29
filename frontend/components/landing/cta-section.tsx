import Link from "next/link"
import { PlayIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CtaSection() {
  return (
    <section>
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="glass-panel flex flex-col items-center gap-5 rounded-xl px-8 py-14 text-center">
          <span className="font-mono-tight text-[11px] uppercase tracking-wide text-muted-foreground">
            Day 1 – Day 10 · Central &amp; Eastern India Prototype Region
          </span>
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Start the historical replay to see bust-risk detection in action.
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Step through past forecast runs, inspect grid-level bust probability, and compare forecast rainfall
            against IMERG reference — all grounded in a held-out historical evaluation.
          </p>
          <Button asChild size="lg" className="mt-2">
            <Link href="/replay">
              <PlayIcon data-icon="inline-start" />
              Start Historical Replay
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
