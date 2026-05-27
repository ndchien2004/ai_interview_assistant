"use client"

import { ChangeEvent, DragEvent, useState } from "react"
import { CheckCircle2, FileUp, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { uploadResume } from "@/services/resume-service"
import type { Resume } from "@/types"
import { cn } from "@/lib/utils"

type ResumeUploadDropzoneProps = {
  onUploaded: (resume: Resume) => void
}

export function ResumeUploadDropzone({ onUploaded }: ResumeUploadDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [uploadedName, setUploadedName] = useState("")

  const handleFile = async (file?: File) => {
    if (!file) return

    setError("")
    setLoading(true)

    try {
      const resume = await uploadResume(file)
      setUploadedName(resume.fileName)
      onUploaded(resume)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload this file.")
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setDragging(false)
    void handleFile(event.dataTransfer.files[0])
  }

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    void handleFile(event.target.files?.[0])
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background p-8 text-center transition-colors",
          dragging && "border-primary bg-primary/5"
        )}
      >
        <input type="file" accept="application/pdf" className="sr-only" onChange={onChange} />
        <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          {loading ? <Loader2 className="size-5 animate-spin" /> : <FileUp className="size-5" />}
        </div>
        <h2 className="text-lg font-semibold">Upload resume PDF</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Drop your resume here or click to browse. PDF only, up to 5MB.
        </p>
        <Button type="button" variant="outline" className="mt-5" disabled={loading}>
          Select PDF
        </Button>
      </label>

      {uploadedName ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          Uploaded {uploadedName}
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
