"use client"

import Link from "next/link"
import { ArrowLeft, Flag, RotateCcw, Send } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createTestSession, submitTestSession } from "@/services/practice-service"
import type { PracticeQuestion, PracticeSession } from "@/types"

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
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession)
      setRemainingSeconds(secondsUntil(initialSession.expiresAt))
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
  const elapsedSeconds = useMemo(() => {
    if (!session) return undefined
    return Math.max(0, Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000))
  }, [session, submitted, submitting, currentIndex])

  useEffect(() => {
    if (!session?.expiresAt || submitted) return
    const interval = window.setInterval(() => {
      const next = secondsUntil(session.expiresAt)
      setRemainingSeconds(next)
      if (next === 0) {
        window.clearInterval(interval)
        void handleSubmit()
      }
    }, 1000)
    return () => window.clearInterval(interval)
  })

  const handleSubmit = async () => {
    if (!session || submitting || submitted) return
    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitTestSession(
        session,
        questions.map((item) => ({ questionId: item.id, selectedOptionIndex: answers[item.id] })),
        elapsedSeconds
      )
      setSession(nextSession)
      setSubmitted(true)
    } catch {
      setError("Không thể nộp bài kiểm tra.")
    } finally {
      setSubmitting(false)
    }
  }

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
    <div className="mx-auto max-w-5xl space-y-6">
      <BackHeader
        meta={`${Object.keys(answers).length}/${questions.length} câu đã trả lời${remainingSeconds !== null ? ` / ${formatTime(remainingSeconds)}` : ""}`}
        backHref={backHref}
        backLabel={backLabel}
      />

      <section className="grid gap-2 sm:grid-cols-10">
        {questions.map((item, index) => {
          const answered = answers[item.id] !== undefined
          const flagged = marked.has(item.id)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "h-10 rounded-md border border-border text-sm font-medium",
                currentIndex === index && "border-foreground bg-foreground text-background",
                answered && currentIndex !== index && "bg-muted",
                flagged && "border-amber-400"
              )}
            >
              {index + 1}
            </button>
          )
        })}
      </section>

      {question ? (
        <>
          <section className="space-y-4">
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>{question.topic}</span>
              <span>/</span>
              <span>{difficultyLabel(question.difficulty)}</span>
            </div>
            <h2 className="text-2xl font-semibold leading-snug tracking-tight">{question.question}</h2>
            {question.codeSnippet ? (
              <pre className="overflow-auto border-y border-border bg-muted/30 p-4 text-sm">
                <code>{question.codeSnippet}</code>
              </pre>
            ) : null}
          </section>
          <AnswerOptions question={question} selectedOptionIndex={answers[question.id] ?? null} onChoose={(index) => setAnswers({ ...answers, [question.id]: index })} />
        </>
      ) : null}

      <div className="flex flex-wrap justify-between gap-2 border-y border-border py-4">
        <Button
          variant="outline"
          onClick={() => {
            if (!question) return
            setMarked((current) => {
              const next = new Set(current)
              if (next.has(question.id)) next.delete(question.id)
              else next.add(question.id)
              return next
            })
          }}
        >
          <Flag className="size-4" />
          Đánh dấu
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>
            Trước
          </Button>
          <Button variant="outline" disabled={currentIndex >= questions.length - 1} onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>
            Sau
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="size-4" />
            Nộp bài
          </Button>
        </div>
      </div>
      {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
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
  const submittedAnswers = Object.fromEntries(session.attempts.map((attempt) => [attempt.questionId, attempt.selectedOptionIndex]))
  const answerMap = Object.keys(submittedAnswers).length ? submittedAnswers : answers
  const scored = questions.map((question) => ({
    question,
    selectedOptionIndex: answerMap[question.id] as number | undefined,
    correct: answerMap[question.id] === question.correctOptionIndex,
  }))
  const score = scored.filter((item) => item.correct).length
  const weak = scored.filter((item) => !item.correct)
  const percentage = questions.length ? Math.round((score / questions.length) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackHeader backHref={backHref} backLabel={backLabel} />
      <section className="grid gap-4 border-b border-border pb-6 sm:grid-cols-3">
        <Metric label="Điểm" value={`${score}/${questions.length}`} />
        <Metric label="Tỉ lệ đúng" value={`${percentage}%`} />
        <Metric label="Cần ôn" value={weak.length.toString()} />
      </section>
      <section>
        <h2 className="text-lg font-semibold">Kết quả chi tiết</h2>
        <div className="mt-3 divide-y divide-border border-y border-border">
          {weak.map((result) => (
            <details key={result.question.id} className="py-4">
              <summary className="cursor-pointer list-none text-sm font-medium">{result.question.question}</summary>
              <p className="mt-3 text-sm text-muted-foreground">
                Bạn chọn: {result.selectedOptionIndex === undefined ? "Chưa trả lời" : `${optionLabel(result.selectedOptionIndex)}. ${result.question.options[result.selectedOptionIndex]}`}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Đáp án đúng: {optionLabel(result.question.correctOptionIndex)}. {result.question.options[result.question.correctOptionIndex]}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{result.question.explanation}</p>
            </details>
          ))}
        </div>
      </section>
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

function BackHeader({ meta, backHref, backLabel }: { meta?: string; backHref: string; backLabel: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Kiểm tra trắc nghiệm</h1>
      </div>
      {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
    </div>
  )
}

function AnswerOptions({
  question,
  selectedOptionIndex,
  onChoose,
}: {
  question: PracticeQuestion
  selectedOptionIndex: number | null
  onChoose: (index: number) => void
}) {
  return (
    <div className="grid gap-3">
      {question.options.map((option, index) => (
        <button
          key={`${index}-${option}`}
          type="button"
          onClick={() => onChoose(index)}
          className={cn(
            "grid min-h-14 grid-cols-[32px_1fr] items-center gap-3 border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted",
            selectedOptionIndex === index && "border-foreground bg-muted"
          )}
        >
          <span className="flex size-8 items-center justify-center rounded-full border border-current text-xs font-semibold">
            {optionLabel(index)}
          </span>
          <span>{option}</span>
        </button>
      ))}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function optionLabel(index: number) {
  return ["A", "B", "C", "D"][index] ?? "?"
}

function difficultyLabel(value: string) {
  if (value === "BEGINNER") return "Cơ bản"
  if (value === "INTERMEDIATE") return "Trung bình"
  return "Nâng cao"
}

function secondsUntil(value?: string | null) {
  if (!value) return null
  return Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 1000))
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
