"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock3, Gamepad2, History, RotateCcw, X, XCircle } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { getCourseDeck } from "@/services/course-service"
import { createMatchSession, listPracticeSessions, submitMatchResult } from "@/services/practice-service"
import type { CourseSection, PracticeQuestion, PracticeSession } from "@/types"
import { formatTime, Pill } from "@/components/views/practice/session-ui"

type MatchTile = {
  id: string
  questionId: string
  kind: "prompt" | "answer"
  text: string
}

const MATCH_MAX_PAIRS = 7

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
  const [selectedTile, setSelectedTile] = useState<MatchTile | null>(null)
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set())
  const [mistakes, setMistakes] = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [correctTileIds, setCorrectTileIds] = useState<Set<string>>(new Set())
  const [wrongTileIds, setWrongTileIds] = useState<Set<string>>(new Set())
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history, setHistory] = useState<PracticeSession[]>([])
  const [error, setError] = useState("")
  const saveStartedRef = useRef(false)

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
      })
      .catch(() => {
        if (active) setError("Không thể mở ghép thẻ.")
      })

    return () => {
      active = false
    }
  }, [courseSlug, deckSlug, initialSession])

  const questions = useMemo(
    () => (session?.questions?.length ? session.questions : deck?.questions ?? []).slice(0, Math.min(session?.questionLimit ?? MATCH_MAX_PAIRS, MATCH_MAX_PAIRS)),
    [deck, session]
  )

  const tiles = useMemo(() => {
    void shuffleSeed
    return shuffle(questions.flatMap(questionToTiles))
  }, [questions, shuffleSeed])
  const boardColumns = Math.max(2, Math.ceil(tiles.length / 2))

  const complete = questions.length > 0 && matchedIds.size === questions.length

  useEffect(() => {
    if (!session || complete) return
    const startedAt = new Date(session.createdAt).getTime()
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [complete, session])

  const resolvedBackHref = backHref ?? (deckSlug ? `/courses/${courseSlug}/decks/${deckSlug}` : `/courses/${courseSlug}`)
  const title = deck?.title ? `Ghép thẻ · ${deck.title}` : "Ghép thẻ"
  const progressValue = (matchedIds.size / Math.max(1, questions.length)) * 100

  const loadHistory = async () => {
    const sessions = await listPracticeSessions({
      courseSlug,
      mode: "MATCH",
      deckSlug,
      status: "COMPLETED",
    })
    setHistory(sessions.slice(0, 8))
  }

  useEffect(() => {
    void loadHistory()
  }, [courseSlug, deckSlug])

  useEffect(() => {
    if (!complete || saved || !session || saveStartedRef.current) return
    saveStartedRef.current = true
    let active = true
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000)))
    setSaving(true)
    submitMatchResult(session, Array.from(matchedIds), mistakes, elapsedSeconds)
      .then(() => {
        if (!active) return
        setSaved(true)
        void loadHistory()
      })
      .catch(() => {
        if (active) {
          saveStartedRef.current = false
          setError("Không thể tự lưu kết quả ghép thẻ.")
        }
      })
      .finally(() => {
        if (active) setSaving(false)
      })

    return () => {
      active = false
    }
  }, [complete, elapsedSeconds, matchedIds, mistakes, saved, session])

  const handleTileSelect = (tile: MatchTile) => {
    if (complete || correctTileIds.size || wrongTileIds.size || matchedIds.has(tile.questionId)) return

    if (!selectedTile) {
      setSelectedTile(tile)
      return
    }

    if (selectedTile.id === tile.id) {
      setSelectedTile(null)
      return
    }

    if (selectedTile.kind === tile.kind) {
      setSelectedTile(tile)
      return
    }

    const selectedIds = new Set([selectedTile.id, tile.id])
    if (selectedTile.questionId === tile.questionId) {
      setCorrectTileIds(selectedIds)
      window.setTimeout(() => {
        setMatchedIds((current) => new Set([...current, tile.questionId]))
        setCorrectTileIds(new Set())
        setSelectedTile(null)
      }, 220)
      return
    }

    setMistakes((current) => current + 1)
    setWrongTileIds(selectedIds)
    window.setTimeout(() => {
      setWrongTileIds(new Set())
      setSelectedTile(null)
    }, 480)
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
        shuffle: true,
      })
      setSession(nextSession)
      setMatchedIds(new Set())
      setSelectedTile(null)
      setCorrectTileIds(new Set())
      setWrongTileIds(new Set())
      setMistakes(0)
      setElapsedSeconds(0)
      setSaved(false)
      setSaving(false)
      saveStartedRef.current = false
      setShuffleSeed((value) => value + 1)
    } catch {
      setError("Không thể tạo lại phiên ghép thẻ.")
    }
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được ghép thẻ" description={error} />
  if (!deck || !session) return <StateBlock title="Đang chuẩn bị ghép thẻ" description="Đang xáo câu hỏi và đáp án..." />

  return (
    <div className="-mt-2 mx-auto flex h-[calc(100dvh-8rem)] max-w-7xl flex-col gap-3 overflow-hidden lg:-mt-4">
      <MatchHeader
        title={title}
        backHref={resolvedBackHref}
        backLabel={deck.title}
        matched={matchedIds.size}
        total={questions.length}
        mistakes={mistakes}
        elapsedSeconds={elapsedSeconds}
        saved={saved}
        saving={saving}
        progressValue={progressValue}
        historyCount={history.length}
        onRestart={handleRestartSameConfig}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {!questions.length ? (
        <StateBlock title="Không có câu hỏi" description="Không có câu phù hợp với cấu hình ghép thẻ." />
      ) : (
        <section className="min-h-0 flex-1 overflow-hidden rounded-[1.5rem] border border-border bg-muted/25 p-3 shadow-lg shadow-black/5 dark:bg-muted/15 sm:p-4">
          {complete ? (
            <MatchComplete
              matched={matchedIds.size}
              mistakes={mistakes}
              elapsedSeconds={elapsedSeconds}
              saved={saved}
              saving={saving}
              onRestart={handleRestartSameConfig}
            />
          ) : (
            <div
              className="grid h-full auto-rows-fr grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-[repeat(var(--match-cols),minmax(0,1fr))] xl:grid-rows-2"
              style={{ "--match-cols": boardColumns } as React.CSSProperties}
            >
              {tiles.map((tile) => (
                <MatchTileButton
                  key={tile.id}
                  tile={tile}
                  matched={matchedIds.has(tile.questionId)}
                  selected={selectedTile?.id === tile.id}
                  correct={correctTileIds.has(tile.id)}
                  wrong={wrongTileIds.has(tile.id)}
                  onClick={() => handleTileSelect(tile)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {error ? <p className="shrink-0 rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p> : null}

      {historyOpen ? (
        <MatchHistoryDialog
          sessions={history}
          onClose={() => setHistoryOpen(false)}
        />
      ) : null}
    </div>
  )
}

function MatchHeader({
  title,
  backHref,
  backLabel,
  matched,
  total,
  mistakes,
  elapsedSeconds,
  saved,
  saving,
  progressValue,
  historyCount,
  onRestart,
  onOpenHistory,
}: {
  title: string
  backHref: string
  backLabel: string
  matched: number
  total: number
  mistakes: number
  elapsedSeconds: number
  saved: boolean
  saving: boolean
  progressValue: number
  historyCount: number
  onRestart: () => void
  onOpenHistory: () => void
}) {
  return (
    <header className="shrink-0 space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 h-8">
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
              {backLabel}
            </Link>
          </Button>
          <div className="mt-1 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Gamepad2 className="size-4" />
            Ghép thẻ
          </div>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Pill>{matched}/{total} cặp</Pill>
          <Pill>
            <Clock3 className="size-3.5" />
            {formatTime(elapsedSeconds)}
          </Pill>
          <Pill>{mistakes} lỗi</Pill>
          <Pill>{saved ? "Đã lưu" : saving ? "Đang lưu" : "Đang chơi"}</Pill>
          <Button variant="outline" size="sm" onClick={onOpenHistory} className="rounded-full">
            <History className="size-4" />
            Lịch sử{historyCount ? ` (${historyCount})` : ""}
          </Button>
          <Button variant="outline" size="sm" onClick={onRestart} className="rounded-full">
            <RotateCcw className="size-4" />
            Chơi lại
          </Button>
        </div>
      </div>
      <Progress value={progressValue} />
    </header>
  )
}

function MatchHistoryDialog({
  sessions,
  onClose,
}: {
  sessions: PracticeSession[]
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-background p-5 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Lịch sử chơi</h2>
            <p className="mt-1 text-sm text-muted-foreground">Các phiên ghép thẻ đã hoàn thành gần đây.</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng lịch sử">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {sessions.length ? (
            <div className="divide-y divide-border rounded-md border border-border">
              {sessions.map((session) => (
                <HistoryRow key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Chưa có lịch sử chơi cho bộ thẻ này.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HistoryRow({ session }: { session: PracticeSession }) {
  const completedAt = session.completedAt ?? session.createdAt
  const timeSpent = session.matchTimeSpentSeconds ?? session.attempts.find((attempt) => attempt.timeSpentSeconds != null)?.timeSpentSeconds ?? null
  const mistakes = session.matchMistakeCount
  return (
    <div className="grid gap-3 p-3 text-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-medium">{new Date(completedAt).toLocaleString("vi-VN")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{session.questionCount ?? session.answeredCount ?? session.attempts.length} cặp trong phiên</p>
      </div>
      <Pill>{session.answeredCount ?? session.attempts.length} cặp đúng</Pill>
      <Pill>{mistakes == null ? "— lỗi" : `${mistakes} lỗi`}</Pill>
      <Pill>{timeSpent == null ? "—:—" : formatTime(timeSpent)}</Pill>
    </div>
  )
}

function MatchTileButton({
  tile,
  matched,
  selected,
  correct,
  wrong,
  onClick,
}: {
  tile: MatchTile
  matched: boolean
  selected: boolean
  correct: boolean
  wrong: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={matched}
      aria-hidden={matched}
      className={cn(
        "group relative min-h-0 overflow-hidden rounded-xl border border-border bg-card p-3 text-left text-sm leading-5 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        tile.kind === "answer" && "bg-background",
        selected && "border-foreground bg-muted shadow-md ring-2 ring-foreground/10",
        correct && "scale-95 border-emerald-300 bg-emerald-50 text-emerald-800 opacity-80 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
        wrong && "animate-pulse border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200",
        matched && "pointer-events-none border-transparent bg-transparent opacity-0 shadow-none"
      )}
    >
      <span className="mb-2 inline-flex rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        {tile.kind === "prompt" ? "Câu hỏi" : "Đáp án"}
      </span>
      <span className="line-clamp-5 text-balance font-medium">{tile.text}</span>
    </button>
  )
}

function MatchComplete({
  matched,
  mistakes,
  elapsedSeconds,
  saved,
  saving,
  onRestart,
}: {
  matched: number
  mistakes: number
  elapsedSeconds: number
  saved: boolean
  saving: boolean
  onRestart: () => void
}) {
  return (
    <div className="grid h-full place-items-center">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-background p-6 text-center shadow-sm">
        <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">Hoàn thành ghép thẻ</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Bạn đã ghép đúng {matched} cặp trong {formatTime(elapsedSeconds)} với {mistakes} lỗi.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <ResultStat label="Cặp đúng" value={matched.toString()} />
          <ResultStat label="Lỗi" value={mistakes.toString()} />
          <ResultStat label="Thời gian" value={formatTime(elapsedSeconds)} />
        </div>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={onRestart}>
            <RotateCcw className="size-4" />
            Chơi lại
          </Button>
          <Pill>{saved ? "Đã lưu kết quả" : saving ? "Đang lưu kết quả" : "Chưa lưu"}</Pill>
        </div>
      </div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function questionToTiles(question: PracticeQuestion): MatchTile[] {
  return [
    { id: `prompt-${question.id}`, questionId: question.id, kind: "prompt", text: question.question },
    { id: `answer-${question.id}`, questionId: question.id, kind: "answer", text: question.shortAnswer },
  ]
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
}
