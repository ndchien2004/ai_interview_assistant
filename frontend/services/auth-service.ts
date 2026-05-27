"use client"

import { demoEvaluations, demoResumes, demoSessions, demoUser } from "@/services/mock-data"
import type { Evaluation, InterviewSession, Resume, User } from "@/types"

const TOKEN_KEY = "ai-interview-token"
const USER_KEY = "ai-interview-user"
const RESUMES_KEY = "ai-interview-resumes"
const SESSIONS_KEY = "ai-interview-sessions"
const EVALUATIONS_KEY = "ai-interview-evaluations"

const canUseStorage = () => typeof window !== "undefined"

const readJson = <T>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback

  const value = window.localStorage.getItem(key)
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const writeJson = <T>(key: string, value: T) => {
  if (canUseStorage()) {
    window.localStorage.setItem(key, JSON.stringify(value))
  }
}

export const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const seedMockData = () => {
  if (!canUseStorage()) return

  if (!window.localStorage.getItem(RESUMES_KEY)) {
    writeJson<Resume[]>(RESUMES_KEY, demoResumes)
  }

  if (!window.localStorage.getItem(SESSIONS_KEY)) {
    writeJson<InterviewSession[]>(SESSIONS_KEY, demoSessions)
  }

  if (!window.localStorage.getItem(EVALUATIONS_KEY)) {
    writeJson<Evaluation[]>(EVALUATIONS_KEY, demoEvaluations)
  }
}

export const getStoredResumes = () => {
  seedMockData()
  return readJson<Resume[]>(RESUMES_KEY, [])
}

export const setStoredResumes = (resumes: Resume[]) => writeJson(RESUMES_KEY, resumes)

export const getStoredSessions = () => {
  seedMockData()
  return readJson<InterviewSession[]>(SESSIONS_KEY, [])
}

export const setStoredSessions = (sessions: InterviewSession[]) => writeJson(SESSIONS_KEY, sessions)

export const getStoredEvaluations = () => {
  seedMockData()
  return readJson<Evaluation[]>(EVALUATIONS_KEY, [])
}

export const setStoredEvaluations = (evaluations: Evaluation[]) =>
  writeJson(EVALUATIONS_KEY, evaluations)

export async function login(email: string, password: string) {
  seedMockData()

  const user: User =
    email.trim().toLowerCase() === demoUser.email ? demoUser : {
      ...demoUser,
      id: makeId("user"),
      email: email.trim().toLowerCase(),
      name: email.split("@")[0] || "Portfolio User",
      createdAt: new Date().toISOString(),
    }

  const token = `mock-jwt-${password.length}-${user.id}`
  writeJson(USER_KEY, user)
  window.localStorage.setItem(TOKEN_KEY, token)

  return { token, user }
}

export async function register(name: string, email: string, password: string) {
  seedMockData()

  const user: User = {
    id: makeId("user"),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    headline: "Candidate preparing for AI-assisted interviews",
    createdAt: new Date().toISOString(),
  }

  const token = `mock-jwt-${password.length}-${user.id}`
  writeJson(USER_KEY, user)
  window.localStorage.setItem(TOKEN_KEY, token)

  return { token, user }
}

export function getCurrentUser() {
  const token = canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null
  if (!token) return null

  return readJson<User | null>(USER_KEY, null)
}

export function logout() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}
