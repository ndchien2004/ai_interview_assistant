"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight, Brain, ClipboardCheck, Gamepad2, Upload } from "lucide-react"
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
    <div className="space-y-7">
      <section className="border-b border-border pb-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/courses/${course.slug}`}>
            <ArrowLeft className="size-4" />
            {course.title}
          </Link>
        </Button>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{deck.title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{deck.description}</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Action href={`${baseHref}/learn`} icon={Brain} label="Học" description="Luyện câu mới, câu đến hạn và câu chưa thuộc." />
        <Action href={`${baseHref}/test`} icon={ClipboardCheck} label="Kiểm tra" description="Tùy chọn phạm vi, số câu và thời gian." />
        <Action href={`${baseHref}/match`} icon={Gamepad2} label="Ghép thẻ" description="Ghép câu hỏi với đáp án trong một phiên tùy chọn." />
        <Action href={`${baseHref}/import`} icon={Upload} label="Import" description="Thêm JSON vào đúng bộ thẻ này." />
      </section>

      <section className="grid gap-4 border-y border-border py-4 sm:grid-cols-2">
        <Metric label="Câu hỏi" value={deck.questions.length.toString()} />
        <Metric label="Học phần" value={course.title} />
      </section>
    </div>
  )
}

function Action({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-md border border-border bg-card p-4 transition-colors hover:border-foreground/40 hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 shrink-0" />
          <span>{label}</span>
        </div>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </Link>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
