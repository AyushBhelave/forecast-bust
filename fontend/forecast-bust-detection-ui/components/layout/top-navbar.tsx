"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MenuIcon } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StatusBadge } from "@/components/layout/status-badge"
import { ConnectionStatus } from "@/components/layout/connection-status"

const NAV_ITEMS = [
  { href: "/", label: "Overview" },
  { href: "/forecast-risk", label: "Forecast Risk" },
  { href: "/replay", label: "Historical Replay" },
  { href: "/bust-risk", label: "Bust Risk" },
  { href: "/verification", label: "Verification" },
  { href: "/model-insights", label: "Model Insights" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
]

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 shrink-0">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary ring-1 ring-primary/30 font-mono-tight">
        FB
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">Forecast Bust AI</span>
        <span className="hidden text-[10px] text-muted-foreground sm:block">SIH 2026 · Historical Replay</span>
      </span>
    </Link>
  )
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </>
  )
}

export function TopNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex">
            <NavLinks />
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 sm:flex">
            <StatusBadge label="Prototype" tone="info" dot={false} />
            <ConnectionStatus />
          </div>

          <Sheet>
            <SheetTrigger
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-left">
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                <NavLinks />
              </div>
              <div className="mt-4 flex flex-col gap-2 border-t border-border px-4 pt-4">
                <StatusBadge label="Prototype" tone="info" dot={false} className="w-fit" />
                <ConnectionStatus />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
