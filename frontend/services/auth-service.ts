"use client"

import { demoUser } from "@/services/mock-data"
import type { User } from "@/types"

const TOKEN_KEY = "freecard-token"
const USER_KEY = "freecard-user"
export const USER_CHANGE_EVENT = "freecard-user-change"
const PENDING_REGISTRATION_KEY = "freecard-pending-registration"
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const canUseStorage = () => typeof window !== "undefined"
const canUseApi = () => Boolean(API_BASE_URL)
const canUseAuthenticatedApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

type AuthResponse = {
  token: string
  user: User
}

export type UserProfileUpdateInput = {
  name: string
  headline: string
  dateOfBirth?: string | null
}

export type PasswordUpdateInput = {
  currentPassword?: string
  newPassword: string
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

  const user: User =
    email.trim().toLowerCase() === demoUser.email ? demoUser : {
      ...demoUser,
      id: makeId("user"),
      email: email.trim().toLowerCase(),
      name: email.split("@")[0] || "FreeCard User",
      avatarUrl: null,
      authProvider: "LOCAL",
      passwordSet: true,
      role: "USER",
      createdAt: new Date().toISOString(),
    }

  const token = `mock-jwt-${password.length}-${user.id}`
  storeCurrentUser(user)
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
    headline: "FreeCard learner",
    avatarUrl: null,
    authProvider: "LOCAL",
    passwordSet: true,
    role: "USER",
    createdAt: new Date().toISOString(),
  }

  const token = `mock-jwt-${pending.password.length}-${user.id}`
  storeCurrentUser(user)
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

  const user = readJson<User | null>(USER_KEY, null)
  return user ? normalizeUser(user) : null
}

export function getAuthToken() {
  return canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null
}

export async function updateCurrentUser(input: UserProfileUpdateInput) {
  if (canUseAuthenticatedApi()) {
    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to update profile."))
    return storeCurrentUser((await response.json()) as User)
  }

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to update your profile.")
  const updated = applyLocalProfileUpdate(user, input)
  return storeCurrentUser({
    ...updated,
  })
}

export async function uploadUserAvatar(file: File) {
  const validationError = validateAvatarFile(file)
  if (validationError) throw new Error(validationError)

  if (canUseAuthenticatedApi()) {
    const formData = new FormData()
    formData.append("file", file)
    const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: formData,
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to upload avatar."))
    return storeCurrentUser((await response.json()) as User)
  }

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to upload an avatar.")
  return storeCurrentUser({
    ...user,
    avatarUrl: await fileToDataUrl(file),
  })
}

export async function removeUserAvatar() {
  if (canUseAuthenticatedApi()) {
    const response = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to remove avatar."))
    return storeCurrentUser((await response.json()) as User)
  }

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to remove an avatar.")
  return storeCurrentUser({ ...user, avatarUrl: null })
}

export async function changePassword(input: PasswordUpdateInput) {
  if (canUseAuthenticatedApi()) {
    const response = await fetch(`${API_BASE_URL}/api/users/me/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify(input),
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to update password."))
    return storeCurrentUser((await response.json()) as User)
  }

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to update your password.")
  if ((user.passwordSet ?? true) && !input.currentPassword?.trim()) {
    throw new Error("Current password is required.")
  }
  const validationError = validatePassword(input.newPassword)
  if (validationError) throw new Error(validationError)

  return storeCurrentUser({
    ...user,
    passwordSet: true,
    authProvider: user.authProvider === "GOOGLE" ? "LOCAL_AND_GOOGLE" : user.authProvider ?? "LOCAL",
  })
}

export function logout() {
  if (!canUseStorage()) return

  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}

async function apiAuth(path: string, payload: Record<string, string>) {
  const data = await apiRequest<AuthResponse>(path, payload)
  storeCurrentUser(data.user)
  window.localStorage.setItem(TOKEN_KEY, data.token)

  return { token: data.token, user: data.user }
}

function storeCurrentUser(user: User) {
  const normalized = normalizeUser(user)
  writeJson(USER_KEY, normalized)
  if (canUseStorage()) {
    window.dispatchEvent(new CustomEvent(USER_CHANGE_EVENT, { detail: normalized }))
  }
  return normalized
}

function normalizeUser(user: User): User {
  return {
    ...user,
    dateOfBirth: user.dateOfBirth ?? null,
    dateOfBirthSetAt: user.dateOfBirthSetAt ?? null,
    nameChangeCount: user.nameChangeCount ?? 0,
    nameLastChangedAt: user.nameLastChangedAt ?? null,
    avatarUrl: user.avatarUrl ?? null,
    authProvider: user.authProvider ?? "LOCAL",
    passwordSet: user.passwordSet ?? true,
    role: user.role ?? "USER",
  }
}

function applyLocalProfileUpdate(user: User, input: UserProfileUpdateInput): User {
  const nextName = input.name.trim() || user.name
  const nextDateOfBirth = input.dateOfBirth?.trim() || null
  const nameChanged = nextName !== user.name

  if (nameChanged) {
    const changeCount = user.nameChangeCount ?? 0
    if (changeCount >= 3) throw new Error("Name change limit has been reached.")
    if (user.nameLastChangedAt && Date.now() < new Date(user.nameLastChangedAt).getTime() + 30 * 24 * 60 * 60 * 1000) {
      throw new Error("Name can only be changed once every 30 days.")
    }
  }

  if (nextDateOfBirth && user.dateOfBirth && user.dateOfBirth !== nextDateOfBirth) {
    throw new Error("Date of birth can only be set once.")
  }

  return {
    ...user,
    name: nextName,
    headline: input.headline.trim(),
    nameChangeCount: nameChanged ? (user.nameChangeCount ?? 0) + 1 : user.nameChangeCount ?? 0,
    nameLastChangedAt: nameChanged ? new Date().toISOString() : user.nameLastChangedAt ?? null,
    dateOfBirth: user.dateOfBirth ?? nextDateOfBirth,
    dateOfBirthSetAt: user.dateOfBirthSetAt ?? (nextDateOfBirth ? new Date().toISOString() : null),
  }
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

function validateAvatarFile(file: File) {
  const supported = ["image/jpeg", "image/png", "image/webp"].includes(file.type)
  if (!supported) return "Avatar must be a JPG, PNG, or WebP image."
  if (file.size > 2 * 1024 * 1024) return "Avatar image must be smaller than 2MB."
  return ""
}

function validatePassword(value: string) {
  if (value.length < 8 || value.length > 72) return "Password must be between 8 and 72 characters."
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return "Password must include uppercase, lowercase, number, and special character."
  }
  return ""
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Unable to read avatar file."))
    reader.readAsDataURL(file)
  })
}
