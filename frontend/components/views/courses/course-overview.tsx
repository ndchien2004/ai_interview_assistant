"use client"

import Link from "next/link"
import { ArrowRight, BookOpenCheck, Brain, CalendarClock, ClipboardCheck, Layers3, Library } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { getCourse, getCourseProgress } from "@/services/course-service"
import type { Course, CourseProgress, TopicProgress } from "@/types"

const courseSlug = "java-fullstack-cv-interview-bank"

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

  const topicProgress = useMemo(() => {
    return Object.fromEntries((progress?.topics ?? []).map((topic) => [topic.topic, topic]))
  }, [progress])

  const sections = useMemo(
    () => [...(course?.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [course]
  )

  const nextTopics = useMemo(
    () =>
      progress?.topics
        .map((topic) => ({ ...topic, remaining: topic.total - topic.mastered }))
        .sort((a, b) => b.due - a.due || b.learning - a.learning || b.remaining - a.remaining)
        .slice(0, 5) ?? [],
    [progress]
  )

  const lastStudyLabel = progress?.lastStudyAt ? new Date(progress.lastStudyAt).toLocaleDateString("vi-VN") : "Chưa học"

  if (error) {
    return <StateBlock tone="error" title="Không mở được trang chủ" description={error} />
  }

  if (!course || !progress) {
    return <StateBlock title="Đang tải trang chủ" description="FreeCard đang chuẩn bị học phần và tiến độ của bạn..." />
  }

  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpenCheck className="size-4" />
              Trang chủ học tập
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Java Full-stack</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{course.description}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <Button asChild>
              <Link href="/courses/java-core/learn">
                Học ngay
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/courses/java-core/review-due">
                <CalendarClock className="size-4" />
                Ôn đến hạn
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/courses/java-core/test">
                <ClipboardCheck className="size-4" />
                Kiểm tra
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Học hôm nay</h2>
          <p className="text-sm text-muted-foreground">Lần học gần nhất: {lastStudyLabel}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Cần ôn" value={progress.dueQuestions.toString()} />
          <Metric label="Đang học" value={progress.learningQuestions.toString()} />
          <Metric label="Đã thuộc" value={progress.masteredQuestions.toString()} />
          <Metric label="Chuỗi ngày" value={`${progress.streakDays} ngày`} />
          <Metric label="Tỉ lệ đúng" value={`${progress.accuracyPercentage ?? 0}%`} />
        </div>
      </section>

      <section className="grid gap-7 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Layers3 className="size-4" />
                {sections.length} học phần
              </div>
              <h2 className="mt-1 text-lg font-semibold">Học phần Java Full-stack</h2>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/courses/java-core/cards">
                <Library className="size-4" />
                Duyệt thẻ
              </Link>
            </Button>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {sections.map((section) => {
              const item = topicProgress[section.title]
              return <SectionRow key={section.id} title={section.title} description={section.description} questionCount={section.questions.length} progress={item} />
            })}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="border-y border-border py-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Brain className="size-4" />
              Gợi ý học tiếp
            </div>
            <div className="mt-3 divide-y divide-border">
              {nextTopics.length ? (
                nextTopics.map((topic) => (
                  <Link
                    key={topic.topic}
                    href={`/courses/java-core/learn?topic=${encodeURIComponent(topic.topic)}`}
                    className="flex items-center justify-between gap-3 py-3 text-sm transition-colors hover:text-foreground"
                  >
                    <span>{topic.topic}</span>
                    <span className="text-muted-foreground">{topic.due || topic.learning || topic.remaining}</span>
                  </Link>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">Chưa có dữ liệu gợi ý.</p>
              )}
            </div>
          </div>

          <div className="border-y border-border py-4 text-sm">
            <p className="font-semibold">Tổng quan tiến độ</p>
            <div className="mt-3">
              <div className="flex justify-between gap-3 text-muted-foreground">
                <span>Đã thuộc</span>
                <span>
                  {progress.masteredQuestions}/{progress.totalQuestions}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-foreground" style={{ width: `${progress.masteryPercentage}%` }} />
              </div>
            </div>
            <dl className="mt-4 grid gap-2 text-muted-foreground">
              <div className="flex justify-between gap-3">
                <dt>Tổng câu</dt>
                <dd>{progress.totalQuestions}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Đã làm</dt>
                <dd>{progress.attemptedQuestions}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </section>
    </div>
  )
}

function SectionRow({
  title,
  description,
  questionCount,
  progress,
}: {
  title: string
  description: string
  questionCount: number
  progress?: TopicProgress
}) {
  const mastered = progress?.mastered ?? 0
  const total = progress?.total ?? questionCount
  const percentage = progress?.masteryPercentage ?? 0

  return (
    <div className="grid gap-4 py-5 lg:grid-cols-[1fr_220px_120px] lg:items-center">
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        <p className="mt-2 text-xs text-muted-foreground">{questionCount} câu hỏi</p>
      </div>
      <div>
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {mastered}/{total} đã thuộc
          </span>
          <span>
            {progress?.due ?? 0} cần ôn / {progress?.learning ?? 0} đang học
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/courses/java-core/learn?topic=${encodeURIComponent(title)}`}>Học học phần</Link>
      </Button>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
