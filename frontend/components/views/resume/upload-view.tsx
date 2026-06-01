"use client"

import Link from "next/link"
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, Plus, Save, Sparkles, Trash2, Wand2, X } from "lucide-react"
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ConfirmModal } from "@/components/common/confirm-modal"
import { RichTextEditor } from "@/components/forms/rich-text-editor"
import { ResumeUploadDropzone } from "@/components/views/resume/resume-upload-dropzone"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  deleteResume,
  isResumeApiMode,
  listResumes,
  RESUME_SERVICE_FALLBACK_EVENT,
  type ResumeServiceFallbackDetail,
  updateResume,
} from "@/services/resume-service"
import type { Resume } from "@/types"

export function UploadView() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [loadingResumes, setLoadingResumes] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<Resume | null>(null)
  const [pendingSelectionId, setPendingSelectionId] = useState<string | null>(null)
  const [dirtyResumeId, setDirtyResumeId] = useState("")
  const [storageMode, setStorageMode] = useState<"api" | "local">(() => (isResumeApiMode() ? "api" : "local"))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const fallbackMessageRef = useRef("")
  const fallbackActionRef = useRef<ResumeServiceFallbackDetail["action"] | null>(null)

  useEffect(() => {
    let active = true

    listResumes()
      .then((items) => {
        if (!active) return
        setResumes(items)
        setSelectedId(items[0]?.id ?? "")
      })
      .catch((caught) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : "Unable to load resumes.")
      })
      .finally(() => {
        if (!active) return
        setLoadingResumes(false)
        setStorageMode(isResumeApiMode() ? "api" : "local")
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const handleFallback = (event: Event) => {
      const detail = (event as CustomEvent<ResumeServiceFallbackDetail>).detail
      fallbackActionRef.current = detail.action
      fallbackMessageRef.current = detail.message
      setStorageMode("local")
      setMessage(detail.message)
      setError("")
    }

    window.addEventListener(RESUME_SERVICE_FALLBACK_EVENT, handleFallback)
    return () => window.removeEventListener(RESUME_SERVICE_FALLBACK_EVENT, handleFallback)
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
  const interviewReadyResumes = useMemo(() => resumes.filter(isInterviewReadyResume), [resumes])
  const hasInterviewReadyResume = interviewReadyResumes.length > 0

  const successMessage = (action: ResumeServiceFallbackDetail["action"], fallback: string) => {
    if (fallbackActionRef.current === action && fallbackMessageRef.current) {
      const message = fallbackMessageRef.current
      fallbackActionRef.current = null
      fallbackMessageRef.current = ""
      return message
    }

    return fallback
  }

  const requestSelectResume = (resumeId: string) => {
    if (resumeId === selectedId) return
    if (dirtyResumeId === selectedId) {
      setPendingSelectionId(resumeId)
      return
    }

    setSelectedId(resumeId)
    setMessage("")
    setError("")
  }

  const handleUploaded = (resume: Resume) => {
    setMessage(successMessage("upload", storageMode === "api" ? "Resume uploaded." : "Resume uploaded to local demo storage."))
    setError("")
    setResumes((current) => [resume, ...current.filter((item) => item.id !== resume.id)])
    if (dirtyResumeId === selectedId) {
      setPendingSelectionId(resume.id)
    } else {
      setSelectedId(resume.id)
    }
  }

  const handleSaved = (resume: Resume) => {
    setMessage(successMessage("update", storageMode === "api" ? "Resume updated." : "Resume updated in local demo storage."))
    setError("")
    setResumes((current) => current.map((item) => (item.id === resume.id ? resume : item)))
    setSelectedId(resume.id)
    setDirtyResumeId((current) => (current === resume.id ? "" : current))
  }

  const handleEditorDirtyChange = useCallback((resumeId: string, dirty: boolean) => {
    setDirtyResumeId((current) => {
      if (dirty) return resumeId
      return current === resumeId ? "" : current
    })
  }, [])

  const handleDeleted = async () => {
    if (!pendingDelete) return
    try {
      await deleteResume(pendingDelete.id)
      const nextResumes = resumes.filter((item) => item.id !== pendingDelete.id)
      setResumes(nextResumes)
      setSelectedId(nextResumes[0]?.id ?? "")
      setDirtyResumeId((current) => (current === pendingDelete.id ? "" : current))
      setMessage(successMessage("delete", storageMode === "api" ? "Resume deleted." : "Resume deleted from local demo storage."))
      setError("")
      setPendingDelete(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete resume.")
    }
  }

  const discardChangesAndSelect = () => {
    if (!pendingSelectionId) return
    setDirtyResumeId("")
    setSelectedId(pendingSelectionId)
    setPendingSelectionId(null)
    setMessage("")
    setError("")
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
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={cn("font-semibold", storageMode === "api" ? "text-emerald-700" : "text-amber-700")}>
                {storageMode === "api" ? "API storage" : "Local demo storage"}
              </span>
              {dirtyResumeId ? <span>Unsaved changes on the selected resume.</span> : null}
            </div>
          </div>
          {hasInterviewReadyResume ? (
            <Button asChild>
              <Link href="/interviews/new">
                Generate questions
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          ) : (
            <Button type="button" disabled title="A resume needs usable parsed text before question generation.">
              Generate questions
              <ArrowRight className="size-4" />
            </Button>
          )}
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

            {loadingResumes ? (
              <div className="py-4">
                <StateBlock
                  title="Loading resumes"
                  description="Checking your saved resume sources."
                  className="min-h-36"
                />
              </div>
            ) : resumes.length ? (
              <div className="divide-y divide-border/35 dark:divide-white/10">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    onClick={() => requestSelectResume(resume.id)}
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
                          "shrink-0 rounded-full px-2 py-1 text-xs font-semibold transition-colors",
                          statusPillClassName(resume.status)
                        )}
                      >
                        {statusLabel(resume.status)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs leading-5">
                      <span>{resume.skills.slice(0, 4).join(", ") || "No skills extracted"}</span>
                      {selectedId === resume.id ? <span className="font-medium text-teal-700">Selected</span> : null}
                      {dirtyResumeId === resume.id ? <span className="font-medium text-amber-700">Unsaved</span> : null}
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
              onDirtyChange={handleEditorDirtyChange}
            />
          </div>
        ) : loadingResumes ? (
          <div className="rounded-lg border border-white/70 bg-white/55 p-4 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-800/45">
            <StateBlock
              title="Loading editor"
              description="Your resume editor will appear once sources are loaded."
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
      <ConfirmModal
        open={Boolean(pendingSelectionId)}
        title="Discard unsaved changes?"
        description="Switching resumes will discard edits that have not been saved yet."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={discardChangesAndSelect}
        onCancel={() => setPendingSelectionId(null)}
      />
    </div>
  )
}

function ResumeEditor({
  resume,
  onSaved,
  onDeleteRequest,
  onError,
  onDirtyChange,
}: {
  resume: Resume
  onSaved: (resume: Resume) => void
  onDeleteRequest: (resume: Resume) => void
  onError: (message: string) => void
  onDirtyChange: (resumeId: string, dirty: boolean) => void
}) {
  const [fileName, setFileName] = useState(resume.fileName)
  const [parsedText, setParsedText] = useState(resume.parsedText)
  const [summary, setSummary] = useState(resume.summary ?? "")
  const [skills, setSkills] = useState(resume.skills)
  const [roleSignals, setRoleSignals] = useState(resume.roleSignals)
  const [senioritySignals, setSenioritySignals] = useState(resume.senioritySignals ?? [])
  const [projectHighlights, setProjectHighlights] = useState(resume.projectHighlights ?? [])
  const [saving, setSaving] = useState(false)
  const hasChanges =
    fileName !== resume.fileName ||
    parsedText !== resume.parsedText ||
    summary !== (resume.summary ?? "") ||
    !arraysEqual(skills, resume.skills) ||
    !arraysEqual(roleSignals, resume.roleSignals) ||
    !arraysEqual(senioritySignals, resume.senioritySignals ?? []) ||
    !arraysEqual(projectHighlights, resume.projectHighlights ?? [])
  const reviewDiagnostics = useMemo(
    () =>
      getResumeDiagnostics({
        ...resume,
        fileName,
        parsedText,
        summary,
        skills,
        roleSignals,
        senioritySignals,
        projectHighlights,
      }),
    [fileName, parsedText, projectHighlights, resume, roleSignals, senioritySignals, skills, summary]
  )

  useEffect(() => {
    onDirtyChange(resume.id, hasChanges)
  }, [hasChanges, onDirtyChange, resume.id])

  const handleSave = async () => {
    const cleanName = fileName.trim()
    const cleanText = toPlainText(parsedText)

    if (!cleanName) {
      onError("File name is required.")
      return
    }

    if (!cleanText) {
      onError("Parsed resume text is required.")
      return
    }

    setSaving(true)
    try {
      const updated = await updateResume(resume.id, {
        fileName: cleanName,
        parsedText,
        summary,
        skills,
        roleSignals,
        senioritySignals,
        projectHighlights,
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
            <span className={cn("rounded-full px-2 py-1 text-xs font-semibold", statusPillClassName(resume.status))}>
              {statusLabel(resume.status)}
            </span>
            {hasChanges ? <span className="text-xs font-semibold text-amber-700">Unsaved changes</span> : null}
          </div>
          {resume.parseError ? <p className="mt-2 text-sm text-destructive">{resume.parseError}</p> : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving || !hasChanges}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {hasChanges ? "Save" : "Saved"}
          </Button>
          <Button variant="destructive" onClick={() => onDeleteRequest(resume)}>
            <Trash2 className="size-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:col-start-2 xl:self-start lg:grid-cols-2">
        {reviewDiagnostics.map((item) => (
          <div
            key={item.label}
            className={cn(
              "flex gap-3 border-y px-0 py-3 text-sm",
              item.tone === "error" && "border-destructive/30 text-destructive",
              item.tone === "warning" && "border-amber-500/25 text-amber-800 dark:text-amber-200",
              item.tone === "success" && "border-emerald-500/25 text-emerald-800 dark:text-emerald-200"
            )}
          >
            {item.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 leading-5 text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
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
        <TagEditor
          id="resume-skills"
          label="Skills"
          value={skills}
          onChange={setSkills}
          placeholder="React, Spring Boot, PostgreSQL"
        />
        <TagEditor
          id="resume-signals"
          label="Role signals"
          value={roleSignals}
          onChange={setRoleSignals}
          placeholder="Full-stack, REST APIs, Authentication"
        />
        <TagEditor
          id="resume-seniority-signals"
          label="Seniority signals"
          value={senioritySignals}
          onChange={setSenioritySignals}
          placeholder="Junior, project ownership, production deployment"
        />
        <TagEditor
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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Label htmlFor="resume-parsed-text">Parsed resume text</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => setParsedText(formatResumeText(parsedText))}>
            <Wand2 className="size-4" />
            Clean format
          </Button>
        </div>
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

function TagEditor({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState("")

  const addTags = (rawValue: string) => {
    const nextTags = rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)

    if (!nextTags.length) return

    onChange(Array.from(new Set([...value, ...nextTags])))
    setDraft("")
  }

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" && event.key !== ",") return
    event.preventDefault()
    addTags(draft)
  }

  return (
    <div className="space-y-2 border-b border-border/50 pb-3">
      <Label htmlFor={id}>{label}</Label>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex min-h-7 items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 text-xs text-foreground"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`Remove ${tag}`}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input
          id={id}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTags(draft)}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" size="icon-sm" onClick={() => addTags(draft)} aria-label={`Add ${label}`}>
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function statusLabel(status?: Resume["status"]) {
  if (status === "READY") return "Ready"
  if (status === "NEEDS_REVIEW") return "Needs review"
  if (status === "FAILED") return "Failed"
  if (status === "PROCESSING") return "Processing"
  return "Mock"
}

function statusPillClassName(status?: Resume["status"]) {
  if (status === "READY") return "bg-emerald-50 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-100"
  if (status === "FAILED") return "bg-destructive/10 text-destructive"
  if (status === "PROCESSING") return "bg-blue-50 text-blue-800 dark:bg-blue-400/10 dark:text-blue-100"
  if (status === "NEEDS_REVIEW") return "bg-amber-50 text-amber-800 dark:bg-amber-400/10 dark:text-amber-100"
  return "bg-background/60 text-muted-foreground dark:bg-white/[0.04]"
}

function isInterviewReadyResume(resume: Resume) {
  return resume.status !== "FAILED" && toPlainText(resume.parsedText).length >= 80
}

type ResumeDiagnostic = {
  label: string
  description: string
  tone: "success" | "warning" | "error"
}

function getResumeDiagnostics(resume: Resume): ResumeDiagnostic[] {
  const textLength = toPlainText(resume.parsedText).length
  const diagnostics: ResumeDiagnostic[] = []

  if (resume.status === "FAILED") {
    diagnostics.push({
      label: "Parsing needs attention",
      description: resume.parseError || "Fix the parsed resume text before generating interviews.",
      tone: "error",
    })
  } else if (textLength < 80) {
    diagnostics.push({
      label: "Parsed text is too short",
      description: "Add enough resume content so question generation has real context.",
      tone: "error",
    })
  } else {
    diagnostics.push({
      label: "Resume text is usable",
      description: `${textLength.toLocaleString()} characters are available for interview context.`,
      tone: "success",
    })
  }

  diagnostics.push(
    resume.skills.length
      ? {
          label: "Skills extracted",
          description: `${resume.skills.length} skills can be used as focus areas.`,
          tone: "success",
        }
      : {
          label: "Add skills",
          description: "Skills improve the focus-area picker and technical question relevance.",
          tone: "warning",
        }
  )

  diagnostics.push(
    resume.roleSignals.length
      ? {
          label: "Role signals found",
          description: `${resume.roleSignals.length} signals help infer the target role.`,
          tone: "success",
        }
      : {
          label: "Add role signals",
          description: "Role signals help create stronger resume-aware interview defaults.",
          tone: "warning",
        }
  )

  if (resume.warnings?.length) {
    diagnostics.push({
      label: "Extraction warnings",
      description: resume.warnings.join(" "),
      tone: "warning",
    })
  } else if (resume.status === "READY") {
    diagnostics.push({
      label: "Ready for interviews",
      description: "This resume can be used to generate a focused mock interview.",
      tone: "success",
    })
  }

  return diagnostics
}

function arraysEqual(first: string[], second: string[]) {
  if (first.length !== second.length) return false
  return first.every((item, index) => item === second[index])
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
    .trim()
}

function formatResumeText(value: string) {
  const sectionHeadings = [
    "EDUCATION",
    "TECHNICAL SKILLS",
    "SKILLS",
    "RELEVANT INFORMATION TECHNOLOGY PROJECTS",
    "PROJECTS",
    "RELEVANT TRAINING",
    "TRAINING",
    "WORK HISTORY",
    "EXPERIENCE",
    "CERTIFICATIONS",
    "SUMMARY",
  ]

  let formatted = toPlainText(value)
    .replace(/\u25A1|\u25AA|\u2022/g, "\n- ")
    .replace(/([a-z0-9)])([A-Z][A-Z ]{4,})(?=[A-Z][a-z]|\s|$)/g, "$1\n\n$2")
    .replace(/(20XX|20\d{2}|Present)([A-Z])/g, "$1\n$2")
    .replace(/([a-z)])(Bachelor|Master|Associate|Languages|Tools and Software|Operating Systems|Trainee|Sales Associate)\b/g, "$1\n$2")
    .replace(/([.!?])\s+(?=[A-Z][a-z]+:)/g, "$1\n")

  for (const heading of sectionHeadings) {
    const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    formatted = formatted.replace(new RegExp(`\\s*(${escapedHeading})\\s*`, "gi"), "\n\n$1\n")
  }

  return formatted
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\| ?/g, " | ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
