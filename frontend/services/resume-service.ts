"use client"

import { getCurrentUser, getStoredResumes, makeId, setStoredResumes } from "@/services/auth-service"
import type { Resume } from "@/types"

export async function listResumes() {
  const user = getCurrentUser()
  const resumes = getStoredResumes()

  if (!user) return []
  return resumes.filter((resume) => resume.userId === user.id || resume.userId === "user-demo")
}

export async function uploadResume(file: File) {
  const user = getCurrentUser()

  if (!user) {
    throw new Error("You must be signed in to upload a resume.")
  }

  if (file.type !== "application/pdf") {
    throw new Error("Please upload a PDF resume.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Resume file must be smaller than 5MB.")
  }

  const resume: Resume = {
    id: makeId("resume"),
    userId: user.id,
    fileName: file.name,
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    parsedText:
      "Mock parsed resume content: full-stack portfolio project, React, Next.js, Spring Boot, PostgreSQL, JWT authentication, REST APIs, Docker, deployment, and AI-powered interview workflows.",
    roleSignals: ["Full-stack", "REST APIs", "Authentication", "AI integration"],
    skills: ["React", "Next.js", "TypeScript", "Spring Boot", "PostgreSQL", "Docker"],
  }

  const resumes = [resume, ...getStoredResumes()]
  setStoredResumes(resumes)

  return resume
}

export async function getResumeById(id: string) {
  return getStoredResumes().find((resume) => resume.id === id) ?? null
}
