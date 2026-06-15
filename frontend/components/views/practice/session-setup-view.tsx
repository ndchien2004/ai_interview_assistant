"use client"

import { Brain, CheckSquare, Gamepad2, Layers3, Minus, Play, Plus, Search, Shuffle, Timer } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Input } from "@/components/ui/input"
import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"
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
import { difficultyLabel } from "./session-ui"

type SetupMode = Extract<PracticeSessionMode, "LEARN" | "TEST" | "MATCH">
const MATCH_MAX_PAIRS = 7

// ─── Design tokens ────────────────────────────────────────────────────────────
// Light: white surfaces, slate-100 borders
// Dark: near-background glass surfaces with neutral borders

const surface =
  neo.section

const subtleRow =
  neo.row

// ─── SessionTopBar (compact) ──────────────────────────────────────────────────
function SessionTopBar({
  title,
  eyebrow,
  icon: Icon,
  backHref,
  backLabel,
  meta,
}: {
  title: string
  eyebrow: string
  icon: React.ComponentType<{ className?: string }>
  backHref: string
  backLabel: string
  meta: string
}) {
  return (
    <header className="flex shrink-0 items-end justify-between gap-5 pb-3">
      <div>
        <a
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border-2 border-transparent px-1 text-base font-extrabold text-muted-foreground transition-colors hover:border-[#172018] hover:bg-[#fef08a] hover:text-[#172018] dark:hover:border-white/80"
        >
          <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          {backLabel}
        </a>
        <div className="flex items-center gap-2 text-sm font-extrabold text-muted-foreground">
          <Icon className="size-4" />
          {eyebrow}
        </div>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      </div>
      <span className={cn("shrink-0 px-4 py-2 text-sm", neo.pill, neo.tones.sky)}>
        {meta}
      </span>
    </header>
  )
}

// ─── Panel ────────────────────────────────────────────────────────────────────
function Panel({
  title,
  children,
  className,
}: {
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(surface, "px-5 py-4", className)}>
      {title && (
        <p className="mb-3 text-xs font-extrabold uppercase tracking-normal text-muted-foreground">
          {title}
        </p>
      )}
      {children}
    </div>
  )
}

// ─── SegmentedControl ─────────────────────────────────────────────────────────
function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-md border-2 border-[#172018] bg-muted/40 p-1 shadow-[4px_4px_0_#172018] dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-sm border-2 border-transparent px-4 py-2.5 text-base font-extrabold transition-all duration-150",
            value === opt.value
              ? "border-[#172018] bg-[#fef08a] text-[#172018] shadow-[2px_2px_0_#172018] dark:border-white/80 dark:bg-accent dark:text-accent-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── FilterChip ───────────────────────────────────────────────────────────────
function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 px-4 py-2 text-base font-extrabold shadow-[3px_3px_0_#172018] duration-150 active:translate-x-1 active:translate-y-1 active:shadow-none dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
        neo.interactive,
        selected
          ? "border-[#172018] bg-[#fef08a] text-[#172018] dark:border-white/80"
          : "border-[#172018] bg-white text-[#172018] hover:bg-[#fef08a] dark:border-white/80 dark:bg-card dark:text-card-foreground"
      )}
    >
      {children}
    </button>
  )
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────
function ToggleRow({
  selected,
  onClick,
  icon: Icon,
  label,
}: {
  selected: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        subtleRow,
        "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-base"
      )}
    >
      <span className="flex items-center gap-2 font-extrabold text-foreground">
        <Icon className="size-5 text-muted-foreground" />
        {label}
      </span>
      {/* Toggle pill */}
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-[#172018] p-0.5 shadow-[2px_2px_0_#172018] transition-colors duration-200 dark:border-white/80 dark:shadow-[2px_2px_0_rgba(255,255,255,0.24)]",
          selected ? "bg-[#fef08a]" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "block size-4 rounded-full border border-[#172018] bg-white transition-transform duration-200",
            selected ? "translate-x-5" : "translate-x-0"
          )}
        />
      </span>
    </button>
  )
}

// ─── CheckGroup ───────────────────────────────────────────────────────────────
function CheckGroup<T extends string>({
  title,
  values,
  selected,
  labelFor = (v: T) => v,
  onToggle,
}: {
  title: string
  values: T[]
  selected: T[]
  labelFor?: (v: T) => string
  onToggle: (v: T) => void
}) {
  if (!values.length) return null
  return (
    <div className="space-y-2">
      <p className="text-base font-extrabold text-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((v) => (
          <FilterChip key={v} selected={selected.includes(v)} onClick={() => onToggle(v)}>
            {labelFor(v)}
          </FilterChip>
        ))}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toggle<T>(values: T[], value: T) {
  return values.includes(value) ? values.filter((i) => i !== value) : [...values, value]
}

function statusLabel(s: FlashcardStatusFilter) {
  if (s === "UNSEEN") return "Chưa học"
  if (s === "LEARNING") return "Đang học"
  if (s === "MASTERED") return "Đã thuộc"
  return "Tất cả"
}

function modeContent(mode: SetupMode) {
  if (mode === "TEST") return { title: "Cấu hình bài kiểm tra", eyebrow: "Kiểm tra", icon: CheckSquare }
  if (mode === "MATCH") return { title: "Cấu hình ghép thẻ", eyebrow: "Ghép thẻ", icon: Gamepad2 }
  return { title: "Cấu hình flashcard", eyebrow: "Học", icon: Brain }
}

// ─── Main component ───────────────────────────────────────────────────────────
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
  // ── All original state & logic unchanged ──────────────────────────────────
  const [course, setCourse] = useState<Course | null>(null)
  const [difficulties, setDifficulties] = useState<QuestionDifficulty[]>([])
  const [status, setStatus] = useState<FlashcardStatusFilter>("ALL")
  const [query, setQuery] = useState("")
  const [questionLimit, setQuestionLimit] = useState(mode === "MATCH" ? MATCH_MAX_PAIRS : 20)
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
    return () => { active = false }
  }, [courseSlug])

  const scopedDeck = useMemo(
    () => course?.sections?.find((deck) => deck.slug === deckSlug) ?? null,
    [course, deckSlug]
  )
  const scopedQuestions = useMemo(
    () => (scopedDeck ? scopedDeck.questions : course?.sections?.flatMap((deck) => deck.questions) ?? []),
    [course, scopedDeck]
  )
  const availableDifficulties = useMemo(
    () => Array.from(new Set(scopedQuestions.map((q) => q.difficulty))),
    [scopedQuestions]
  )

  useEffect(() => {
    let active = true
    if (!course) return
    listCourseQuestions(courseSlug, { deckSlug, difficulties, status, query })
      .then((questions) => { if (active) setPreview(questions) })
      .catch(() => { if (active) setPreview([]) })
    return () => { active = false }
  }, [course, courseSlug, deckSlug, difficulties, query, status])

  const maxQuestions = mode === "MATCH" ? Math.min(preview.length, MATCH_MAX_PAIRS) : preview.length
  const effectiveLimit = maxQuestions ? Math.max(1, Math.min(questionLimit || 1, maxQuestions)) : 0
  const modeCopy = modeContent(mode)
  const itemLabel = mode === "LEARN" ? "thẻ" : mode === "MATCH" ? "cặp" : "câu"

  if (loading) return <LoadingSpinner />

  const handleStart = async () => {
    if (!preview.length || starting) return
    setStarting(true)
    setError("")
    try {
      const filters = {
        deckSlug,
        difficulties,
        status,
        query,
        questionLimit: effectiveLimit,
        timeLimitMinutes: timeEnabled ? timeLimitMinutes : undefined,
        shuffle,
        feedbackMode: mode === "TEST" ? ("END_ONLY" as const) : ("IMMEDIATE" as const),
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

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return <StateBlock title="Đang tải cấu hình" description="Đang chuẩn bị các tùy chọn cho phiên học." />
  }
  if (!course) {
    return <StateBlock tone="error" title="Không mở được học phần" description={error || "Vui lòng thử lại."} />
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 overflow-visible px-5 pb-8 pr-7 md:px-8 md:pr-10 lg:min-h-[calc(100dvh-8rem)]">
      {/* ── Header ── */}
      <SessionTopBar
        title={modeCopy.title}
        eyebrow={modeCopy.eyebrow}
        icon={modeCopy.icon}
        backHref={backHref}
        backLabel={backLabel}
        meta={`${maxQuestions} câu hỏi`}
      />

      {/* ── Two-column body ── */}
      <div className="grid flex-1 gap-6 overflow-visible lg:grid-cols-[minmax(0,1fr)_400px]">

        {/* ── Left column: scope info + filters ── */}
        <div className="space-y-5 overflow-visible">

          {/* Scope row — compact, informational only */}
          <div
            className={cn(
              subtleRow,
              "flex items-center gap-4 px-5 py-4"
            )}
          >
            <Layers3 className="size-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div className="min-w-0">
              <p className="truncate text-base font-extrabold text-foreground">
                {scopedDeck?.title ?? course.title}
              </p>
              <p className="text-sm font-medium text-muted-foreground">
                {scopedQuestions.length} câu trong {scopedDeck ? "bộ thẻ này" : "học phần này"}
              </p>
            </div>
          </div>

          {/* Filters panel */}
          <Panel title="Bộ lọc" className="min-h-0">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm câu hỏi, đáp án, tag..."
                  className="h-12 pl-12 text-base"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <p className="text-base font-medium text-slate-700 dark:text-zinc-300">Trạng thái</p>
                <SegmentedControl
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "ALL", label: "Tất cả" },
                    { value: "UNSEEN", label: "Chưa học" },
                    { value: "LEARNING", label: "Đang học" },
                    { value: "MASTERED", label: "Đã thuộc" },
                  ]}
                />
              </div>

              {/* Difficulty chips */}
              <CheckGroup
                title="Độ khó"
                values={availableDifficulties}
                selected={difficulties}
                labelFor={difficultyLabel}
                onToggle={(v) => setDifficulties((cur) => toggle(cur, v))}
              />
            </div>
          </Panel>
        </div>

        {/* ── Right column: config + start ── */}
        <aside className="space-y-5 overflow-visible lg:self-start">

          {/* Session config */}
          <Panel title="Cấu hình phiên">
            <div className="space-y-3">

              {/* Question count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-medium text-slate-700 dark:text-zinc-300">
                    Số {itemLabel}
                  </span>
                  <span className="text-sm text-slate-400 dark:text-zinc-500">
                    {effectiveLimit}/{maxQuestions || "—"}
                  </span>
                </div>
                <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!maxQuestions || effectiveLimit <= 1}
                    onClick={() => setQuestionLimit((c) => Math.max(1, c - 1))}
                    aria-label={`Giảm số ${itemLabel}`}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#172018] bg-white text-[#172018] shadow-[3px_3px_0_#172018] duration-150 hover:bg-[#fef08a] active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
                      neo.interactive,
                      "disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    <Minus className="size-4" />
                  </button>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, maxQuestions)}
                    value={questionLimit}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      setQuestionLimit(maxQuestions ? Math.max(1, Math.min(next, maxQuestions)) : next)
                    }}
                    className="h-11 text-center text-base font-extrabold"
                  />
                  <button
                    type="button"
                    disabled={!maxQuestions || effectiveLimit >= maxQuestions}
                    onClick={() => setQuestionLimit((c) => Math.min(maxQuestions, c + 1))}
                    aria-label={`Tăng số ${itemLabel}`}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#172018] bg-white text-[#172018] shadow-[3px_3px_0_#172018] duration-150 hover:bg-[#fef08a] active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
                      neo.interactive,
                      "disabled:pointer-events-none disabled:opacity-40"
                    )}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              {/* Toggle rows */}
              <ToggleRow
                selected={timeEnabled}
                onClick={() => setTimeEnabled((c) => !c)}
                icon={Timer}
                label="Giới hạn thời gian"
              />

              {timeEnabled && (
                <div className="space-y-2">
                  <span className="text-base font-medium text-slate-700 dark:text-zinc-300">Số phút</span>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    value={timeLimitMinutes}
                    onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                    className="h-11 text-base"
                  />
                </div>
              )}

              <ToggleRow
                selected={shuffle}
                onClick={() => setShuffle((c) => !c)}
                icon={Shuffle}
                label={mode === "LEARN" ? "Xáo trộn thẻ" : "Trộn thứ tự câu"}
              />
            </div>
          </Panel>

          {/* Start section */}
          <div className="space-y-2">
            {!preview.length && (
              <p className={cn(neo.notice, "bg-[#fef08a]")}>
                Không có câu hỏi phù hợp với bộ lọc hiện tại.
              </p>
            )}
            {error && (
              <p className={cn(neo.notice, "border-destructive bg-destructive/10 text-destructive")}>{error}</p>
            )}

            {/* CTA — signature element */}
            <button
              type="button"
              onClick={handleStart}
              disabled={!preview.length || starting}
              className={cn(
                "group w-full overflow-hidden rounded-md border-2 border-[#172018] bg-[#172018] px-6 py-3.5 text-base font-extrabold text-white shadow-[6px_6px_0_#f59e0b] duration-200",
                neo.interactive,
                "hover:bg-[#2d3b2f] hover:shadow-[7px_7px_0_#f59e0b]",
                "active:translate-x-1 active:translate-y-1 active:shadow-none",
                "dark:border-white/85 dark:bg-primary dark:text-primary-foreground dark:shadow-[6px_6px_0_rgba(255,255,255,0.28)]",
                "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
              )}
            >
              {/* Shine overlay on hover */}
              <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
              <span className="relative flex items-center justify-center gap-2">
                <Play className="size-4" />
                {starting ? "Đang tạo phiên..." : "Bắt đầu"}
              </span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
