"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Loader2, Mic2, PencilLine, UploadCloud } from "lucide-react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createInterviewSession } from "@/services/interview-service"
import { listResumes } from "@/services/resume-service"
import type { InterviewSession, QuestionCategory, Resume } from "@/types"
import { cn } from "@/lib/utils"

const categoryLabels: Record<QuestionCategory, string> = {
  technical: "Technical",
  experience: "Experience from CV",
  behavioral: "Behavioral",
  "system-design": "System design",
}

const questionPlan = (count: number): QuestionCategory[] => {
  const plan: QuestionCategory[] = ["technical", "experience", "behavioral"]
  if (count >= 4) plan.push("system-design")
  if (count >= 5) plan.splice(1, 0, "technical")
  while (plan.length < count) {
    plan.push(plan.length % 2 === 0 ? "experience" : "technical")
  }
  return plan.slice(0, count)
}

const skillOptions = [
  "Technical depth",
  "Communication",
  "Problem solving",
  "System design",
  "Product thinking",
  "Leadership",
]

export function InterviewSetupForm({ initialMode = "WRITTEN" }: { initialMode?: "WRITTEN" | "LIVE" }) {
  const router = useRouter()
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState("")
  const [mode, setMode] = useState<"WRITTEN" | "LIVE">(initialMode)
  const [targetRole, setTargetRole] = useState("Full-stack Developer")
  const [seniority, setSeniority] = useState<InterviewSession["seniority"]>("Junior")
  const [domain, setDomain] = useState("Full-stack Web Development")
  const [questionCount, setQuestionCount] = useState(5)
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [evaluationSkills, setEvaluationSkills] = useState<string[]>([
    "Technical depth",
    "Communication",
    "Problem solving",
  ])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const applyResumeDefaults = (resume: Resume | undefined) => {
    if (!resume) return

    const roleSignal = resume.roleSignals[0]
    if (roleSignal) {
      setTargetRole(roleSignal.includes("Developer") ? roleSignal : `${roleSignal} Developer`)
    }

    const senioritySignal = resume.senioritySignals?.join(" ").toLowerCase() ?? ""
    if (senioritySignal.includes("senior")) setSeniority("Senior")
    else if (senioritySignal.includes("middle") || senioritySignal.includes("mid")) setSeniority("Middle")
    else if (senioritySignal.includes("intern")) setSeniority("Intern")
    else setSeniority("Junior")

    setFocusAreas(resume.skills.slice(0, 3))
  }

  useEffect(() => {
    listResumes().then((items) => {
      setResumes(items)
      const preferred = items.find((item) => item.status === "READY") ?? items.find((item) => item.status === "NEEDS_REVIEW") ?? items[0]
      setResumeId(preferred?.id ?? "")
      applyResumeDefaults(preferred)
    })
  }, [])

  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === resumeId) ?? null,
    [resumeId, resumes]
  )
  const currentPlan = useMemo(() => questionPlan(questionCount), [questionCount])
  const resumeTooShort = (selectedResume?.parsedText.trim().length ?? 0) < 80
  const resumeFailed = selectedResume?.status === "FAILED"
  const canSubmit = Boolean(selectedResume)
    && !resumeFailed
    && !resumeTooShort
    && Boolean(targetRole.trim())
    && questionCount >= 3
    && questionCount <= 8
    && (mode === "WRITTEN" || Boolean(domain.trim() && evaluationSkills.length))

  const toggleFocusArea = (skill: string) => {
    setFocusAreas((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    )
  }

  const toggleEvaluationSkill = (skill: string) => {
    setEvaluationSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    )
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!selectedResume) throw new Error("Please upload or select a resume first.")
      if (resumeFailed) throw new Error("Please fix the selected resume before creating an interview.")
      if (resumeTooShort) throw new Error("Resume text is too short for question generation.")
      const session = await createInterviewSession({
        resumeId: selectedResume.id,
        targetRole: targetRole.trim(),
        seniority,
        questionCount,
        focusAreas,
        mode,
        domain: domain.trim() || targetRole.trim(),
        evaluationSkills,
      })
      router.push(`/interviews/${session.id}${mode === "LIVE" ? "?mode=live" : ""}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create interview.")
    } finally {
      setLoading(false)
    }
  }

  if (!resumes.length) {
    return (
      <div className="space-y-4">
        <StateBlock
          title="Upload a resume first"
          description="Question generation needs parsed resume content before it can create a focused interview."
        />
        <Button asChild>
          <Link href="/upload">
            <UploadCloud className="size-4" />
            Upload resume
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]" onSubmit={handleSubmit}>
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Practice mode</CardTitle>
            <CardDescription>Choose between written practice and a ChatGPT-style live room.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setMode("WRITTEN")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                mode === "WRITTEN" ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/50"
              )}
            >
              <PencilLine className="mt-0.5 size-4" />
              <span>
                <span className="block text-sm font-semibold">Written</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Draft answers, move between questions, and submit when ready.
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode("LIVE")}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                mode === "LIVE" ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/50"
              )}
            >
              <Mic2 className="mt-0.5 size-4" />
              <span>
                <span className="block text-sm font-semibold">Live</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  Answer one question at a time with voice capture and transcript.
                </span>
              </span>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume context</CardTitle>
            <CardDescription>Select the CV that should drive question generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resume">Resume</Label>
              <select
                id="resume"
                value={resumeId}
                onChange={(event) => {
                  const nextResume = resumes.find((resume) => resume.id === event.target.value)
                  setResumeId(event.target.value)
                  applyResumeDefaults(nextResume)
                }}
                className="h-10 w-full rounded-lg border border-input bg-background/55 px-3 text-sm shadow-none outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/10"
              >
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>
                    {resume.fileName}
                  </option>
                ))}
              </select>
            </div>

            {selectedResume ? (
              <div className="space-y-4 border-y border-border/80 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <Badge className={statusClassName(selectedResume.status)}>{selectedResume.status ?? "READY"}</Badge>
                  {selectedResume.status === "NEEDS_REVIEW" ? (
                    <span className="text-xs text-muted-foreground">Review recommended before interview.</span>
                  ) : null}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {selectedResume.summary || "No resume summary yet."}
                </p>
                <SignalList title="Skills" values={selectedResume.skills} />
                <SignalList title="Role signals" values={selectedResume.roleSignals} />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Interview target</CardTitle>
            <CardDescription>These choices control difficulty and question mix.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                  className="h-10 w-full rounded-lg border border-input bg-background/55 px-3 text-sm shadow-none outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/10"
                >
                  {["Intern", "Junior", "Middle", "Senior"].map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {mode === "LIVE" ? (
              <div className="space-y-2">
                <Label htmlFor="interview-domain">Interview domain</Label>
                <Input
                  id="interview-domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value)}
                  placeholder="Backend, Frontend, Data, DevOps..."
                />
              </div>
            ) : null}

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

            {selectedResume?.skills.length ? (
              <div className="space-y-2">
                <Label>Focus areas</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedResume.skills.map((skill) => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleFocusArea(skill)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        focusAreas.includes(skill)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {mode === "LIVE" ? (
              <div className="space-y-2">
                <Label>Live scoring focus</Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {skillOptions.map((skill) => (
                    <label
                      key={skill}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 border-b border-border/80 py-3 text-sm transition-colors",
                        evaluationSkills.includes(skill) && "border-primary text-foreground"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={evaluationSkills.includes(skill)}
                        onChange={() => toggleEvaluationSkill(skill)}
                        className="size-4"
                      />
                      {skill}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Question preview</CardTitle>
            <CardDescription>Hybrid plan generated from role, seniority, and CV signals.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentPlan.map((category, index) => (
              <div key={`${category}-${index}`} className="flex items-center justify-between border-b border-border/80 py-3 text-sm">
                <span>{index + 1}. {categoryLabels[category]}</span>
                <Badge>{seniority}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {selectedResume?.status === "NEEDS_REVIEW" ? (
          <p className="border-l border-amber-500 pl-3 text-sm leading-6 text-muted-foreground">
            This resume can generate questions, but reviewing extracted text first will improve relevance.
          </p>
        ) : null}
        {resumeFailed || resumeTooShort ? (
          <p className="border-l border-destructive pl-3 text-sm leading-6 text-destructive">
            This resume cannot be used until parsing issues are fixed.
          </p>
        ) : null}
        {error ? <p className="border-l border-destructive pl-3 text-sm leading-6 text-destructive">{error}</p> : null}

        <Button type="submit" disabled={loading || !canSubmit} className="w-full">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {mode === "LIVE" ? "Start live room" : "Generate interview"}
        </Button>
      </aside>
    </form>
  )
}

function SignalList({ title, values }: { title: string; values: string[] }) {
  if (!values.length) return null

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value}>{value}</Badge>
        ))}
      </div>
    </div>
  )
}

function statusClassName(status: Resume["status"]) {
  if (status === "FAILED") return "bg-red-50 text-red-800"
  if (status === "NEEDS_REVIEW") return "bg-amber-50 text-amber-800"
  return "bg-emerald-50 text-emerald-800"
}
