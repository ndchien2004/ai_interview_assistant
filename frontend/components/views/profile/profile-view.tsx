"use client"

import Image from "next/image"
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react"
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Flame,
  KeyRound,
  Loader2,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  changePassword,
  getCurrentUser,
  removeUserAvatar,
  updateCurrentUser,
  uploadUserAvatar,
} from "@/services/auth-service"
import { readLocalProgress } from "@/services/course-service"
import { listPracticeSessions } from "@/services/practice-service"
import type { User } from "@/types"

type StudyDay = {
  dateKey: string
  count: number
}

export function ProfileView() {
  const initialUser = getCurrentUser()
  const [user, setUser] = useState<User | null>(() => initialUser)
  const [name, setName] = useState(() => initialUser?.name ?? "")
  const [headline, setHeadline] = useState(() => initialUser?.headline ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(() => initialUser?.dateOfBirth ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [studyDays, setStudyDays] = useState<StudyDay[]>([])
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()))
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [removeAvatarOpen, setRemoveAvatarOpen] = useState(false)

  const isGoogleOnly = user?.authProvider === "GOOGLE" && user.passwordSet === false
  const canSaveProfile = Boolean(user) && Boolean(name.trim())
  const dateOfBirthLocked = Boolean(user?.dateOfBirthSetAt || user?.dateOfBirth)
  const nameChangesUsed = user?.nameChangeCount ?? 0
  const nameChangesRemaining = Math.max(0, 3 - nameChangesUsed)

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(""), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  useEffect(() => {
    let active = true
    loadStudyDays().then((days) => {
      if (active) setStudyDays(days)
    })
    return () => {
      active = false
    }
  }, [])

  const joinedDate = user?.createdAt
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(user.createdAt))
    : "Chưa rõ"

  const streakStats = useMemo(() => calculateStreakStats(studyDays), [studyDays])

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
      setMessage("Đã lưu hồ sơ.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu hồ sơ.")
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
      setMessage("Đã cập nhật ảnh đại diện.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật ảnh đại diện.")
    } finally {
      setSavingAvatar(false)
    }
  }

  const confirmRemoveAvatar = async () => {
    setSavingAvatar(true)
    setError("")
    try {
      const updated = await removeUserAvatar()
      setUser(updated)
      setMessage("Đã xóa ảnh đại diện.")
      setRemoveAvatarOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể xóa ảnh đại diện.")
    } finally {
      setSavingAvatar(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.")
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
      setMessage(isGoogleOnly ? "Đã tạo mật khẩu đăng nhập." : "Đã đổi mật khẩu.")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đổi mật khẩu.")
    } finally {
      setSavingPassword(false)
    }
  }

  const resetProfileForm = () => {
    if (!user) return
    setName(user.name)
    setHeadline(user.headline)
    setDateOfBirth(user.dateOfBirth ?? "")
    setError("")
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl rounded-md border border-border p-6">
        <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <ProfileHero
        user={user}
        savingAvatar={savingAvatar}
        onAvatarChange={handleAvatarChange}
        onRemoveAvatar={() => setRemoveAvatarOpen(true)}
      />

      {message || error ? (
        <div
          className={cn(
            "rounded-md border px-4 py-3 text-sm",
            error
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <StreakCalendar
        month={calendarMonth}
        studyDays={studyDays}
        currentStreak={streakStats.current}
        longestStreak={streakStats.longest}
        onMonthChange={setCalendarMonth}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <ProfilePanel title="Thông tin cá nhân" description="Những thông tin này dùng để cá nhân hóa trải nghiệm học của bạn.">
            <form className="grid gap-5" onSubmit={handleProfileSubmit}>
              <Field label="Tên" htmlFor="profile-name">
                <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
                <p className="text-xs text-muted-foreground">
                  Còn {nameChangesRemaining} lần đổi tên. Mỗi 30 ngày đổi được một lần.
                </p>
              </Field>

              <Field label="Mô tả ngắn" htmlFor="profile-headline">
                <Input
                  id="profile-headline"
                  value={headline}
                  onChange={(event) => setHeadline(event.target.value)}
                  maxLength={240}
                  placeholder="Ví dụ: Đang ôn Java backend"
                />
              </Field>

              <Field label="Ngày sinh" htmlFor="profile-date-of-birth">
                <Input
                  id="profile-date-of-birth"
                  type="date"
                  value={dateOfBirth}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  disabled={dateOfBirthLocked}
                />
                <p className="text-xs text-muted-foreground">
                  {dateOfBirthLocked ? "Ngày sinh đã được khóa sau khi lưu." : "Có thể bỏ trống, nhưng chỉ lưu được một lần."}
                </p>
              </Field>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" disabled={savingProfile || !canSaveProfile}>
                  {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Lưu hồ sơ
                </Button>
                <Button type="button" variant="outline" onClick={resetProfileForm} disabled={savingProfile}>
                  <RotateCcw className="size-4" />
                  Hoàn tác
                </Button>
              </div>
            </form>
          </ProfilePanel>

          <ProfilePanel title="Bảo mật" description={isGoogleOnly ? "Tạo mật khẩu để có thể đăng nhập bằng email ngoài Google." : "Cập nhật mật khẩu đăng nhập của bạn."}>
            <form className="grid gap-5" onSubmit={handlePasswordSubmit}>
              {!isGoogleOnly ? (
                <Field label="Mật khẩu hiện tại" htmlFor="current-password">
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
              ) : null}

              <Field label={isGoogleOnly ? "Tạo mật khẩu" : "Mật khẩu mới"} htmlFor="new-password">
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <Field label="Xác nhận mật khẩu" htmlFor="confirm-password">
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </Field>

              <div className="pt-1">
                <Button type="submit" disabled={savingPassword || !newPassword || !confirmPassword}>
                  {savingPassword ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                  {isGoogleOnly ? "Tạo mật khẩu" : "Đổi mật khẩu"}
                </Button>
              </div>
            </form>
          </ProfilePanel>
        </div>

        <aside className="space-y-6">
          <ProfilePanel title="Tài khoản">
            <div className="divide-y divide-border/60 text-sm">
              <InfoItem label="Email" value={user.email} />
              <InfoItem label="Ngày sinh" value={user.dateOfBirth ?? "Chưa đặt"} />
              <InfoItem label="Đăng nhập" value={providerText(user)} />
              <InfoItem label="Mật khẩu" value={user.passwordSet === false ? "Chưa bật" : "Đã bật"} />
              <InfoItem label="Tham gia" value={joinedDate} />
            </div>
          </ProfilePanel>
        </aside>
      </div>

      <ConfirmDialog
        open={removeAvatarOpen}
        title="Xóa ảnh đại diện?"
        description="Ảnh đại diện hiện tại sẽ bị gỡ khỏi hồ sơ của bạn."
        confirmLabel="Xóa ảnh"
        loading={savingAvatar}
        tone="danger"
        onClose={() => {
          if (!savingAvatar) setRemoveAvatarOpen(false)
        }}
        onConfirm={confirmRemoveAvatar}
      />
    </div>
  )
}

function ProfileHero({
  user,
  savingAvatar,
  onAvatarChange,
  onRemoveAvatar,
}: {
  user: User
  savingAvatar: boolean
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveAvatar: () => void
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <AvatarPreview user={user} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Hồ sơ</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight sm:text-4xl">{user.name}</h1>
            <p className="mt-2 truncate text-base text-muted-foreground">{user.email}</p>
            {user.headline ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{user.headline}</p> : null}
          </div>
        </div>
        <AvatarActions
          saving={savingAvatar}
          hasAvatar={Boolean(user.avatarUrl)}
          onAvatarChange={onAvatarChange}
          onRemoveAvatar={onRemoveAvatar}
        />
      </div>
    </section>
  )
}

function AvatarPreview({ user }: { user: User }) {
  return (
    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted text-foreground shadow-sm">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={96} height={96} unoptimized className="size-full object-cover" />
      ) : (
        <UserRound className="size-10" />
      )}
    </div>
  )
}

function AvatarActions({
  saving,
  hasAvatar,
  onAvatarChange,
  onRemoveAvatar,
}: {
  saving: boolean
  hasAvatar: boolean
  onAvatarChange: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveAvatar: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="inline-flex">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={onAvatarChange}
          disabled={saving}
        />
        <span className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Đổi ảnh
        </span>
      </label>
      <Button type="button" variant="outline" onClick={onRemoveAvatar} disabled={saving || !hasAvatar}>
        <Trash2 className="size-4" />
        Xóa
      </Button>
    </div>
  )
}

function ProfilePanel({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

function StreakCalendar({
  month,
  studyDays,
  currentStreak,
  longestStreak,
  onMonthChange,
}: {
  month: Date
  studyDays: StudyDay[]
  currentStreak: number
  longestStreak: number
  onMonthChange: (value: Date) => void
}) {
  const activeDays = useMemo(() => new Map(studyDays.map((day) => [day.dateKey, day.count])), [studyDays])
  const calendarDays = useMemo(() => buildCalendarMonth(month), [month])
  const monthLabel = new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(month)

  return (
    <section className="overflow-hidden rounded-2xl border border-[#3b4268] bg-[#20213f] p-5 text-white shadow-sm sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
        <div>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white/70">Chuỗi ngày học</p>
              <h3 className="mt-1 text-xl font-semibold capitalize">{monthLabel}</h3>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => onMonthChange(addMonths(month, -1))}
                aria-label="Tháng trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10"
                onClick={() => onMonthChange(addMonths(month, 1))}
                aria-label="Tháng sau"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-sm font-semibold text-white/85">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const active = activeDays.has(day.dateKey)
              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "relative flex min-h-9 items-center justify-center rounded-full text-sm font-semibold sm:min-h-10",
                    day.inCurrentMonth ? "text-white" : "text-white/25",
                    active && "bg-orange-400 text-[#111432] shadow-[0_0_0_4px_rgba(251,146,60,0.16)]"
                  )}
                  title={active ? `${activeDays.get(day.dateKey)} hoạt động` : undefined}
                >
                  {active ? <Flame className="absolute inset-0 m-auto size-9 fill-orange-400 text-orange-400" /> : null}
                  <span className="relative z-10">{day.date.getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/5 p-4 text-center">
          <p className="text-lg font-semibold">Chuỗi hiện tại</p>
          <p className="mt-1 text-3xl font-semibold">{currentStreak}</p>
          <p className="text-sm text-white/70">{currentStreak === 1 ? "ngày" : "ngày"}</p>
          <div className="mt-5 flex flex-col items-center gap-2 text-orange-400">
            <Flame className="size-12 fill-orange-400" />
            <Flame className="size-9 fill-orange-400" />
          </div>
          <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-sm text-white/75">
            <ShieldCheck className="size-4" />
            Dài nhất {longestStreak} ngày
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="break-words font-medium">{value}</span>
    </div>
  )
}

async function loadStudyDays() {
  const counts = new Map<string, number>()

  Object.values(readLocalProgress()).forEach((progress) => {
    if (progress.lastAttemptAt) addDate(counts, progress.lastAttemptAt)
  })

  const sessions = await listPracticeSessions()
  sessions.forEach((session) => {
    addDate(counts, session.completedAt ?? session.createdAt)
    session.attempts.forEach((attempt) => addDate(counts, attempt.createdAt))
  })

  return Array.from(counts.entries())
    .map(([dateKey, count]) => ({ dateKey, count }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
}

function addDate(counts: Map<string, number>, value?: string | null) {
  if (!value) return
  const dateKey = toDateKey(new Date(value))
  counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1)
}

function calculateStreakStats(days: StudyDay[]) {
  const daySet = new Set(days.map((day) => day.dateKey))
  const sorted = Array.from(daySet).sort()
  let longest = 0
  let run = 0
  let previous: Date | null = null

  for (const dateKey of sorted) {
    const current = parseDateKey(dateKey)
    if (previous && daysBetween(previous, current) === 1) run += 1
    else run = 1
    longest = Math.max(longest, run)
    previous = current
  }

  const today = startOfDay(new Date())
  const yesterday = addDays(today, -1)
  let cursor = daySet.has(toDateKey(today)) ? today : daySet.has(toDateKey(yesterday)) ? yesterday : null
  let current = 0
  while (cursor && daySet.has(toDateKey(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  return { current, longest }
}

function buildCalendarMonth(month: Date) {
  const first = startOfMonth(month)
  const startOffset = (first.getDay() + 6) % 7
  const start = addDays(first, -startOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return {
      date,
      dateKey: toDateKey(date),
      inCurrentMonth: date.getMonth() === month.getMonth(),
    }
  })
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function providerText(user: User | null) {
  if (!user) return "Chưa rõ"
  if (user.authProvider === "GOOGLE") return "Google"
  if (user.authProvider === "LOCAL_AND_GOOGLE") return "Email + Google"
  return "Email"
}
