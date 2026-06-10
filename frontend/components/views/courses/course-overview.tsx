"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, Brain, ClipboardCheck, Gamepad2, Library } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"

import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { getCourse, getCourseProgress } from "@/services/course-service"
import type { Course, CourseProgress, CourseSection, TopicProgress } from "@/types"

const courseSlug = "java-fullstack-flashcard-bank"

export function CourseOverview() {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

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

    return () => {
      active = false
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
      <section className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BookOpen className="size-4" />
            Trang chủ
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Java Full-stack</h1>
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

      <section className="rounded-md border border-border bg-card p-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm text-muted-foreground">Học tiếp</p>
            <h2 className="mt-1 text-xl font-semibold">{nextDeck?.title ?? "Chưa có bộ thẻ"}</h2>
            {nextDeck ? <p className="mt-1 text-sm text-muted-foreground">{nextDeck.questions.length} câu hỏi</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {nextDeck ? (
              <>
                <QuickAction href={`${baseDeckHref}/learn`} icon={Brain} label="Học" />
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
      className="grid gap-3 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/35 hover:bg-muted/30 sm:grid-cols-[1fr_180px_auto] sm:items-center"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{section.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{section.questions.length} câu hỏi</p>
      </div>
      <div>
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{mastered}/{total}</span>
          <span>{percentage}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <ArrowRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={href}>
        <Icon className="size-4" />
        {label}
      </Link>
    </Button>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}

function deckPriority(item: { section: CourseSection; progress?: TopicProgress }) {
  const remaining = item.section.questions.length - (item.progress?.mastered ?? 0)
  return (item.progress?.due ?? 0) * 10 + (item.progress?.learning ?? 0) * 5 + remaining
}
