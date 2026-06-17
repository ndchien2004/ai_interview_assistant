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
import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"
import {
  changePassword,
  getCurrentUser,
  removeUserAvatar,
  updateCurrentUser,
  uploadUserAvatar,
} from "@/services/auth-service"
import {
  EMPTY_STREAK_SUMMARY,
  buildCalendarMonth,
  loadStudyStreakSummary,
  startOfMonth,
  toDateKey,
  type StudyDay,
} from "@/services/streak-service"
import type { User } from "@/types"

export function ProfileView() {
  const initialUser = getCurrentUser()
  const [user, setUser] = useState<User | null>(() => initialUser)
  const [name, setName] = useState(() => initialUser?.name ?? "")
  const [headline, setHeadline] = useState(() => initialUser?.headline ?? "")
  const [dateOfBirth, setDateOfBirth] = useState(() => initialUser?.dateOfBirth ?? "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [streakSummary, setStreakSummary] = useState(EMPTY_STREAK_SUMMARY)
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
    loadStudyStreakSummary().then((summary) => {
      if (active) setStreakSummary(summary)
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
      <div className={cn("mx-auto max-w-5xl p-6", neo.section)}>
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
            "rounded-md border-2 px-4 py-3 text-sm font-semibold shadow-[4px_4px_0_#172018] dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]",
            error
              ? "border-destructive bg-destructive/10 text-destructive"
              : "border-[#172018] bg-emerald-200 text-emerald-950 dark:border-white/80 dark:bg-emerald-950/50 dark:text-emerald-100"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <StreakCalendar
        month={calendarMonth}
        studyDays={streakSummary.studyDays}
        currentStreak={streakSummary.current}
        longestStreak={streakSummary.longest}
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
    <section className={cn("p-5 sm:p-6", neo.header)}>
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
    <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#172018] bg-[#fef08a] text-[#172018] shadow-[5px_5px_0_#172018] dark:border-white/80 dark:shadow-[5px_5px_0_rgba(255,255,255,0.24)]">
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
        <span className={cn("inline-flex h-10 cursor-pointer items-center justify-center gap-2 px-4 text-sm text-primary-foreground", neo.button, "bg-primary hover:bg-primary/90")}>
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
    <section className={cn("p-5", neo.section)}>
      <div className="mb-5">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{description}</p> : null}
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
  const todayKey = toDateKey(new Date())

  return (
    <section className={cn("overflow-hidden p-3 sm:p-4", neo.section)}>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,640px)_minmax(360px,1fr)] lg:items-center">
        <div className="w-full max-w-[640px]">
          <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-extrabold text-muted-foreground">Chuỗi ngày học</p>
              <h3 className="text-xl font-extrabold capitalize tracking-tight">{monthLabel}</h3>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onMonthChange(addMonths(month, -1))}
                aria-label="Tháng trước"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => onMonthChange(addMonths(month, 1))}
                aria-label="Tháng sau"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-x-1 text-center text-xs font-extrabold uppercase leading-none text-muted-foreground">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="mt-1 grid auto-rows-[1.7rem] grid-cols-7 items-center gap-x-1 gap-y-0.5">
            {calendarDays.map((day) => {
              const active = activeDays.has(day.dateKey)
              const isToday = day.dateKey === todayKey
              return (
                <div
                  key={day.dateKey}
                  className={cn(
                    "relative mx-auto flex h-7 min-w-7 max-w-10 items-center justify-center rounded-full border-2 px-1 text-sm font-extrabold leading-none transition-colors",
                    day.inCurrentMonth
                      ? "border-transparent text-foreground"
                      : "border-transparent text-muted-foreground/35",
                    active &&
                      "border-[#172018] bg-[#fef08a] text-[#172018] shadow-[2px_2px_0_#172018] dark:border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:shadow-[2px_2px_0_rgba(253,224,71,0.24)]",
                    !active &&
                      isToday &&
                      "border-[#172018] bg-[#fef08a] text-[#172018] shadow-[2px_2px_0_#172018] dark:border-amber-200 dark:bg-amber-950 dark:text-amber-100 dark:shadow-[2px_2px_0_rgba(253,224,71,0.24)]"
                  )}
                  title={active ? `${activeDays.get(day.dateKey)} hoạt động` : undefined}
                >
                  {active ? <Flame className="mr-0.5 size-3.5 fill-orange-500 text-orange-700 dark:text-orange-400" /> : null}
                  <span>{day.date.getDate()}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex min-h-[178px] flex-col justify-center gap-5 rounded-md border-2 border-[#172018] bg-[#fef08a] p-5 text-[#172018] shadow-[5px_5px_0_#172018] dark:border-white/80 dark:bg-amber-950/70 dark:text-amber-100 dark:shadow-[5px_5px_0_rgba(255,255,255,0.24)] sm:min-h-[190px] sm:p-6 lg:self-center xl:min-h-[200px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
              <p className="text-lg font-extrabold text-[#4f4a20] dark:text-amber-100/75 sm:text-xl">Chuỗi hiện tại</p>
              <div className="flex items-baseline gap-2 sm:gap-3">
                <p className="text-6xl font-extrabold leading-none sm:text-7xl">{currentStreak}</p>
                <p className="text-xl font-extrabold sm:text-2xl">ngày</p>
              </div>
            </div>
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-[#172018] bg-white shadow-[3px_3px_0_#172018] dark:border-white/80 dark:bg-background dark:shadow-[3px_3px_0_rgba(255,255,255,0.2)] sm:size-16">
              <Flame className="size-8 fill-orange-500 text-orange-700 dark:text-orange-400 sm:size-9" />
            </span>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-[#172018] bg-white px-4 py-2 text-base font-extrabold text-[#172018] shadow-[3px_3px_0_#172018] dark:border-white/80 dark:bg-background dark:text-foreground dark:shadow-[3px_3px_0_rgba(255,255,255,0.2)] sm:text-lg">
            <ShieldCheck className="size-4 sm:size-5" />
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
    <div className="grid gap-1 border-b-2 border-[#172018]/20 py-3 last:border-b-0 dark:border-white/20">
      <span className="text-xs font-extrabold text-muted-foreground">{label}</span>
      <span className="break-words font-extrabold">{value}</span>
    </div>
  )
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function providerText(user: User | null) {
  if (!user) return "Chưa rõ"
  if (user.authProvider === "GOOGLE") return "Google"
  if (user.authProvider === "LOCAL_AND_GOOGLE") return "Email + Google"
  return "Email"
}
