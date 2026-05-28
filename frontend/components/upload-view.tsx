"use client"

import Link from "next/link"
import { ArrowRight, FileText, Save, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ConfirmModal } from "@/components/confirm-modal"
import { ResumeUploadDropzone } from "@/components/resume-upload-dropzone"
import { StateBlock } from "@/components/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { deleteResume, listResumes, updateResume } from "@/services/resume-service"
import type { Resume } from "@/types"

export function UploadView() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [pendingDelete, setPendingDelete] = useState<Resume | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true

    listResumes().then((items) => {
      if (!active) return
      setResumes(items)
      setSelectedId(items[0]?.id ?? "")
    })

    return () => {
      active = false
    }
  }, [])

  const selectedResume = useMemo(
    () => resumes.find((resume) => resume.id === selectedId) ?? null,
    [resumes, selectedId]
  )

  const handleUploaded = (resume: Resume) => {
    setMessage("Resume uploaded.")
    setError("")
    setResumes((current) => [resume, ...current.filter((item) => item.id !== resume.id)])
    setSelectedId(resume.id)
  }

  const handleSaved = (resume: Resume) => {
    setMessage("Resume updated.")
    setError("")
    setResumes((current) => current.map((item) => (item.id === resume.id ? resume : item)))
    setSelectedId(resume.id)
  }

  const handleDeleted = async () => {
    if (!pendingDelete) return
    try {
      await deleteResume(pendingDelete.id)
      const nextResumes = resumes.filter((item) => item.id !== pendingDelete.id)
      setResumes(nextResumes)
      setSelectedId(nextResumes[0]?.id ?? "")
      setMessage("Resume deleted.")
      setError("")
      setPendingDelete(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete resume.")
    }
  }

  return (
    <div className="space-y-7">
      <section className="border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="size-4" />
              Resume workspace
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Resume</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Upload, edit, review, and remove resume sources used by interview practice.
            </p>
          </div>
          <Button asChild disabled={!resumes.length}>
            <Link href="/interviews/new">
              Generate questions
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      {(message || error) ? (
        <div
          className={cn(
            "border-y py-3 text-sm",
            error ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[360px_1fr]">
        <div className="space-y-6">
          <ResumeUploadDropzone onUploaded={handleUploaded} />

          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-semibold">Resume library</h2>
              <span className="text-xs text-muted-foreground">{resumes.length} total</span>
            </div>

            {resumes.length ? (
              <div className="divide-y divide-border">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(resume.id)
                      setMessage("")
                      setError("")
                    }}
                    className={cn(
                      "relative w-full py-4 pl-4 pr-2 text-left transition-colors outline-none hover:bg-muted/40 hover:text-foreground focus-visible:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring/30",
                      selectedId === resume.id
                        ? "bg-muted/50 text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-4 h-[calc(100%-2rem)] w-0.5 bg-transparent transition-colors",
                        selectedId === resume.id && "bg-foreground"
                      )}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{resume.fileName}</p>
                        <p className="mt-1 text-xs">
                          {(resume.fileSize / 1024).toFixed(1)} KB / {formatDate(resume.uploadedAt)}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-xs transition-colors",
                          selectedId === resume.id ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {selectedId === resume.id ? "Selected" : "PDF"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5">
                      <span>{resume.skills.slice(0, 4).join(", ") || "No skills extracted"}</span>
                      <span className={cn("font-medium", statusTone(resume.status))}>
                        {resume.status ?? "MOCK"}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <StateBlock
                title="No resumes"
                description="Upload a PDF resume to create the first resume source."
              />
            )}
          </div>
        </div>

        {selectedResume ? (
          <ResumeEditor
            key={selectedResume.id}
            resume={selectedResume}
            onSaved={handleSaved}
            onDeleteRequest={setPendingDelete}
            onError={setError}
          />
        ) : (
          <StateBlock
            title="Select a resume"
            description="Uploaded resumes will appear here for review and editing."
          />
        )}
      </section>

      <ConfirmModal
        open={Boolean(pendingDelete)}
        title="Delete resume?"
        description={
          pendingDelete
            ? `This will remove "${pendingDelete.fileName}" from your resume library. Interview history will remain, but this resume will no longer be available for new sessions.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={handleDeleted}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}

function ResumeEditor({
  resume,
  onSaved,
  onDeleteRequest,
  onError,
}: {
  resume: Resume
  onSaved: (resume: Resume) => void
  onDeleteRequest: (resume: Resume) => void
  onError: (message: string) => void
}) {
  const [fileName, setFileName] = useState(resume.fileName)
  const [parsedText, setParsedText] = useState(resume.parsedText)
  const [summary, setSummary] = useState(resume.summary ?? "")
  const [skills, setSkills] = useState(resume.skills.join(", "))
  const [roleSignals, setRoleSignals] = useState(resume.roleSignals.join(", "))
  const [senioritySignals, setSenioritySignals] = useState(resume.senioritySignals?.join(", ") ?? "")
  const [projectHighlights, setProjectHighlights] = useState(resume.projectHighlights?.join(", ") ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await updateResume(resume.id, {
        fileName,
        parsedText,
        summary,
        skills: splitCsv(skills),
        roleSignals: splitCsv(roleSignals),
        senioritySignals: splitCsv(senioritySignals),
        projectHighlights: splitCsv(projectHighlights),
        warnings: resume.warnings ?? [],
      })
      onSaved(updated)
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "Unable to update resume.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Editing resume</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight">{resume.fileName}</h2>
            <span className={cn("text-xs font-semibold", statusTone(resume.status))}>
              {resume.status ?? "MOCK"}
            </span>
          </div>
          {resume.parseError ? <p className="mt-2 text-sm text-destructive">{resume.parseError}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            <Save className="size-4" />
            Save
          </Button>
          <Button variant="destructive" onClick={() => onDeleteRequest(resume)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="resume-file-name">File name</Label>
          <Input id="resume-file-name" value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Uploaded</Label>
          <p className="border-b border-border py-2 text-sm text-muted-foreground">
            {formatDate(resume.uploadedAt)} / {(resume.fileSize / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-skills">Skills</Label>
        <Input
          id="resume-skills"
          value={skills}
          onChange={(event) => setSkills(event.target.value)}
          placeholder="React, Spring Boot, PostgreSQL"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-signals">Role signals</Label>
        <Input
          id="resume-signals"
          value={roleSignals}
          onChange={(event) => setRoleSignals(event.target.value)}
          placeholder="Full-stack, REST APIs, Authentication"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-seniority-signals">Seniority signals</Label>
        <Input
          id="resume-seniority-signals"
          value={senioritySignals}
          onChange={(event) => setSenioritySignals(event.target.value)}
          placeholder="Junior, project ownership, production deployment"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-project-highlights">Project highlights</Label>
        <Input
          id="resume-project-highlights"
          value={projectHighlights}
          onChange={(event) => setProjectHighlights(event.target.value)}
          placeholder="AI Interview Assistant, dashboard, REST API"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-summary">Summary</Label>
        <Textarea
          id="resume-summary"
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          className="min-h-24 resize-y"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="resume-parsed-text">Parsed resume text</Label>
        <Textarea
          id="resume-parsed-text"
          value={parsedText}
          onChange={(event) => setParsedText(event.target.value)}
          className="min-h-56 resize-y"
        />
      </div>

      {resume.warnings?.length ? (
        <div className="border-y border-border py-3 text-sm text-muted-foreground">
          {resume.warnings.join(" ")}
        </div>
      ) : null}
    </div>
  )
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function statusTone(status?: Resume["status"]) {
  if (status === "READY") return "text-emerald-700"
  if (status === "FAILED") return "text-destructive"
  if (status === "PROCESSING") return "text-amber-700"
  return "text-muted-foreground"
}
