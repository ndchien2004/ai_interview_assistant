"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createTestSession, submitMultipleChoiceAnswer } from "@/services/practice-service"
import type { PracticeQuestion, PracticeSession } from "@/types"

type TestResult = {
  question: PracticeQuestion
  selectedOptionIndex: number
  correct: boolean
}

type FeedbackState = TestResult & {
  nextSession: PracticeSession
}

export function JavaCoreTestView({
  courseSlug = "java-fullstack-flashcard-bank",
  deckSlug,
  backHref = "/courses/java-core",
  backLabel = "Java Full-stack",
}: {
  courseSlug?: string
  deckSlug?: string
  backHref?: string
  backLabel?: string
}) {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    createTestSession(courseSlug, deckSlug ? { deckSlug } : {})
      .then((nextSession) => {
        if (active) setSession(nextSession)
      })
      .catch(() => {
        if (active) setError("Không thể bắt đầu bài kiểm tra.")
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug])

  const question = feedback?.question ?? session?.nextQuestion ?? null
  const score = useMemo(() => results.filter((result) => result.correct).length, [results])

  const handleChoose = async (selectedOptionIndex: number) => {
    if (!session || !session.nextQuestion || feedback || submitting) return

    const currentQuestion = session.nextQuestion
    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitMultipleChoiceAnswer(session, currentQuestion, selectedOptionIndex)
      setFeedback({
        question: currentQuestion,
        selectedOptionIndex,
        correct: selectedOptionIndex === currentQuestion.correctOptionIndex,
        nextSession,
      })
    } catch {
      setError("Không thể lưu đáp án.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleContinue = () => {
    if (!feedback) return
    setResults((current) => [
      ...current,
      {
        question: feedback.question,
        selectedOptionIndex: feedback.selectedOptionIndex,
        correct: feedback.correct,
      },
    ])
    setSession(feedback.nextSession)
    setFeedback(null)
  }

  if (error && !session) {
    return <StateBlock tone="error" title="Không mở được kiểm tra" description={error} />
  }

  if (!session) {
    return <StateBlock title="Đang tạo bài kiểm tra" description="FreeCard đang chọn câu hỏi từ bộ thẻ..." />
  }

  if (!question) {
    const total = results.length
    const percentage = total ? Math.round((score / total) * 100) : 0
    const weak = results.filter((result) => !result.correct)

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackHeader backHref={backHref} backLabel={backLabel} />
        <section className="grid gap-4 border-b border-border pb-6 sm:grid-cols-3">
          <Metric label="Điểm" value={`${score}/${total}`} />
          <Metric label="Tỉ lệ đúng" value={`${percentage}%`} />
          <Metric label="Cần ôn" value={weak.length.toString()} />
        </section>
        {weak.length ? (
          <div>
            <h2 className="text-lg font-semibold">Câu cần ôn lại</h2>
            <div className="mt-3 divide-y divide-border border-y border-border">
              {weak.map((result) => (
                <details key={result.question.id} className="py-4">
                  <summary className="cursor-pointer list-none text-sm font-medium">{result.question.question}</summary>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Đáp án đúng: {optionLabel(result.question.correctOptionIndex)}.{" "}
                    {result.question.options[result.question.correctOptionIndex]}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{result.question.explanation}</p>
                </details>
              ))}
            </div>
          </div>
        ) : (
          <StateBlock title="Làm rất tốt" description="Bạn trả lời đúng toàn bộ câu trong lượt kiểm tra này." />
        )}
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={backHref}>Ôn tiếp</Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" />
            Kiểm tra lượt mới
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackHeader meta={`${results.length} câu đã làm`} backHref={backHref} backLabel={backLabel} />
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>{question.topic}</span>
          <span>/</span>
          <span>{difficultyLabel(question.difficulty)}</span>
        </div>
        <h2 className="text-2xl font-semibold leading-snug tracking-tight">{question.question}</h2>
      </section>
      <AnswerOptions
        question={question}
        selectedOptionIndex={feedback?.selectedOptionIndex ?? null}
        disabled={submitting || Boolean(feedback)}
        onChoose={handleChoose}
      />
      {feedback ? (
        <section className="space-y-4 border-y border-border py-5">
          <div className={cn("flex items-center gap-2 text-sm font-semibold", feedback.correct ? "text-emerald-600" : "text-red-600")}>
            {feedback.correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
            {feedback.correct ? "Chính xác" : "Chưa đúng"}
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{question.explanation}</p>
          <Button onClick={handleContinue}>Câu tiếp theo</Button>
        </section>
      ) : null}
      {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
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
  disabled,
  onChoose,
}: {
  question: PracticeQuestion
  selectedOptionIndex: number | null
  disabled: boolean
  onChoose: (index: number) => void
}) {
  return (
    <div className="grid gap-3">
      {question.options.map((option, index) => {
        const selected = selectedOptionIndex === index
        const correct = selectedOptionIndex !== null && question.correctOptionIndex === index
        return (
          <button
            key={`${index}-${option}`}
            type="button"
            disabled={disabled}
            onClick={() => onChoose(index)}
            className={cn(
              "grid min-h-14 grid-cols-[32px_1fr] items-center gap-3 border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default",
              selected && !correct && "border-red-300 bg-red-50 text-red-700",
              correct && "border-emerald-300 bg-emerald-50 text-emerald-700"
            )}
          >
            <span className="flex size-8 items-center justify-center rounded-full border border-current text-xs font-semibold">
              {optionLabel(index)}
            </span>
            <span>{option}</span>
          </button>
        )
      })}
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
