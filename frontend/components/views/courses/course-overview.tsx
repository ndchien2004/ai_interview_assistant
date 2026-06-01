"use client"

import Link from "next/link"
import { ArrowRight, BookOpen, CheckCircle2, RotateCcw, Upload } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { getCourse, getCourseProgress } from "@/services/course-service"
import type { Course, CourseProgress } from "@/types"

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
      })
      .catch(() => {
        if (active) setError("Unable to load the Java + full-stack course.")
      })

    return () => {
      active = false
    }
  }, [])

  const sections = course?.sections ?? []
  const importedCount = sections
    .flatMap((section) => section.questions)
    .filter((question) => question.tags.includes("imported")).length
  const nextTopics = useMemo(
    () =>
      progress?.topics
        .map((topic) => ({ ...topic, ratio: topic.total ? topic.mastered / topic.total : 0 }))
        .sort((a, b) => a.ratio - b.ratio)
        .slice(0, 4) ?? [],
    [progress]
  )

  if (error) {
    return <StateBlock tone="error" title="Course unavailable" description={error} />
  }

  if (!course || !progress) {
    return <StateBlock title="Loading question bank" description="Preparing questions and progress data..." />
  }

  return (
    <div className="space-y-8">
      <section className="border-b border-border pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <BookOpen className="size-4" />
              Interview practice course
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{course.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/courses/java-core/practice">
                Start Practice
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/courses/java-core/flashcards">
                Study Flashcards
                <CheckCircle2 className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/courses/java-core/import">
                Import Flashcards
                <Upload className="size-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/courses/java-core/review">
                Review Weak Topics
                <RotateCcw className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 border-b border-border pb-8 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Questions" value={progress.totalQuestions.toString()} />
        <Metric label="Attempted" value={progress.attemptedQuestions.toString()} />
        <Metric label="Mastered" value={progress.masteredQuestions.toString()} />
        <Metric label="Imported" value={importedCount.toString()} />
        <Metric label="Mastery" value={`${progress.masteryPercentage}%`} />
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Topic breakdown</h2>
            <span className="text-sm text-muted-foreground">{sections.length} sections</span>
          </div>
          <div className="divide-y divide-border border-y border-border">
            {progress.topics.map((topic) => (
              <div key={topic.topic} className="grid gap-3 py-4 sm:grid-cols-[180px_1fr_110px] sm:items-center">
                <div>
                  <p className="text-sm font-medium">{topic.topic}</p>
                  <p className="text-xs text-muted-foreground">
                    {topic.attempted}/{topic.total} attempted
                  </p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${topic.total ? (topic.mastered / topic.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground sm:text-right">{topic.mastered} mastered</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Recommended next</h2>
          <div className="divide-y divide-border border-y border-border">
            {nextTopics.map((topic) => (
              <div key={topic.topic} className="flex items-start justify-between gap-4 py-4">
                <div>
                  <p className="text-sm font-medium">{topic.topic}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Focus here to raise your interview coverage.
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {topic.mastered}/{topic.total}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-2 border-y border-border py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-foreground" />
            Answers are stored locally in mock mode and through Spring Boot when API auth is connected.
          </div>
        </div>
      </section>
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
