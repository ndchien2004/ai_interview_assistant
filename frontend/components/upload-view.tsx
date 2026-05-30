"use client"

import Link from "next/link"
import { ArrowRight, Save, Sparkles, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { ConfirmModal } from "@/components/confirm-modal"
import { RichTextEditor } from "@/components/rich-text-editor"
import { ResumeUploadDropzone } from "@/components/resume-upload-dropzone"
import { StateBlock } from "@/components/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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

  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(() => {
      setMessage("")
    }, 3000)

    return () => window.clearTimeout(timeoutId)
  }, [message])

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
    <div className="relative -m-4 min-h-[calc(100vh-2rem)] overflow-hidden rounded-lg border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(236,253,245,0.58)_45%,rgba(239,246,255,0.68))] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(29,33,43,0.98),rgba(25,43,41,0.76)_45%,rgba(31,42,57,0.86))] dark:shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:-m-6 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,rgba(20,184,166,0.16),rgba(255,255,255,0.28),rgba(99,102,241,0.12))] dark:bg-[linear-gradient(90deg,rgba(20,184,166,0.10),rgba(51,65,85,0.18),rgba(99,102,241,0.11))]" />

      <section className="relative rounded-lg border border-white/70 bg-white/55 p-5 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800/45">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="size-4 text-teal-700" />
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
            "relative mt-5 rounded-lg border px-4 py-3 text-sm shadow-sm backdrop-blur-xl",
            error
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-500/25 bg-emerald-50/80 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <section className="relative mt-6 grid items-start gap-6 xl:auto-rows-min xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6 xl:row-span-3">
          <ResumeUploadDropzone onUploaded={handleUploaded} />

          <div className="border-y border-border/50 bg-transparent dark:border-white/10">
            <div className="flex items-center justify-between border-b border-border/40 py-3">
              <h2 className="text-sm font-semibold">Resume library</h2>
              <span className="text-xs text-muted-foreground">
                {resumes.length} total
              </span>
            </div>

            {resumes.length ? (
              <div className="divide-y divide-border/35 dark:divide-white/10">
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
                      "relative w-full py-4 pl-5 pr-3 text-left transition-colors outline-none hover:bg-white/35 hover:text-foreground focus-visible:bg-white/45 focus-visible:ring-2 focus-visible:ring-ring/30 dark:hover:bg-white/[0.045] dark:focus-visible:bg-white/[0.07]",
                      selectedId === resume.id
                        ? "bg-white/35 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)] dark:bg-white/[0.055] dark:text-slate-50 dark:shadow-[inset_0_0_0_1px_rgba(148,163,184,0.16)]"
                        : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-4 h-[calc(100%-2rem)] w-0.5 rounded-full bg-transparent transition-colors",
                        selectedId === resume.id && "bg-teal-700 dark:bg-teal-400"
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
                          "shrink-0 rounded-full px-2 py-1 text-xs transition-colors",
                          selectedId === resume.id
                            ? "bg-teal-50 text-teal-800 dark:bg-teal-400/10 dark:text-teal-100 dark:ring-1 dark:ring-teal-300/15"
                            : "bg-background/60 text-muted-foreground dark:bg-white/[0.04]"
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
              <div className="py-4">
                <StateBlock
                  title="No resumes"
                  description="Upload a PDF resume to create the first resume source."
                />
              </div>
            )}
          </div>
        </div>

        {selectedResume ? (
          <div className="xl:contents">
            <ResumeEditor
              key={selectedResume.id}
              resume={selectedResume}
              onSaved={handleSaved}
              onDeleteRequest={setPendingDelete}
              onError={setError}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800/45">
            <StateBlock
              title="Select a resume"
              description="Uploaded resumes will appear here for review and editing."
            />
          </div>
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
    <div className="space-y-6 rounded-lg border border-white/70 bg-white/45 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800/35 xl:contents">
      <div className="flex flex-col gap-4 border-y border-border/50 py-4 sm:flex-row sm:items-start sm:justify-between xl:col-start-2 xl:self-start">
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

      <div className="grid gap-4 border-b border-border/40 pb-5 lg:grid-cols-2 xl:col-start-2 xl:self-start">
        <div className="space-y-2 border-b border-border/50 pb-3 lg:border-b-0 lg:pb-0">
          <Label htmlFor="resume-file-name">File name</Label>
          <Input id="resume-file-name" value={fileName} onChange={(event) => setFileName(event.target.value)} />
        </div>
        <div className="space-y-2 border-b border-border/50 pb-3 lg:border-b-0 lg:pb-0">
          <Label>Uploaded</Label>
          <p className="py-2 text-sm text-muted-foreground">
            {formatDate(resume.uploadedAt)} / {(resume.fileSize / 1024).toFixed(1)} KB
          </p>
        </div>
      </div>

      <div className="grid gap-x-8 gap-y-5 border-b border-border/40 pb-5 lg:grid-cols-2 xl:col-start-2 xl:self-start">
        <GlassInput
          id="resume-skills"
          label="Skills"
          value={skills}
          onChange={setSkills}
          placeholder="React, Spring Boot, PostgreSQL"
        />
        <GlassInput
          id="resume-signals"
          label="Role signals"
          value={roleSignals}
          onChange={setRoleSignals}
          placeholder="Full-stack, REST APIs, Authentication"
        />
        <GlassInput
          id="resume-seniority-signals"
          label="Seniority signals"
          value={senioritySignals}
          onChange={setSenioritySignals}
          placeholder="Junior, project ownership, production deployment"
        />
        <GlassInput
          id="resume-project-highlights"
          label="Project highlights"
          value={projectHighlights}
          onChange={setProjectHighlights}
          placeholder="AI Interview Assistant, dashboard, REST API"
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="resume-summary">Summary</Label>
        <RichTextEditor
          value={summary}
          onChange={setSummary}
          minHeight="min-h-28"
        />
      </div>

      <div className="space-y-2 xl:col-span-2">
        <Label htmlFor="resume-parsed-text">Parsed resume text</Label>
        <RichTextEditor
          value={parsedText}
          onChange={setParsedText}
          minHeight="min-h-[460px]"
        />
      </div>

      {resume.warnings?.length ? (
        <div className="rounded-lg border border-white/70 bg-white/55 px-4 py-3 text-sm text-muted-foreground shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/45 xl:col-span-2">
          {resume.warnings.join(" ")}
        </div>
      ) : null}
    </div>
  )
}

function GlassInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <div className="space-y-2 border-b border-border/50 pb-3">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
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
