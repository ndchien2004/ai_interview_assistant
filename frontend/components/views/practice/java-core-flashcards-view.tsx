"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, Eye, Keyboard, ListFilter, RotateCcw, XCircle } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCourse, getCourseProgress, readLocalProgress } from "@/services/course-service"
import { createFlashcardSession, submitFlashcardResult } from "@/services/practice-service"
import type {
  Course,
  CourseProgress,
  FlashcardStatusFilter,
  PracticeQuestion,
  PracticeSession,
  QuestionDifficulty,
} from "@/types"

export function JavaCoreFlashcardsView() {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [progressByQuestionId, setProgressByQuestionId] = useState<ReturnType<typeof readLocalProgress>>({})
  const [topicFilter, setTopicFilter] = useState("ALL")
  const [difficultyFilter, setDifficultyFilter] = useState<"ALL" | QuestionDifficulty>("ALL")
  const [statusFilter, setStatusFilter] = useState<FlashcardStatusFilter>("ALL")

  const loadProgress = useCallback(async () => {
    const nextProgress = await getCourseProgress()
    setProgress(nextProgress)
    setProgressByQuestionId(readLocalProgress())
  }, [])

  useEffect(() => {
    let active = true

    const filters = {
      topic: topicFilter === "ALL" ? undefined : topicFilter,
      difficulty: difficultyFilter === "ALL" ? undefined : difficultyFilter,
      status: statusFilter,
    }

    Promise.all([getCourse(), getCourseProgress(), createFlashcardSession("java-fullstack-cv-interview-bank", filters)])
      .then(([courseData, progressData, sessionData]) => {
        if (!active) return
        setCourse(courseData)
        setProgress(progressData)
        setProgressByQuestionId(readLocalProgress())
        setRevealed(false)
        setSession(sessionData)
      })
      .catch(() => {
        if (active) setError("Unable to start flashcards.")
      })

    return () => {
      active = false
    }
  }, [difficultyFilter, statusFilter, topicFilter])

  const question = session?.nextQuestion ?? null
  const filteredQuestions = useMemo(() => {
    const questions = course?.sections?.flatMap((section) => section.questions) ?? []
    return questions.filter((item) => {
      if (topicFilter !== "ALL" && item.topic !== topicFilter) return false
      if (difficultyFilter !== "ALL" && item.difficulty !== difficultyFilter) return false

      const confidence = progressByQuestionId[item.id]?.confidence
      if (statusFilter === "UNSEEN") return !confidence
      if (statusFilter === "LEARNING") return Boolean(confidence && !progressByQuestionId[item.id]?.mastered)
      if (statusFilter === "MASTERED") return progressByQuestionId[item.id]?.mastered
      return true
    })
  }, [course, difficultyFilter, progressByQuestionId, statusFilter, topicFilter])
  const known = filteredQuestions.filter((item) => progressByQuestionId[item.id]?.mastered).length
  const total = filteredQuestions.length || progress?.totalQuestions || course?.questionCount || 0
  const remaining = Math.max(total - known, 0)
  const completion = total ? Math.round((known / total) * 100) : 0
  const topicOptions = useMemo(
    () => course?.sections?.map((section) => section.title).filter((topic, index, all) => all.indexOf(topic) === index) ?? [],
    [course]
  )

  const weakTopics = useMemo(
    () =>
      progress?.topics
        .map((topic) => ({ ...topic, remaining: topic.total - topic.mastered }))
        .filter((topic) => topic.remaining > 0)
        .sort((a, b) => b.remaining - a.remaining)
        .slice(0, 4) ?? [],
    [progress]
  )

  const handleResult = useCallback(
    async (remembered: boolean) => {
      if (!session || !question || saving) return

      setSaving(true)
      setError("")
      try {
        const nextSession = await submitFlashcardResult(session, question.id, remembered)
        setSession(nextSession)
        setRevealed(false)
        await loadProgress()
      } catch {
        setError("Unable to save this flashcard result.")
      } finally {
        setSaving(false)
      }
    },
    [loadProgress, question, saving, session]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

      if (event.code === "Space") {
        event.preventDefault()
        setRevealed((current) => !current)
      }

      if (event.key.toLowerCase() === "x") {
        event.preventDefault()
        void handleResult(false)
      }

      if (event.key.toLowerCase() === "v") {
        event.preventDefault()
        void handleResult(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleResult, revealed])

  if (error && !session) {
    return <StateBlock tone="error" title="Flashcards unavailable" description={error} />
  }

  if (!course || !progress || !session) {
    return <StateBlock title="Loading flashcards" description="Building your Java + full-stack study deck..." />
  }

  if (!question && statusFilter === "ALL" && remaining === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackHeader />
        <StateBlock
          title="All cards mastered"
          description="Every flashcard in this bank is marked as known. Nice work - your deck is fully green."
        />
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/courses/java-core/review">Review Mastered Cards</Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" />
            Start Again
          </Button>
        </div>
      </div>
    )
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <BackHeader />
        <StateBlock
          title="Round complete"
          description="You have reviewed every card that matches the current filters. Adjust filters to study a different slice."
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" />
            Continue Studying
          </Button>
          <Button variant="outline" asChild>
            <Link href="/courses/java-core/review">Review Weak Cards</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <BackHeader />

      <section className="grid gap-4 border-b border-border pb-6 sm:grid-cols-4">
        <Metric label="Known" value={`${known}/${total}`} />
        <Metric label="Remaining" value={remaining.toString()} />
        <Metric label="Due now" value={(progress.dueQuestions ?? 0).toString()} />
        <Metric label="Deck mastery" value={`${completion}%`} />
      </section>

      <FlashcardFilters
        topics={topicOptions}
        topic={topicFilter}
        difficulty={difficultyFilter}
        status={statusFilter}
        onTopicChange={setTopicFilter}
        onDifficultyChange={setDifficultyFilter}
        onStatusChange={setStatusFilter}
      />

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${completion}%` }} />
      </div>

      <section className="grid gap-7 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <Flashcard
            question={question}
            revealed={revealed}
            saving={saving}
            onToggle={() => setRevealed((current) => !current)}
            onResult={handleResult}
          />

          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}

          <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr]">
            <Button variant="outline" onClick={() => setRevealed((current) => !current)}>
              <Eye className="size-4" />
              {revealed ? "Show Question" : "Flip to Answer"}
            </Button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleResult(false)}
              className="border-y border-border py-4 text-left transition-colors hover:text-foreground disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-red-600">
                <XCircle className="size-5" />
                Still learning
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Keep this card in the study queue. You can also drag the card left.
              </span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleResult(true)}
              className="border-y border-border py-4 text-left transition-colors hover:text-foreground disabled:opacity-60"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="size-5" />
                I know this
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Mark this card as mastered. You can also drag the card right.
              </span>
            </button>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border-y border-border py-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Keyboard className="size-4" />
              Shortcuts
            </div>
            <div className="mt-3 divide-y divide-border text-sm text-muted-foreground">
              <p className="py-2">Space - flip card</p>
              <p className="py-2">X - still learning</p>
              <p className="py-2">V - mark with check</p>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">Weak topics</h2>
            <div className="mt-3 divide-y divide-border border-y border-border">
              {weakTopics.map((topic) => (
                <div key={topic.topic} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span>{topic.topic}</span>
                  <span className="text-muted-foreground">{topic.remaining}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

function FlashcardFilters({
  topics,
  topic,
  difficulty,
  status,
  onTopicChange,
  onDifficultyChange,
  onStatusChange,
}: {
  topics: string[]
  topic: string
  difficulty: "ALL" | QuestionDifficulty
  status: FlashcardStatusFilter
  onTopicChange: (value: string) => void
  onDifficultyChange: (value: "ALL" | QuestionDifficulty) => void
  onStatusChange: (value: FlashcardStatusFilter) => void
}) {
  return (
    <section className="grid gap-3 border-y border-border py-4 lg:grid-cols-[auto_1fr_180px_180px] lg:items-center">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ListFilter className="size-4" />
        Study filters
      </div>

      <select
        value={topic}
        onChange={(event) => onTopicChange(event.target.value)}
        className="h-10 border border-border bg-background px-3 text-sm"
        aria-label="Filter flashcards by topic"
      >
        <option value="ALL">All topics</option>
        {topics.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>

      <select
        value={difficulty}
        onChange={(event) => onDifficultyChange(event.target.value as "ALL" | QuestionDifficulty)}
        className="h-10 border border-border bg-background px-3 text-sm"
        aria-label="Filter flashcards by difficulty"
      >
        <option value="ALL">All levels</option>
        <option value="BEGINNER">Beginner</option>
        <option value="INTERMEDIATE">Intermediate</option>
        <option value="ADVANCED">Advanced</option>
      </select>

      <select
        value={status}
        onChange={(event) => onStatusChange(event.target.value as FlashcardStatusFilter)}
        className="h-10 border border-border bg-background px-3 text-sm"
        aria-label="Filter flashcards by learning status"
      >
        <option value="ALL">Active deck</option>
        <option value="UNSEEN">Unseen only</option>
        <option value="LEARNING">Still learning</option>
        <option value="MASTERED">Mastered review</option>
      </select>
    </section>
  )
}

function BackHeader() {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/courses/java-core">
            <ArrowLeft className="size-4" />
            Java + Full-stack
          </Link>
        </Button>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Flashcard Study</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag left for still learning, drag right for mastered, or flip to inspect the answer.
        </p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/courses/java-core/practice">Practice Interview</Link>
      </Button>
    </div>
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

    const nextDragX = Math.max(Math.min(event.clientX - startXRef.current, 180), -180)
    if (Math.abs(nextDragX) > 6) {
      suppressClickRef.current = true
    }
    setDragX(nextDragX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    const shouldCommit = Math.abs(dragX) >= 110
    const remembered = dragX > 0
    resetDrag()

    if (shouldCommit) {
      onResult(remembered)
    }
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    onToggle()
  }

  return (
    <section className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        aria-pressed={revealed}
        aria-label={revealed ? "Flip card to question" : "Flip card to answer"}
        className={cn(
          "relative block w-full touch-pan-y text-left outline-none [perspective:1600px] focus-visible:ring-3 focus-visible:ring-ring/40",
          canSwipe && (isDragging ? "cursor-grabbing" : "cursor-grab")
        )}
        style={{
          transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
          transition: isDragging ? "none" : "transform 180ms ease-out",
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-between px-5 sm:px-8">
            <div
              className="flex size-16 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-200"
              style={{ opacity: leftOpacity, transform: `scale(${0.86 + leftOpacity * 0.14})` }}
            >
              <XCircle className="size-10" />
            </div>
            <div
              className="flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
              style={{ opacity: rightOpacity, transform: `scale(${0.86 + rightOpacity * 0.14})` }}
            >
              <CheckCircle2 className="size-10" />
            </div>
        </div>

        <div
          className={cn(
            "relative min-h-[430px] transition-transform duration-500 ease-out [transform-style:preserve-3d]",
            revealed && "[transform:rotateY(180deg)]"
          )}
        >
          <div className="absolute inset-0 overflow-hidden rounded-xl bg-muted/70 p-6 shadow-sm ring-1 ring-border/40 [backface-visibility:hidden] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{question.topic}</span>
                <span>/</span>
                <span>{question.difficulty}</span>
                <span>/</span>
                <span>{question.tags.slice(0, 3).join(", ")}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Front</span>
            </div>

            <div className="flex min-h-[300px] flex-col justify-center">
              <h2 className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
                {question.question}
              </h2>

              {question.codeSnippet ? (
                <pre className="mt-6 max-h-40 overflow-auto border-y border-border bg-muted/30 p-4 text-sm">
                  <code>{question.codeSnippet}</code>
                </pre>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">Click the card or press Space to see the answer.</p>
          </div>

          <div className="absolute inset-0 overflow-y-auto rounded-xl bg-muted/70 p-6 shadow-sm ring-1 ring-border/40 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{question.topic}</span>
                <span>/</span>
                <span>{question.difficulty}</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Back</span>
            </div>

            <div className="flex min-h-[300px] items-center justify-center px-2 text-center sm:px-8">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold text-muted-foreground">Answer</p>
                <p className="mt-5 text-2xl font-semibold leading-relaxed tracking-tight sm:text-3xl">
                  {question.shortAnswer}
                </p>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Drag left to keep learning, or drag right to mark this card with a check.
            </p>
          </div>
        </div>
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {revealed ? "Back side shown" : "Front side shown"} / click to flip / drag left or right to save progress
      </p>
    </section>
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
