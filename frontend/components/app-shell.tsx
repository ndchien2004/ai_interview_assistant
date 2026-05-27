"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  Sparkles,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCurrentUser, logout } from "@/services/auth-service"
import type { User } from "@/types"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Resume", icon: FileText },
  { href: "/interviews/new", label: "New interview", icon: Sparkles },
  { href: "/interviews/live", label: "Live interview", icon: Mic2 },
  { href: "/history", label: "History", icon: History },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentUser = getCurrentUser()

      if (!currentUser) {
        router.replace("/login")
        return
      }

      setUser(currentUser)
      setReady(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [router])

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-px w-20 animate-pulse bg-primary/40" />
          <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-border/80 bg-background px-5 py-5 transition-transform lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <span className="flex size-9 items-center justify-center border border-foreground text-foreground">
              <BarChart3 className="size-4" />
            </span>
            AI Interview
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation"
          >
            <X />
          </Button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 border-l px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="absolute inset-x-5 bottom-5 border-t border-border pt-4">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
          <Button variant="outline" size="sm" className="mt-3 w-full" onClick={handleLogout}>
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setMenuOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <p className="hidden text-sm text-muted-foreground sm:block">
                Mock mode · API-ready contracts
              </p>
              <span className="flex size-9 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground">
                {user.name.slice(0, 1).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}
