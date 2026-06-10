"use client"

import { CheckCircle2, Gamepad2, RotateCcw, Save } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCourseDeck } from "@/services/course-service"
import { createMatchSession, submitMatchResult } from "@/services/practice-service"
import type { CourseSection, PracticeSession } from "@/types"
import { formatTime, MetricStrip, Panel, SessionTopBar } from "@/components/views/practice/session-ui"

type MatchCard = {
  id: string
  questionId: string
  text: string
}

export function CourseDeckMatchView({
  courseSlug,
  deckSlug,
  initialSession,
  backHref,
}: {
  courseSlug: string
  deckSlug?: string
  initialSession?: PracticeSession
  backHref?: string
}) {
  const [deck, setDeck] = useState<CourseSection | null>(null)
  const [session, setSession] = useState<PracticeSession | null>(initialSession ?? null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [saved, setSaved] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(secondsUntil(initialSession?.expiresAt))
  const [mismatchId, setMismatchId] = useState<string | null>(null)
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    const deckPromise = deckSlug
      ? getCourseDeck(courseSlug, deckSlug)
      : Promise.resolve({
          id: "course",
          slug: "course",
          title: "Học phần",
          description: "",
          sortOrder: 0,
          questions: initialSession?.questions ?? [],
        } satisfies CourseSection)
    const sessionPromise = initialSession ? Promise.resolve(initialSession) : createMatchSession(courseSlug, deckSlug ? { deckSlug } : {})

    Promise.all([deckPromise, sessionPromise])
      .then(([deckData, sessionData]) => {
        if (!active) return
        setDeck(deckData)
        setSession(sessionData)
        setRemainingSeconds(secondsUntil(sessionData.expiresAt))
      })
      .catch(() => {
        if (active) setError("Không thể mở ghép thẻ.")
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug, initialSession])

  useEffect(() => {
    if (!session?.expiresAt || saved) return
    const interval = window.setInterval(() => {
      const next = secondsUntil(session.expiresAt)
      setRemainingSeconds(next)
      if (next === 0) window.clearInterval(interval)
    }, 1000)
    return () => window.clearInterval(interval)
  }, [saved, session?.expiresAt])

  const questions = useMemo(
    () => (session?.questions?.length ? session.questions : deck?.questions ?? []).slice(0, session?.questionLimit ?? 12),
    [deck, session]
  )
  const prompts = useMemo(
    () => {
      void shuffleSeed
      return shuffle(questions.map((question) => ({ id: `q-${question.id}`, questionId: question.id, text: question.question })))
    },
    [questions, shuffleSeed]
  )
  const answers = useMemo(
    () => {
      void shuffleSeed
      return shuffle(questions.map((question) => ({ id: `a-${question.id}`, questionId: question.id, text: question.shortAnswer })))
    },
    [questions, shuffleSeed]
  )

  const complete = questions.length > 0 && matchedIds.size === questions.length
  const resolvedBackHref = backHref ?? (deckSlug ? `/courses/${courseSlug}/decks/${deckSlug}` : `/courses/${courseSlug}`)
  const title = deck?.title ? `Ghép thẻ · ${deck.title}` : "Ghép thẻ"

  const handleSave = async () => {
    if (!session || saving) return
    setSaving(true)
    setError("")
    try {
      await submitMatchResult(session, Array.from(matchedIds), mistakes, elapsedSeconds(session))
      setSaved(true)
    } catch {
      setError("Không thể lưu kết quả ghép thẻ.")
    } finally {
      setSaving(false)
    }
  }

  const resolvePair = (promptId: string, answerId: string) => {
    const correct = promptId === answerId
    setSelectedPrompt(promptId)
    setSelectedAnswer(answerId)
    if (correct) {
      setMatchedIds((current) => new Set([...current, promptId]))
    } else {
      setMistakes((current) => current + 1)
      setMismatchId(promptId)
    }
    window.setTimeout(() => {
      setSelectedPrompt(null)
      setSelectedAnswer(null)
      setMismatchId(null)
    }, correct ? 180 : 420)
  }

  const handlePromptSelect = (questionId: string) => {
    if (selectedPrompt && selectedAnswer) return
    if (selectedAnswer) {
      resolvePair(questionId, selectedAnswer)
      return
    }
    setSelectedPrompt(questionId)
  }

  const handleAnswerSelect = (questionId: string) => {
    if (selectedPrompt && selectedAnswer) return
    if (selectedPrompt) {
      resolvePair(selectedPrompt, questionId)
      return
    }
    setSelectedAnswer(questionId)
  }

  const handleRestartSameConfig = async () => {
    if (!session) return
    setError("")
    try {
      const nextSession = await createMatchSession(courseSlug, {
        ...(session.filters ?? {}),
        deckSlug: session.deckSlug ?? deckSlug,
        deckSlugs: session.deckSlugs,
        questionLimit: session.questionLimit ?? undefined,
        timeLimitMinutes: session.timeLimitSeconds ? Math.ceil(session.timeLimitSeconds / 60) : undefined,
        shuffle: session.shuffle,
      })
      setSession(nextSession)
      setMatchedIds(new Set())
      setSelectedPrompt(null)
      setSelectedAnswer(null)
      setMistakes(0)
      setSaved(false)
      setRemainingSeconds(secondsUntil(nextSession.expiresAt))
      setShuffleSeed((value) => value + 1)
    } catch {
      setError("Không thể tạo lại phiên ghép thẻ.")
    }
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được ghép thẻ" description={error} />
  if (!deck || !session) return <StateBlock title="Đang chuẩn bị ghép thẻ" description="Đang xáo câu hỏi và đáp án..." />

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <SessionTopBar
        title={title}
        eyebrow="Ghép thẻ"
        icon={Gamepad2}
        backHref={resolvedBackHref}
        backLabel={deck.title}
        meta={`${matchedIds.size}/${questions.length} cặp`}
        timer={remainingSeconds === null ? null : formatTime(remainingSeconds)}
        progressValue={(matchedIds.size / Math.max(1, questions.length)) * 100}
      />

      {!questions.length ? <StateBlock title="Không có câu hỏi" description="Không có câu phù hợp với cấu hình ghép thẻ." /> : null}

      {questions.length ? (
        <>
          <MetricStrip
            items={[
              { label: "Đã ghép", value: `${matchedIds.size}/${questions.length}`, tone: "good" },
              { label: "Lỗi", value: mistakes.toString(), tone: mistakes ? "warn" : "default" },
              { label: "Thời gian", value: remainingSeconds === null ? "Tự do" : formatTime(remainingSeconds) },
              { label: "Trạng thái", value: saved ? "Đã lưu" : complete ? "Hoàn thành" : "Đang chơi" },
            ]}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <MatchColumn
              title="Câu hỏi"
              cards={prompts}
              selectedId={selectedPrompt}
              matchedIds={matchedIds}
              mismatchId={mismatchId}
              onSelect={handlePromptSelect}
            />
            <MatchColumn
              title="Đáp án"
              cards={answers}
              selectedId={selectedAnswer}
              matchedIds={matchedIds}
              mismatchId={mismatchId}
              onSelect={handleAnswerSelect}
            />
          </section>

          {complete ? (
            <Panel title={saved ? "Kết quả đã lưu" : "Hoàn thành phiên ghép thẻ"}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 text-emerald-600" />
                  <p className="text-sm leading-6 text-muted-foreground">
                    Bạn đã ghép đúng {matchedIds.size} cặp với {mistakes} lỗi.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={handleRestartSameConfig}>
                    <RotateCcw className="size-4" />
                    Chơi lại cùng cấu hình
                  </Button>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Tạo phiên mới
                  </Button>
                  <Button disabled={saved || saving} onClick={handleSave}>
                    <Save className="size-4" />
                    {saved ? "Đã lưu" : "Lưu kết quả"}
                  </Button>
                </div>
              </div>
            </Panel>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 rounded-md border border-border bg-card p-3">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tạo phiên mới
              </Button>
            </div>
          )}

          {error ? <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}
        </>
      ) : null}
    </div>
  )
}

function MatchColumn({
  title,
  cards,
  selectedId,
  matchedIds,
  mismatchId,
  onSelect,
}: {
  title: string
  cards: MatchCard[]
  selectedId: string | null
  matchedIds: Set<string>
  mismatchId: string | null
  onSelect: (questionId: string) => void
}) {
  return (
    <Panel title={title} className="h-full">
      <div className="grid gap-3">
        {cards.map((card) => {
          const matched = matchedIds.has(card.questionId)
          const selected = selectedId === card.questionId
          const wrong = mismatchId === card.questionId
          return (
            <button
              key={card.id}
              type="button"
              disabled={matched}
              onClick={() => onSelect(card.questionId)}
              className={cn(
                "min-h-20 rounded-md border border-border bg-background px-4 py-3 text-left text-sm leading-6 shadow-sm transition-colors hover:bg-muted disabled:cursor-default",
                selected && "border-primary bg-muted",
                wrong && "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
                matched && "border-emerald-300 bg-emerald-50 text-emerald-800 opacity-80 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
              )}
            >
              {card.text}
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}

function secondsUntil(value?: string | null) {
  if (!value) return null
  return Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 1000))
}

function elapsedSeconds(session: PracticeSession) {
  const end = session.completedAt ? new Date(session.completedAt).getTime() : Date.now()
  return Math.max(0, Math.round((end - new Date(session.createdAt).getTime()) / 1000))
}
