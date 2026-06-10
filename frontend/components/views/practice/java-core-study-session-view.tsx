"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, RotateCcw, XCircle } from "lucide-react"
import { useEffect, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createLearnSession, createReviewDueSession, submitMultipleChoiceAnswer } from "@/services/practice-service"
import type { FlashcardStudyFilters, PracticeQuestion, PracticeSession } from "@/types"

type StudySessionMode = "LEARN" | "REVIEW_DUE"
type FeedbackState = {
  question: PracticeQuestion
  selectedOptionIndex: number
  correct: boolean
  nextSession: PracticeSession
}

export function JavaCoreStudySessionView({
  mode,
  courseSlug = "java-fullstack-flashcard-bank",
  deckSlug,
  backHref = "/courses/java-core",
  backLabel = "Java Full-stack",
}: {
  mode: StudySessionMode
  courseSlug?: string
  deckSlug?: string
  backHref?: string
  backLabel?: string
}) {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const title = mode === "REVIEW_DUE" ? "Ôn tập đến hạn" : "Học trắc nghiệm"
  const emptyTitle = mode === "REVIEW_DUE" ? "Chưa có câu cần ôn" : "Hoàn thành lượt học"
  const emptyDescription =
    mode === "REVIEW_DUE"
      ? "Hiện tại chưa có câu nào đến lịch ôn. Bạn có thể học câu mới hoặc quay lại sau."
      : "Bạn đã học hết các câu phù hợp với bộ lọc hiện tại."

  useEffect(() => {
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
        setFeedback(null)
      })
      .catch(() => {
        if (active) setError("Không thể bắt đầu phiên học.")
      })

    return () => {
      active = false
    }
  }, [backHref, backLabel, courseSlug, deckSlug, mode])

  const question = feedback?.question ?? session?.nextQuestion ?? null

  const handleChoose = async (selectedOptionIndex: number) => {
    if (!session || !session.nextQuestion || submitting || feedback) return

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
    setSession(feedback.nextSession)
    setFeedback(null)
  }

  if (error && !session) {
    return <StateBlock tone="error" title="Không mở được phiên học" description={error} />
  }

  if (!session) {
    return <StateBlock title="Đang chuẩn bị" description="FreeCard đang chọn câu hỏi phù hợp..." />
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackHeader title={title} backHref={backHref} backLabel={backLabel} />
        <StateBlock title={emptyTitle} description={emptyDescription} />
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <BackHeader title={title} meta={`${session.attempts.length} câu đã làm`} backHref={backHref} backLabel={backLabel} />
      <QuestionPanel question={question} />
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
          <div className="text-sm leading-6">
            <p className="font-medium">Đáp án đúng: {optionLabel(question.correctOptionIndex)}. {question.options[question.correctOptionIndex]}</p>
            <p className="mt-2 text-muted-foreground">{question.explanation}</p>
          </div>
          <Button onClick={handleContinue}>Câu tiếp theo</Button>
        </section>
      ) : null}
      {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function BackHeader({ title, meta, backHref, backLabel }: { title: string; meta?: string; backHref: string; backLabel: string }) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
      </div>
      {meta ? <p className="text-sm text-muted-foreground">{meta}</p> : null}
    </div>
  )
}

function QuestionPanel({ question }: { question: PracticeQuestion }) {
  return (
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

function optionLabel(index: number) {
  return ["A", "B", "C", "D"][index] ?? "?"
}

function difficultyLabel(value: string) {
  if (value === "BEGINNER") return "Cơ bản"
  if (value === "INTERMEDIATE") return "Trung bình"
  return "Nâng cao"
}
