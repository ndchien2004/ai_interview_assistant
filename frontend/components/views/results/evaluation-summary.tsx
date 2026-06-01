"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle2, Lightbulb, Target } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { Evaluation } from "@/types"

type EvaluationSummaryProps = {
  evaluation: Evaluation
}

export function EvaluationSummary({ evaluation }: EvaluationSummaryProps) {
  const categoryRows = Object.entries(evaluation.categoryScores)
  const evaluationMode = evaluation.evaluationMode ?? "FALLBACK"
  const provider = evaluation.provider ?? "LOCAL"
  const model = evaluation.model ?? "local"
  const perQuestionFeedback = evaluation.perQuestionFeedback ?? []
  const [activeFeedbackIndex, setActiveFeedbackIndex] = useState(0)
  const safeActiveFeedbackIndex = Math.min(activeFeedbackIndex, Math.max(perQuestionFeedback.length - 1, 0))
  const activeFeedback = perQuestionFeedback[safeActiveFeedbackIndex]
  const canNavigateFeedback = perQuestionFeedback.length > 1

  const goToPreviousFeedback = () => {
    if (!perQuestionFeedback.length) return
    setActiveFeedbackIndex(() =>
      safeActiveFeedbackIndex === 0 ? perQuestionFeedback.length - 1 : safeActiveFeedbackIndex - 1
    )
  }

  const goToNextFeedback = () => {
    if (!perQuestionFeedback.length) return
    setActiveFeedbackIndex(() => (safeActiveFeedbackIndex + 1) % perQuestionFeedback.length)
  }

  return (
    <div className="space-y-6">
      <div className="border-y border-border/80 py-6">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Overall score</p>
          <Badge>{evaluationMode === "AI" ? "AI evaluation" : "Fallback evaluation"}</Badge>
          <span className="text-xs text-muted-foreground">
            {provider} / {model}
          </span>
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-5xl font-semibold tracking-normal">{evaluation.totalScore}%</span>
        </div>
        {evaluation.interviewDomain ? (
          <p className="mt-3 text-sm font-medium">Domain: {evaluation.interviewDomain}</p>
        ) : null}
        {evaluationMode === "FALLBACK" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            AI provider was unavailable, so this result used local fallback scoring.
          </p>
        ) : null}
        <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{evaluation.summary}</p>
      </div>

      {evaluation.skillScores?.length ? (
        <div className="border-y border-border/80 py-5">
          <h2 className="font-semibold">Skill-based scoring</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {evaluation.skillScores.map((skill) => (
              <div key={skill.name} className="border-t border-border/80 py-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{skill.name}</span>
                  <span className="font-semibold">{skill.score}%</span>
                </div>
                <Progress value={skill.score} />
                <p className="mt-2 text-sm text-muted-foreground">{skill.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-y border-border/80 py-5">
          <h2 className="font-semibold">Category scores</h2>
          <div className="mt-4 space-y-4">
            {categoryRows.map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="capitalize">{label.replace(/([A-Z])/g, " $1")}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <Progress value={value} />
              </div>
            ))}
          </div>
        </div>

        <div className="border-y border-border/80 py-5">
          <h2 className="font-semibold">Strengths</h2>
          <ul className="mt-4 space-y-3">
            {evaluation.strengths.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-y border-border/80 py-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Target className="size-4" />
            Focus areas
          </h2>
          <ul className="mt-4 space-y-3">
            {evaluation.weaknesses.map((item) => (
              <li key={item} className="text-sm text-muted-foreground">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-y border-border/80 py-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lightbulb className="size-4" />
            Improvement roadmap
          </h2>
          <ol className="mt-4 space-y-3">
            {evaluation.improvementRoadmap.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <span className="shrink-0 text-xs font-medium text-foreground">
                  {index + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {activeFeedback ? (
        <div className="border-y border-border/80 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Question feedback</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Question {safeActiveFeedbackIndex + 1} of {perQuestionFeedback.length}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToPreviousFeedback}
                disabled={!canNavigateFeedback}
                aria-label="Previous question feedback"
              >
                <ArrowLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-1">
                {perQuestionFeedback.map((item, index) => (
                  <button
                    key={item.questionId}
                    type="button"
                    onClick={() => setActiveFeedbackIndex(index)}
                    aria-label={`Open question ${index + 1} feedback`}
                    className={`size-2 rounded-full transition-colors ${
                      index === safeActiveFeedbackIndex ? "bg-foreground" : "bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={goToNextFeedback}
                disabled={!canNavigateFeedback}
                aria-label="Next question feedback"
              >
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="relative mt-5 min-h-[520px] sm:min-h-[460px]">
            {canNavigateFeedback ? (
              <>
                <div className="absolute inset-x-5 top-5 h-[calc(100%-20px)] rounded-lg border border-border/50 bg-muted/30" />
                <div className="absolute inset-x-3 top-3 h-[calc(100%-12px)] rounded-lg border border-border/70 bg-background" />
              </>
            ) : null}

            <article
              key={activeFeedback.questionId}
              className="relative z-10 min-h-[500px] rounded-lg border border-border bg-background p-5 shadow-sm transition-all duration-300 sm:min-h-[440px] sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Question {safeActiveFeedbackIndex + 1}
                  </p>
                  <h3 className="mt-2 text-base font-semibold leading-7">{activeFeedback.questionPrompt}</h3>
                </div>
                <Badge>{activeFeedback.score}%</Badge>
              </div>

              {activeFeedback.answerText ? (
                <div className="mt-5 border-y border-border/70 py-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Your answer</p>
                  <p className="mt-2 max-h-32 overflow-y-auto text-sm text-muted-foreground">
                    {activeFeedback.answerText}
                  </p>
                </div>
              ) : null}

              <p className="mt-5 text-sm leading-6 text-muted-foreground">{activeFeedback.rationale}</p>

              {(activeFeedback.missingSignals ?? []).length ? (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Missing signals</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(activeFeedback.missingSignals ?? []).map((signal) => (
                      <Badge key={signal}>{signal}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {activeFeedback.suggestedAnswer ? (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Suggested stronger answer</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {activeFeedback.suggestedAnswer}
                  </p>
                </div>
              ) : null}
            </article>
          </div>
        </div>
      ) : null}

      {evaluation.transcript?.length ? (
        <div className="border-y border-border/80 py-5">
          <h2 className="font-semibold">Saved transcript</h2>
          <div className="mt-4 max-h-96 space-y-3 overflow-y-auto border-y border-border/80 py-3">
            {evaluation.transcript.map((message) => (
              <div key={message.id} className="border-b border-border/70 pb-3 text-sm last:border-b-0">
                <p className="mb-1 font-medium capitalize">{message.role}</p>
                <p className="text-muted-foreground">{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
