"use client"

import Link from "next/link"
import { ArrowLeft, Check, Eye, Mic2, RotateCcw } from "lucide-react"
import { useEffect, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createPracticeSession, submitPracticeAttempt } from "@/services/practice-service"
import type { PracticeConfidence, PracticeQuestion, PracticeSession } from "@/types"

const confidenceOptions: Array<{
  value: PracticeConfidence
  label: string
  description: string
}> = [
  { value: "AGAIN", label: "Again", description: "I need to see this soon." },
  { value: "HARD", label: "Hard", description: "I understand part of it." },
  { value: "GOOD", label: "Good", description: "I can explain this." },
  { value: "MASTERED", label: "Mastered", description: "I am interview-ready." },
]

export function JavaCorePracticeView() {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [answerText, setAnswerText] = useState("")
  const [revealed, setRevealed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    createPracticeSession()
      .then((nextSession) => {
        if (active) setSession(nextSession)
      })
      .catch(() => {
        if (active) setError("Unable to start practice.")
      })

    return () => {
      active = false
    }
  }, [])

  const question = session?.nextQuestion ?? null

  const handleSubmit = async (confidence: PracticeConfidence) => {
    if (!session || !question) return

    setSubmitting(true)
    setError("")
    try {
      const nextSession = await submitPracticeAttempt(session, question.id, answerText, confidence)
      setSession(nextSession)
      setAnswerText("")
      setRevealed(false)
    } catch {
      setError("Unable to save this attempt.")
    } finally {
      setSubmitting(false)
    }
  }

  if (error && !session) {
    return <StateBlock tone="error" title="Practice unavailable" description={error} />
  }

  if (!session) {
    return <StateBlock title="Starting practice" description="Selecting unseen and weak questions..." />
  }

  if (!question) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" asChild>
          <Link href="/courses/java-core">
            <ArrowLeft className="size-4" />
            Back to course
          </Link>
        </Button>
        <StateBlock
          title="Practice complete"
          description="You have no due questions in this session. Review weak topics or start again later."
        />
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/courses/java-core/review">Review Weak Topics</Link>
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="size-4" />
            New Session
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/courses/java-core">
              <ArrowLeft className="size-4" />
              Java + Full-stack
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Flashcard Practice</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer first, reveal the expected response, then mark your confidence.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">{session.attempts.length} answered this session</div>
      </div>

      <QuestionPanel question={question} />

      <section className="space-y-3 border-y border-border py-5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="answer" className="text-sm font-medium">
            Your answer
          </label>
          <Button variant="ghost" size="sm" type="button" disabled>
            <Mic2 className="size-4" />
            Voice soon
          </Button>
        </div>
        <Textarea
          id="answer"
          value={answerText}
          onChange={(event) => setAnswerText(event.target.value)}
          placeholder="Write how you would answer in an interview..."
          className="min-h-36 resize-none border-border bg-transparent"
        />
      </section>

      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>
          <Eye className="size-4" />
          Reveal Answer
        </Button>
      ) : (
        <section className="space-y-5 border-y border-border py-5">
          <AnswerPanel question={question} />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div>
            <h2 className="text-sm font-semibold">How confident are you?</h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              {confidenceOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(option.value)}
                  className="border-t border-border px-0 py-3 text-left transition-colors hover:text-foreground disabled:opacity-60"
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Check className="size-4" />
                    {option.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{option.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function QuestionPanel({ question }: { question: PracticeQuestion }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{question.topic}</span>
        <span>/</span>
        <span>{question.difficulty}</span>
        <span>/</span>
        <span>{question.tags.slice(0, 3).join(", ")}</span>
      </div>
      <h2 className="text-2xl font-semibold leading-snug tracking-tight">{question.question}</h2>
      {question.codeSnippet ? (
        <pre className="overflow-auto border-y border-border bg-muted/30 p-4 text-sm">
          <code>{question.codeSnippet}</code>
        </pre>
      ) : null}
    </section>
  )
}

function AnswerPanel({ question }: { question: PracticeQuestion }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
      <div>
        <h2 className="text-sm font-semibold">Expected answer</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.shortAnswer}</p>
        <p className="mt-3 text-sm leading-6">{question.detailedAnswer}</p>
      </div>
      <div className="space-y-4">
        <List title="Key points" items={question.keyPoints} />
        <List title="Common mistakes" items={question.commonMistakes} />
      </div>
    </div>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 divide-y divide-border border-y border-border text-sm text-muted-foreground">
        {items.map((item) => (
          <li key={item} className="py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
