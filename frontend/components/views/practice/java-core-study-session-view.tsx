"use client"

import Link from "next/link"
import { Brain, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { createLearnSession, createReviewDueSession, submitMultipleChoiceAnswer } from "@/services/practice-service"
import type { FlashcardStudyFilters, PracticeQuestion, PracticeSession } from "@/types"
import {
  AnswerOption,
  FeedbackPanel,
  MetricStrip,
  optionLabel,
  Panel,
  QuestionBlock,
  SessionTopBar,
} from "./session-ui"

type StudySessionMode = "LEARN" | "REVIEW_DUE"
type FeedbackState = {
  question: PracticeQuestion
  selectedOptionIndex: number
  correct: boolean
  nextSession: PracticeSession
}
type StudyResult = {
  question: PracticeQuestion
  selectedOptionIndex: number
  correct: boolean
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
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [results, setResults] = useState<StudyResult[]>([])
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (initialSession) {
      return
    }

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
  }, [courseSlug, deckSlug, initialSession, mode])

  const title = mode === "REVIEW_DUE" ? "Ôn đến hạn" : "Học trắc nghiệm"
  const question = feedback?.question ?? session?.nextQuestion ?? null
  const totalQuestions = session?.questionCount ?? session?.questions?.length ?? 0
  const answeredCount = results.length || session?.attempts.length || 0
  const visibleProgress = Math.min(100, ((answeredCount + (feedback ? 1 : 0)) / Math.max(1, totalQuestions)) * 100)

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

  const rememberFeedback = () => {
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

  const handleContinue = () => {
    rememberFeedback()
  }

  const handleFinish = () => {
    rememberFeedback()
    setFinished(true)
  }

  const handleRetryWeak = (weak: StudyResult[]) => {
    if (!session || !weak.length) return
    const questions = weak.map((item) => item.question)
    setSession({
      ...session,
      id: `${session.id}-retry-${Date.now()}`,
      status: "IN_PROGRESS",
      completedAt: null,
      nextQuestion: questions[0],
      questions,
      questionCount: questions.length,
      answeredCount: 0,
      attempts: [],
    })
    setResults([])
    setFeedback(null)
    setFinished(false)
  }

  if (error && !session) {
    return <StateBlock tone="error" title="Không mở được phiên học" description={error} />
  }

  if (!session) {
    return <StateBlock title="Đang chuẩn bị" description="Đang chọn câu hỏi phù hợp..." />
  }

  if (finished || !question) {
    return (
      <StudySummary
        title={title}
        session={session}
        results={results}
        backHref={backHref}
        backLabel={backLabel}
        onRetryWeak={handleRetryWeak}
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SessionTopBar
        title={title}
        eyebrow="Học"
        icon={Brain}
        backHref={backHref}
        backLabel={backLabel}
        meta={`${answeredCount}/${totalQuestions || "?"} câu đã học`}
        progressValue={visibleProgress}
        action={
          <Button variant="outline" size="sm" onClick={handleFinish}>
            Kết thúc phiên
          </Button>
        }
      />

      <QuestionBlock question={question} />
      <div className="grid gap-3">
        {question.options.map((option, index) => {
          const selected = feedback?.selectedOptionIndex === index
          const correct = feedback && question.correctOptionIndex === index
          const incorrect = selected && feedback && !feedback.correct
          return (
            <AnswerOption
              key={`${index}-${option}`}
              label={optionLabel(index)}
              selected={selected}
              correct={Boolean(correct)}
              incorrect={Boolean(incorrect)}
              disabled={submitting || Boolean(feedback)}
              onClick={() => handleChoose(index)}
            >
              {option}
            </AnswerOption>
          )
        })}
      </div>

      {feedback ? (
        <FeedbackPanel
          correct={feedback.correct}
          answer={`${optionLabel(question.correctOptionIndex)}. ${question.options[question.correctOptionIndex]}`}
          explanation={question.explanation}
        >
          <Button onClick={handleContinue}>Câu tiếp theo</Button>
          <Button variant="outline" onClick={handleFinish}>
            Kết thúc phiên
          </Button>
        </FeedbackPanel>
      ) : null}

      {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
    </div>
  )
}

function StudySummary({
  title,
  session,
  results,
  backHref,
  backLabel,
  onRetryWeak,
}: {
  title: string
  session: PracticeSession
  results: StudyResult[]
  backHref: string
  backLabel: string
  onRetryWeak: (weak: StudyResult[]) => void
}) {
  const total = results.length || session.attempts.length
  const correct = results.length
    ? results.filter((result) => result.correct).length
    : session.attempts.filter((attempt) => attempt.correct).length
  const weak = results.filter((result) => !result.correct)
  const percentage = total ? Math.round((correct / total) * 100) : 0

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SessionTopBar title={title} eyebrow="Tổng kết" icon={Brain} backHref={backHref} backLabel={backLabel} meta={`${total} câu`} progressValue={100} />
      {total ? (
        <MetricStrip
          items={[
            { label: "Đúng", value: `${correct}/${total}`, tone: "good" },
            { label: "Tỷ lệ đúng", value: `${percentage}%` },
            { label: "Cần ôn", value: weak.length.toString(), tone: weak.length ? "warn" : "good" },
          ]}
        />
      ) : (
        <StateBlock title="Chưa có câu nào" description="Không có câu phù hợp với bộ lọc hiện tại." />
      )}

      {weak.length ? <WeakQuestions results={weak} /> : null}

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href={backHref}>Về bộ thẻ</Link>
        </Button>
        {weak.length ? (
          <Button variant="outline" onClick={() => onRetryWeak(weak)}>
            Học lại câu sai
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RotateCcw className="size-4" />
          Học lượt mới
        </Button>
      </div>
    </div>
  )
}

function WeakQuestions({ results }: { results: StudyResult[] }) {
  return (
    <Panel title="Câu cần học lại">
      <div className="divide-y divide-border">
        {results.map((result) => (
          <details key={result.question.id} className="py-4 first:pt-0 last:pb-0">
            <summary className="cursor-pointer list-none text-sm font-medium">{result.question.question}</summary>
            <p className="mt-3 text-sm text-muted-foreground">
              Bạn chọn: {optionLabel(result.selectedOptionIndex)}. {result.question.options[result.selectedOptionIndex]}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Đáp án đúng: {optionLabel(result.question.correctOptionIndex)}. {result.question.options[result.question.correctOptionIndex]}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.question.explanation}</p>
          </details>
        ))}
      </div>
    </Panel>
  )
}
