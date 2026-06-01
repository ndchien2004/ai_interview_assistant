"use client"

import Image from "next/image"
import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { Camera, KeyRound, Loader2, Save, Trash2, UserRound } from "lucide-react"

import {
  changePassword,
  getCurrentUser,
  removeUserAvatar,
  requestPhoneOtp,
  updateCurrentUser,
  uploadUserAvatar,
  verifyPhoneOtp,
} from "@/services/auth-service"
import { listInterviewSessions, getEvaluationBySessionId } from "@/services/interview-service"
import { listResumes } from "@/services/resume-service"
import type { User } from "@/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type ActivityStats = {
  resumes: number
  interviews: number
  completed: number
  latestScore: number | null
}

type PhoneCountry = {
  iso: string
  name: string
  dialCode: string
}

const phoneCountries: PhoneCountry[] = [
  { iso: "VN", name: "Vietnam", dialCode: "+84" },
  { iso: "US", name: "United States", dialCode: "+1" },
  { iso: "JP", name: "Japan", dialCode: "+81" },
  { iso: "KR", name: "South Korea", dialCode: "+82" },
  { iso: "SG", name: "Singapore", dialCode: "+65" },
  { iso: "TH", name: "Thailand", dialCode: "+66" },
  { iso: "AU", name: "Australia", dialCode: "+61" },
  { iso: "GB", name: "United Kingdom", dialCode: "+44" },
  { iso: "CA", name: "Canada", dialCode: "+1" },
]

const emptyStats: ActivityStats = {
  resumes: 0,
  interviews: 0,
  completed: 0,
  latestScore: null,
}

export function ProfileView() {
  const initialUser = getCurrentUser()
  const initialPhone = parsePhoneForUi(initialUser?.phoneNumber ?? null)
  const [user, setUser] = useState<User | null>(() => initialUser)
  const [name, setName] = useState(() => initialUser?.name ?? "")
  const [headline, setHeadline] = useState(() => initialUser?.headline ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(() => initialUser?.dateOfBirth ?? "")
  const [phoneCountryIso, setPhoneCountryIso] = useState(() => initialPhone.countryIso)
  const [phoneNationalNumber, setPhoneNationalNumber] = useState(() => initialPhone.nationalNumber)
  const [phoneOtp, setPhoneOtp] = useState("")
  const [phoneChallenge, setPhoneChallenge] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [stats, setStats] = useState<ActivityStats>(emptyStats)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false)
  const [verifyingPhone, setVerifyingPhone] = useState(false)

  const isGoogleOnly = user?.authProvider === "GOOGLE" && user.passwordSet === false
  const providerLabel = providerText(user)
  const canSaveProfile = Boolean(user) && Boolean(name.trim())
  const dateOfBirthLocked = Boolean(user?.dateOfBirthSetAt || user?.dateOfBirth)
  const nameChangesUsed = user?.nameChangeCount ?? 0
  const nameChangesRemaining = Math.max(0, 3 - nameChangesUsed)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    let active = true
    async function loadStats() {
      const [resumes, sessions] = await Promise.all([listResumes(), listInterviewSessions()])
      const completed = sessions.filter((session) => session.status === "completed")
      const latestCompleted = completed[0]
      const latestEvaluation = latestCompleted
        ? await getEvaluationBySessionId(latestCompleted.id).catch(() => null)
        : null

      if (!active) return
      setStats({
        resumes: resumes.length,
        interviews: sessions.length,
        completed: completed.length,
        latestScore: latestEvaluation?.totalScore ?? null,
      })
    }

    void loadStats()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(""), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(user.createdAt))
    : "Unknown"

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSaveProfile) return

    setSavingProfile(true)
    setError("")
    try {
      const updated = await updateCurrentUser({
        name: name.trim(),
        headline: headline.trim(),
        dateOfBirth: dateOfBirth || null,
      })
      setUser(updated)
      setDateOfBirth(updated.dateOfBirth ?? "")
      setMessage("Profile updated.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update profile.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    setSavingAvatar(true)
    setError("")
    try {
      const updated = await uploadUserAvatar(file)
      setUser(updated)
      setMessage("Avatar updated.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update avatar.")
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setSavingAvatar(true)
    setError("")
    try {
      const updated = await removeUserAvatar()
      setUser(updated)
      setMessage("Avatar removed.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove avatar.")
    } finally {
      setSavingAvatar(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match.")
      return
    }

    setSavingPassword(true)
    try {
      const updated = await changePassword({
        currentPassword: isGoogleOnly ? undefined : currentPassword,
        newPassword,
      })
      setUser(updated)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setMessage(isGoogleOnly ? "Password set. You can now sign in with email and password." : "Password updated.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update password.")
    } finally {
      setSavingPassword(false)
    }
  }

  const handlePhoneOtpRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSendingPhoneOtp(true)
    setError("")
    try {
      const challenge = await requestPhoneOtp(phoneCountryIso, phoneNationalNumber)
      setPhoneChallenge(challenge.phoneNumber)
      setMessage(challenge.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to send phone OTP.")
    } finally {
      setSendingPhoneOtp(false)
    }
  }

  const handlePhoneVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setVerifyingPhone(true)
    setError("")
    try {
      const updated = await verifyPhoneOtp(phoneOtp)
      const parsedPhone = parsePhoneForUi(updated.phoneNumber ?? null)
      setUser(updated)
      setPhoneCountryIso(parsedPhone.countryIso)
      setPhoneNationalNumber(parsedPhone.nationalNumber)
      setPhoneOtp("")
      setPhoneChallenge("")
      setMessage("Recovery phone verified.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to verify phone number.")
    } finally {
      setVerifyingPhone(false)
    }
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Preparing your profile...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="border-y border-border/80 py-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <AvatarPreview user={user} size="lg" />
            <div>
              <p className="text-sm text-muted-foreground">Account profile</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{user.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Resumes" value={stats.resumes} />
            <Stat label="Interviews" value={stats.interviews} />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Latest score" value={stats.latestScore === null ? "--" : `${stats.latestScore}%`} />
          </div>
        </div>
      </section>

      {(message || error) ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-500/25 bg-emerald-50/80 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile details</CardTitle>
              <CardDescription>Update the name and headline shown across the workspace.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleProfileSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Name</Label>
                  <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
                  <p className="text-xs text-muted-foreground">
                    {nameChangesRemaining} name changes remaining. Name can be changed once every 30 days.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-headline">Headline</Label>
                  <Input
                    id="profile-headline"
                    value={headline}
                    onChange={(event) => setHeadline(event.target.value)}
                    maxLength={240}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-date-of-birth">Date of birth</Label>
                  <Input
                    id="profile-date-of-birth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(event) => setDateOfBirth(event.target.value)}
                    disabled={dateOfBirthLocked}
                  />
                  <p className="text-xs text-muted-foreground">
                    {dateOfBirthLocked
                      ? "Date of birth is locked after it is set."
                      : "Date of birth is optional and can only be set once."}
                  </p>
                </div>
                <Button type="submit" disabled={savingProfile || !canSaveProfile}>
                  {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save profile
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recovery phone</CardTitle>
              <CardDescription>
                Add or change a verified phone number for future password recovery OTP.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form className="space-y-3" onSubmit={handlePhoneOtpRequest}>
                <div className="space-y-2">
                  <Label htmlFor="recovery-phone">Phone number</Label>
                  <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
                    <select
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                      value={phoneCountryIso}
                      onChange={(event) => setPhoneCountryIso(event.target.value)}
                      aria-label="Country code"
                    >
                      {phoneCountries.map((country) => (
                        <option key={country.iso} value={country.iso}>
                          {country.name} {country.dialCode}
                        </option>
                      ))}
                    </select>
                    <Input
                      id="recovery-phone"
                      value={phoneNationalNumber}
                      onChange={(event) => setPhoneNationalNumber(event.target.value)}
                      inputMode="tel"
                      placeholder="0901234567"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A new number must be verified before it replaces the current one.
                  </p>
                </div>
                <Button type="submit" variant="outline" disabled={sendingPhoneOtp || !phoneNationalNumber.trim()}>
                  {sendingPhoneOtp ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  Send OTP
                </Button>
              </form>

              {phoneChallenge ? (
                <form className="space-y-3 border-y border-border/80 py-4" onSubmit={handlePhoneVerify}>
                  <div className="space-y-2">
                    <Label htmlFor="phone-otp">OTP for {formatPhoneForDisplay(phoneChallenge)}</Label>
                    <Input
                      id="phone-otp"
                      value={phoneOtp}
                      onChange={(event) => setPhoneOtp(event.target.value)}
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="123456"
                    />
                  </div>
                  <Button type="submit" disabled={verifyingPhone || phoneOtp.length !== 6}>
                    {verifyingPhone ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Verify phone
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                {isGoogleOnly
                  ? "Set a password to upgrade this Google account for email/password sign-in."
                  : "Change the password used for email/password sign-in."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                {!isGoogleOnly ? (
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                    />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="new-password">{isGoogleOnly ? "Create password" : "New password"}</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" disabled={savingPassword || !newPassword || !confirmPassword}>
                  {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {isGoogleOnly ? "Set password" : "Change password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Avatar</CardTitle>
              <CardDescription>JPG, PNG, or WebP. Max 2MB. API uploads are stored in Cloudinary.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <AvatarPreview user={user} size="md" />
                <div className="space-y-2">
                  <label className="inline-flex">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleAvatarChange}
                      disabled={savingAvatar}
                    />
                    <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-border px-3.5 text-sm font-medium transition-colors hover:bg-muted">
                      {savingAvatar ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                      Upload avatar
                    </span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemoveAvatar}
                    disabled={savingAvatar || !user.avatarUrl}
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Read-only account metadata.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Phone" value={user.phoneNumber ? `${formatPhoneForDisplay(user.phoneNumber)} verified` : "Not set"} />
              <InfoRow label="Date of birth" value={user.dateOfBirth ?? "Not set"} />
              <InfoRow label="Provider" value={providerLabel} />
              <InfoRow label="Password sign-in" value={user.passwordSet === false ? "Not enabled" : "Enabled"} />
              <InfoRow label="Joined" value={joinedDate} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function AvatarPreview({ user, size }: { user: User; size: "md" | "lg" }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-foreground",
        size === "lg" ? "size-20 text-2xl" : "size-16 text-xl"
      )}
    >
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={80} height={80} unoptimized className="size-full object-cover" />
      ) : (
        <UserRound className={size === "lg" ? "size-8" : "size-6"} />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-y border-border/80 py-3 text-center">
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-2 last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}

function providerText(user: User | null) {
  if (!user) return "Unknown"
  if (user.authProvider === "GOOGLE") return "Google"
  if (user.authProvider === "LOCAL_AND_GOOGLE") return "Email + Google"
  return "Email password"
}

function parsePhoneForUi(phoneNumber: string | null) {
  if (!phoneNumber) {
    return { countryIso: "VN", nationalNumber: "" }
  }

  const matches = [...phoneCountries]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => phoneNumber.startsWith(country.dialCode))

  if (!matches) {
    return { countryIso: "VN", nationalNumber: phoneNumber.replace(/^\+/, "") }
  }

  return {
    countryIso: matches.iso,
    nationalNumber: phoneNumber.slice(matches.dialCode.length),
  }
}

function formatPhoneForDisplay(phoneNumber: string) {
  if (!phoneNumber) return ""
  const parsed = parsePhoneForUi(phoneNumber)
  const country = phoneCountries.find((item) => item.iso === parsed.countryIso)
  return `${country?.dialCode ?? ""} ${parsed.nationalNumber}`.trim()
}
