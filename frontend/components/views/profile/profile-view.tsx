"use client"

import Image from "next/image"
import { ChangeEvent, FormEvent, useEffect, useState } from "react"
import { Camera, KeyRound, Loader2, RotateCcw, Save, Trash2, UserRound } from "lucide-react"

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

  const handleRemoveAvatar = () => {
    setRemoveAvatarOpen(true)
  }

  const confirmRemoveAvatar = async () => {
    setSavingAvatar(true)
    setError("")
    try {
      const updated = await removeUserAvatar()
      setUser(updated)
      setMessage("Đã xoá ảnh đại diện.")
      setRemoveAvatarOpen(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể xoá ảnh đại diện.")
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
      <div className="mx-auto max-w-5xl border-t border-border/60 py-6">
        <p className="text-sm text-muted-foreground">Đang tải hồ sơ...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <GlassHeader>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <AvatarPreview user={user} />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Hồ sơ</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight sm:text-3xl">{user.name}</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <AvatarActions
            saving={savingAvatar}
            hasAvatar={Boolean(user.avatarUrl)}
            onAvatarChange={handleAvatarChange}
            onRemoveAvatar={handleRemoveAvatar}
          />
        </div>
      </GlassHeader>

      {message || error ? (
        <div
          className={cn(
            "mt-4 border-y px-1 py-3 text-sm",
            error
              ? "border-destructive/30 text-destructive"
              : "border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          )}
        >
          {error || message}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <LineSection title="Thông tin cá nhân">
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
                  {dateOfBirthLocked ? "Ngày sinh đã được khoá sau khi lưu." : "Có thể bỏ trống, nhưng chỉ lưu được một lần."}
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
          </LineSection>

          <LineSection title="Bảo mật">
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
          </LineSection>
        </div>

        <aside>
          <LineSection title="Tài khoản">
            <div className="divide-y divide-border/50 text-sm">
              <InfoItem label="Email" value={user.email} />
              <InfoItem label="Ngày sinh" value={user.dateOfBirth ?? "Chưa đặt"} />
              <InfoItem label="Đăng nhập" value={providerText(user)} />
              <InfoItem label="Mật khẩu" value={user.passwordSet === false ? "Chưa bật" : "Đã bật"} />
              <InfoItem label="Tham gia" value={joinedDate} />
            </div>
          </LineSection>
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

function GlassHeader({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-white/10 bg-background/55 p-5 shadow-[0_18px_70px_-48px_rgba(15,23,42,0.7)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.035]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.16),transparent_38%,rgba(255,255,255,0.05))] dark:bg-[linear-gradient(115deg,rgba(255,255,255,0.08),transparent_40%,rgba(255,255,255,0.03))]" />
      <div className="relative">{children}</div>
    </section>
  )
}

function AvatarPreview({ user }: { user: User }) {
  return (
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-background/45 text-foreground shadow-sm backdrop-blur-md">
      {user.avatarUrl ? (
        <Image src={user.avatarUrl} alt="" width={80} height={80} unoptimized className="size-full object-cover" />
      ) : (
        <UserRound className="size-8" />
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
        <span className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          Đổi ảnh
        </span>
      </label>
      <Button type="button" variant="outline" onClick={onRemoveAvatar} disabled={saving || !hasAvatar}>
        <Trash2 className="size-4" />
        Xoá
      </Button>
    </div>
  )
}

function LineSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/60 py-6">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
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

function providerText(user: User | null) {
  if (!user) return "Chưa rõ"
  if (user.authProvider === "GOOGLE") return "Google"
  if (user.authProvider === "LOCAL_AND_GOOGLE") return "Email + Google"
  return "Email"
}
