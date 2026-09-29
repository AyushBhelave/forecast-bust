import type { ReactNode } from "react"
import { TopNavbar } from "@/components/layout/top-navbar"
import { SiteFooter } from "@/components/layout/site-footer"

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <TopNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
