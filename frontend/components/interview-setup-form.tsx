"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, Loader2 } from "lucide-react"

import { StateBlock } from "@/components/state-block"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInterviewSession } from "@/services/interview-service"
import { listResumes } from "@/services/resume-service"
import type { InterviewSession, Resume } from "@/types"

export function InterviewSetupForm() {
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState("")
  const [targetRole, setTargetRole] = useState("Full-stack Developer")
  const [seniority, setSeniority] = useState<InterviewSession["seniority"]>("Junior")
  const [questionCount, setQuestionCount] = useState(5)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    listResumes().then((items) => {
      setResumes(items)
      setResumeId(items[0]?.id ?? "")
    })
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!resumeId) throw new Error("Please upload or select a resume first.")
      const session = await createInterviewSession({
        resumeId,
        targetRole,
        seniority,
        questionCount,
      })
      router.push(`/interviews/${session.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create interview.")
    } finally {
      setLoading(false)
    }
  }

  if (!resumes.length) {
    return (
      <StateBlock
        title="Upload a resume first"
        description="Question generation needs resume content. Go to the Resume page and upload a PDF."
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview setup</CardTitle>
        <CardDescription>
          Generate a focused practice session from the selected resume and target role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="resume">Resume</Label>
            <select
              id="resume"
              value={resumeId}
              onChange={(event) => setResumeId(event.target.value)}
              className="h-10 w-full rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 text-sm shadow-none outline-none focus-visible:border-foreground focus-visible:ring-0"
            >
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.fileName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="target-role">Target role</Label>
              <Input
                id="target-role"
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seniority">Seniority</Label>
              <select
                id="seniority"
                value={seniority}
                onChange={(event) => setSeniority(event.target.value as InterviewSession["seniority"])}
                className="h-10 w-full rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 text-sm shadow-none outline-none focus-visible:border-foreground focus-visible:ring-0"
              >
                {["Intern", "Junior", "Middle", "Senior"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-count">Question count</Label>
            <Input
              id="question-count"
              type="number"
              min={3}
              max={8}
              value={questionCount}
              onChange={(event) => setQuestionCount(Number(event.target.value))}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            Generate interview
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
