"use client"

import Link from "next/link"
import { ArrowLeft, Filter, RotateCcw } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { getCourse, getCourseProgress, readLocalProgress } from "@/services/course-service"
import type { Course, CourseProgress, PracticeQuestion, QuestionDifficulty } from "@/types"

type FilterState = {
  topic: string
  difficulty: "ALL" | QuestionDifficulty
  status: "ALL" | "WEAK" | "UNSEEN" | "MASTERED"
}

export function JavaCoreReviewView() {
  const [course, setCourse] = useState<Course | null>(null)
  const [progress, setProgress] = useState<CourseProgress | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    topic: "ALL",
    difficulty: "ALL",
    status: "WEAK",
  })
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    Promise.all([getCourse(), getCourseProgress()])
      .then(([courseData, progressData]) => {
        if (!active) return
        setCourse(courseData)
        setProgress(progressData)
      })
      .catch(() => {
        if (active) setError("Unable to load review data.")
      })

    return () => {
      active = false
    }
  }, [])

  const questions = useMemo(() => course?.sections?.flatMap((section) => section.questions) ?? [], [course])
  const progressMap = typeof window === "undefined" ? {} : readLocalProgress()
  const topics = Array.from(new Set(questions.map((question) => question.topic)))

  const filteredQuestions = questions.filter((question) => {
    const itemProgress = progressMap[question.id]
    const status = itemProgress
      ? itemProgress.confidence === "MASTERED"
        ? "MASTERED"
        : "WEAK"
      : "UNSEEN"

    return (
      (filters.topic === "ALL" || question.topic === filters.topic) &&
      (filters.difficulty === "ALL" || question.difficulty === filters.difficulty) &&
      (filters.status === "ALL" || status === filters.status)
    )
  })

  if (error) {
    return <StateBlock tone="error" title="Review unavailable" description={error} />
  }

  if (!course || !progress) {
    return <StateBlock title="Loading review" description="Collecting weak topics and previous attempts..." />
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/courses/java-core">
              <ArrowLeft className="size-4" />
              Java + Full-stack
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Review Weak Topics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter questions by topic, difficulty, and confidence status.
          </p>
        </div>
        <Button asChild>
          <Link href="/courses/java-core/practice">
            <RotateCcw className="size-4" />
            Resume Practice
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 border-b border-border pb-6 sm:grid-cols-3">
        {progress.topics
          .map((topic) => ({
            ...topic,
            weak: topic.attempted - topic.mastered,
          }))
          .sort((a, b) => b.weak - a.weak)
          .slice(0, 3)
          .map((topic) => (
            <div key={topic.topic} className="border-t border-border pt-4">
              <p className="text-sm font-medium">{topic.topic}</p>
              <p className="mt-2 text-2xl font-semibold">{topic.weak}</p>
              <p className="mt-1 text-xs text-muted-foreground">questions need more review</p>
            </div>
          ))}
      </section>

      <section className="flex flex-col gap-3 border-b border-border pb-5 lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4" />
          Filters
        </div>
        <select
          value={filters.topic}
          onChange={(event) => setFilters((current) => ({ ...current, topic: event.target.value }))}
          className="h-9 border border-border bg-background px-2 text-sm"
        >
          <option value="ALL">All topics</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
        <select
          value={filters.difficulty}
          onChange={(event) =>
            setFilters((current) => ({ ...current, difficulty: event.target.value as FilterState["difficulty"] }))
          }
          className="h-9 border border-border bg-background px-2 text-sm"
        >
          <option value="ALL">All difficulties</option>
          <option value="BEGINNER">Beginner</option>
          <option value="INTERMEDIATE">Intermediate</option>
          <option value="ADVANCED">Advanced</option>
        </select>
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((current) => ({ ...current, status: event.target.value as FilterState["status"] }))
          }
          className="h-9 border border-border bg-background px-2 text-sm"
        >
          <option value="ALL">All statuses</option>
          <option value="WEAK">Weak</option>
          <option value="UNSEEN">Unseen</option>
          <option value="MASTERED">Mastered</option>
        </select>
      </section>

      <QuestionRows questions={filteredQuestions} progressMap={progressMap} />
    </div>
  )
}

function QuestionRows({
  questions,
  progressMap,
}: {
  questions: PracticeQuestion[]
  progressMap: Record<string, { confidence: string; answerText?: string }>
}) {
  if (!questions.length) {
    return <StateBlock title="No questions found" description="Try changing filters or complete a practice session." />
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {questions.map((question) => {
        const confidence = progressMap[question.id]?.confidence ?? "UNSEEN"
        return (
          <details key={question.id} className="group py-4">
            <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium">{question.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {question.topic} / {question.difficulty}
                </p>
              </div>
              <span className="text-xs font-medium text-muted-foreground">{confidence}</span>
            </summary>
            <div className="mt-4 grid gap-4 text-sm lg:grid-cols-[1fr_0.8fr]">
              <p className="leading-6 text-muted-foreground">{question.detailedAnswer}</p>
              <div>
                <p className="font-medium">Your last answer</p>
                <p className="mt-2 leading-6 text-muted-foreground">
                  {progressMap[question.id]?.answerText || "No answer stored yet."}
                </p>
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
