"use client"

import { demoEvaluations, demoResumes, demoSessions, demoUser } from "@/services/mock-data"
import type { Evaluation, InterviewSession, Resume, User } from "@/types"

const TOKEN_KEY = "ai-interview-token"
const USER_KEY = "ai-interview-user"
export const USER_CHANGE_EVENT = "ai-interview-user-change"
const PENDING_REGISTRATION_KEY = "ai-interview-pending-registration"
const PENDING_PHONE_KEY = "ai-interview-pending-phone"
const RESUMES_KEY = "ai-interview-resumes"
const SESSIONS_KEY = "ai-interview-sessions"
const EVALUATIONS_KEY = "ai-interview-evaluations"
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

type PendingPhoneVerification = {
  phoneNumber: string
  otp: string
  expiresAt: string
}

const PHONE_COUNTRIES = [
  { iso: "VN", dialCode: "+84" },
  { iso: "US", dialCode: "+1" },
  { iso: "JP", dialCode: "+81" },
  { iso: "KR", dialCode: "+82" },
  { iso: "SG", dialCode: "+65" },
  { iso: "TH", dialCode: "+66" },
  { iso: "AU", dialCode: "+61" },
  { iso: "GB", dialCode: "+44" },
  { iso: "CA", dialCode: "+1" },
] as const

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

export async function requestPhoneOtp(countryIso: string, nationalNumber: string) {
  const normalizedCountryIso = countryIso.trim().toUpperCase()
  const normalizedNationalNumber = normalizeNationalPhone(nationalNumber)
  const validationError = validatePhoneNumber(normalizedCountryIso, normalizedNationalNumber)
  if (validationError) throw new Error(validationError)

  if (canUseAuthenticatedApi()) {
    const response = await fetch(`${API_BASE_URL}/api/users/me/phone/otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({
        countryIso: normalizedCountryIso,
        nationalNumber: normalizedNationalNumber,
      }),
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to send phone OTP."))
    return (await response.json()) as {
      phoneNumber: string
      otpRequired: boolean
      expiresInSeconds: number
      message: string
    }
  }

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to verify a phone number.")
  const normalizedPhone = toE164DemoPhone(normalizedCountryIso, normalizedNationalNumber)
  if (user.phoneNumber === normalizedPhone) throw new Error("This phone number is already verified.")

  writeJson<PendingPhoneVerification>(PENDING_PHONE_KEY, {
    phoneNumber: normalizedPhone,
    otp: "123456",
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  return {
    phoneNumber: normalizedPhone,
    otpRequired: true,
    expiresInSeconds: 600,
    message: "Demo mode: use OTP 123456 to verify this phone number.",
  }
}

export async function verifyPhoneOtp(otp: string) {
  if (canUseAuthenticatedApi()) {
    const response = await fetch(`${API_BASE_URL}/api/users/me/phone/verify`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ otp }),
    })
    if (!response.ok) throw new Error(await errorMessage(response, "Unable to verify phone number."))
    return storeCurrentUser((await response.json()) as User)
  }

  const pending = readJson<PendingPhoneVerification | null>(PENDING_PHONE_KEY, null)
  if (!pending) throw new Error("Phone verification request was not found.")
  if (new Date(pending.expiresAt).getTime() < Date.now()) throw new Error("OTP has expired. Please request a new code.")
  if (pending.otp !== otp.trim()) throw new Error("OTP is invalid.")

  const user = getCurrentUser()
  if (!user) throw new Error("You must be signed in to verify a phone number.")
  window.localStorage.removeItem(PENDING_PHONE_KEY)
  return storeCurrentUser({
    ...user,
    phoneNumber: pending.phoneNumber,
    phoneVerifiedAt: new Date().toISOString(),
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
    phoneNumber: user.phoneNumber ?? null,
    phoneVerifiedAt: user.phoneVerifiedAt ?? null,
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

function normalizeNationalPhone(phoneNumber: string) {
  return phoneNumber.trim().replace(/[^\d]/g, "")
}

function validatePhoneNumber(countryIso: string, nationalNumber: string) {
  if (!PHONE_COUNTRIES.some((country) => country.iso === countryIso)) {
    return "Please choose a supported country code."
  }
  if (!/^\d{6,15}$/.test(nationalNumber)) {
    return "Phone number must contain 6 to 15 digits."
  }
  return ""
}

function toE164DemoPhone(countryIso: string, nationalNumber: string) {
  const country = PHONE_COUNTRIES.find((item) => item.iso === countryIso)
  const localNumber = nationalNumber.replace(/^0+/, "")
  return `${country?.dialCode ?? "+84"}${localNumber}`
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Unable to read avatar file."))
    reader.readAsDataURL(file)
  })
}
