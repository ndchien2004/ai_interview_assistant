"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Search } from "lucide-react"

import { StateBlock } from "@/components/common/state-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listInterviewSessions } from "@/services/interview-service"
import type { InterviewSession } from "@/types"

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(date)
  )

export function HistoryView() {
  const [sessions, setSessions] = useState<InterviewSession[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listInterviewSessions().then((data) => {
      setSessions(data)
      setLoading(false)
    })
  }, [])

  const filteredSessions = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sessions

    return sessions.filter(
      (session) =>
        session.targetRole.toLowerCase().includes(needle) ||
        session.seniority.toLowerCase().includes(needle) ||
        session.status.toLowerCase().includes(needle)
    )
  }, [query, sessions])

  if (loading) {
    return <StateBlock title="Loading history" description="Collecting previous interview sessions." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge className="mb-3 bg-amber-50 text-amber-800">Practice history</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Interview history</h1>
          <p className="mt-2 text-muted-foreground">
            Review completed interviews, resume-targeted roles, and in-progress sessions.
          </p>
        </div>
        <Button asChild>
          <Link href="/interviews/new">New interview</Link>
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by role, seniority, or status"
          className="pl-9"
        />
      </div>

      <div className="border-y border-border/80">
        {filteredSessions.length ? (
          <div className="divide-y divide-border">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 py-4 md:grid-cols-[1fr_auto_auto] md:items-center"
              >
                <div>
                  <p className="font-medium">{session.targetRole}</p>
                  <p className="text-sm text-muted-foreground">
                    {session.seniority} · {session.questionCount} questions · {formatDate(session.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{session.mode === "LIVE" ? "Live" : "Written"}</Badge>
                  <Badge>{session.status}</Badge>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={
                      session.evaluationId
                        ? `/results/${session.evaluationId}`
                        : `/interviews/${session.id}${session.mode === "LIVE" ? "?mode=live" : ""}`
                    }
                  >
                    Open
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <StateBlock
            title="No matching sessions"
            description="Try another search or create a new interview."
            className="border-0"
          />
        )}
      </div>
    </div>
  )
}
