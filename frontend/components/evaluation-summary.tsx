import { CheckCircle2, Lightbulb, Target } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import type { Evaluation } from "@/types"

type EvaluationSummaryProps = {
  evaluation: Evaluation
}

export function EvaluationSummary({ evaluation }: EvaluationSummaryProps) {
  const categoryRows = Object.entries(evaluation.categoryScores)

  return (
    <div className="space-y-6">
      <div className="border-y border-border/80 py-6">
        <p className="text-sm text-muted-foreground">Overall score</p>
        <div className="mt-2 flex items-end gap-3">
          <span className="text-5xl font-semibold tracking-normal">{evaluation.totalScore}%</span>
          <span className="pb-2 text-sm text-muted-foreground">mock AI evaluation</span>
        </div>
        {evaluation.interviewDomain ? (
          <p className="mt-3 text-sm font-medium">Domain: {evaluation.interviewDomain}</p>
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
