"use client"

import { getAuthToken, getCurrentUser, getStoredResumes, makeId, setStoredResumes } from "@/services/auth-service"
import type { Resume } from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export type ResumeUpdateInput = {
  fileName: string
  parsedText: string
  summary?: string
  skills: string[]
  roleSignals: string[]
  senioritySignals?: string[]
  projectHighlights?: string[]
  warnings?: string[]
}

const canUseApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function listResumes() {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load resumes.")
      return response.json() as Promise<Resume[]>
    } catch {
      return listLocalResumes()
    }
  }

  return listLocalResumes()
}

function listLocalResumes() {
  const user = getCurrentUser()
  const resumes = getStoredResumes()

  if (!user) return []
  return resumes.filter((resume) => resume.userId === user.id || resume.userId === "user-demo")
}

export async function uploadResume(file: File) {
  if (canUseApi()) {
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch(`${API_BASE_URL}/api/resumes`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to upload resume."))
      return response.json() as Promise<Resume>
    } catch {
      return uploadLocalResume(file)
    }
  }

  return uploadLocalResume(file)
}

async function uploadLocalResume(file: File) {
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
    contentType: file.type,
    uploadedAt: new Date().toISOString(),
    parsedText:
      "Mock parsed resume content: full-stack portfolio project, React, Next.js, Spring Boot, PostgreSQL, JWT authentication, REST APIs, Docker, deployment, and AI-powered interview workflows.",
    summary: "Full-stack candidate with modern frontend, Spring Boot backend, database, Docker, and AI interview workflow experience.",
    status: "NEEDS_REVIEW",
    parseError: null,
    roleSignals: ["Full-stack", "REST APIs", "Authentication", "AI integration"],
    skills: ["React", "Next.js", "TypeScript", "Spring Boot", "PostgreSQL", "Docker"],
    senioritySignals: [],
    projectHighlights: ["AI Interview Assistant"],
    warnings: ["Mock extraction is being used until the backend API is configured."],
  }

  const resumes = [resume, ...getStoredResumes()]
  setStoredResumes(resumes)

  return resume
}

export async function getResumeById(id: string) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${id}`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load resume.")
      return response.json() as Promise<Resume>
    } catch {
      return getStoredResumes().find((resume) => resume.id === id) ?? null
    }
  }
  return getStoredResumes().find((resume) => resume.id === id) ?? null
}

export async function updateResume(id: string, input: ResumeUpdateInput) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to update resume."))
      return response.json() as Promise<Resume>
    } catch {
      return updateLocalResume(id, input)
    }
  }

  return updateLocalResume(id, input)
}

async function updateLocalResume(id: string, input: ResumeUpdateInput) {
  const user = getCurrentUser()
  if (!user) {
    throw new Error("You must be signed in to update a resume.")
  }

  const resumes = getStoredResumes()
  const current = resumes.find((resume) => resume.id === id)
  if (!current) {
    throw new Error("Resume was not found.")
  }

  const updated: Resume = {
    ...current,
    fileName: input.fileName.trim() || current.fileName,
    parsedText: input.parsedText.trim(),
    summary: input.summary?.trim() ?? current.summary ?? "",
    skills: input.skills.map((item) => item.trim()).filter(Boolean),
    roleSignals: input.roleSignals.map((item) => item.trim()).filter(Boolean),
    senioritySignals: input.senioritySignals?.map((item) => item.trim()).filter(Boolean) ?? current.senioritySignals ?? [],
    projectHighlights: input.projectHighlights?.map((item) => item.trim()).filter(Boolean) ?? current.projectHighlights ?? [],
    warnings: input.warnings?.map((item) => item.trim()).filter(Boolean) ?? current.warnings ?? [],
    status: input.parsedText.trim().length < 80 ? "NEEDS_REVIEW" : "READY",
    parseError: null,
  }

  setStoredResumes(resumes.map((resume) => (resume.id === id ? updated : resume)))
  return updated
}

export async function deleteResume(id: string) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/resumes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to delete resume."))
      return
    } catch {
      return deleteLocalResume(id)
    }
  }

  return deleteLocalResume(id)
}

async function deleteLocalResume(id: string) {
  const user = getCurrentUser()
  if (!user) {
    throw new Error("You must be signed in to delete a resume.")
  }

  const resumes = getStoredResumes()
  const exists = resumes.some((resume) => resume.id === id)
  if (!exists) {
    throw new Error("Resume was not found.")
  }

  setStoredResumes(resumes.filter((resume) => resume.id !== id))
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const json = await response.json()
    return json.message ?? fallback
  } catch {
    return fallback
  }
}
