"use client"

import Link from "next/link"
import { ArrowLeft, Check, Save } from "lucide-react"
import { useEffect, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { getCourse, getCourseDeck, updateCourseDeckQuestion } from "@/services/course-service"
import type { Course, CourseSection, PracticeQuestion } from "@/types"

type QuestionForm = {
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export function CourseDeckCardsView({ courseSlug, deckSlug }: { courseSlug: string; deckSlug: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [deck, setDeck] = useState<CourseSection | null>(null)
  const [forms, setForms] = useState<Record<string, QuestionForm>>({})
  const [savingId, setSavingId] = useState("")
  const [savedId, setSavedId] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    Promise.all([getCourse(courseSlug), getCourseDeck(courseSlug, deckSlug)])
      .then(([courseData, deckData]) => {
        if (!active) return
        setCourse(courseData)
        setDeck(deckData)
        setForms(Object.fromEntries(deckData.questions.map((question) => [question.id, formFromQuestion(question)])))
      })
      .catch(() => {
        if (active) setError("Không thể tải danh sách thẻ.")
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug])

  const updateForm = (questionId: string, patch: Partial<QuestionForm>) => {
    setForms((current) => ({
      ...current,
      [questionId]: {
        ...current[questionId],
        ...patch,
      },
    }))
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setForms((current) => {
      const form = current[questionId]
      const options = [...form.options]
      options[optionIndex] = value
      return {
        ...current,
        [questionId]: {
          ...form,
          options,
        },
      }
    })
  }

  const handleSave = async (question: PracticeQuestion) => {
    const form = forms[question.id]
    if (!deck || !form || !form.question.trim() || !form.explanation.trim() || form.options.some((option) => !option.trim())) {
      setError("Câu hỏi, 4 đáp án và giải thích không được để trống.")
      return
    }

    setError("")
    setSavedId("")
    setSavingId(question.id)
    try {
      const updated = await updateCourseDeckQuestion(courseSlug, deckSlug, question.id, {
        question: form.question.trim(),
        options: form.options.map((option) => option.trim()),
        correctOptionIndex: form.correctOptionIndex,
        explanation: form.explanation.trim(),
      })
      setDeck({
        ...deck,
        questions: deck.questions.map((item) => (item.id === updated.id ? updated : item)),
      })
      setForms((current) => ({ ...current, [updated.id]: formFromQuestion(updated) }))
      setSavedId(updated.id)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu câu hỏi.")
    } finally {
      setSavingId("")
    }
  }

  if (error && !deck) return <StateBlock tone="error" title="Không mở được thẻ" description={error} />
  if (!course || !deck) return <StateBlock title="Đang tải thẻ" description="FreeCard đang lấy câu hỏi trong bộ thẻ..." />

  return (
    <div className="space-y-7">
      <Header href={`/courses/${course.slug}/decks/${deck.slug}`} label={deck.title} title="Sửa thẻ" />
      {error ? <p className="rounded-md border border-destructive/40 px-4 py-3 text-sm text-destructive">{error}</p> : null}
      <section className="grid gap-3">
        {deck.questions.map((question, index) => (
          <QuestionEditor
            key={question.id}
            index={index}
            question={question}
            form={forms[question.id] ?? formFromQuestion(question)}
            saving={savingId === question.id}
            saved={savedId === question.id}
            onChange={(patch) => updateForm(question.id, patch)}
            onOptionChange={(optionIndex, value) => updateOption(question.id, optionIndex, value)}
            onSave={() => handleSave(question)}
          />
        ))}
      </section>
      {!deck.questions.length ? <StateBlock title="Bộ thẻ chưa có câu hỏi" description="Import JSON để thêm câu hỏi vào bộ thẻ này." /> : null}
    </div>
  )
}

function QuestionEditor({
  index,
  question,
  form,
  saving,
  saved,
  onChange,
  onOptionChange,
  onSave,
}: {
  index: number
  question: PracticeQuestion
  form: QuestionForm
  saving: boolean
  saved: boolean
  onChange: (patch: Partial<QuestionForm>) => void
  onOptionChange: (optionIndex: number, value: string) => void
  onSave: () => void
}) {
  return (
    <article className="rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Thẻ {index + 1}</h2>
        <Button size="sm" onClick={onSave} disabled={saving}>
          <Save className="size-4" />
          {saving ? "Đang lưu" : saved ? "Đã lưu" : "Lưu"}
        </Button>
      </div>

      <div className="mt-4 grid gap-4">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`question-${question.id}`}>
            Câu hỏi
          </label>
          <Textarea
            id={`question-${question.id}`}
            value={form.question}
            onChange={(event) => onChange({ question: event.target.value })}
            className="min-h-20 resize-y"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {form.options.map((option, optionIndex) => (
            <div key={`${question.id}-${optionIndex}`} className="grid gap-2">
              <label className="text-sm font-medium" htmlFor={`option-${question.id}-${optionIndex}`}>
                Đáp án {["A", "B", "C", "D"][optionIndex]}
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="icon-sm"
                  variant={form.correctOptionIndex === optionIndex ? "default" : "outline"}
                  onClick={() => onChange({ correctOptionIndex: optionIndex })}
                  aria-label={`Chọn đáp án ${["A", "B", "C", "D"][optionIndex]} là đúng`}
                >
                  {form.correctOptionIndex === optionIndex ? <Check className="size-4" /> : ["A", "B", "C", "D"][optionIndex]}
                </Button>
                <Input
                  id={`option-${question.id}-${optionIndex}`}
                  value={option}
                  onChange={(event) => onOptionChange(optionIndex, event.target.value)}
                  className={cn(form.correctOptionIndex === optionIndex && "border-emerald-500")}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor={`explanation-${question.id}`}>
            Giải thích đáp án đúng
          </label>
          <Textarea
            id={`explanation-${question.id}`}
            value={form.explanation}
            onChange={(event) => onChange({ explanation: event.target.value })}
            className="min-h-24 resize-y"
          />
        </div>
      </div>
    </article>
  )
}

export function Header({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <div className="border-b border-border pb-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={href}>
          <ArrowLeft className="size-4" />
          {label}
        </Link>
      </Button>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">{title}</h1>
    </div>
  )
}

function formFromQuestion(question: PracticeQuestion): QuestionForm {
  const options = [...question.options]
  while (options.length < 4) options.push("")
  return {
    question: question.question,
    options: options.slice(0, 4),
    correctOptionIndex: question.correctOptionIndex,
    explanation: question.explanation,
  }
}
