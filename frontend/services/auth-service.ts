"use client"

import { demoEvaluations, demoResumes, demoSessions, demoUser } from "@/services/mock-data"
import type { Evaluation, InterviewSession, Resume, User } from "@/types"

const TOKEN_KEY = "ai-interview-token"
const USER_KEY = "ai-interview-user"
const RESUMES_KEY = "ai-interview-resumes"
const SESSIONS_KEY = "ai-interview-sessions"
const EVALUATIONS_KEY = "ai-interview-evaluations"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const canUseStorage = () => typeof window !== "undefined"
const canUseApi = () => Boolean(API_BASE_URL)

type AuthResponse = {
  token: string
  user: User
}

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
  if (canUseApi()) {
    try {
      return await apiAuth("/api/auth/login", {
        email: email.trim().toLowerCase(),
        password,
      })
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }
    }
  }

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
  if (canUseApi()) {
    try {
      return await apiAuth("/api/auth/register", {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      })
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }
    }
  }

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

export function getAuthToken() {
  return canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null
}

export function logout() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

async function apiAuth(path: string, payload: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await errorMessage(response, "Authentication failed."))
  }

  const data = (await response.json()) as AuthResponse
  writeJson(USER_KEY, data.user)
  window.localStorage.setItem(TOKEN_KEY, data.token)

  return { token: data.token, user: data.user }
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const json = await response.json()
    return json.message ?? fallback
  } catch {
    return fallback
  }
}
