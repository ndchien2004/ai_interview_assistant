"use client"

import Link from "next/link"
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react"
import { FormEvent, useEffect, useMemo, useState } from "react"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { makeId } from "@/services/auth-service"
import { createAdminQuestion, deleteAdminQuestion, getCourse, updateAdminQuestion } from "@/services/course-service"
import type { Course, PracticeQuestion, QuestionDifficulty } from "@/types"

type Draft = {
  id?: string
  sectionId: string
  question: string
  shortAnswer: string
  detailedAnswer: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOptionIndex: number
  difficulty: QuestionDifficulty
  topic: string
  tags: string
}

const emptyDraft: Draft = {
  sectionId: "",
  question: "",
  shortAnswer: "",
  detailedAnswer: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOptionIndex: 0,
  difficulty: "INTERMEDIATE",
  topic: "Java Core Foundations",
  tags: "java, flashcard-bank",
}

export function AdminCoursesView({ mode = "list" }: { mode?: "list" | "detail" }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [pendingDeleteQuestion, setPendingDeleteQuestion] = useState<PracticeQuestion | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    getCourse()
      .then((courseData) => {
        if (!active) return
        setCourse(courseData)
        const firstSection = courseData.sections?.[0]
        setDraft((current) => ({
          ...current,
          sectionId: firstSection?.id ?? "",
          topic: firstSection?.title ?? current.topic,
        }))
      })
      .catch(() => {
        if (active) setError("Unable to load admin course data.")
      })

    return () => {
      active = false
    }
  }, [])

  const questions = useMemo(() => course?.sections?.flatMap((section) => section.questions) ?? [], [course])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!course) return

    const payload = {
      courseId: course.id,
      sectionId: draft.sectionId,
      question: draft.question.trim(),
      shortAnswer: draft.shortAnswer.trim(),
      detailedAnswer: draft.detailedAnswer.trim(),
      options: [draft.optionA, draft.optionB, draft.optionC, draft.optionD].map((option) => option.trim()),
      correctOptionIndex: draft.correctOptionIndex,
      explanation: draft.detailedAnswer.trim() || draft.shortAnswer.trim(),
      keyPoints: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
      commonMistakes: ["Missing tradeoffs.", "Answering without a concrete Java example."],
      difficulty: draft.difficulty,
      topic: draft.topic.trim(),
      tags: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
      codeSnippet: null,
      sortOrder: questions.length + 1,
    }

    if (!payload.question || !payload.shortAnswer || !payload.sectionId || payload.options.some((option) => !option)) {
      setError("Question, short answer, section, and 4 options are required.")
      return
    }

    setError("")
    try {
      const saved = draft.id
        ? await updateAdminQuestion(draft.id, payload)
        : await createAdminQuestion(payload)
      applyQuestionLocally({ ...saved, sectionId: draft.sectionId })
      setMessage("Saved through Spring Boot admin API.")
    } catch (requestError) {
      const localQuestion: PracticeQuestion = {
        id: draft.id ?? makeId("admin-question"),
        ...payload,
      }
      applyQuestionLocally(localQuestion)
      setMessage(
        requestError instanceof Error
          ? `${requestError.message} Local preview updated.`
          : "Local preview updated."
      )
    }

    setDraft((current) => ({
      ...emptyDraft,
      sectionId: current.sectionId,
      topic: current.topic,
    }))
  }

  const applyQuestionLocally = (question: PracticeQuestion & { sectionId?: string }) => {
    setCourse((current) => {
      if (!current?.sections) return current
      const sections = current.sections.map((section) => {
          if (section.id !== question.sectionId && !section.questions.some((item) => item.id === question.id)) {
            return section
          }

          const exists = section.questions.some((item) => item.id === question.id)
          return {
            ...section,
            questions: exists
              ? section.questions.map((item) => (item.id === question.id ? question : item))
              : [...section.questions, question],
          }
        })

      return {
        ...current,
        questionCount: sections.reduce((total, section) => total + section.questions.length, 0),
        sections,
      }
    })
  }

  const handleEdit = (question: PracticeQuestion, sectionId: string) => {
    setDraft({
      id: question.id,
      sectionId,
      question: question.question,
      shortAnswer: question.shortAnswer,
      detailedAnswer: question.detailedAnswer,
      optionA: question.options[0] ?? question.shortAnswer,
      optionB: question.options[1] ?? "",
      optionC: question.options[2] ?? "",
      optionD: question.options[3] ?? "",
      correctOptionIndex: question.correctOptionIndex ?? 0,
      difficulty: question.difficulty,
      topic: question.topic,
      tags: question.tags.join(", "),
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleDelete = (question: PracticeQuestion) => {
    setPendingDeleteQuestion(question)
  }

  const confirmDelete = async () => {
    if (!pendingDeleteQuestion) return
    try {
      await deleteAdminQuestion(pendingDeleteQuestion.id)
      setMessage("Deleted through Spring Boot admin API.")
    } catch {
      setMessage("Local preview deleted. Connect an admin JWT for persistent delete.")
    }

    setCourse((current) =>
      current?.sections
        ? {
            ...current,
            sections: current.sections.map((section) => ({
              ...section,
              questions: section.questions.filter((question) => question.id !== pendingDeleteQuestion.id),
            })),
          }
        : current
    )
    setPendingDeleteQuestion(null)
  }

  if (error && !course) {
    return <StateBlock tone="error" title="Admin unavailable" description={error} />
  }

  if (!course) {
    return <StateBlock title="Loading admin workspace" description="Preparing courses, sections, and questions..." />
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
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {mode === "detail" ? course.title : "Admin Courses"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage course content. Backend persistence is enabled for ROLE_ADMIN JWT sessions.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/courses/course-java-fullstack-flashcard">Open Course Detail</Link>
        </Button>
      </div>

      {message ? <p className="border-y border-border py-3 text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form onSubmit={handleSubmit} className="space-y-4 border-y border-border py-5">
          <div className="flex items-center gap-2">
            <Plus className="size-4" />
            <h2 className="text-sm font-semibold">{draft.id ? "Edit question" : "Create question"}</h2>
          </div>
          <select
            value={draft.sectionId}
            onChange={(event) => {
              const section = course.sections?.find((item) => item.id === event.target.value)
              setDraft((current) => ({
                ...current,
                sectionId: event.target.value,
                topic: section?.title ?? current.topic,
              }))
            }}
            className="h-9 w-full border border-border bg-background px-2 text-sm"
          >
            {course.sections?.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
          <Input
            value={draft.question}
            onChange={(event) => setDraft((current) => ({ ...current, question: event.target.value }))}
            placeholder="Question"
          />
          <Input
            value={draft.shortAnswer}
            onChange={(event) => setDraft((current) => ({ ...current, shortAnswer: event.target.value }))}
            placeholder="Short answer"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {[draft.optionA, draft.optionB, draft.optionC, draft.optionD].map((value, index) => (
              <Input
                key={index}
                value={value}
                onChange={(event) => {
                  const keys = ["optionA", "optionB", "optionC", "optionD"] as const
                  setDraft((current) => ({ ...current, [keys[index]]: event.target.value }))
                }}
                placeholder={`Option ${String.fromCharCode(65 + index)}`}
              />
            ))}
          </div>
          <select
            value={draft.correctOptionIndex}
            onChange={(event) =>
              setDraft((current) => ({ ...current, correctOptionIndex: Number(event.target.value) }))
            }
            className="h-9 w-full border border-border bg-background px-2 text-sm"
          >
            <option value={0}>Correct answer: A</option>
            <option value={1}>Correct answer: B</option>
            <option value={2}>Correct answer: C</option>
            <option value={3}>Correct answer: D</option>
          </select>
          <Textarea
            value={draft.detailedAnswer}
            onChange={(event) => setDraft((current) => ({ ...current, detailedAnswer: event.target.value }))}
            placeholder="Detailed explanation"
            className="min-h-28 resize-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({ ...current, difficulty: event.target.value as QuestionDifficulty }))
              }
              className="h-9 border border-border bg-background px-2 text-sm"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
            <Input
              value={draft.tags}
              onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
              placeholder="Tags, comma-separated"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit">{draft.id ? "Save Changes" : "Create Question"}</Button>
            {draft.id ? (
              <Button type="button" variant="outline" onClick={() => setDraft(emptyDraft)}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Question bank</h2>
            <span className="text-sm text-muted-foreground">{questions.length} questions</span>
          </div>
          <div className="max-h-[720px] divide-y divide-border overflow-auto border-y border-border">
            {course.sections?.map((section) => (
              <div key={section.id} className="py-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.title}
                </p>
                <div className="divide-y divide-border/70">
                  {section.questions.slice(0, mode === "detail" ? undefined : 6).map((question) => (
                    <div key={question.id} className="flex items-start justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{question.question}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{question.difficulty}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => handleEdit(question, section.id)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(question)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(pendingDeleteQuestion)}
        title="Delete question?"
        description={
          <>
            This will remove <span className="font-medium text-foreground">{pendingDeleteQuestion?.question}</span> from the question bank.
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        onClose={() => setPendingDeleteQuestion(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
