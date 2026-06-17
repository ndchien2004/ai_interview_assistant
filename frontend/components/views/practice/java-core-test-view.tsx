"use client"

import Link from "next/link"
import { ArrowLeft, ClipboardCheck, Flag, RotateCcw, Send } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { createTestSession, submitTestSession } from "@/services/practice-service"
import type { PracticeQuestion, PracticeSession } from "@/types"
import {
  AnswerOption,
  formatTime,
  MetricStrip,
  optionLabel,
  Panel,
  SegmentedControl,
  SessionTopBar,
} from "./session-ui"

type ResultFilter = "ALL" | "WRONG" | "UNANSWERED"

export function JavaCoreTestView({
  courseSlug = "java-fullstack-flashcard-bank",
  deckSlug,
  backHref = "/courses/java-core",
  backLabel = "Java Full-stack",
  initialSession,
}: {
  courseSlug?: string
  deckSlug?: string
  backHref?: string
  backLabel?: string
  initialSession?: PracticeSession
}) {
  const [session, setSession] = useState<PracticeSession | null>(initialSession ?? null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [marked, setMarked] = useState<Set<string>>(new Set())
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [error, setError] = useState("")
  const testViewRef = useRef<HTMLDivElement | null>(null)
  const submitBadgeRef = useRef<HTMLDivElement | null>(null)
  const fireworksRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (initialSession) {
      return
    }
    let active = true
    createTestSession(courseSlug, deckSlug ? { deckSlug } : {})
      .then((nextSession) => {
        if (!active) return
        setSession(nextSession)
        setRemainingSeconds(secondsUntil(nextSession.expiresAt))
      })
      .catch(() => {
        if (active) setError("Không thể bắt đầu bài kiểm tra.")
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug, initialSession])

  const questions = session?.questions?.length ? session.questions : session?.nextQuestion ? [session.nextQuestion] : []
  const question = questions[currentIndex] ?? null
  const answeredCount = Object.keys(answers).length
  const progressValue = Math.min(100, (answeredCount / Math.max(1, questions.length)) * 100)
  const timerLabel = remainingSeconds !== null ? formatTime(remainingSeconds) : null

  const requestSubmit = () => {
    if (!session || submitting || submitted) return
    setConfirmOpen(true)
  }

  const executeSubmit = async () => {
    if (!session || submitting || submitted) return
    setConfirmOpen(false)

    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitTestSession(
        session,
        questions.map((item) => ({ questionId: item.id, selectedOptionIndex: answers[item.id] })),
        elapsedSeconds(session)
      )
      await playSubmitAnimation()
      setSession(nextSession)
      setSubmitted(true)
    } catch {
      setError("Không thể nộp bài kiểm tra.")
    } finally {
      setSubmitting(false)
    }
  }

  const playSubmitAnimation = () => {
    const view = testViewRef.current
    const badge = submitBadgeRef.current
    const fireworks = fireworksRef.current
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!view || !badge || !fireworks || reduceMotion) return Promise.resolve()

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
        .set(particles, { autoAlpha: 0, scale: 0.35, x: 0, y: 0 })
        .to(view, { scale: 1.012, y: -6, duration: 0.22, ease: "back.out(2.4)" })
        .to(badge, { autoAlpha: 1, scale: 1, y: 0, duration: 0.3, ease: "back.out(2.2)" }, "-=0.1")
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
        .to(particles, { autoAlpha: 0, scale: 0.35, duration: 0.28, ease: "power2.in" }, "-=0.08")
        .to([view, badge], { y: -18, autoAlpha: 0, duration: 0.28, ease: "power2.in" }, "+=0.18")
        .set([view, badge], { clearProps: "all" })
    })
  }

  useEffect(() => {
    if (!session?.expiresAt || submitted) return
    const interval = window.setInterval(() => {
      const next = secondsUntil(session.expiresAt)
      setRemainingSeconds(next)
      if (next === 0) {
        window.clearInterval(interval)
        void executeSubmit()
      }
    }, 1000)
    return () => window.clearInterval(interval)
  })

  if (error && !session) {
    return <StateBlock tone="error" title="Không mở được kiểm tra" description={error} />
  }

  if (!session) {
    return <StateBlock title="Đang tạo bài kiểm tra" description="Đang chọn câu hỏi từ bộ thẻ..." />
  }

  if (!questions.length) {
    return <StateBlock title="Không có câu hỏi" description="Không có câu phù hợp với cấu hình kiểm tra." />
  }

  if (submitted || session.status === "COMPLETED") {
    return <TestSummary session={session} questions={questions} answers={answers} backHref={backHref} backLabel={backLabel} />
  }

  return (
    <>
    <div ref={testViewRef} className="relative mx-auto flex max-w-6xl flex-col gap-3 overflow-visible lg:h-[calc(100dvh-9.5rem)]">
      <div
        ref={submitBadgeRef}
        className="pointer-events-none absolute left-1/2 top-1/2 z-40 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#172018] bg-[#bbf7d0] px-6 py-3 text-lg font-extrabold text-[#12351d] opacity-0 shadow-[7px_7px_0_#172018]"
      >
        Đã nộp bài!
      </div>
      <div ref={fireworksRef} className="pointer-events-none absolute inset-0 z-30 overflow-visible" aria-hidden="true" />
      <TestHeader
        title="Kiểm tra trắc nghiệm"
        eyebrow="Kiểm tra"
        backHref={backHref}
        backLabel={backLabel}
        meta={`${answeredCount}/${questions.length} câu đã trả lời · ${marked.size} đánh dấu`}
        timer={timerLabel}
        progressValue={progressValue}
        action={
          <Button size="sm" onClick={requestSubmit} disabled={submitting}>
            <Send className="size-4" />
            Nộp bài
          </Button>
          }
        />

      <section className="grid gap-4 overflow-visible lg:min-h-0 lg:flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <QuestionNavigator
          questions={questions}
          answers={answers}
          marked={marked}
          currentIndex={currentIndex}
          question={question}
          submitting={submitting}
          onSelect={setCurrentIndex}
          onPrevious={() => setCurrentIndex((value) => Math.max(0, value - 1))}
          onNext={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}
          onToggleMarked={() => {
            if (!question) return
            setMarked((current) => {
              const next = new Set(current)
              if (next.has(question.id)) next.delete(question.id)
              else next.add(question.id)
              return next
            })
          }}
        />

        <div className="flex flex-col gap-3 overflow-visible lg:min-h-0">
          {question ? (
            <>
              <TestQuestionBlock question={question} />
              <div className="grid gap-3 pr-2 pb-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                {question.options.map((option, index) => (
                  <AnswerOption
                    key={`${index}-${option}`}
                    label={optionLabel(index)}
                    selected={answers[question.id] === index}
                    onClick={() => setAnswers({ ...answers, [question.id]: index })}
                  >
                    {option}
                  </AnswerOption>
                ))}
              </div>
            </>
          ) : null}
          {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
        </div>
      </section>
    </div>
    <ConfirmDialog
      open={confirmOpen}
      title="Nộp bài kiểm tra?"
      description={<SubmitConfirmDescription total={questions.length} answered={answeredCount} marked={marked.size} />}
      confirmLabel="Nộp bài"
      cancelLabel="Xem lại"
      loading={submitting}
      onClose={() => setConfirmOpen(false)}
      onConfirm={() => void executeSubmit()}
    />
    </>
  )
}

function TestHeader({
  title,
  eyebrow,
  backHref,
  backLabel,
  meta,
  timer,
  progressValue,
  action,
}: {
  title: string
  eyebrow: string
  backHref: string
  backLabel: string
  meta: string
  timer?: string | null
  progressValue: number
  action: React.ReactNode
}) {
  return (
    <header className="shrink-0 space-y-2">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
          <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-muted-foreground">
            <ClipboardCheck className="size-4" />
            {eyebrow}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="inline-flex min-h-9 max-w-full items-center rounded-full border-2 border-[#172018] bg-white px-4 text-sm font-extrabold text-[#172018] shadow-[4px_4px_0_#172018] dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
            {meta}
          </span>
          {timer ? (
            <span className="inline-flex min-h-9 items-center rounded-full border-2 border-[#172018] bg-white px-4 text-sm font-extrabold text-[#172018] shadow-[4px_4px_0_#172018] dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
              {timer}
            </span>
          ) : null}
          {action}
        </div>
      </div>
      <Progress value={progressValue} />
    </header>
  )
}

function QuestionNavigator({
  questions,
  answers,
  marked,
  currentIndex,
  question,
  submitting,
  onSelect,
  onPrevious,
  onNext,
  onToggleMarked,
}: {
  questions: PracticeQuestion[]
  answers: Record<string, number>
  marked: Set<string>
  currentIndex: number
  question: PracticeQuestion | null
  submitting: boolean
  onSelect: (index: number) => void
  onPrevious: () => void
  onNext: () => void
  onToggleMarked: () => void
}) {
  return (
    <Panel title="Bảng câu hỏi" className="min-h-0 lg:self-start">
      <div className="grid grid-cols-5 gap-2 lg:grid-cols-4">
        {questions.map((item, index) => {
          const answered = answers[item.id] !== undefined
          const flagged = marked.has(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "relative h-10 rounded-md border-2 border-[#172018] text-sm font-extrabold shadow-[2px_2px_0_#172018] transition-colors dark:border-white/80 dark:shadow-[2px_2px_0_rgba(255,255,255,0.24)]",
                !answered && !flagged && currentIndex !== index && "bg-background text-foreground hover:bg-muted",
                answered && !flagged && currentIndex !== index && "bg-[#bbf7d0] text-[#12351d] hover:bg-[#86efac]",
                flagged && "bg-[#fef08a] text-[#172018] hover:bg-[#fde047]",
                currentIndex === index && !flagged && "bg-[#172018] text-white dark:bg-white dark:text-[#172018]"
              )}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
        <p>Đã trả lời: {Object.keys(answers).length}</p>
        <p>Đánh dấu: {marked.size}</p>
      </div>
      <div className="mt-4 grid gap-2">
        <Button variant="outline" disabled={!question || submitting} onClick={onToggleMarked}>
          <Flag className="size-4" />
          {question && marked.has(question.id) ? "Bỏ đánh dấu" : "Đánh dấu"}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={submitting || currentIndex === 0} onClick={onPrevious}>
            Trước
          </Button>
          <Button variant="outline" disabled={submitting || currentIndex >= questions.length - 1} onClick={onNext}>
            Sau
          </Button>
        </div>
      </div>
    </Panel>
  )
}

function TestQuestionBlock({ question }: { question: PracticeQuestion }) {
  return (
    <section className="shrink-0 rounded-md border-2 border-[#172018] bg-card px-4 py-3 shadow-[6px_6px_0_#172018] dark:border-white/80 dark:shadow-[6px_6px_0_rgba(255,255,255,0.24)]">
      <h2 className="text-lg font-extrabold leading-snug tracking-tight sm:text-xl lg:text-2xl">{question.question}</h2>
      {question.codeSnippet ? (
        <pre className="mt-3 max-h-36 overflow-auto rounded-md border-2 border-[#172018] bg-muted/40 p-3 text-sm leading-6 shadow-[4px_4px_0_#172018] dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
          <code>{question.codeSnippet}</code>
        </pre>
      ) : null}
    </section>
  )
}

function SubmitConfirmDescription({
  total,
  answered,
  marked,
}: {
  total: number
  answered: number
  marked: number
}) {
  const unanswered = Math.max(total - answered, 0)
  return (
    <div className="space-y-1">
      <p>
        Bạn đã trả lời <span className="font-extrabold text-foreground">{answered}/{total}</span> câu.
      </p>
      {unanswered ? <p>Còn {unanswered} câu chưa trả lời.</p> : <p>Tất cả câu hỏi đã có đáp án.</p>}
      {marked ? <p>Có {marked} câu đang được đánh dấu để xem lại.</p> : null}
    </div>
  )
}

function TestSummary({
  session,
  questions,
  answers,
  backHref,
  backLabel,
}: {
  session: PracticeSession
  questions: PracticeQuestion[]
  answers: Record<string, number>
  backHref: string
  backLabel: string
}) {
  const [filter, setFilter] = useState<ResultFilter>("WRONG")
  const submittedAnswers = Object.fromEntries(session.attempts.map((attempt) => [attempt.questionId, attempt.selectedOptionIndex]))
  const answerMap = Object.keys(submittedAnswers).length ? submittedAnswers : answers
  const scored = useMemo(
    () =>
      questions.map((question) => ({
        question,
        selectedOptionIndex: answerMap[question.id] as number | undefined,
        correct: answerMap[question.id] === question.correctOptionIndex,
      })),
    [answerMap, questions]
  )
  const score = scored.filter((item) => item.correct).length
  const wrong = scored.filter((item) => item.selectedOptionIndex !== undefined && !item.correct)
  const unanswered = scored.filter((item) => item.selectedOptionIndex === undefined)
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0
  const visible = scored.filter((item) => {
    if (filter === "WRONG") return item.selectedOptionIndex !== undefined && !item.correct
    if (filter === "UNANSWERED") return item.selectedOptionIndex === undefined
    return true
  })

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SessionTopBar
        title="Kết quả kiểm tra"
        eyebrow="Tổng kết"
        icon={ClipboardCheck}
        backHref={backHref}
        backLabel={backLabel}
        meta={`${questions.length} câu`}
        progressValue={100}
      />
      <MetricStrip
        items={[
          { label: "Điểm", value: `${score}/${questions.length}`, tone: "good" },
          { label: "Tỷ lệ đúng", value: `${percentage}%` },
          { label: "Sai", value: wrong.length.toString(), tone: wrong.length ? "bad" : "good" },
          { label: "Chưa làm", value: unanswered.length.toString(), tone: unanswered.length ? "warn" : "good" },
          { label: "Thời gian", value: formatTime(elapsedSeconds(session)) },
        ]}
      />

      <Panel title="Kết quả chi tiết">
        <div className="mb-4">
          <SegmentedControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "Tất cả" },
              { value: "WRONG", label: "Sai" },
              { value: "UNANSWERED", label: "Chưa làm" },
            ]}
          />
        </div>
        {visible.length ? (
          <div className="divide-y divide-border">
            {visible.map((result) => (
              <details key={result.question.id} className="py-4 first:pt-0 last:pb-0">
                <summary className="cursor-pointer list-none text-sm font-medium">{result.question.question}</summary>
                <p className="mt-3 text-sm text-muted-foreground">
                  Bạn chọn:{" "}
                  {result.selectedOptionIndex === undefined
                    ? "Chưa trả lời"
                    : `${optionLabel(result.selectedOptionIndex)}. ${result.question.options[result.selectedOptionIndex]}`}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Đáp án đúng: {optionLabel(result.question.correctOptionIndex)}. {result.question.options[result.question.correctOptionIndex]}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.question.explanation}</p>
              </details>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Không có câu nào trong nhóm này.</p>
        )}
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={backHref}>{backLabel}</Link>
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" />
          Kiểm tra lượt mới
        </Button>
      </div>
    </div>
  )
}

function secondsUntil(value?: string | null) {
  if (!value) return null
  return Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 1000))
}

function elapsedSeconds(session: PracticeSession) {
  const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
  return Math.max(0, Math.round((end - new Date(session.createdAt).getTime()) / 1000))
}

function createFireworkParticles(container: HTMLDivElement) {
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

function fireworkVector(index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total
  const radius = 82 + (index % 5) * 18
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
}


