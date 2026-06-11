"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, ClipboardCheck, Gamepad2, Layers3, Upload } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { getCourse, getCourseDeck } from "@/services/course-service"
import type { Course, CourseSection } from "@/types"

export function CourseDeckDetailView({ courseSlug, deckSlug }: { courseSlug: string; deckSlug: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [deck, setDeck] = useState<CourseSection | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([getCourse(courseSlug), getCourseDeck(courseSlug, deckSlug)])
      .then(([courseData, deckData]) => {
        if (!active) return
        setCourse(courseData)
        setDeck(deckData)
      })
      .catch(() => {
        if (active) setError("Không thể tải bộ thẻ.")
      })

    return () => {
      active = false
    }
  }, [courseSlug, deckSlug])

  if (error) {
    return <StateBlock tone="error" title="Không mở được bộ thẻ" description={error} />
  }

  if (!course || !deck) {
    return <StateBlock title="Đang tải bộ thẻ" description="Đang chuẩn bị các lựa chọn học..." />
  }

  const baseHref = `/courses/${course.slug}/decks/${deck.slug}`

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-5 shadow-sm">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/courses/${course.slug}`}>
            <ArrowLeft className="size-4" />
            {course.title}
          </Link>
        </Button>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers3 className="size-4" />
              Bộ thẻ
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{deck.title}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{deck.description}</p>
          </div>
          <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 sm:w-80">
            <Metric label="Câu hỏi" value={deck.questions.length.toString()} compact />
            <Metric label="Học phần" value={course.title} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Action
          href={`${baseHref}/learn`}
          icon={Brain}
          label="Học"
          description="Luyện câu đến hạn, câu mới và câu chưa thuộc."
          primary
        />
        <Action
          href={`${baseHref}/test`}
          icon={ClipboardCheck}
          label="Kiểm tra"
          description="Chọn phạm vi, số câu và thời gian trước khi làm bài."
        />
        <Action
          href={`${baseHref}/match`}
          icon={Gamepad2}
          label="Ghép thẻ"
          description="Ghép câu hỏi với đáp án trong một phiên có cấu hình."
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-4">
        <div>
          <p className="text-sm font-semibold">Quản lý nội dung</p>
          <p className="mt-1 text-sm text-muted-foreground">Thêm câu hỏi vào đúng bộ thẻ này bằng JSON.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`${baseHref}/import`}>
            <Upload className="size-4" />
            Import
          </Link>
        </Button>
      </section>
    </div>
  )
}

function Action({
  href,
  icon: Icon,
  label,
  description,
  primary,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group rounded-md border p-4 shadow-sm transition-colors ${
        primary
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card hover:border-foreground/40 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 shrink-0" />
          <span>{label}</span>
        </div>
        <ArrowRight className={`size-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${primary ? "text-primary-foreground/70" : "text-muted-foreground"}`} />
      </div>
      <p className={`mt-3 text-sm leading-6 ${primary ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{description}</p>
    </Link>
  )
}

function Metric({ label, value, compact }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={`rounded-md border border-border bg-background ${compact ? "min-h-16 p-2.5" : "p-3"}`}>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-lg font-semibold tracking-tight">{value}</p>
    </div>
  )
}
