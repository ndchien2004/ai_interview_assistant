"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import {
  BarChart3,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Sun,
  UserRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { getCurrentUser, logout, USER_CHANGE_EVENT } from "@/services/auth-service"
import type { User } from "@/types"
import { cn } from "@/lib/utils"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

const navItems: NavItem[] = [
  {
    href: "/courses/java-core",
    label: "Trang chủ",
    icon: LayoutDashboard,
    isActive: (pathname) =>
      pathname === "/courses/java-core" ||
      (pathname.startsWith("/courses/java-core/") &&
        !pathname.startsWith("/courses/java-core/cards") &&
        !pathname.startsWith("/courses/java-core/import")),
  },
  {
    href: "/courses",
    label: "Bộ thẻ",
    icon: BookOpen,
    isActive: (pathname) =>
      pathname === "/courses" ||
      (pathname.startsWith("/courses/") && !pathname.startsWith("/courses/java-core")) ||
      pathname.startsWith("/courses/java-core/cards") ||
      pathname.startsWith("/courses/java-core/import"),
  },
  { href: "/profile", label: "Hồ sơ", icon: UserRound, isActive: (pathname) => pathname.startsWith("/profile") },
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
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [theme, setTheme] = useState<Theme>("light")
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const activeNavHref = navItems.find((item) => item.isActive(pathname))?.href

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

  useEffect(() => {
    const handleUserChange = (event: Event) => {
      setUser((event as CustomEvent<User>).detail)
    }

    window.addEventListener(USER_CHANGE_EVENT, handleUserChange)
    return () => window.removeEventListener(USER_CHANGE_EVENT, handleUserChange)
  }, [])

  useEffect(() => {
    if (!profileOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [profileOpen])

  const handleLogout = () => {
    logout()
    setProfileOpen(false)
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
          <p className="text-sm text-muted-foreground">Đang chuẩn bị không gian học...</p>
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
            href="/courses/java-core"
            className={cn("flex items-center gap-2 font-semibold", sidebarCollapsed && "lg:justify-center")}
            title="FreeCard"
          >
            <BarChart3 className="size-5 text-sidebar-foreground" />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>FreeCard</span>
          </Link>
          <Button
            variant="ghost"
            size="icon-sm"
            className="hidden lg:inline-flex"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            title={sidebarCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
          >
            {sidebarCollapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Đóng điều hướng"
          >
            <X />
          </Button>
        </div>

        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.href === activeNavHref

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
          <Link href="/profile" className={cn("block", sidebarCollapsed && "lg:hidden")}>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
          </Link>
          <Link
            href="/profile"
            className={cn(
              "hidden size-9 items-center justify-center overflow-hidden rounded-full border border-sidebar-border text-sm font-semibold text-sidebar-foreground",
              sidebarCollapsed && "lg:flex"
            )}
            title={user.name}
          >
            <UserAvatar user={user} />
          </Link>
          <Button
            variant="outline"
            size={sidebarCollapsed ? "icon-sm" : "sm"}
            className={cn("mt-3 w-full", sidebarCollapsed && "lg:w-8")}
            onClick={handleLogout}
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <LogOut className="size-4" />
            <span className={cn(sidebarCollapsed && "lg:hidden")}>Đăng xuất</span>
          </Button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          aria-label="Đóng lớp phủ điều hướng"
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
              aria-label="Mở điều hướng"
            >
              <Menu />
            </Button>
            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={toggleTheme}
                aria-label={theme === "dark" ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
                title={theme === "dark" ? "Chuyển sang nền sáng" : "Chuyển sang nền tối"}
              >
                {theme === "dark" ? <Sun /> : <Moon />}
              </Button>
              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((current) => !current)}
                  className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-border text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  aria-label="Mở menu hồ sơ"
                  aria-expanded={profileOpen}
                >
                  <UserAvatar user={user} />
                </button>
                {profileOpen ? (
                  <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-lg border border-border bg-background shadow-2xl">
                    <div className="border-b border-border px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center overflow-hidden rounded-full border border-border text-sm font-semibold">
                          <UserAvatar user={user} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{user.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      <DropdownLink href="/profile" label="Hồ sơ" icon={UserRound} onClick={() => setProfileOpen(false)} />
                    </div>
                    <div className="border-t border-border p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="size-4" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

function UserAvatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return <Image src={user.avatarUrl} alt="" width={44} height={44} unoptimized className="size-full object-cover" />
  }

  return <span>{user.name.slice(0, 1).toUpperCase()}</span>
}

function DropdownLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  )
}

function applyAppTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  window.localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }))
}
