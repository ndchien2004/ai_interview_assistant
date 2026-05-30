"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  BarChart3,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  Mic2,
  Moon,
  Sparkles,
  Sun,
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
  { href: "/courses/java-core", label: "Java Core", icon: BookOpen },
  { href: "/history", label: "History", icon: History },
]

const SIDEBAR_COLLAPSED_KEY = "ai-interview-sidebar-collapsed"
const THEME_KEY = "ai-interview-theme"
const THEME_CHANGE_EVENT = "ai-interview-theme-change"
type Theme = "light" | "dark"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentUser = getCurrentUser()

      if (!currentUser) {
        router.replace("/login")
        return
      }

      setUser(currentUser)
      setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true")
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
      setReady(true)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [router])

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }

    syncTheme()
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme)
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme)
  }, [])

  const handleLogout = () => {
    logout()
    router.replace("/login")
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
      return next
    })
  }

  const toggleTheme = () => {
    const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark"
    applyAppTheme(next)
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
          "fixed inset-y-0 left-0 z-40 w-48 border-r border-border/80 bg-sidebar px-4 py-5 text-sidebar-foreground transition-all duration-200 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
          sidebarCollapsed && "lg:w-20 lg:px-3"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between gap-2",
            sidebarCollapsed && "lg:flex-col lg:justify-center"
          )}
        >
          <Link
            href="/dashboard"
            className={cn("flex items-center gap-2 font-semibold", sidebarCollapsed && "lg:justify-center")}
            title="AI Interview"
          >
            <BarChart3 className="size-5 text-sidebar-foreground" />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>AI Interview</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
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
                title={item.label}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                  sidebarCollapsed && "lg:justify-center lg:px-0"
                )}
              >
                <Icon className="size-4" />
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div
          className={cn(
            "absolute inset-x-5 bottom-5 border-t border-border pt-4",
            sidebarCollapsed && "lg:inset-x-3 lg:flex lg:flex-col lg:items-center"
          )}
        >
          <p className={cn("text-sm font-medium", sidebarCollapsed && "lg:hidden")}>{user.name}</p>
          <p className={cn("mt-0.5 truncate text-xs text-muted-foreground", sidebarCollapsed && "lg:hidden")}>
            {user.email}
          </p>
          <span
            className={cn(
              "hidden size-9 items-center justify-center rounded-full border border-sidebar-border text-sm font-semibold text-sidebar-foreground",
              sidebarCollapsed && "lg:flex"
            )}
            title={user.name}
          >
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <Button
            variant="outline"
            size={sidebarCollapsed ? "icon-sm" : "sm"}
            className={cn("mt-3 w-full", sidebarCollapsed && "lg:w-8")}
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>Sign out</span>
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

      <div className={cn("transition-[padding] duration-200 lg:pl-48", sidebarCollapsed && "lg:pl-20")}>
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
              <Button
                variant="outline"
                size="icon-sm"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
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

function applyAppTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  window.localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }))
}
