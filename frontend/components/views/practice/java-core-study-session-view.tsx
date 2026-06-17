"use client"

import Link from "next/link"
import { ArrowLeft, Brain, CheckCircle2, Eye, RotateCcw, Shuffle, XCircle } from "lucide-react"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { createLearnSession, createReviewDueSession, submitFlashcardResult } from "@/services/practice-service"
import type { FlashcardStudyFilters, PracticeQuestion, PracticeSession } from "@/types"
import { MetricStrip, Panel, Pill, QuestionMeta, SessionTopBar } from "./session-ui"

type StudySessionMode = "LEARN" | "REVIEW_DUE"

type CardResult = {
  question: PracticeQuestion
  remembered: boolean
}

export function JavaCoreStudySessionView({
  mode,
  courseSlug = "java-fullstack-flashcard-bank",
  deckSlug,
  backHref = "/courses/java-core",
  backLabel = "Java Full-stack",
  initialSession,
}: {
  mode: StudySessionMode
  courseSlug?: string
  deckSlug?: string
  backHref?: string
  backLabel?: string
  initialSession?: PracticeSession
}) {
  const [session, setSession] = useState<PracticeSession | null>(initialSession ?? null)
  const [revealed, setRevealed] = useState(false)
  const [results, setResults] = useState<CardResult[]>([])
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState("")
  const cardStageRef = useRef<HTMLDivElement | null>(null)
  const cardMotionRef = useRef<HTMLDivElement | null>(null)
  const answerBadgeRef = useRef<HTMLDivElement | null>(null)
  const completionBadgeRef = useRef<HTMLDivElement | null>(null)
  const fireworksRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (initialSession) return

    let active = true
    const filters: FlashcardStudyFilters = {}
    const topic = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("topic")
    if (topic) filters.topic = topic
    if (deckSlug) filters.deckSlug = deckSlug

    const create = mode === "REVIEW_DUE" ? createReviewDueSession : createLearnSession
    create(courseSlug, filters)
      .then((nextSession) => {
        if (!active) return
        setSession(nextSession)
        setRevealed(false)
      })
      .catch(() => {
        if (active) setError("Không thể bắt đầu phiên học.")
      })

    return () => {
      active = false
    }
  }, [courseSlug, deckSlug, initialSession, mode])

  const title = mode === "REVIEW_DUE" ? "Ôn bằng flashcard" : "Học flashcard"
  const question = session?.nextQuestion ?? null
  const totalQuestions = session?.questionCount ?? session?.questions?.length ?? 0
  const answeredCount = session?.attempts.length ?? 0
  const visibleProgress = Math.min(100, (answeredCount / Math.max(1, totalQuestions)) * 100)

  const handleResult = async (remembered: boolean) => {
    if (!session || !question || submitting) return

    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitFlashcardResult(session, question.id, remembered)
      const nextResults = [...results, { question, remembered }]
      const hasNextQuestion = Boolean(nextSession.nextQuestion)
      setResults(nextResults)
      await playAnswerAnimation(remembered, hasNextQuestion)
      if (!hasNextQuestion) {
        setCompleting(true)
        await playCompletionAnimation()
        setCompleting(false)
      }
      setSession(nextSession)
      setRevealed(false)
      if (hasNextQuestion) {
        await waitForNextPaint()
        await playQuestionIntroAnimation(remembered)
      }
    } catch {
      setError("Không thể lưu tiến trình thẻ này.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartShuffledSession = async () => {
    if (!session || submitting) return

    setSubmitting(true)
    setError("")
    try {
      const nextSession = await createLearnSession(courseSlug, {
        ...session.filters,
        deckSlug: deckSlug ?? session.deckSlug ?? session.filters?.deckSlug,
        questionLimit: session.questionLimit ?? undefined,
        shuffle: true,
      })
      setSession(nextSession)
      setResults([])
      setRevealed(false)
      setFinished(false)
    } catch {
      setError("Không thể tạo lượt học xáo trộn.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = () => {
    setFinished(true)
  }

  const playAnswerAnimation = (remembered: boolean, hasNextQuestion: boolean) => {
    const cardMotion = cardMotionRef.current
    const badge = answerBadgeRef.current
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!cardMotion || !badge || reduceMotion) return Promise.resolve()

    const direction = remembered ? 1 : -1
    badge.textContent = remembered ? "Đã thuộc" : "Cần học lại"
    badge.style.backgroundColor = remembered ? "#bbf7d0" : "#fee2e2"
    badge.style.color = remembered ? "#12351d" : "#991b1b"

    return new Promise<void>((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .set(badge, { display: "block", autoAlpha: 0, scale: 0.72, x: direction * 26, y: 16 })
        .to(badge, { autoAlpha: 1, scale: 1, x: 0, y: 0, duration: 0.22, ease: "back.out(2.4)" })
        .to(cardMotion, { x: direction * 58, rotateZ: direction * 1.6, scale: 0.985, duration: 0.26, ease: "power2.out" }, "-=0.14")
        .to(cardMotion, {
          x: hasNextQuestion ? direction * 118 : 0,
          rotateZ: hasNextQuestion ? direction * 3.5 : 0,
          scale: hasNextQuestion ? 0.965 : 1.012,
          autoAlpha: hasNextQuestion ? 0 : 1,
          duration: 0.28,
          ease: hasNextQuestion ? "power2.in" : "back.out(2)",
        })
        .to(badge, { autoAlpha: 0, y: -18, scale: 0.92, duration: 0.18, ease: "power2.in" }, "-=0.16")
        .set(badge, { clearProps: "all" })
    })
  }

  const playQuestionIntroAnimation = (previousRemembered: boolean) => {
    const cardMotion = cardMotionRef.current
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!cardMotion || reduceMotion) return Promise.resolve()

    const direction = previousRemembered ? 1 : -1
    return new Promise<void>((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .set(cardMotion, { x: -direction * 52, rotateZ: -direction * 1.2, scale: 0.975, autoAlpha: 0 })
        .to(cardMotion, { x: 0, rotateZ: 0, scale: 1, autoAlpha: 1, duration: 0.42, ease: "back.out(1.7)" })
        .set(cardMotion, { clearProps: "all" })
    })
  }

  const waitForNextPaint = () =>
    new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })

  const playCompletionAnimation = () => {
    const cardStage = cardStageRef.current
    const badge = completionBadgeRef.current
    const fireworks = fireworksRef.current
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!cardStage || !badge || !fireworks || reduceMotion) return Promise.resolve()

    const particles = createFireworkParticles(fireworks)

    return new Promise<void>((resolve) => {
      gsap
        .timeline({
          onComplete: () => {
            particles.forEach((particle) => particle.remove())
            resolve()
          },
        })
        .set(badge, { display: "block", autoAlpha: 0, scale: 0.72, y: 22 })
        .set(particles, { autoAlpha: 0, scale: 0.4, x: 0, y: 0 })
        .to(cardStage, { y: -18, scale: 1.018, rotateZ: -0.6, duration: 0.24, ease: "back.out(2.4)" })
        .to(badge, { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2.2)" }, "-=0.12")
        .to(
          particles,
          {
            autoAlpha: 1,
            scale: 1,
            x: (index) => fireworkVector(index, particles.length).x,
            y: (index) => fireworkVector(index, particles.length).y,
            duration: 0.58,
            ease: "power3.out",
            stagger: 0.006,
          },
          "-=0.18"
        )
        .to(particles, { autoAlpha: 0, scale: 0.35, duration: 0.28, ease: "power2.in" }, "-=0.1")
        .to(cardStage, { y: 10, scale: 0.985, rotateZ: 0, duration: 0.28, ease: "sine.inOut" }, "+=0.35")
        .to([cardStage, badge], { y: -18, autoAlpha: 0, duration: 0.28, ease: "power2.in" })
        .set([cardStage, badge], { clearProps: "all" })
    })
  }

  const createFireworkParticles = (container: HTMLDivElement) => {
    container.innerHTML = ""
    const colors = ["#22c55e", "#38bdf8", "#f97316", "#fb7185", "#facc15", "#a78bfa"]
    return Array.from({ length: 34 }, (_, index) => {
      const particle = document.createElement("span")
      particle.className = "absolute left-1/2 top-1/2 block rounded-full border border-[#172018]/30"
      particle.style.width = `${index % 3 === 0 ? 10 : 7}px`
      particle.style.height = particle.style.width
      particle.style.backgroundColor = colors[index % colors.length]
      particle.style.boxShadow = "3px 3px 0 #172018"
      container.appendChild(particle)
      return particle
    })
  }

  const fireworkVector = (index: number, total: number) => {
    const angle = (Math.PI * 2 * index) / total
    const radius = 82 + (index % 5) * 18
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    }
  }

  if (error && !session) {
    return <StateBlock tone="error" title="Không mở được phiên học" description={error} />
  }

  if (!session) {
    return <StateBlock title="Đang chuẩn bị" description="Đang chọn thẻ phù hợp..." />
  }

  if (finished || !question) {
    return <StudySummary title={title} session={session} results={results} backHref={backHref} backLabel={backLabel} />
  }

  return (
    <div className="-mt-2 mx-auto flex h-[calc(100dvh-8rem)] max-w-5xl flex-col gap-2 overflow-hidden lg:-mt-4">
      <FlashcardHeader
        title={title}
        backHref={backHref}
        backLabel={backLabel}
        meta={`${answeredCount}/${totalQuestions || "?"} thẻ đã học`}
        progressValue={visibleProgress}
        status={revealed ? "Đang xem đáp án" : "Đang xem câu hỏi"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={submitting || completing}
              onClick={handleStartShuffledSession}
              className="rounded-full"
            >
              <Shuffle className="size-4" />
              <span className="hidden sm:inline">Xáo trộn</span>
            </Button>
            <Button variant="outline" size="sm" disabled={submitting || completing} onClick={() => window.location.reload()} className="rounded-full">
              <RotateCcw className="size-4" />
              <span className="hidden sm:inline">Tải lại</span>
            </Button>
            <Button variant="outline" size="sm" disabled={submitting || completing} onClick={handleFinish} className="rounded-full">
              Kết thúc phiên
            </Button>
          </div>
        }
      />

      <div ref={cardStageRef} className="relative flex min-h-0 flex-1">
        <div
          ref={answerBadgeRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#172018] px-6 py-3 text-lg font-extrabold opacity-0 shadow-[7px_7px_0_#172018]"
        />
        <div
          ref={completionBadgeRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#172018] bg-[#bbf7d0] px-6 py-3 text-lg font-extrabold text-[#12351d] opacity-0 shadow-[7px_7px_0_#172018]"
        >
          Hoàn thành!
        </div>
        <div ref={fireworksRef} className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden="true" />
        <div ref={cardMotionRef} className="flex min-h-0 flex-1">
          <Flashcard
            question={question}
            revealed={revealed}
            saving={submitting || completing}
            onToggle={() => setRevealed((current) => !current)}
            onResult={handleResult}
          />
        </div>
      </div>

      <section className="grid shrink-0 gap-3 pb-1 md:grid-cols-[1fr_auto_1fr]">
        <Button
          type="button"
          variant="outline"
          className="h-12 justify-center text-red-600 hover:text-red-700"
          disabled={submitting || completing}
          onClick={() => handleResult(false)}
        >
          <XCircle className="size-5" />
          Chưa thuộc
        </Button>
        <Button type="button" variant="outline" className="h-12" disabled={submitting || completing} onClick={() => setRevealed((current) => !current)}>
          <Eye className="size-5" />
          {revealed ? "Mặt trước" : "Mặt sau"}
        </Button>
        <Button
          type="button"
          className="h-12 justify-center"
          disabled={submitting || completing}
          onClick={() => handleResult(true)}
        >
          <CheckCircle2 className="size-5" />
          Đã thuộc
        </Button>
      </section>

      {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function FlashcardHeader({
  title,
  backHref,
  backLabel,
  meta,
  status,
  progressValue,
  actions,
}: {
  title: string
  backHref: string
  backLabel: string
  meta: string
  status: string
  progressValue: number
  actions: React.ReactNode
}) {
  return (
    <header className="shrink-0 space-y-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Brain className="size-4" />
            Flashcard
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <Pill>{meta}</Pill>
          <Pill>{status}</Pill>
          {actions}
        </div>
      </div>
      <Progress value={progressValue} />
    </header>
  )
}

function Flashcard({
  question,
  revealed,
  saving,
  onToggle,
  onResult,
}: {
  question: PracticeQuestion
  revealed: boolean
  saving: boolean
  onToggle: () => void
  onResult: (remembered: boolean) => void
}) {
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const suppressClickRef = useRef(false)
  const canSwipe = !saving
  const leftOpacity = dragX < 0 ? Math.min(Math.abs(dragX) / 120, 1) : 0
  const rightOpacity = dragX > 0 ? Math.min(dragX / 120, 1) : 0

  const resetDrag = () => {
    setDragX(0)
    setIsDragging(false)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!canSwipe) return
    startXRef.current = event.clientX
    suppressClickRef.current = false
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return
    const nextDragX = Math.max(Math.min(event.clientX - startXRef.current, 190), -190)
    if (Math.abs(nextDragX) > 6) suppressClickRef.current = true
    setDragX(nextDragX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    const shouldCommit = Math.abs(dragX) >= 110
    const remembered = dragX > 0
    resetDrag()
    if (shouldCommit) onResult(remembered)
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    onToggle()
  }

  return (
    <section className="relative min-h-0 flex-1 overflow-visible px-0 py-1">
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-8">
        <SwipeBadge tone="bad" opacity={leftOpacity} icon={XCircle} />
        <SwipeBadge tone="good" opacity={rightOpacity} icon={CheckCircle2} />
      </div>
      <div className="absolute inset-y-0 -left-4 -right-4 overflow-x-clip px-4">
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        aria-pressed={revealed}
        className={cn(
          "relative block h-full w-full touch-pan-y text-left outline-none [perspective:1800px] focus-visible:ring-3 focus-visible:ring-ring/40",
          canSwipe && (isDragging ? "cursor-grabbing" : "cursor-grab")
        )}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
          transition: isDragging ? "none" : "transform 180ms ease-out",
        }}
      >
        <div
          className={cn(
            "relative h-full min-h-0 transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]"
          )}
        >
          <CardFront question={question} />
          <CardBack question={question} />
        </div>
      </button>
      </div>
    </section>
  )
}

function CardFront({ question }: { question: PracticeQuestion }) {
  return (
    <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.5rem] border border-border bg-muted/35 p-5 shadow-lg shadow-black/5 [backface-visibility:hidden] dark:bg-muted/20 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <QuestionMeta question={question} />
        <Pill>Mặt trước</Pill>
      </div>

      <div className="flex min-h-0 flex-col items-center justify-center px-1 py-6 text-center sm:px-8">
        <h2 className="mx-auto max-w-3xl text-balance text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          {question.question}
        </h2>
        {question.codeSnippet ? (
          <pre className="mt-6 max-h-40 w-full max-w-3xl overflow-auto rounded-md border border-border bg-muted/40 p-4 text-left text-sm leading-6">
            <code>{question.codeSnippet}</code>
          </pre>
        ) : null}
      </div>

      <p className="text-center text-xs font-medium text-muted-foreground">Bấm để lật thẻ</p>
    </div>
  )
}

function CardBack({ question }: { question: PracticeQuestion }) {
  return (
    <div className="absolute inset-0 grid grid-rows-[auto_1fr_auto] overflow-y-auto rounded-[1.5rem] border border-border bg-muted/35 p-5 shadow-lg shadow-black/5 [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-muted/20 sm:p-7">
      <div className="flex items-center justify-between gap-4">
        <QuestionMeta question={question} />
        <Pill>Mặt sau</Pill>
      </div>

      <div className="flex min-h-0 items-center justify-center px-2 py-6 text-center sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-muted-foreground">Đáp án</p>
          <p className="mt-5 text-2xl font-semibold leading-relaxed tracking-tight sm:text-3xl">
            {question.shortAnswer}
          </p>
        </div>
      </div>

      <p className="text-center text-xs font-medium text-muted-foreground">Vuốt phải nếu đã thuộc, vuốt trái nếu cần học lại</p>
    </div>
  )
}

function SwipeBadge({
  tone,
  opacity,
  icon: Icon,
}: {
  tone: "good" | "bad"
  opacity: number
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div
      className={cn(
        "flex size-16 items-center justify-center rounded-full ring-1",
        tone === "good" && "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800",
        tone === "bad" && "bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800"
      )}
      style={{ opacity, transform: `scale(${0.86 + opacity * 0.14})` }}
    >
      <Icon className="size-10" />
    </div>
  )
}

function StudySummary({
  title,
  session,
  results,
  backHref,
  backLabel,
}: {
  title: string
  session: PracticeSession
  results: CardResult[]
  backHref: string
  backLabel: string
}) {
  const total = results.length || session.attempts.length
  const remembered = results.length
    ? results.filter((result) => result.remembered).length
    : session.attempts.filter((attempt) => attempt.confidence === "MASTERED").length
  const learning = Math.max(total - remembered, 0)
  const percentage = total ? Math.round((remembered / total) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SessionTopBar title={title} eyebrow="Tổng kết" icon={Brain} backHref={backHref} backLabel={backLabel} meta={`${total} thẻ`} progressValue={100} />
      {total ? (
        <MetricStrip
          items={[
            { label: "Đã thuộc", value: `${remembered}/${total}`, tone: "good" },
            { label: "Cần học lại", value: learning.toString(), tone: learning ? "warn" : "good" },
            { label: "Tỷ lệ thuộc", value: `${percentage}%` },
          ]}
        />
      ) : (
        <StateBlock title="Chưa có thẻ nào" description="Không có thẻ phù hợp với bộ lọc hiện tại." />
      )}

      {results.filter((result) => !result.remembered).length ? (
        <Panel title="Thẻ cần học lại">
          <div className="divide-y divide-border">
            {results.filter((result) => !result.remembered).map((result) => (
              <details key={result.question.id} className="py-4 first:pt-0 last:pb-0">
                <summary className="cursor-pointer list-none text-sm font-medium">{result.question.question}</summary>
                <p className="mt-3 text-sm text-muted-foreground">{result.question.shortAnswer}</p>
              </details>
            ))}
          </div>
        </Panel>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={backHref}>Về bộ thẻ</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" />
          Học lượt mới
        </Button>
      </div>
    </div>
  )
}
