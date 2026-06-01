"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, FileUp, MessageSquareText, Trophy } from "lucide-react"

import { ScoreCard } from "@/components/common/score-card"
import { StateBlock } from "@/components/common/state-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getStoredEvaluations } from "@/services/auth-service"
import { listInterviewSessions } from "@/services/interview-service"
import { listResumes } from "@/services/resume-service"
import type { Evaluation, InterviewSession, Resume } from "@/types"

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(date)
  )

export function DashboardView() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([listResumes(), listInterviewSessions()]).then(([resumeData, sessionData]) => {
      setResumes(resumeData)
      setSessions(sessionData)
      setEvaluations(getStoredEvaluations())
      setLoading(false)
    })
  }, [])

  const completedSessions = sessions.filter((session) => session.status === "completed")
  const averageScore = useMemo(() => {
    if (!evaluations.length) return 0
    return Math.round(
      evaluations.reduce((total, evaluation) => total + evaluation.totalScore, 0) / evaluations.length
    )
  }, [evaluations])
  const latestResume = resumes[0]
  const recentSessions = sessions.slice(0, 4)

  if (loading) {
    return <StateBlock title="Loading dashboard" description="Gathering your practice history." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge className="mb-3 bg-emerald-50 text-emerald-800">Frontend Phase</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Interview workspace</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Upload a resume, generate targeted interview questions, and review mock AI feedback.
          </p>
        </div>
        <Button asChild>
          <Link href="/interviews/new">
            Start practice
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard
          label="Average score"
          value={averageScore ? `${averageScore}%` : "N/A"}
          detail="Across completed evaluations"
          tone="success"
        />
        <ScoreCard
          label="Completed interviews"
          value={String(completedSessions.length)}
          detail="Stored in mock interview history"
        />
        <ScoreCard
          label="Resumes uploaded"
          value={String(resumes.length)}
          detail="PDF upload workflow ready"
          tone="warning"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader>
            <CardTitle>Latest resume</CardTitle>
            <CardDescription>The resume source used for question generation.</CardDescription>
          </CardHeader>
          <CardContent>
            {latestResume ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{latestResume.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      Uploaded {formatDate(latestResume.uploadedAt)}
                    </p>
                  </div>
                  <FileUp className="size-5 text-muted-foreground" />
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {toPlainText(latestResume.parsedText)}
                </p>
                <div className="flex flex-wrap gap-2">
                  {latestResume.skills.map((skill) => (
                    <Badge key={skill}>{skill}</Badge>
                  ))}
                </div>
                <Button asChild variant="outline">
                  <Link href="/upload">Upload another resume</Link>
                </Button>
              </div>
            ) : (
              <StateBlock
                title="No resume yet"
                description="Upload a PDF resume to unlock question generation."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent interviews</CardTitle>
            <CardDescription>Jump back into practice or review your scores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentSessions.length ? (
              recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={
                    session.evaluationId
                      ? `/results/${session.evaluationId}`
                      : `/interviews/${session.id}${session.mode === "LIVE" ? "?mode=live" : ""}`
                  }
                  className="flex items-center justify-between gap-3 border-b border-border/80 py-3 transition-colors hover:text-foreground last:border-b-0"
                >
                  <div>
                    <p className="font-medium">{session.targetRole}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.seniority} · {formatDate(session.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{session.mode === "LIVE" ? "Live" : "Written"}</Badge>
                    <Badge>{session.status}</Badge>
                  </div>
                </Link>
              ))
            ) : (
              <StateBlock
                title="No interviews yet"
                description="Create your first mock interview from a resume."
              />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquareText className="size-4" />
              Practice loop
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Resume upload creates source data, interview generation creates structured questions, and
            evaluation produces a scorecard with improvement guidance.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4" />
              Portfolio signal
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The UI is mock-backed today, but the service boundaries mirror Spring Boot endpoints for the
            next backend phase.
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function toPlainText(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
