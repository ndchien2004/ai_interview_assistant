"use client"

import Link from "next/link"
import { ArrowLeft, Brain, CheckSquare, Gamepad2, Play, Shuffle, Timer } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCourse, listCourseQuestions } from "@/services/course-service"
import { createLearnSession, createMatchSession, createTestSession } from "@/services/practice-service"
import type {
  Course,
  FlashcardStatusFilter,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionMode,
  QuestionDifficulty,
} from "@/types"

type SetupMode = Extract<PracticeSessionMode, "LEARN" | "TEST" | "MATCH">

export function SessionSetupView({
  mode,
  courseSlug,
  deckSlug,
  backHref,
  backLabel,
  onStart,
}: {
  mode: SetupMode
  courseSlug: string
  deckSlug?: string
  backHref: string
  backLabel: string
  onStart: (session: PracticeSession) => void
}) {
  const [course, setCourse] = useState<Course | null>(null)
  const [deckSlugs, setDeckSlugs] = useState<string[]>(deckSlug ? [deckSlug] : [])
  const [topics, setTopics] = useState<string[]>([])
  const [difficulties, setDifficulties] = useState<QuestionDifficulty[]>([])
  const [status, setStatus] = useState<FlashcardStatusFilter>("ALL")
  const [query, setQuery] = useState("")
  const [questionLimit, setQuestionLimit] = useState(mode === "MATCH" ? 12 : 20)
  const [timeEnabled, setTimeEnabled] = useState(false)
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(mode === "TEST" ? 20 : 10)
  const [shuffle, setShuffle] = useState(mode !== "LEARN")
  const [preview, setPreview] = useState<PracticeQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getCourse(courseSlug)
      .then((data) => {
        if (!active) return
        setCourse(data)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setError("Không thể tải học phần.")
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [courseSlug])

  const decks = useMemo(() => [...(course?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [course])
  const availableTopics = useMemo(
    () => Array.from(new Set(decks.flatMap((deck) => deck.questions.map((question) => question.topic)))).sort(),
    [decks]
  )
  const availableDifficulties = useMemo(
    () => Array.from(new Set(decks.flatMap((deck) => deck.questions.map((question) => question.difficulty)))),
    [decks]
  )

  useEffect(() => {
    let active = true
    if (!course) return
    listCourseQuestions(courseSlug, {
      deckSlugs,
      topics,
      difficulties,
      status,
      query,
    })
      .then((questions) => {
        if (active) setPreview(questions)
      })
      .catch(() => {
        if (active) setPreview([])
      })
    return () => {
      active = false
    }
  }, [course, courseSlug, deckSlugs, difficulties, query, status, topics])

  const maxQuestions = Math.max(1, preview.length)
  const effectiveLimit = Math.min(questionLimit, maxQuestions)
  const modeCopy = modeContent(mode)
  const ModeIcon = modeCopy.icon

  const handleStart = async () => {
    if (!preview.length || starting) return
    setStarting(true)
    setError("")
    try {
      const filters = {
        deckSlugs,
        topics,
        difficulties,
        status,
        query,
        questionLimit: effectiveLimit,
        timeLimitMinutes: timeEnabled ? timeLimitMinutes : undefined,
        shuffle,
        feedbackMode: mode === "TEST" ? "END_ONLY" as const : "IMMEDIATE" as const,
      }
      const create = mode === "TEST" ? createTestSession : mode === "MATCH" ? createMatchSession : createLearnSession
      const session = await create(courseSlug, filters)
      onStart(session)
    } catch {
      setError("Không thể bắt đầu phiên mới.")
    } finally {
      setStarting(false)
    }
  }

  if (loading) {
    return <StateBlock title="Đang tải cấu hình" description="Đang chuẩn bị các tùy chọn cho phiên học." />
  }

  if (!course) {
    return <StateBlock tone="error" title="Không mở được học phần" description={error || "Vui lòng thử lại."} />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="border-b border-border pb-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="mt-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ModeIcon className="size-4" />
          {modeCopy.eyebrow}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{modeCopy.title}</h1>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <Panel title="Phạm vi">
            <div className="grid gap-2 sm:grid-cols-2">
              {decks.map((deck) => {
                const selected = deckSlugs.includes(deck.slug)
                return (
                  <label key={deck.slug} className="flex min-h-12 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => setDeckSlugs((current) => toggle(current, deck.slug))}
                      disabled={Boolean(deckSlug) && deck.slug === deckSlug}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{deck.title}</span>
                      <span className="text-xs text-muted-foreground">{deck.questions.length} câu</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {!deckSlug ? (
              <Button variant="outline" size="sm" onClick={() => setDeckSlugs([])}>
                Toàn khóa học
              </Button>
            ) : null}
          </Panel>

          <Panel title="Bộ lọc">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm câu hỏi, đáp án, tag..." />
            <SelectRow
              label="Trạng thái"
              value={status}
              onChange={(value) => setStatus(value as FlashcardStatusFilter)}
              options={[
                ["ALL", "Tất cả"],
                ["UNSEEN", "Chưa học"],
                ["LEARNING", "Đang học"],
                ["MASTERED", "Đã thuộc"],
              ]}
            />
            <CheckGroup title="Topic" values={availableTopics} selected={topics} onToggle={(value) => setTopics((current) => toggle(current, value))} />
            <CheckGroup
              title="Độ khó"
              values={availableDifficulties}
              selected={difficulties}
              labelFor={difficultyLabel}
              onToggle={(value) => setDifficulties((current) => toggle(current, value))}
            />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Cấu hình">
            <label className="grid gap-2 text-sm">
              <span className="font-medium">Số câu</span>
              <Input
                type="number"
                min={1}
                max={maxQuestions}
                value={questionLimit}
                onChange={(event) => setQuestionLimit(Number(event.target.value))}
              />
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={timeEnabled} onChange={(event) => setTimeEnabled(event.target.checked)} />
              <Timer className="size-4" />
              Giới hạn thời gian
            </label>
            {timeEnabled ? (
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Số phút</span>
                <Input
                  type="number"
                  min={1}
                  max={1440}
                  value={timeLimitMinutes}
                  onChange={(event) => setTimeLimitMinutes(Number(event.target.value))}
                />
              </label>
            ) : null}
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" checked={shuffle} onChange={(event) => setShuffle(event.target.checked)} />
              <Shuffle className="size-4" />
              Trộn thứ tự câu
            </label>
          </Panel>

          <Panel title="Preview">
            <Metric label="Câu phù hợp" value={preview.length.toString()} />
            <Metric label="Sẽ lấy" value={preview.length ? effectiveLimit.toString() : "0"} />
            <Metric label="Thời gian" value={timeEnabled ? `${timeLimitMinutes} phút` : "Không giới hạn"} />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button className="w-full" onClick={handleStart} disabled={!preview.length || starting}>
              <Play className="size-4" />
              Bắt đầu
            </Button>
          </Panel>
        </div>
      </section>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 border-y border-border py-4">
      <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<[string, string]>
  onChange: (value: string) => void
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-10 rounded-md border border-border bg-background px-3">
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  )
}

function CheckGroup<T extends string>({
  title,
  values,
  selected,
  labelFor = (value: T) => value,
  onToggle,
}: {
  title: string
  values: T[]
  selected: T[]
  labelFor?: (value: T) => string
  onToggle: (value: T) => void
}) {
  if (!values.length) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={`rounded-md border px-3 py-2 text-sm ${selected.includes(value) ? "border-foreground bg-foreground text-background" : "border-border bg-background"}`}
          >
            {labelFor(value)}
          </button>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

function modeContent(mode: SetupMode) {
  if (mode === "TEST") {
    return { title: "Cấu hình bài kiểm tra", eyebrow: "Kiểm tra", icon: CheckSquare }
  }
  if (mode === "MATCH") {
    return { title: "Cấu hình ghép thẻ", eyebrow: "Ghép thẻ", icon: Gamepad2 }
  }
  return { title: "Cấu hình phiên học", eyebrow: "Học", icon: Brain }
}

function difficultyLabel(value: QuestionDifficulty) {
  if (value === "BEGINNER") return "Cơ bản"
  if (value === "INTERMEDIATE") return "Trung bình"
  return "Nâng cao"
}
