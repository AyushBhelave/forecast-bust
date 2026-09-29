import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          Forecast Bust AI — a historical replay research prototype built for Smart India Hackathon 2026. Not an
          operational forecasting system.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/methodology" className="hover:text-foreground">
            Methodology
          </Link>
          <Link href="/about" className="hover:text-foreground">
            Data provenance
          </Link>
        </div>
      </div>
    </footer>
  )
}
