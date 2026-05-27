"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { ResumeUploadDropzone } from "@/components/resume-upload-dropzone"
import { StateBlock } from "@/components/state-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { listResumes } from "@/services/resume-service"
import type { Resume } from "@/types"

export function UploadView() {
  const [resumes, setResumes] = useState<Resume[]>([])

  useEffect(() => {
    listResumes().then(setResumes)
  }, [])

  const handleUploaded = (resume: Resume) => {
    setResumes((current) => [resume, ...current])
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <div>
        <Badge className="mb-3 bg-emerald-50 text-emerald-800">Resume intake</Badge>
        <h1 className="text-3xl font-semibold tracking-normal">Upload your resume</h1>
        <p className="mt-2 text-muted-foreground">
          The frontend validates PDFs now. The backend phase will parse the file with PDFBox and persist
          extracted text.
        </p>
        <div className="mt-6">
          <ResumeUploadDropzone onUploaded={handleUploaded} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resume library</CardTitle>
          <CardDescription>Choose a resume later when generating questions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {resumes.length ? (
            resumes.map((resume) => (
              <div key={resume.id} className="border-b border-border/80 py-4 last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{resume.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {(resume.fileSize / 1024).toFixed(1)} KB · {resume.skills.slice(0, 3).join(", ")}
                    </p>
                  </div>
                  <Badge>PDF</Badge>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{resume.parsedText}</p>
              </div>
            ))
          ) : (
            <StateBlock
              title="No resumes uploaded"
              description="Upload a PDF resume to begin the interview workflow."
            />
          )}

          <Button asChild className="w-full" disabled={!resumes.length}>
            <Link href="/interviews/new">
              Generate questions
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
