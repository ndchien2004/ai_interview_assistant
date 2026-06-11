"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Brain, ClipboardCheck, Gamepad2, Library, PlayCircle } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { COURSE_PROGRESS_CHANGE_EVENT, getCourse, getCourseProgress } from "@/services/course-service"
import { listActivePracticeSessions } from "@/services/practice-service"
import type { Course, CourseProgress, CourseSection, PracticeSession, PracticeSessionMode, TopicProgress } from "@/types"
import { cn } from "@/lib/utils"

// ─── All original constants unchanged ────────────────────────────────────────
const courseSlug = "java-fullstack-flashcard-bank"
const courseSlugAliases = new Set([courseSlug, "java-core"])

// ─── Design tokens ─────────────────────────────────────────────────────────
const card =
  "rounded-2xl border border-border bg-card shadow-sm"

const rowItem =
  "rounded-xl border border-border bg-card transition-all duration-150 hover:border-foreground/25 hover:bg-muted/45"

// ─── CourseOverview ───────────────────────────────────────────────────────────
export function CourseOverview() {
  // All original state & logic unchanged
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [activeSessions, setActiveSessions] = useState<PracticeSession[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const loadOverview = () => {
      Promise.all([getCourse(courseSlug), getCourseProgress(courseSlug), listActivePracticeSessions(courseSlug)])
        .then(([courseData, progressData, sessions]) => {
          if (!active) return
          setCourse(courseData)
          setProgress(progressData)
          setActiveSessions(sessions)
          setError("")
        })
        .catch(() => {
          if (active) setError("Không thể tải trang chủ Java Full-stack.")
        })
    }

    const handleProgressChange = (event: Event) => {
      const detail = (event as CustomEvent<{ courseSlug?: string }>).detail
      if (detail?.courseSlug && !courseSlugAliases.has(detail.courseSlug)) return
      loadOverview()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") loadOverview()
    }

    loadOverview()
    window.addEventListener(COURSE_PROGRESS_CHANGE_EVENT, handleProgressChange)
    window.addEventListener("focus", loadOverview)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      active = false
      window.removeEventListener(COURSE_PROGRESS_CHANGE_EVENT, handleProgressChange)
      window.removeEventListener("focus", loadOverview)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  const sections = useMemo(
    () => [...(course?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [course]
  )

  const topicProgress = useMemo(() => {
    return Object.fromEntries((progress?.topics ?? []).map((topic) => [topic.topic, topic]))
  }, [progress])

  const deckBySlug = useMemo(() => {
    return Object.fromEntries(sections.map((section) => [section.slug, section]))
  }, [sections])

  const nextDeck = useMemo(() => {
    return (
      sections
        .map((section) => ({ section, progress: topicProgress[section.title] }))
        .sort((a, b) => deckPriority(b) - deckPriority(a))[0]?.section ?? null
    )
  }, [sections, topicProgress])

  if (error) {
    return <StateBlock tone="error" title="Không mở được trang chủ" description={error} />
  }

  if (!course || !progress) {
    return <LoadingSpinner />
  }

  const baseDeckHref = nextDeck ? `/courses/${course.slug}/decks/${nextDeck.slug}` : `/courses/${course.slug}`
  const masteredPct = progress.totalQuestions
    ? Math.round((progress.masteredQuestions / progress.totalQuestions) * 100)
    : 0

  return (
    <div className="mx-auto w-full space-y-6 px-0 pt-3 pb-8">

      {/* ── Hero: title + overall progress + open-course ── */}
      <section className={cn(card, "px-7 py-6")}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="size-4" />
              Trang chủ
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              Java Full-stack
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Theo dõi tiến độ và tiếp tục học từ bộ thẻ phù hợp nhất.
            </p>
          </div>

          {/* Right: metric pills + action */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <MetricPill label="Cần ôn" value={progress.dueQuestions} accent="amber" />
            <MetricPill label="Đang học" value={progress.learningQuestions} accent="blue" />
            <MetricPill label="Đã thuộc" value={`${progress.masteredQuestions}/${progress.totalQuestions}`} accent="green" />
            <Link
              href={`/courses/${course.slug}`}
              className={cn(
                "flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all duration-150 hover:border-foreground/25 hover:bg-muted/50 active:scale-95"
              )}
            >
              <Library className="size-4" />
              Mở học phần
            </Link>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Tổng tiến độ · {progress.attemptedQuestions}/{progress.totalQuestions} đã học
            </span>
            <span className="text-sm font-semibold text-foreground">{masteredPct}% thuộc</span>
          </div>
          <Progress value={masteredPct} className="h-2" />
        </div>
      </section>

      {/* ── Active sessions (if any) ── */}
      {activeSessions.length > 0 && (
        <section className={cn(card, "px-7 py-5")}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Đang học dở
            </p>
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {activeSessions.length} phiên
            </span>
          </div>
          <div className="space-y-2">
            {activeSessions.slice(0, 3).map((session) => (
              <ActiveSessionRow
                key={session.id}
                session={session}
                deck={session.deckSlug ? deckBySlug[session.deckSlug] : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Next deck + quick actions ── */}
      <section className={cn(card, "px-7 py-6")}>
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Học tiếp
        </p>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold tracking-tight text-foreground">
              {nextDeck?.title ?? "Chưa có bộ thẻ"}
            </h2>
            {nextDeck && (
              <p className="mt-1 text-base text-muted-foreground">
                {nextDeck.questions.length} câu hỏi
                {topicProgress[nextDeck.title] && (
                  <> · {topicProgress[nextDeck.title].due ?? 0} cần ôn</>
                )}
              </p>
            )}
          </div>

          {nextDeck ? (
            <div className="flex flex-wrap gap-2">
              {/* Primary CTA */}
              <Link
                href={`${baseDeckHref}/learn`}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-200",
                  "shadow-sm hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-md",
                  "active:translate-y-0 active:scale-[0.98]"
                )}
              >
                <span className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-500 group-hover:translate-x-[100%]" />
                <span className="relative flex items-center gap-1.5">
                  <Brain className="size-4" />
                  Học
                </span>
              </Link>

              {/* Secondary CTAs */}
              {(
                [
                  { href: `${baseDeckHref}/test`, icon: ClipboardCheck, label: "Kiểm tra" },
                  { href: `${baseDeckHref}/match`, icon: Gamepad2, label: "Ghép thẻ" },
                ] as const
              ).map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition-all duration-150 hover:border-foreground/25 hover:bg-muted/50 active:scale-95"
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          ) : (
            <Button asChild>
              <Link href={`/courses/${course.slug}`}>Tạo bộ thẻ</Link>
            </Button>
          )}
        </div>
      </section>

      {/* ── Deck list ── */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Bộ thẻ</h2>
          <span className="text-sm text-muted-foreground">{sections.length} bộ</span>
        </div>
        <div className="space-y-1.5">
          {sections.slice(0, 6).map((section) => (
            <DeckRow
              key={section.id}
              courseSlug={course.slug}
              section={section}
              progress={topicProgress[section.title]}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── MetricPill ──────────────────────────────────────────────────────────────
function MetricPill({
  label,
  value,
}: {
  label: string
  value: string | number
  accent: "amber" | "blue" | "green"
}) {
  return (
    <div className="rounded-xl border border-border bg-muted px-4 py-2 text-center text-foreground">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-bold leading-tight">{value}</p>
    </div>
  )
}

// ─── ActiveSessionRow ────────────────────────────────────────────────────────
function ActiveSessionRow({ session, deck }: { session: PracticeSession; deck?: CourseSection }) {
  const answered = session.answeredCount ?? session.attempts.length
  const total = session.questionCount ?? session.questions?.length ?? 0
  const percentage = total ? Math.round((answered / total) * 100) : 0
  const href = sessionHref(session)

  return (
    <Link
      href={href}
      className={cn(
        rowItem,
        "flex items-center gap-4 px-4 py-3 active:scale-[0.99]"
      )}
    >
      <PlayCircle className="size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-base font-semibold text-foreground">
            {deck?.title ?? "Học phần hiện tại"}
          </p>
          <span className="shrink-0 text-sm text-muted-foreground">
            {formatSessionTime(session.createdAt)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={percentage} className="h-1.5 flex-1" />
          <span className="shrink-0 text-sm font-medium text-muted-foreground">
            {answered}/{total || "?"} · {percentage}%
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── DeckRow ─────────────────────────────────────────────────────────────────
function DeckRow({
  courseSlug,
  section,
  progress,
}: {
  courseSlug: string
  section: CourseSection
  progress?: TopicProgress
}) {
  const attempted = progress?.attempted ?? 0
  const mastered = progress?.mastered ?? 0
  const due = progress?.due ?? 0
  const total = progress?.total ?? section.questions.length
  const masteredPct = total ? Math.round((mastered / total) * 100) : 0
  const attemptedPct = total ? Math.round((attempted / total) * 100) : 0

  return (
    <Link
      href={`/courses/${courseSlug}/decks/${section.slug}`}
      className={cn(
        rowItem,
        "grid items-center gap-4 px-5 py-4 active:scale-[0.99]",
        "sm:grid-cols-[minmax(0,1fr)_260px_auto]"
      )}
    >
      {/* Name + counters */}
      <div className="min-w-0">
        <p className="truncate text-base font-semibold text-foreground">{section.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
          <span>{section.questions.length} câu</span>
          {due > 0 && (
            <span className="font-medium text-foreground">{due} cần ôn</span>
          )}
          {mastered > 0 && (
            <span className="text-foreground">{mastered} thuộc</span>
          )}
        </div>
      </div>

      {/* Progress bars — stacked: attempted (bg) + mastered (fg) */}
      <div className="hidden sm:block">
        <div className="mb-1.5 flex justify-between text-sm text-muted-foreground">
          <span>{attempted}/{total} đã học</span>
          <span>{masteredPct}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          {/* attempted */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-foreground/20"
            style={{ width: `${attemptedPct}%` }}
          />
          {/* mastered on top */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: `${masteredPct}%` }}
          />
        </div>
      </div>

      <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  )
}

// ─── Helpers (all original logic unchanged) ──────────────────────────────────
function sessionHref(session: PracticeSession) {
  const modePath = modePathFor(session.mode)
  if (session.deckSlug) return `/courses/${session.courseSlug}/decks/${session.deckSlug}/${modePath}`
  return `/courses/java-core/${modePath}`
}

function modePathFor(mode?: PracticeSessionMode) {
  if (mode === "TEST") return "test"
  if (mode === "MATCH") return "match"
  return "learn"
}

function modeLabel(mode?: PracticeSessionMode) {
  if (mode === "TEST") return "Kiểm tra"
  if (mode === "MATCH") return "Ghép thẻ"
  return "Học"
}

function formatSessionTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(value))
}

function deckPriority(item: { section: CourseSection; progress?: TopicProgress }) {
  const remaining = item.section.questions.length - (item.progress?.mastered ?? 0)
  return (item.progress?.due ?? 0) * 10 + (item.progress?.learning ?? 0) * 5 + remaining
}
