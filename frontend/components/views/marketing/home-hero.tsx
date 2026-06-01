"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { ArrowRight, BrainCircuit, FileText, ShieldCheck, Sparkles } from "lucide-react"
import gsap from "gsap"

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

const transcriptLines = [
  "Explain your resume project architecture.",
  "Show tradeoffs between frontend and backend logic.",
  "Score communication, depth, and role fit.",
]

export function HomeHero() {
  const rootRef = useRef<HTMLElement>(null)
  const scoreRef = useRef<HTMLSpanElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduceMotion) return

    const context = gsap.context(() => {
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" } })

      timeline
        .from("[data-hero-nav]", { y: -18, opacity: 0, duration: 0.6 })
        .from("[data-hero-line]", { scaleX: 0, transformOrigin: "left", duration: 0.75 }, "-=0.25")
        .from("[data-hero-kicker]", { y: 16, opacity: 0, duration: 0.55 }, "-=0.35")
        .from("[data-hero-title] span", { yPercent: 105, duration: 0.8, stagger: 0.09 }, "-=0.2")
        .from("[data-hero-copy]", { y: 18, opacity: 0, duration: 0.55 }, "-=0.35")
        .from("[data-hero-action]", { y: 16, opacity: 0, duration: 0.45, stagger: 0.08 }, "-=0.25")
        .from("[data-panel]", { x: 36, opacity: 0, duration: 0.75 }, "-=0.55")
        .from("[data-feature]", { x: 22, opacity: 0, duration: 0.45, stagger: 0.1 }, "-=0.35")

      gsap.fromTo(
        scoreRef.current,
        { textContent: 0 },
        {
          textContent: 82,
          duration: 1.4,
          ease: "power2.out",
          snap: { textContent: 1 },
          delay: 0.9,
        }
      )

      gsap.to("[data-scan-line]", {
        xPercent: 120,
        duration: 2.6,
        ease: "none",
        repeat: -1,
        repeatDelay: 0.35,
      })

      gsap.to("[data-transcript-track]", {
        yPercent: -50,
        duration: 9,
        ease: "none",
        repeat: -1,
      })
    }, root)

    const quickX = gsap.quickTo(spotlightRef.current, "x", { duration: 0.45, ease: "power3.out" })
    const quickY = gsap.quickTo(spotlightRef.current, "y", { duration: 0.45, ease: "power3.out" })

    const handlePointerMove = (event: PointerEvent) => {
      if (!spotlightRef.current) return
      quickX(event.clientX - 160)
      quickY(event.clientY - 160)
    }

    window.addEventListener("pointermove", handlePointerMove)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      context.revert()
    }
  }, [])

  return (
    <main ref={rootRef} className="relative h-dvh max-h-dvh overflow-hidden bg-background">
      <div
        ref={spotlightRef}
        className="pointer-events-none fixed left-0 top-0 z-0 hidden size-80 border border-border/60 opacity-50 mix-blend-multiply md:block"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:96px_96px] opacity-[0.18]"
        aria-hidden="true"
      />

      <header data-hero-nav className="relative z-10 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="size-5 text-foreground" />
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

      <section className="relative z-10 mx-auto grid h-[calc(100dvh-4rem)] max-w-7xl items-center gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:py-6">
        <div>
          <div data-hero-line className="mb-5 h-px w-full max-w-xl bg-foreground lg:mb-8" />
          <Badge data-hero-kicker className="mb-4 lg:mb-5">
            Portfolio-ready fullstack project
          </Badge>
          <h1
            data-hero-title
            className="max-w-3xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl md:text-6xl xl:text-7xl"
          >
            <span className="block overflow-hidden">
              <span className="block">Practice smarter</span>
            </span>
            <span className="block overflow-hidden">
              <span className="block">interviews from</span>
            </span>
            <span className="block overflow-hidden">
              <span className="block">your resume.</span>
            </span>
          </h1>
          <p data-hero-copy className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            A production-style AI interview assistant built with Next.js, Tailwind, shadcn/ui, Spring
            Boot contracts, PostgreSQL planning, and backend-owned OpenAI integration.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-8">
            <Button data-hero-action asChild size="lg">
              <Link href="/login">
                Try the mock app
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button data-hero-action asChild variant="outline" size="lg">
              <Link href="/dashboard">Open workspace</Link>
            </Button>
          </div>
        </div>

        <div data-panel className="relative hidden border-y border-border/80 py-4 lg:block xl:py-5">
          <div className="relative overflow-hidden border-b border-border pb-4 xl:pb-5">
            <div data-scan-line className="absolute left-[-45%] top-0 h-px w-1/2 bg-foreground/80" />
            <p className="text-sm text-muted-foreground">Current mock evaluation</p>
            <div className="mt-4 flex items-end gap-3">
              <span ref={scoreRef} className="text-6xl font-semibold tracking-normal xl:text-7xl">
                82
              </span>
              <span className="pb-3 text-sm text-muted-foreground">% overall score</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground xl:mt-5">
              Strong junior full-stack signal. Improve by making answers more evidence-driven and
              structured around project outcomes.
            </p>
          </div>

          <div className="grid border-b border-border/80 py-3 md:grid-cols-[130px_1fr] xl:py-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Transcript
            </p>
            <div className="h-16 overflow-hidden">
              <div data-transcript-track className="space-y-3">
                {[...transcriptLines, ...transcriptLines].map((line, index) => (
                  <p key={`${line}-${index}`} className="text-sm text-foreground">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 grid gap-0">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  data-feature
                  className="flex gap-3 border-b border-border/80 py-3 last:border-b-0 xl:py-4"
                >
                  <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
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
