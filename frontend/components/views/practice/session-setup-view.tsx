"use client"

import { Brain, CheckSquare, Gamepad2, Layers3, Minus, Play, Plus, Search, Shuffle, Timer } from "lucide-react"
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
import {
  difficultyLabel,
  FilterChip,
  MetricStrip,
  Panel,
  SegmentedControl,
  SessionTopBar,
  statusLabel,
} from "./session-ui"

type SetupMode = Extract<PracticeSessionMode, "LEARN" | "TEST" | "MATCH">
const MATCH_MAX_PAIRS = 7

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
    return () => {
      active = false
    }
  }, [courseSlug])

  const scopedDeck = useMemo(() => course?.sections?.find((deck) => deck.slug === deckSlug) ?? null, [course, deckSlug])
  const scopedQuestions = useMemo(
    () => (scopedDeck ? scopedDeck.questions : course?.sections?.flatMap((deck) => deck.questions) ?? []),
    [course, scopedDeck]
  )
  const availableDifficulties = useMemo(
    () => Array.from(new Set(scopedQuestions.map((question) => question.difficulty))),
    [scopedQuestions]
  )

  useEffect(() => {
    let active = true
    if (!course) return
    listCourseQuestions(courseSlug, {
      deckSlug,
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
  }, [course, courseSlug, deckSlug, difficulties, query, status])

  const maxQuestions = mode === "MATCH" ? Math.min(preview.length, MATCH_MAX_PAIRS) : preview.length
  const effectiveLimit = maxQuestions ? Math.max(1, Math.min(questionLimit || 1, maxQuestions)) : 0
  const modeCopy = modeContent(mode)
  const itemLabel = mode === "LEARN" ? "thẻ" : mode === "MATCH" ? "cặp" : "câu"

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

  if (loading) {
    return <StateBlock title="Đang tải cấu hình" description="Đang chuẩn bị các tùy chọn cho phiên học." />
  }

  if (!course) {
    return <StateBlock tone="error" title="Không mở được học phần" description={error || "Vui lòng thử lại."} />
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <SessionTopBar
        title={modeCopy.title}
        eyebrow={modeCopy.eyebrow}
        icon={modeCopy.icon}
        backHref={backHref}
        backLabel={backLabel}
        meta={`Đang hiển thị ${maxQuestions} câu hỏi`}
      />

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Panel title="Nội dung phiên" description="Phiên này tự lấy câu hỏi trong học phần hoặc bộ thẻ bạn vừa mở.">
            <div className="flex items-start gap-3 rounded-md border border-border bg-background p-3">
              <Layers3 className="mt-0.5 size-4 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{scopedDeck?.title ?? course.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {scopedQuestions.length} câu hỏi trong {scopedDeck ? "bộ thẻ hiện tại" : "học phần hiện tại"}
                </p>
              </div>
            </div>
          </Panel>

          <Panel title="Bộ lọc" description="Thu hẹp theo từ khóa, độ khó hoặc trạng thái học thật của bạn.">
            <div className="space-y-5">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Tìm kiếm</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Tìm câu hỏi, đáp án, tag..."
                    className="pl-9"
                  />
                </div>
              </label>

              <div className="grid gap-2 text-sm">
                <span className="font-medium">Trạng thái</span>
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

              <CheckGroup
                title="Độ khó"
                values={availableDifficulties}
                selected={difficulties}
                labelFor={difficultyLabel}
                onToggle={(value) => setDifficulties((current) => toggle(current, value))}
              />
            </div>
          </Panel>
        </div>

        <aside className="space-y-5 lg:sticky lg:top-36 lg:self-start">
          <Panel title="Cấu hình phiên">
            <div className="space-y-5">
              <div className="grid gap-2 text-sm">
                <span className="font-medium">Số {itemLabel}</span>
                <div className="grid grid-cols-[40px_1fr_40px] gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!maxQuestions || effectiveLimit <= 1}
                    onClick={() => setQuestionLimit((current) => Math.max(1, current - 1))}
                    aria-label={`Giảm số ${itemLabel}`}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={Math.max(1, maxQuestions)}
                    value={questionLimit}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setQuestionLimit(maxQuestions ? Math.max(1, Math.min(next, maxQuestions)) : next)
                    }}
                    className="text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!maxQuestions || effectiveLimit >= maxQuestions}
                    onClick={() => setQuestionLimit((current) => Math.min(maxQuestions, current + 1))}
                    aria-label={`Tăng số ${itemLabel}`}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              <ToggleRow selected={timeEnabled} onClick={() => setTimeEnabled((current) => !current)} icon={Timer} label="Giới hạn thời gian" />
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
              <ToggleRow selected={shuffle} onClick={() => setShuffle((current) => !current)} icon={Shuffle} label={mode === "LEARN" ? "Xáo trộn thẻ" : "Trộn thứ tự câu"} />
            </div>
          </Panel>

          <MetricStrip
            className="grid-cols-2 lg:grid-cols-2"
            items={[
              { label: "Phù hợp", value: maxQuestions.toString() },
              { label: "Sẽ lấy", value: effectiveLimit.toString() },
              { label: "Thời gian", value: timeEnabled ? `${timeLimitMinutes} phút` : "Tự do" },
              { label: "Trạng thái", value: statusLabel(status) },
            ]}
          />

          <Panel title="Sẵn sàng bắt đầu">
            <div className="space-y-3">
              {!preview.length ? (
                <p className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Không có câu hỏi phù hợp với bộ lọc hiện tại.
                </p>
              ) : null}
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button className="w-full" onClick={handleStart} disabled={!preview.length || starting}>
                <Play className="size-4" />
                {starting ? "Đang tạo phiên..." : "Bắt đầu"}
              </Button>
            </div>
          </Panel>
        </aside>
      </section>
    </div>
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
          <FilterChip key={value} selected={selected.includes(value)} onClick={() => onToggle(value)}>
            {labelFor(value)}
          </FilterChip>
        ))}
      </div>
    </div>
  )
}

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
      className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
    >
      <span className="flex items-center gap-2 font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </span>
      <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${selected ? "bg-primary" : "bg-muted"}`}>
        <span className={`block size-4 rounded-full bg-background transition-transform ${selected ? "translate-x-4" : ""}`} />
      </span>
    </button>
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
  return { title: "Cấu hình flashcard", eyebrow: "Học", icon: Brain }
}
