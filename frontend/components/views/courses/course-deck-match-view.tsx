"use client"

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

export function CourseDeckMatchView({ courseSlug, deckSlug }: { courseSlug: string; deckSlug: string }) {
  const [deck, setDeck] = useState<CourseSection | null>(null)
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([getCourseDeck(courseSlug, deckSlug), createMatchSession(courseSlug, { deckSlug })])
      .then(([deckData, sessionData]) => {
        if (!active) return
        setDeck(deckData)
        setSession(sessionData)
      })
      .catch(() => {
        if (active) setError("Không thể mở ghép thẻ.")
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug])

  const questions = useMemo(() => (deck?.questions ?? []).slice(0, 12), [deck])
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

  const handleSave = async () => {
    if (!session) return
    setError("")
    try {
      await submitMatchResult(session, Array.from(matchedIds), mistakes)
      setSaved(true)
    } catch {
      setError("Không thể lưu kết quả ghép thẻ.")
    }
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được ghép thẻ" description={error} />
  if (!deck || !session) return <StateBlock title="Đang chuẩn bị ghép thẻ" description="FreeCard đang xáo câu hỏi và đáp án..." />

  return (
    <div className="space-y-7">
      <Header href={`/courses/${courseSlug}/decks/${deckSlug}`} label={deck.title} title="Ghép thẻ" />
      {!questions.length ? <StateBlock title="Bộ thẻ chưa có câu hỏi" description="Import câu hỏi trước khi chơi ghép thẻ." /> : null}
      {questions.length ? (
        <>
          <section className="grid gap-4 border-y border-border py-4 sm:grid-cols-3">
            <Metric label="Đã ghép" value={`${matchedIds.size}/${questions.length}`} />
            <Metric label="Lỗi" value={mistakes.toString()} />
            <Metric label="Trạng thái" value={saved ? "Đã lưu" : complete ? "Hoàn thành" : "Đang chơi"} />
          </section>
          <section className="grid gap-4 lg:grid-cols-2">
            <Column cards={prompts} selectedId={selectedPrompt} matchedIds={matchedIds} onSelect={setSelectedPrompt} />
            <Column cards={answers} selectedId={selectedAnswer} matchedIds={matchedIds} onSelect={setSelectedAnswer} />
          </section>
          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end border-y border-border py-4">
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
