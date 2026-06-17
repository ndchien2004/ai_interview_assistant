"use client"

import { CheckCircle2, History, RotateCcw, Volume2, VolumeX, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getCourseDeck } from "@/services/course-service"
import {
  cancelPracticeSession,
  createMatchSession,
  listPracticeSessions,
  submitMatchResult,
} from "@/services/practice-service"
import type { CourseSection, PracticeQuestion, PracticeSession } from "@/types"
import { formatTime, Pill } from "@/components/views/practice/session-ui"

type MatchTile = {
  id: string
  questionId: string
  kind: "prompt" | "answer"
  text: string
}

const MATCH_MAX_PAIRS = 6
const MATCH_MUSIC_SRC = "/audio/funny-cartoon-music.mp3"

export function CourseDeckMatchView({
  courseSlug,
  deckSlug,
  initialSession,
  onExitToSetup,
}: {
  courseSlug: string
  deckSlug?: string
  initialSession?: PracticeSession
  backHref?: string
  onExitToSetup?: () => void
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
  const [exitDialogOpen, setExitDialogOpen] = useState(false)
  const [history, setHistory] = useState<PracticeSession[]>([])
  const [error, setError] = useState("")
  const [musicEnabled, setMusicEnabled] = useState(true)
  const audioContextRef = useRef<AudioContext | null>(null)
  const musicRef = useRef<HTMLAudioElement | null>(null)
  const musicEnabledRef = useRef(true)
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

  const complete = questions.length > 0 && matchedIds.size === questions.length

  useEffect(() => {
    if (!session || complete) return
    const startedAt = new Date(session.createdAt).getTime()
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [complete, session])

  useEffect(() => {
    musicEnabledRef.current = musicEnabled
  }, [musicEnabled])

  useEffect(() => {
    const music = new Audio(MATCH_MUSIC_SRC)
    music.loop = true
    music.volume = 0.22
    music.preload = "auto"
    musicRef.current = music

    const playMusic = () => {
      if (!musicEnabledRef.current) return
      void music.play().catch(() => {
        // Some browsers require the first user interaction before audible autoplay.
      })
    }
    const playAfterInteraction = () => {
      if (music.paused) playMusic()
    }

    playMusic()
    window.addEventListener("pointerdown", playAfterInteraction)
    window.addEventListener("keydown", playAfterInteraction)

    return () => {
      window.removeEventListener("pointerdown", playAfterInteraction)
      window.removeEventListener("keydown", playAfterInteraction)
      music.pause()
      musicRef.current = null
    }
  }, [])

  const handleToggleMusic = () => {
    const music = musicRef.current
    if (!music) return

    if (musicEnabled) {
      music.pause()
      setMusicEnabled(false)
      return
    }

    music
      .play()
      .then(() => setMusicEnabled(true))
      .catch(() => setMusicEnabled(false))
  }

  const getAudioContext = () => {
    if (typeof window === "undefined") return null
    const audioWindow = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext
    if (!AudioContextClass) return null
    if (!audioContextRef.current) audioContextRef.current = new AudioContextClass()
    if (audioContextRef.current.state === "suspended") {
      void audioContextRef.current.resume()
    }
    return audioContextRef.current
  }

  const playTone = (frequency: number, duration = 0.08, delay = 0, type: OscillatorType = "sine", volume = 0.04) => {
    const audio = getAudioContext()
    if (!audio) return
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    const start = audio.currentTime + delay
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, start)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  const playSelectSound = () => playTone(520, 0.055, 0, "triangle", 0.03)
  const playMatchSound = () => {
    playTone(660, 0.08, 0, "sine", 0.04)
    playTone(920, 0.12, 0.07, "sine", 0.035)
  }
  const playMissSound = () => {
    playTone(220, 0.12, 0, "sawtooth", 0.025)
    playTone(160, 0.12, 0.08, "sawtooth", 0.02)
  }
  const playWinSound = () => {
    ;[523, 659, 784, 1047].forEach((frequency, index) => {
      playTone(frequency, 0.13, index * 0.08, "triangle", 0.04)
    })
  }

  useEffect(() => {
    let active = true
    listPracticeSessions({
      courseSlug,
      mode: "MATCH",
      deckSlug,
      status: "COMPLETED",
    }).then((sessions) => {
      if (active) setHistory(sessions.slice(0, 8))
    })

    return () => {
      active = false
    }
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
        listPracticeSessions({
          courseSlug,
          mode: "MATCH",
          deckSlug,
          status: "COMPLETED",
        }).then((sessions) => {
          if (active) setHistory(sessions.slice(0, 8))
        })
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
  }, [complete, courseSlug, deckSlug, elapsedSeconds, matchedIds, mistakes, saved, session])

  const handleTileSelect = (tile: MatchTile) => {
    if (complete || correctTileIds.size || wrongTileIds.size || matchedIds.has(tile.questionId)) return

    if (!selectedTile) {
      playSelectSound()
      setSelectedTile(tile)
      return
    }

    if (selectedTile.id === tile.id) {
      setSelectedTile(null)
      return
    }

    if (selectedTile.kind === tile.kind) {
      playSelectSound()
      setSelectedTile(tile)
      return
    }

    const selectedIds = new Set([selectedTile.id, tile.id])
    if (selectedTile.questionId === tile.questionId) {
      const completesGame = matchedIds.size + 1 === questions.length
      playMatchSound()
      setCorrectTileIds(selectedIds)
      window.setTimeout(() => {
        setMatchedIds((current) => new Set([...current, tile.questionId]))
        setCorrectTileIds(new Set())
        setSelectedTile(null)
        if (completesGame) playWinSound()
      }, 220)
      return
    }

    setMistakes((current) => current + 1)
    playMissSound()
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

  const handleCancelAndExit = () => {
    if (session) cancelPracticeSession(session)
    setExitDialogOpen(false)
    onExitToSetup?.()
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được ghép thẻ" description={error} />
  if (!deck || !session) return <StateBlock title="Đang chuẩn bị ghép thẻ" description="Đang xáo câu hỏi và đáp án..." />

  return (
    <div className="relative -m-4 flex min-h-[calc(100dvh-4rem)] flex-col overflow-y-auto overflow-x-hidden bg-background px-4 py-4 text-foreground sm:-m-6 sm:px-8 sm:py-5 lg:-my-8 lg:mx-[-1.5rem] lg:h-[calc(100dvh-4rem)] lg:min-h-0 lg:overflow-hidden lg:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(23,32,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,32,24,0.08)_1px,transparent_1px)] [background-size:52px_52px] dark:opacity-35 dark:[background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)]"
      />
      <MatchHeader
        elapsedSeconds={elapsedSeconds}
        musicEnabled={musicEnabled}
        historyCount={history.length}
        onToggleMusic={handleToggleMusic}
        onOpenHistory={() => setHistoryOpen(true)}
        onRequestExit={() => setExitDialogOpen(true)}
      />

      {!questions.length ? (
        <StateBlock title="Không có câu hỏi" description="Không có câu phù hợp với cấu hình ghép thẻ." />
      ) : (
        <section className="relative z-10 mx-auto flex w-full max-w-[1460px] flex-1 items-start overflow-visible py-4 sm:py-6 lg:min-h-0 lg:items-center lg:overflow-hidden lg:py-8">
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
            <div className="grid h-auto w-full auto-rows-[minmax(104px,1fr)] grid-cols-2 gap-3 pb-5 sm:auto-rows-[minmax(118px,1fr)] sm:grid-cols-3 sm:gap-4 lg:h-full lg:max-h-[720px] lg:auto-rows-fr lg:grid-cols-4 lg:grid-rows-3 lg:gap-4 lg:pb-0">
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

      {exitDialogOpen ? (
        <MatchExitDialog
          onClose={() => setExitDialogOpen(false)}
          onCancelSession={handleCancelAndExit}
        />
      ) : null}
    </div>
  )
}

function MatchHeader({
  elapsedSeconds,
  musicEnabled,
  historyCount,
  onToggleMusic,
  onOpenHistory,
  onRequestExit,
}: {
  elapsedSeconds: number
  musicEnabled: boolean
  historyCount: number
  onToggleMusic: () => void
  onOpenHistory: () => void
  onRequestExit: () => void
}) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between">
      <div className="w-32" aria-hidden="true" />

      <div className="absolute left-1/2 top-1/2 rounded-full border-2 border-[#172018] bg-card px-5 py-2 text-base font-extrabold tabular-nums text-card-foreground shadow-[4px_4px_0_#172018] -translate-x-1/2 -translate-y-1/2 dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
        {formatTime(elapsedSeconds)}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMusic}
          className="grid size-10 place-items-center rounded-md border-2 border-[#172018] bg-card text-card-foreground shadow-[3px_3px_0_#172018] transition-transform hover:-translate-y-0.5 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-white/80 dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]"
          aria-label={musicEnabled ? "Tắt nhạc nền" : "Bật nhạc nền"}
        >
          {musicEnabled ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
        </button>
        <button
          type="button"
          onClick={onOpenHistory}
          className="relative grid size-10 place-items-center rounded-md border-2 border-[#172018] bg-card text-card-foreground shadow-[3px_3px_0_#172018] transition-transform hover:-translate-y-0.5 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-white/80 dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]"
          aria-label="Lịch sử chơi"
          title={historyCount ? `${historyCount} phiên gần đây` : "Lịch sử chơi"}
        >
          <History className="size-5" />
        </button>
        <button
          type="button"
          onClick={onRequestExit}
          className="grid size-10 place-items-center rounded-md border-2 border-[#172018] bg-card text-card-foreground shadow-[3px_3px_0_#172018] transition-transform hover:-translate-y-0.5 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 dark:border-white/80 dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]"
          aria-label="Thoát ghép thẻ"
        >
          <X className="size-5" />
        </button>
      </div>
    </header>
  )
}

function MatchExitDialog({
  onClose,
  onCancelSession,
}: {
  onClose: () => void
  onCancelSession: () => void
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-exit-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-md border-2 border-[#172018] bg-background p-5 shadow-[9px_9px_0_#172018] dark:border-white/80 dark:shadow-[9px_9px_0_rgba(255,255,255,0.24)]"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="match-exit-dialog-title" className="text-base font-extrabold">
              Rời phiên ghép thẻ?
            </h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              Nếu hủy phiên, tiến trình ghép thẻ hiện tại sẽ không được giữ lại và bạn sẽ quay về màn cấu hình ghép thẻ.
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr]">
          <Button variant="destructive" onClick={onCancelSession}>
            Hủy phiên
          </Button>
          <Button variant="outline" onClick={onClose}>
            Tiếp tục ghép
          </Button>
        </div>
      </div>
    </div>
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
        "group relative grid min-h-0 place-items-center overflow-hidden rounded-md border-2 border-[#172018] bg-card p-3 text-center text-[0.72rem] font-extrabold leading-4 text-card-foreground shadow-[5px_5px_0_#172018] transition-all duration-150 hover:-translate-y-0.5 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:text-xs sm:leading-5 md:text-sm lg:text-[0.86rem] dark:border-white/80 dark:shadow-[5px_5px_0_rgba(255,255,255,0.24)]",
        tile.kind === "answer" && "bg-muted/35",
        selected && "bg-[#fef08a] text-[#172018] hover:bg-[#fde047]",
        correct && "scale-95 bg-[#bbf7d0] text-[#12351d] opacity-80 dark:bg-emerald-950/70 dark:text-emerald-100",
        wrong && "animate-pulse bg-[#fecdd3] text-[#4a0f18] dark:bg-rose-950/70 dark:text-rose-100",
        matched && "pointer-events-none border-transparent bg-transparent opacity-0 shadow-none"
      )}
    >
      <span className="line-clamp-6 max-w-full text-balance break-words sm:line-clamp-5">{tile.text}</span>
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
  const panelRef = useRef<HTMLDivElement | null>(null)
  const fireworksRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const panel = panelRef.current
    const fireworks = fireworksRef.current
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!panel || !fireworks || reduceMotion) return

    const particles = createMatchFireworkParticles(fireworks)
    const timeline = gsap
      .timeline({
        onComplete: () => {
          particles.forEach((particle) => particle.remove())
        },
      })
      .set(panel, { autoAlpha: 0, y: 34, scale: 0.92, rotateZ: -1.2 })
      .set(particles, { autoAlpha: 0, scale: 0.45, x: 0, y: 0 })
      .to(panel, { autoAlpha: 1, y: 0, scale: 1, rotateZ: 0, duration: 0.48, ease: "back.out(1.8)" })
      .to(
        particles,
        {
          autoAlpha: 1,
          scale: 1,
          x: (index) => matchFireworkVector(index, particles.length).x,
          y: (index) => matchFireworkVector(index, particles.length).y,
          duration: 0.68,
          ease: "power3.out",
          stagger: 0.006,
        },
        "-=0.2"
      )
      .to(particles, { autoAlpha: 0, scale: 0.35, duration: 0.24, ease: "power2.in" }, "-=0.14")
      .set(panel, { clearProps: "all" })

    return () => {
      timeline.kill()
      particles.forEach((particle) => particle.remove())
    }
  }, [])

  return (
    <div className="relative grid h-full w-full place-items-center overflow-visible py-6">
      <div ref={fireworksRef} className="pointer-events-none absolute inset-0 z-10 overflow-visible" aria-hidden="true" />
      <div ref={panelRef} className="relative z-20 w-full max-w-xl rounded-md border-2 border-[#172018] bg-card p-5 text-center text-card-foreground shadow-[8px_8px_0_#172018] sm:p-7 dark:border-white/80 dark:shadow-[8px_8px_0_rgba(255,255,255,0.24)]">
        <CheckCircle2 className="mx-auto size-12 text-emerald-700" />
        <h2 className="mt-4 text-3xl font-extrabold tracking-normal">Hoàn thành ghép thẻ</h2>
        <p className="mt-2 text-sm font-medium text-[#526057]">
          Bạn đã ghép đúng {matched} cặp trong {formatTime(elapsedSeconds)} với {mistakes} lỗi.
        </p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <ResultStat label="Cặp đúng" value={matched.toString()} />
          <ResultStat label="Lỗi" value={mistakes.toString()} />
          <ResultStat label="Thời gian" value={formatTime(elapsedSeconds)} />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={onRestart} className="border-2 border-[#172018] bg-[#fef08a] text-[#172018] shadow-[4px_4px_0_#172018] hover:bg-[#fde047] dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
            <RotateCcw className="size-4" />
            Chơi lại
          </Button>
          <span className="inline-flex items-center rounded-md border-2 border-[#172018] bg-[#bbf7d0] px-4 py-2 text-sm font-extrabold text-[#12351d] shadow-[3px_3px_0_#172018] dark:border-white/80 dark:bg-emerald-950/70 dark:text-emerald-100 dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]">
            {saved ? "Đã lưu kết quả" : saving ? "Đang lưu kết quả" : "Chưa lưu"}
          </span>
        </div>
      </div>
    </div>
  )
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border-2 border-[#172018] bg-background p-3 shadow-[3px_3px_0_#172018] dark:border-white/80 dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]">
      <p className="text-xs font-bold text-[#526057]">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-foreground">{value}</p>
    </div>
  )
}

function createMatchFireworkParticles(container: HTMLDivElement) {
  container.innerHTML = ""
  const colors = ["#22c55e", "#38bdf8", "#fef08a", "#fb7185", "#f59e0b", "#172018"]
  return Array.from({ length: 42 }, (_, index) => {
    const particle = document.createElement("span")
    particle.className = "absolute left-1/2 top-1/2 size-2 rounded-full border border-[#172018]/30 shadow-[2px_2px_0_rgba(23,32,24,0.25)]"
    particle.style.backgroundColor = colors[index % colors.length]
    container.appendChild(particle)
    return particle
  })
}

function matchFireworkVector(index: number, total: number) {
  const angle = (Math.PI * 2 * index) / total
  const radius = 92 + (index % 6) * 16
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  }
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
