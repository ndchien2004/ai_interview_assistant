"use client"

import Link from "next/link"
import { FormEvent, useEffect, useRef, useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

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
import { login, loginWithGoogle, register } from "@/services/auth-service"

type AuthFormProps = {
  mode: "login" | "register"
}

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
              theme: "outline" | "filled_blue" | "filled_black"
              size: "large" | "medium" | "small"
              width?: number
              text?: "signin_with" | "signup_with" | "continue_with"
            }
          ) => void
        }
      }
    }
  }
}

export function AuthForm({ mode }: AuthFormProps) {
  const googleButtonRef = useRef<HTMLDivElement>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState(mode === "login" ? "alex@example.com" : "")
  const [password, setPassword] = useState(mode === "login" ? "password123" : "")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isRegister = mode === "register"
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return

    let cancelled = false

    const initializeGoogle = () => {
      if (cancelled || !window.google || !googleButtonRef.current) return

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            setError("Google sign-in did not return a credential.")
            return
          }

          setError("")
          setGoogleLoading(true)

          try {
            await loginWithGoogle(response.credential)
            window.location.assign("/dashboard")
          } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Google sign-in failed.")
          } finally {
            setGoogleLoading(false)
          }
        },
      })

      googleButtonRef.current.innerHTML = ""
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: googleButtonRef.current.offsetWidth || 384,
        text: isRegister ? "signup_with" : "signin_with",
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
  }, [googleClientId, isRegister])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error("Please enter your name.")
        await register(name, email, password)
      } else {
        await login(email, password)
      }

      window.location.assign("/dashboard")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md rounded-lg">
      <CardHeader>
        <CardTitle>{isRegister ? "Create your account" : "Welcome back"}</CardTitle>
        <CardDescription>
          {isRegister
            ? "Start practicing resume-based interviews with mock AI feedback."
            : "Use the demo credentials or sign in with any email."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          {isRegister ? (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Alex Morgan"
                required
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="alex@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={loading || googleLoading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        {googleClientId ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div
              ref={googleButtonRef}
              className={googleLoading ? "pointer-events-none opacity-60" : ""}
            />
          </div>
        ) : null}

        <p className="mt-5 text-center text-sm text-muted-foreground">
          {isRegister ? "Already have an account?" : "New to the project?"}{" "}
          <Link
            href={isRegister ? "/login" : "/register"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {isRegister ? "Sign in" : "Create one"}
          </Link>
        </p>
      </CardContent>
    </Card>
  )
}
