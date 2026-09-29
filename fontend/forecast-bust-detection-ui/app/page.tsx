import { Hero } from "@/components/landing/hero"
import { ProblemSolution } from "@/components/landing/problem-solution"
import { Capabilities } from "@/components/landing/capabilities"
import { ProofStrip } from "@/components/landing/proof-strip"
import { CtaSection } from "@/components/landing/cta-section"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <ProblemSolution />
      <Capabilities />
      <ProofStrip />
      <CtaSection />
    </div>
  )
}
