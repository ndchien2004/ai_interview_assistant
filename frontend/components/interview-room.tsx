"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Save } from "lucide-react"

import { StateBlock } from "@/components/state-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  evaluateInterview,
  getInterviewSession,
  saveInterviewAnswers,
} from "@/services/interview-service"
import type { Answer, InterviewSession } from "@/types"

type InterviewRoomProps = {
  sessionId: string
}

export function InterviewRoom({ sessionId }: InterviewRoomProps) {
  const router = useRouter()
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    getInterviewSession(sessionId).then((data) => {
      setSession(data)
      setAnswers(data?.answers ?? [])
      setLoading(false)
    })
  }, [sessionId])

  const activeQuestion = session?.questions[activeIndex]
  const answerValue = useMemo(() => {
    if (!activeQuestion) return ""
    return answers.find((answer) => answer.questionId === activeQuestion.id)?.response ?? ""
  }, [activeQuestion, answers])
  const answeredCount = answers.filter((answer) => answer.response.trim().length > 0).length
  const progress = session ? Math.round((answeredCount / session.questions.length) * 100) : 0

  const updateAnswer = (response: string) => {
    if (!activeQuestion) return

    setAnswers((current) => {
      const existing = current.find((answer) => answer.questionId === activeQuestion.id)
      if (existing) {
        return current.map((answer) =>
          answer.questionId === activeQuestion.id ? { ...answer, response } : answer
        )
      }
      return [...current, { questionId: activeQuestion.id, response }]
    })
  }

  const handleSave = async () => {
    if (!session) return
    setSaving(true)
    setError("")

    try {
      await saveInterviewAnswers(session.id, answers)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save answers.")
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!session) return
    setSubmitting(true)
    setError("")

    try {
      const evaluation = await evaluateInterview(session.id, answers)
      router.push(`/results/${evaluation.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to evaluate interview.")
      setSubmitting(false)
    }
  }

  if (loading) {
    return <StateBlock title="Loading interview" description="Getting your generated questions." />
  }

  if (!session || !activeQuestion) {
    return (
      <StateBlock
        tone="error"
        title="Interview not found"
        description="This session may have been removed from local mock storage."
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge className="mb-3 bg-emerald-50 text-emerald-800">{session.seniority}</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">{session.targetRole} interview</h1>
          <p className="mt-2 text-muted-foreground">
            Answer each question as if speaking to an interviewer. Save a draft or submit for mock
            evaluation.
          </p>
        </div>
        <Button variant="outline" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save draft
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <div className="mb-4 flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            Question {activeIndex + 1} of {session.questions.length}
          </span>
          <span>{answeredCount} answered</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge>{activeQuestion.category}</Badge>
          <Badge>{activeQuestion.difficulty}</Badge>
        </div>
        <h2 className="text-xl font-semibold leading-8">{activeQuestion.prompt}</h2>
        <div className="mt-5">
          <Textarea
            value={answerValue}
            onChange={(event) => updateAnswer(event.target.value)}
            placeholder="Write your answer with context, action, tradeoffs, and outcome..."
            className="min-h-52"
          />
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium">Expected signals</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeQuestion.expectedSignals.map((signal) => (
              <Badge key={signal}>{signal}</Badge>
            ))}
          </div>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <Button
          variant="outline"
          onClick={() => setActiveIndex((index) => Math.max(0, index - 1))}
          disabled={activeIndex === 0}
        >
          <ArrowLeft className="size-4" />
          Previous
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setActiveIndex((index) => Math.min(session.questions.length - 1, index + 1))}
            disabled={activeIndex === session.questions.length - 1}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || answeredCount === 0}>
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Submit for evaluation
          </Button>
        </div>
      </div>
    </div>
  )
}
