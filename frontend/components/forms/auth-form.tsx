"use client"

import Link from "next/link"
import {
  ClipboardEvent,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  login,
  loginWithGoogle,
  register,
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "@/services/auth-service"
import { cn } from "@/lib/utils"

type AuthFormProps = {
  mode: "login" | "register"
  compact?: boolean
}

type FieldErrors = Partial<Record<"name" | "email" | "password" | "otp", string>>

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential?: string }) => void
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon"
              theme: "outline" | "filled_blue" | "filled_black"
              size: "large" | "medium" | "small"
              shape?: "rectangular" | "pill" | "circle" | "square"
              width?: number
              text?: "signin_with" | "signup_with" | "continue_with"
            }
          ) => void
        }
      }
    }
  }
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const validateName = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return "Vui lòng nhập họ tên."
  if (trimmed.length < 2) return "Họ tên phải có ít nhất 2 ký tự."
  if (trimmed.length > 120) return "Họ tên không được vượt quá 120 ký tự."
  return ""
}

const validateEmail = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return "Vui lòng nhập email."
  if (trimmed.length > 180) return "Email không được vượt quá 180 ký tự."
  if (!emailPattern.test(trimmed)) return "Vui lòng nhập email hợp lệ."
  return ""
}

const passwordChecks = [
  {
    label: "Ít nhất 8 ký tự",
    test: (value: string) => value.length >= 8,
  },
  {
    label: "Có chữ hoa",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Có chữ thường",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "Có chữ số",
    test: (value: string) => /\d/.test(value),
  },
  {
    label: "Có ký tự đặc biệt",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
]

const validatePassword = (value: string, isRegister: boolean) => {
  if (!value) return "Vui lòng nhập mật khẩu."
  if (value.length > 72) return "Mật khẩu không được vượt quá 72 ký tự."
  if (!isRegister) return ""

  const missing = passwordChecks.find((check) => !check.test(value))
  return missing ? "Mật khẩu chưa đáp ứng đủ yêu cầu." : ""
}

const validateOtp = (value: string) => {
  if (!value) return "Vui lòng nhập mã OTP."
  if (!/^\d{6}$/.test(value)) return "Mã OTP phải gồm đúng 6 chữ số."
  return ""
}

const resendCooldownSeconds = 60

export function AuthForm({ compact = false, mode }: AuthFormProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])
  const [name, setName] = useState("")
  const [email, setEmail] = useState(mode === "login" ? "nguyen@example.com" : "")
  const [password, setPassword] = useState(mode === "login" ? "Matkhau123!" : "")
  const [otp, setOtp] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(0)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isRegister = mode === "register"
  const isVerifyingRegistration = isRegister && Boolean(verificationEmail)
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const actionAreaClassName = "w-full"

  const title = isVerifyingRegistration
    ? "Kiểm tra hộp thư"
    : isRegister
      ? "Tạo tài khoản"
      : "Chào mừng trở lại"

  const description = isVerifyingRegistration
    ? `Chúng tôi đã gửi mã OTP 6 chữ số tới ${verificationEmail}.`
    : isRegister
      ? "Dùng email xác thực để bắt đầu học cùng FreeCard."
      : "Đăng nhập để tiếp tục ôn tập với thẻ ghi nhớ."

  const passedPasswordChecks = useMemo(
    () => passwordChecks.map((check) => ({ ...check, passed: check.test(password) })),
    [password]
  )

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current || isVerifyingRegistration) return

    let cancelled = false

    const initializeGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google không trả về thông tin xác thực.")
            return
          }

          setError("")
          setGoogleLoading(true)

          try {
            await loginWithGoogle(response.credential)
            window.location.assign("/courses/java-core")
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Đăng nhập bằng Google thất bại.")
          } finally {
            setGoogleLoading(false)
          }
        },
      })

      googleButtonRef.current.innerHTML = ""
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: "icon",
        theme: "outline",
        size: "large",
        shape: "square",
        width: 44,
      })
    }

    if (window.google) {
      initializeGoogle()
      return () => {
        cancelled = true
      }
    }

    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = initializeGoogle
    document.head.appendChild(script)

    return () => {
      cancelled = true
    }
  }, [googleClientId, isRegister, isVerifyingRegistration])

  useEffect(() => {
    if (resendCountdown <= 0) return

    const timer = window.setTimeout(() => {
      setResendCountdown((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearTimeout(timer)
  }, [resendCountdown])

  const validateCurrentStep = () => {
    const nextErrors: FieldErrors = {}

    if (isVerifyingRegistration) {
      nextErrors.otp = validateOtp(otp)
    } else {
      if (isRegister) nextErrors.name = validateName(name)
      nextErrors.email = validateEmail(email)
      nextErrors.password = validatePassword(password, isRegister)
    }

    Object.keys(nextErrors).forEach((key) => {
      const field = key as keyof FieldErrors
      if (!nextErrors[field]) delete nextErrors[field]
    })

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")

    if (!validateCurrentStep()) return

    setLoading(true)

    try {
      if (isRegister) {
        if (isVerifyingRegistration) {
          await verifyRegistrationOtp(verificationEmail, otp)
            window.location.assign("/courses/java-core")
          return
        }

        const challenge = await register(name, email, password)
        setVerificationEmail(challenge.email)
        setResendCountdown(resendCooldownSeconds)
        setOtp("")
        setFieldErrors({})
      } else {
        await login(email, password)
        window.location.assign("/courses/java-core")
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Đã có lỗi xảy ra.")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!verificationEmail) return

    setError("")
    setResending(true)

    try {
      const challenge = await resendRegistrationOtp(verificationEmail)
      setVerificationEmail(challenge.email)
      setResendCountdown(resendCooldownSeconds)
      setOtp("")
      setFieldErrors({})
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi lại mã OTP.")
    } finally {
      setResending(false)
    }
  }

  const updateEmail = (value: string) => {
    setEmail(value)
    if (fieldErrors.email) {
      setFieldErrors((current) => ({ ...current, email: validateEmail(value) || undefined }))
    }
  }

  const updatePassword = (value: string) => {
    setPassword(value)
    if (fieldErrors.password) {
      setFieldErrors((current) => ({
        ...current,
        password: validatePassword(value, isRegister) || undefined,
      }))
    }
  }

  const updateOtpAt = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1)
    const digits = otp.padEnd(6, " ").split("")
    digits[index] = digit || " "
    const nextOtp = digits.join("").replace(/\s/g, "")

    setOtp(nextOtp)
    if (fieldErrors.otp) {
      setFieldErrors((current) => ({ ...current, otp: validateOtp(nextOtp) || undefined }))
    }

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault()
      const digits = otp.padEnd(6, " ").split("")

      if (digits[index] && digits[index] !== " ") {
        digits[index] = " "
        const nextOtp = digits.join("").replace(/\s/g, "")
        setOtp(nextOtp)
        if (fieldErrors.otp) {
          setFieldErrors((current) => ({ ...current, otp: validateOtp(nextOtp) || undefined }))
        }
        return
      }

      if (index > 0) {
        otpInputRefs.current[index - 1]?.focus()
      }
      return
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault()
      otpInputRefs.current[index - 1]?.focus()
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault()
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pastedOtp = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    setOtp(pastedOtp)
    setFieldErrors((current) => ({ ...current, otp: validateOtp(pastedOtp) || undefined }))

    const nextIndex = Math.min(pastedOtp.length, 5)
    otpInputRefs.current[nextIndex]?.focus()
  }

  return (
    <section className="w-full">
      <div className={cn("space-y-2", compact ? "mb-5" : "mb-10")}>
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
          {isRegister ? "Hồ sơ mới" : "Hồ sơ đã có"}
        </p>
        <div className="space-y-2">
          <h1 className={cn("font-semibold tracking-normal text-foreground", compact ? "text-[2rem]" : "text-4xl")}>
            {title}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>

      <form className={cn(compact ? "space-y-3.5" : "space-y-6")} onSubmit={handleSubmit} noValidate>
        {isRegister && !isVerifyingRegistration ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={fieldErrors.name} htmlFor="name" label="Họ tên">
              <Input
                id="name"
                autoComplete="name"
                value={name}
                onBlur={() => setFieldErrors((current) => ({ ...current, name: validateName(name) || undefined }))}
                onChange={(event) => {
                  setName(event.target.value)
                  if (fieldErrors.name) {
                    setFieldErrors((current) => ({
                      ...current,
                      name: validateName(event.target.value) || undefined,
                    }))
                  }
                }}
                placeholder="Nguyễn Minh Anh"
                aria-invalid={Boolean(fieldErrors.name)}
                required
              />
            </Field>
            <Field error={fieldErrors.email} htmlFor="email" label="Email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onBlur={() => setFieldErrors((current) => ({ ...current, email: validateEmail(email) || undefined }))}
                onChange={(event) => updateEmail(event.target.value)}
                placeholder="nguyen@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
                required
              />
            </Field>
          </div>
        ) : !isVerifyingRegistration ? (
          <Field error={fieldErrors.email} htmlFor="email" label="Email">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onBlur={() => setFieldErrors((current) => ({ ...current, email: validateEmail(email) || undefined }))}
              onChange={(event) => updateEmail(event.target.value)}
              placeholder="nguyen@example.com"
              aria-invalid={Boolean(fieldErrors.email)}
              required
            />
          </Field>
        ) : null}

        {!isVerifyingRegistration ? (
          <Field error={fieldErrors.password} htmlFor="password" label="Mật khẩu">
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                value={password}
                onBlur={() =>
                  setFieldErrors((current) => ({
                    ...current,
                    password: validatePassword(password, isRegister) || undefined,
                  }))
                }
                onChange={(event) => updatePassword(event.target.value)}
                minLength={isRegister ? 8 : 1}
                maxLength={72}
                aria-invalid={Boolean(fieldErrors.password)}
                required
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {isRegister ? (
              <div className={cn("grid gap-2 sm:grid-cols-2", compact ? "pt-0" : "pt-1")}>
                {passedPasswordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={cn(
                      "flex items-center gap-2 text-xs",
                      check.passed ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-full border",
                        check.passed ? "border-foreground bg-foreground text-background" : "border-border"
                      )}
                    >
                      {check.passed ? <Check className="size-3" /> : null}
                    </span>
                    {check.label}
                  </div>
                ))}
              </div>
            ) : null}
          </Field>
        ) : (
          <Field error={fieldErrors.otp} htmlFor="otp" label="OTP">
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <input
                  key={index}
                  id={index === 0 ? "otp" : undefined}
                  ref={(element) => {
                    otpInputRefs.current[index] = element
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  value={otp[index] ?? ""}
                  onBlur={() => setFieldErrors((current) => ({ ...current, otp: validateOtp(otp) || undefined }))}
                  onChange={(event) => updateOtpAt(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  maxLength={1}
                  aria-invalid={Boolean(fieldErrors.otp)}
                  aria-label={`Chữ số OTP thứ ${index + 1}`}
                  className={cn(
                    "aspect-square h-12 w-full rounded-xl border bg-background/55 text-center text-xl font-semibold outline-none transition-[border-color,box-shadow,background-color]",
                    "border-input focus:border-foreground focus:ring-2 focus:ring-foreground/10",
                    fieldErrors.otp ? "border-destructive focus:border-destructive focus:ring-destructive/15" : ""
                  )}
                />
              ))}
            </div>
          </Field>
        )}

        {error ? (
          <p className="border-l border-destructive pl-3 text-sm leading-6 text-destructive">{error}</p>
        ) : null}

        <div
          className={cn(
            isVerifyingRegistration ? "space-y-3" : "flex items-center gap-3",
            actionAreaClassName,
            compact ? "pt-0" : "pt-2"
          )}
        >
          <Button
            type="submit"
            className={cn("h-11 rounded-lg", isVerifyingRegistration ? "w-full" : "flex-1")}
            disabled={loading || googleLoading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isVerifyingRegistration ? (
              <ShieldCheck className="size-4" />
            ) : (
              <ArrowRight className="size-4" />
            )}
            {isVerifyingRegistration ? "Xác thực và tiếp tục" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          </Button>

          {googleClientId && !isVerifyingRegistration ? (
            <button
              type="button"
              aria-label={isRegister ? "Đăng ký bằng Google" : "Đăng nhập bằng Google"}
              className={cn(
                "relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg border border-input bg-background text-foreground transition-colors hover:bg-muted",
                googleLoading ? "pointer-events-none opacity-60" : ""
              )}
            >
              <GoogleIcon className="size-5" />
              <div
                ref={googleButtonRef}
                className="absolute inset-0 opacity-0 [&>div]:!m-0 [&>div]:!size-11 [&_iframe]:!m-0 [&_iframe]:!size-11"
              />
            </button>
          ) : null}

          {isVerifyingRegistration ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-lg"
              disabled={loading || resending || googleLoading || resendCountdown > 0}
              onClick={handleResendOtp}
            >
              {resending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              {resendCountdown > 0 ? `Gửi lại OTP sau ${resendCountdown}s` : "Gửi lại OTP"}
            </Button>
          ) : null}
        </div>
      </form>

      <p className={cn("text-sm text-muted-foreground", compact ? "mt-4" : "mt-8")}>
        {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {isRegister ? "Đăng nhập" : "Tạo tài khoản"}
        </Link>
      </p>
    </section>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

function Field({
  children,
  error,
  htmlFor,
  label,
}: {
  children: ReactNode
  error?: string
  htmlFor: string
  label: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs leading-5 text-destructive">{error}</p> : null}
    </div>
  )
}
