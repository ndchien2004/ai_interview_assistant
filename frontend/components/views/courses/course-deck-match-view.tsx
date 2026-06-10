"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/views/courses/course-deck-cards-view"
import { cn } from "@/lib/utils"
import { getCourseDeck } from "@/services/course-service"
import { createMatchSession, submitMatchResult } from "@/services/practice-service"
import type { CourseSection, PracticeSession } from "@/types"

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
    () => shuffle(questions.map((question) => ({ id: `q-${question.id}`, questionId: question.id, text: question.question }))),
    [questions]
  )
  const answers = useMemo(
    () => shuffle(questions.map((question) => ({ id: `a-${question.id}`, questionId: question.id, text: question.shortAnswer }))),
    [questions]
  )

  useEffect(() => {
    if (!selectedPrompt || !selectedAnswer) return
    const correct = selectedPrompt === selectedAnswer
    if (correct) {
      setMatchedIds((current) => new Set([...current, selectedPrompt]))
    } else {
      setMistakes((current) => current + 1)
    }
    window.setTimeout(() => {
      setSelectedPrompt(null)
      setSelectedAnswer(null)
    }, 250)
  }, [selectedAnswer, selectedPrompt])

  const complete = questions.length > 0 && matchedIds.size === questions.length
  const resolvedBackHref = backHref ?? (deckSlug ? `/courses/${courseSlug}/decks/${deckSlug}` : `/courses/${courseSlug}`)

  const handleSave = async () => {
    if (!session) return
    setError("")
    try {
      await submitMatchResult(session, Array.from(matchedIds), mistakes, elapsedSeconds(session))
      setSaved(true)
    } catch {
      setError("Không thể lưu kết quả ghép thẻ.")
    }
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được ghép thẻ" description={error} />
  if (!deck || !session) return <StateBlock title="Đang chuẩn bị ghép thẻ" description="Đang xáo câu hỏi và đáp án..." />

  return (
    <div className="space-y-7">
      <Header href={resolvedBackHref} label={deck.title} title="Ghép thẻ" />
      {!questions.length ? <StateBlock title="Không có câu hỏi" description="Không có câu phù hợp với cấu hình ghép thẻ." /> : null}
      {questions.length ? (
        <>
          <section className="grid gap-4 border-y border-border py-4 sm:grid-cols-4">
            <Metric label="Đã ghép" value={`${matchedIds.size}/${questions.length}`} />
            <Metric label="Lỗi" value={mistakes.toString()} />
            <Metric label="Thời gian" value={remainingSeconds === null ? "Không giới hạn" : formatTime(remainingSeconds)} />
            <Metric label="Trạng thái" value={saved ? "Đã lưu" : complete ? "Hoàn thành" : "Đang chơi"} />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <Column cards={prompts} selectedId={selectedPrompt} matchedIds={matchedIds} onSelect={setSelectedPrompt} />
            <Column cards={answers} selectedId={selectedAnswer} matchedIds={matchedIds} onSelect={setSelectedAnswer} />
          </section>
          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap justify-between gap-2 border-y border-border py-4">
            <Button variant="outline" asChild>
              <Link href={resolvedBackHref}>Tạo phiên mới</Link>
            </Button>
            <Button disabled={!complete || saved} onClick={handleSave}>
              Lưu kết quả
            </Button>
          </div>
        </>
      ) : null}
    </div>
  )
}

function Column({
  cards,
  selectedId,
  matchedIds,
  onSelect,
}: {
  cards: MatchCard[]
  selectedId: string | null
  matchedIds: Set<string>
  onSelect: (questionId: string) => void
}) {
  return (
    <div className="grid gap-3">
      {cards.map((card) => {
        const matched = matchedIds.has(card.questionId)
        return (
          <button
            key={card.id}
            type="button"
            disabled={matched}
            onClick={() => onSelect(card.questionId)}
            className={cn(
              "min-h-16 rounded-md border border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted disabled:cursor-default",
              selectedId === card.questionId && "border-foreground bg-muted",
              matched && "border-emerald-300 bg-emerald-50 text-emerald-700"
            )}
          >
            {card.text}
          </button>
        )
      })}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
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
  return Math.max(0, Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000))
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
