"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Brain, ClipboardCheck, Gamepad2, Library } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { COURSE_PROGRESS_CHANGE_EVENT, getCourse, getCourseProgress } from "@/services/course-service"
import type { Course, CourseProgress, CourseSection, TopicProgress } from "@/types"

const courseSlug = "java-fullstack-flashcard-bank"

export function CourseOverview() {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    const loadOverview = () => {
      Promise.all([getCourse(courseSlug), getCourseProgress(courseSlug)])
        .then(([courseData, progressData]) => {
          if (!active) return
          setCourse(courseData)
          setProgress(progressData)
          setError("")
        })
        .catch(() => {
          if (active) setError("Không thể tải trang chủ Java Full-stack.")
        })
    }

    const handleProgressChange = (event: Event) => {
      const detail = (event as CustomEvent<{ courseSlug?: string }>).detail
      if (detail?.courseSlug && detail.courseSlug !== courseSlug) return
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

  const nextDeck = useMemo(() => {
    return (
      sections
        .map((section) => ({
          section,
          progress: topicProgress[section.title],
        }))
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 rounded-md border border-border bg-card p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="size-4" />
            Trang chủ
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Java Full-stack</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Theo dõi tiến độ và tiếp tục học từ bộ thẻ phù hợp nhất.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/courses/${course.slug}`}>
            <Library className="size-4" />
            Mở học phần
          </Link>
        </Button>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Cần ôn" value={progress.dueQuestions.toString()} />
        <Metric label="Đang học" value={progress.learningQuestions.toString()} />
        <Metric label="Đã thuộc" value={`${progress.masteredQuestions}/${progress.totalQuestions}`} />
      </section>

      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Học tiếp</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{nextDeck?.title ?? "Chưa có bộ thẻ"}</h2>
            {nextDeck ? <p className="mt-1 text-sm text-muted-foreground">{nextDeck.questions.length} câu hỏi</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {nextDeck ? (
              <>
                <QuickAction href={`${baseDeckHref}/learn`} icon={Brain} label="Học" primary />
                <QuickAction href={`${baseDeckHref}/test`} icon={ClipboardCheck} label="Kiểm tra" />
                <QuickAction href={`${baseDeckHref}/match`} icon={Gamepad2} label="Ghép thẻ" />
              </>
            ) : (
              <Button asChild>
                <Link href={`/courses/${course.slug}`}>Tạo bộ thẻ</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Bộ thẻ</h2>
          <p className="text-sm text-muted-foreground">{sections.length} bộ</p>
        </div>
        <div className="grid gap-3">
          {sections.slice(0, 6).map((section) => (
            <DeckRow key={section.id} courseSlug={course.slug} section={section} progress={topicProgress[section.title]} />
          ))}
        </div>
      </section>
    </div>
  )
}

function DeckRow({
  courseSlug,
  section,
  progress,
}: {
  courseSlug: string
  section: CourseSection
  progress?: TopicProgress
}) {
  const mastered = progress?.mastered ?? 0
  const total = progress?.total ?? section.questions.length
  const percentage = progress?.masteryPercentage ?? 0

  return (
    <Link
      href={`/courses/${courseSlug}/decks/${section.slug}`}
      className="grid gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-sm transition-colors hover:border-foreground/35 hover:bg-muted/30 sm:grid-cols-[1fr_220px_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{section.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{section.questions.length} câu hỏi</p>
      </div>
      <div>
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{mastered}/{total} đã thuộc</span>
          <span>{percentage}%</span>
        </div>
        <Progress value={percentage} className="mt-2" />
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  primary?: boolean
}) {
  return (
    <Button variant={primary ? "default" : "outline"} size="sm" asChild>
      <Link href={href}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function deckPriority(item: { section: CourseSection; progress?: TopicProgress }) {
  const remaining = item.section.questions.length - (item.progress?.mastered ?? 0)
  return (item.progress?.due ?? 0) * 10 + (item.progress?.learning ?? 0) * 5 + remaining
}
