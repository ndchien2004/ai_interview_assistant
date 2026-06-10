"use client"

import Link from "next/link"
import { ArrowLeft, CalendarClock, Filter, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCourse, getQuestionProgress, listCourseQuestions } from "@/services/course-service"
import type {
  Course,
  FlashcardStatusFilter,
  PracticeQuestion,
  QuestionDifficulty,
  QuestionProgress,
} from "@/types"

type Filters = {
  topic: string
  difficulty: "ALL" | QuestionDifficulty
  status: FlashcardStatusFilter
  due: boolean
  q: string
}

export function JavaCoreCardsView() {
  const [course, setCourse] = useState<Course | null>(null)
  const [questions, setQuestions] = useState<PracticeQuestion[]>([])
  const [progress, setProgress] = useState<Record<string, QuestionProgress>>({})
  const [filters, setFilters] = useState<Filters>({
    topic: "ALL",
    difficulty: "ALL",
    status: "ALL",
    due: false,
    q: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    getCourse()
      .then((courseData) => {
        if (active) setCourse(courseData)
      })
      .catch(() => {
        if (active) setError("Không thể tải thông tin bộ thẻ.")
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const payload = {
      topic: filters.topic === "ALL" ? undefined : filters.topic,
      difficulty: filters.difficulty === "ALL" ? undefined : filters.difficulty,
      status: filters.status,
      due: filters.due ? true : undefined,
      q: filters.q.trim() || undefined,
    }

    Promise.all([listCourseQuestions("java-fullstack-flashcard-bank", payload), getQuestionProgress()])
      .then(([cards, progressRows]) => {
        if (!active) return
        setQuestions(cards)
        setProgress(Object.fromEntries(progressRows.map((row) => [row.questionId, row])))
        setError("")
      })
      .catch(() => {
        if (active) setError("Không thể tải danh sách câu hỏi.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filters])

  const topics = useMemo(
    () => course?.sections?.map((section) => section.title).filter((topic, index, all) => all.indexOf(topic) === index) ?? [],
    [course]
  )

  if (error && !questions.length) {
    return <StateBlock tone="error" title="Không mở được bộ thẻ" description={error} />
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/courses/java-core">
              <ArrowLeft className="size-4" />
              Java Full-stack
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Duyệt thẻ</h1>
        </div>
        <Button asChild>
          <Link href="/courses/java-core/learn">Học ngay</Link>
        </Button>
      </div>

      <section className="grid gap-3 border-y border-border py-4 lg:grid-cols-[1fr_180px_180px_160px_auto] lg:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.q}
            onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
            placeholder="Tìm câu hỏi"
            className="pl-9"
          />
        </div>
        <select
          value={filters.topic}
          onChange={(event) => setFilters((current) => ({ ...current, topic: event.target.value }))}
          className="h-10 border border-border bg-background px-3 text-sm"
          aria-label="Lọc theo chủ đề"
        >
          <option value="ALL">Tất cả chủ đề</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value as Filters["difficulty"] }))}
          className="h-10 border border-border bg-background px-3 text-sm"
          aria-label="Lọc theo độ khó"
        >
          <option value="ALL">Tất cả mức độ</option>
          <option value="BEGINNER">Cơ bản</option>
          <option value="INTERMEDIATE">Trung bình</option>
          <option value="ADVANCED">Nâng cao</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as FlashcardStatusFilter }))}
          className="h-10 border border-border bg-background px-3 text-sm"
          aria-label="Lọc theo trạng thái"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="UNSEEN">Chưa học</option>
          <option value="LEARNING">Đang học</option>
          <option value="MASTERED">Đã thuộc</option>
        </select>
        <button
          type="button"
          onClick={() => setFilters((current) => ({ ...current, due: !current.due }))}
          className="inline-flex h-10 items-center justify-center gap-2 border border-border px-3 text-sm font-medium transition-colors hover:bg-muted"
          aria-pressed={filters.due}
        >
          {filters.due ? <CalendarClock className="size-4" /> : <Filter className="size-4" />}
          Chỉ câu cần ôn
        </button>
      </section>

      {loading ? <StateBlock title="Đang tải câu hỏi" description="FreeCard đang áp dụng bộ lọc..." /> : null}
      {!loading && !questions.length ? (
        <StateBlock title="Không tìm thấy câu hỏi" description="Hãy đổi bộ lọc hoặc import thêm câu hỏi." />
      ) : null}

      {!loading && questions.length ? (
        <div className="divide-y divide-border border-y border-border">
          {questions.map((question) => {
            const item = progress[question.id]
            const status = item ? (item.mastered ? "Đã thuộc" : "Đang học") : "Chưa học"
            return (
              <details key={question.id} className="group py-4">
                <summary className="grid cursor-pointer list-none gap-3 sm:grid-cols-[1fr_150px_130px] sm:items-start">
                  <div>
                    <p className="text-sm font-medium">{question.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {question.topic} / {difficultyLabel(question.difficulty)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground sm:text-right">{status}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/courses/java-core/learn?topic=${encodeURIComponent(question.topic)}`}>Học chủ đề</Link>
                  </Button>
                </summary>
                <div className="mt-4 grid gap-4 text-sm lg:grid-cols-[1fr_0.7fr]">
                  <div>
                    <div className="grid gap-2">
                      {question.options.map((option, index) => (
                        <p key={`${question.id}-${index}`} className={index === question.correctOptionIndex ? "font-medium text-emerald-600" : "text-muted-foreground"}>
                          {["A", "B", "C", "D"][index]}. {option}
                        </p>
                      ))}
                    </div>
                    <p className="mt-3 leading-6 text-muted-foreground">{question.explanation}</p>
                  </div>
                  <dl className="grid gap-2 text-muted-foreground">
                    <div className="flex justify-between gap-3">
                      <dt>Số lần làm</dt>
                      <dd>{item?.attemptCount ?? 0}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Lịch ôn</dt>
                      <dd>{item?.nextReviewAt ? new Date(item.nextReviewAt).toLocaleDateString("vi-VN") : "Chưa có"}</dd>
                    </div>
                  </dl>
                </div>
              </details>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function difficultyLabel(value: string) {
  if (value === "BEGINNER") return "Cơ bản"
  if (value === "INTERMEDIATE") return "Trung bình"
  return "Nâng cao"
}
