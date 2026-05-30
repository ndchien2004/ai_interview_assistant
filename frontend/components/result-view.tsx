"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, History } from "lucide-react"

import { EvaluationSummary } from "@/components/evaluation-summary"
import { StateBlock } from "@/components/state-block"
import { Button } from "@/components/ui/button"
import { getEvaluation } from "@/services/interview-service"
import type { Evaluation } from "@/types"

type ResultViewProps = {
  evaluationId: string
}

export function ResultView({ evaluationId }: ResultViewProps) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    getEvaluation(evaluationId)
      .then((data) => {
        setEvaluation(data)
        setLoading(false)
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Unable to load evaluation.")
        setLoading(false)
      })
  }, [evaluationId])

  if (loading) {
    return <StateBlock title="Loading result" description="Preparing your evaluation summary." />
  }

  if (error || !evaluation) {
    return (
      <StateBlock
        tone="error"
        title="Result not found"
        description={error || "This evaluation may have been removed or belongs to another account."}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">Evaluation result</h1>
          <p className="mt-2 text-muted-foreground">
            A structured interview scorecard generated from your saved answers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/history">
              <History className="size-4" />
              History
            </Link>
          </Button>
          <Button asChild>
            <Link href="/interviews/new">
              <ArrowLeft className="size-4" />
              New practice
            </Link>
          </Button>
        </div>
      </div>
      <EvaluationSummary evaluation={evaluation} />
    </div>
  )
}
