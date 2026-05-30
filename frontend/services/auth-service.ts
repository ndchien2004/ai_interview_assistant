"use client"

import { demoEvaluations, demoResumes, demoSessions, demoUser } from "@/services/mock-data"
import type { Evaluation, InterviewSession, Resume, User } from "@/types"

const TOKEN_KEY = "ai-interview-token"
const USER_KEY = "ai-interview-user"
const PENDING_REGISTRATION_KEY = "ai-interview-pending-registration"
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

type OtpChallengeResponse = {
  email: string
  otpRequired: boolean
  expiresInSeconds: number
  message: string
}

type PendingRegistration = {
  name: string
  email: string
  password: string
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
  const normalizedEmail = email.trim().toLowerCase()
  const trimmedName = name.trim()

  if (canUseApi()) {
    try {
      return await apiRequest<OtpChallengeResponse>("/api/auth/register", {
        name: trimmedName,
        email: normalizedEmail,
        password,
      })
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }
    }
  }

  seedMockData()

  writeJson<PendingRegistration>(PENDING_REGISTRATION_KEY, {
    name: trimmedName,
    email: normalizedEmail,
    password,
  })

  return {
    email: normalizedEmail,
    otpRequired: true,
    expiresInSeconds: 600,
    message: "Use OTP 123456 to complete demo registration.",
  }
}

export async function verifyRegistrationOtp(email: string, otp: string) {
  const normalizedEmail = email.trim().toLowerCase()

  if (canUseApi()) {
    try {
      return await apiAuth("/api/auth/register/verify", {
        email: normalizedEmail,
        otp,
      })
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }
    }
  }

  const pending = readJson<PendingRegistration | null>(PENDING_REGISTRATION_KEY, null)
  if (!pending || pending.email !== normalizedEmail) {
    throw new Error("Registration session was not found.")
  }

  if (otp !== "123456") {
    throw new Error("OTP is invalid.")
  }

  const user: User = {
    id: makeId("user"),
    name: pending.name,
    email: normalizedEmail,
    headline: "Candidate preparing for AI-assisted interviews",
    createdAt: new Date().toISOString(),
  }

  const token = `mock-jwt-${pending.password.length}-${user.id}`
  writeJson(USER_KEY, user)
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.removeItem(PENDING_REGISTRATION_KEY)

  return { token, user }
}

export async function resendRegistrationOtp(email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  if (canUseApi()) {
    try {
      return await apiRequest<OtpChallengeResponse>("/api/auth/register/resend-otp", {
        email: normalizedEmail,
      })
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error
      }
    }
  }

  const pending = readJson<PendingRegistration | null>(PENDING_REGISTRATION_KEY, null)
  if (!pending || pending.email !== normalizedEmail) {
    throw new Error("Registration session was not found.")
  }

  return {
    email: normalizedEmail,
    otpRequired: true,
    expiresInSeconds: 600,
    message: "Use OTP 123456 to complete demo registration.",
  }
}

export async function loginWithGoogle(idToken: string) {
  if (!canUseApi()) {
    throw new Error("Backend API URL is required for Google sign-in.")
  }

  return apiAuth("/api/auth/google", {
    idToken,
  })
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
  const data = await apiRequest<AuthResponse>(path, payload)
  writeJson(USER_KEY, data.user)
  window.localStorage.setItem(TOKEN_KEY, data.token)

  return { token: data.token, user: data.user }
}

async function apiRequest<T>(path: string, payload: Record<string, string>) {
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

  return (await response.json()) as T
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const json = await response.json()
    return json.message ?? fallback
  } catch {
    return fallback
  }
}
