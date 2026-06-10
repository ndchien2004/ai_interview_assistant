"use client"

import Link from "next/link"
import { ClipboardCheck, Flag, RotateCcw, Send } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createTestSession, submitTestSession } from "@/services/practice-service"
import type { PracticeQuestion, PracticeSession } from "@/types"
import {
  AnswerOption,
  formatTime,
  MetricStrip,
  optionLabel,
  Panel,
  QuestionBlock,
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
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [error, setError] = useState("")

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

  const handleSubmit = async (force = false) => {
    if (!session || submitting || submitted) return
    const unanswered = questions.length - Object.keys(answers).length
    if (!force && unanswered > 0 && !window.confirm(`Bạn còn ${unanswered} câu chưa trả lời. Nộp bài ngay?`)) return

    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitTestSession(
        session,
        questions.map((item) => ({ questionId: item.id, selectedOptionIndex: answers[item.id] })),
        elapsedSeconds(session)
      )
      setSession(nextSession)
      setSubmitted(true)
    } catch {
      setError("Không thể nộp bài kiểm tra.")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!session?.expiresAt || submitted) return
    const interval = window.setInterval(() => {
      const next = secondsUntil(session.expiresAt)
      setRemainingSeconds(next)
      if (next === 0) {
        window.clearInterval(interval)
        void handleSubmit(true)
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
    <div className="mx-auto max-w-6xl space-y-5">
      <SessionTopBar
        title="Kiểm tra trắc nghiệm"
        eyebrow="Kiểm tra"
        icon={ClipboardCheck}
        backHref={backHref}
        backLabel={backLabel}
        meta={`${answeredCount}/${questions.length} câu đã trả lời · ${marked.size} đánh dấu`}
        timer={timerLabel}
        progressValue={progressValue}
        action={
          <Button size="sm" onClick={() => handleSubmit()} disabled={submitting}>
            <Send className="size-4" />
            Nộp bài
          </Button>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <QuestionNavigator
          questions={questions}
          answers={answers}
          marked={marked}
          currentIndex={currentIndex}
          onSelect={setCurrentIndex}
        />

        <div className="space-y-5">
          {question ? (
            <>
              <QuestionBlock question={question} />
              <div className="grid gap-3">
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

          <div className="flex flex-wrap justify-between gap-2 rounded-md border border-border bg-card p-3">
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
              {question && marked.has(question.id) ? "Bỏ đánh dấu" : "Đánh dấu"}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))}>
                Trước
              </Button>
              <Button variant="outline" disabled={currentIndex >= questions.length - 1} onClick={() => setCurrentIndex((value) => Math.min(questions.length - 1, value + 1))}>
                Sau
              </Button>
              <Button onClick={() => handleSubmit()} disabled={submitting}>
                <Send className="size-4" />
                Nộp bài
              </Button>
            </div>
          </div>
          {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
        </div>
      </section>
    </div>
  )
}

function QuestionNavigator({
  questions,
  answers,
  marked,
  currentIndex,
  onSelect,
}: {
  questions: PracticeQuestion[]
  answers: Record<string, number>
  marked: Set<string>
  currentIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <Panel title="Bảng câu hỏi" className="lg:sticky lg:top-36 lg:self-start">
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
                "relative h-10 rounded-md border border-border text-sm font-semibold transition-colors",
                currentIndex === index && "border-primary bg-primary text-primary-foreground",
                answered && currentIndex !== index && "bg-muted",
                !answered && currentIndex !== index && "bg-background hover:bg-muted",
                flagged && "ring-2 ring-amber-400/70"
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
    </Panel>
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
