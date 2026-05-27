import Link from "next/link"
import { ArrowRight, BrainCircuit, FileText, ShieldCheck, Sparkles } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: FileText,
    title: "Resume-based practice",
    description: "Upload a PDF and generate interview questions from the candidate profile.",
  },
  {
    icon: BrainCircuit,
    title: "AI-ready evaluation",
    description: "Mock scoring now, backend-owned OpenAI evaluation in the Spring Boot phase.",
  },
  {
    icon: ShieldCheck,
    title: "Production-style contracts",
    description: "Typed service boundaries mirror authentication, resume, interview, and result APIs.",
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f7f3]">
      <header className="border-b border-border bg-background/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" />
            </span>
            AI Interview Assistant
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Start demo</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Badge className="mb-5 bg-emerald-50 text-emerald-800">Portfolio-ready fullstack project</Badge>
          <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal md:text-6xl">
            Practice smarter interviews from your own resume.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            A production-style AI interview assistant built with Next.js, Tailwind, shadcn/ui, Spring
            Boot contracts, PostgreSQL planning, and backend-owned OpenAI integration.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">
                Try the mock app
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-background p-5 shadow-xs">
          <div className="rounded-lg bg-[#12231d] p-5 text-white">
            <p className="text-sm text-white/70">Current mock evaluation</p>
            <div className="mt-4 flex items-end gap-3">
              <span className="text-6xl font-semibold tracking-normal">82%</span>
              <span className="pb-2 text-sm text-white/70">overall score</span>
            </div>
            <p className="mt-5 text-sm leading-6 text-white/75">
              Strong junior full-stack signal. Improve by making answers more evidence-driven and
              structured around project outcomes.
            </p>
          </div>
          <div className="mt-4 grid gap-3">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div key={feature.title} className="flex gap-3 rounded-lg border border-border p-4">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-800">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <h2 className="font-medium">{feature.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
