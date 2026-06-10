"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BarChart3,
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FileQuestion,
  FolderPlus,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Sun,
  UserRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUser, logout, USER_CHANGE_EVENT } from "@/services/auth-service"
import { createCourse, createCourseDeck, getCourse, listCourses } from "@/services/course-service"
import { cn } from "@/lib/utils"
import type { Course, CourseSection, PracticeQuestion, User } from "@/types"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  isActive: (pathname: string) => boolean
}

type SearchFilter = "all" | "course" | "question"
type QuickCreateMode = "course" | "deck" | null

type QuestionSearchResult = {
  course: Course
  deck: CourseSection
  question: PracticeQuestion
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
]

const SIDEBAR_COLLAPSED_KEY = "freecard-sidebar-collapsed"
const THEME_KEY = "freecard-theme"
const THEME_CHANGE_EVENT = "freecard-theme-change"
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
  const [searchQuery, setSearchQuery] = useState("")
  const [searchFilter, setSearchFilter] = useState<SearchFilter>("all")
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchCourses, setSearchCourses] = useState<Course[]>([])
  const [searchError, setSearchError] = useState("")
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickMode, setQuickMode] = useState<QuickCreateMode>(null)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickDescription, setQuickDescription] = useState("Học phần tự tạo để gom các bộ thẻ ôn tập.")
  const [quickCourseSlug, setQuickCourseSlug] = useState("")
  const [quickSaving, setQuickSaving] = useState(false)
  const [quickError, setQuickError] = useState("")
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLDivElement | null>(null)
  const quickRef = useRef<HTMLDivElement | null>(null)
  const activeNavHref = navItems.find((item) => item.isActive(pathname))?.href

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const courseResults = useMemo(() => {
    if (!normalizedQuery || searchFilter === "question") return []
    return searchCourses
      .filter((course) => [course.title, course.description].join(" ").toLowerCase().includes(normalizedQuery))
      .slice(0, 6)
  }, [normalizedQuery, searchCourses, searchFilter])

  const questionResults = useMemo(() => {
    if (!normalizedQuery || searchFilter === "course") return []
    const results: QuestionSearchResult[] = []
    for (const course of searchCourses) {
      for (const deck of course.sections ?? []) {
        for (const question of deck.questions) {
          const haystack = [
            course.title,
            deck.title,
            question.question,
            question.shortAnswer,
            question.explanation,
            question.tags.join(" "),
          ]
            .join(" ")
            .toLowerCase()
          if (haystack.includes(normalizedQuery)) results.push({ course, deck, question })
        }
      }
    }
    return results.slice(0, 8)
  }, [normalizedQuery, searchCourses, searchFilter])

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
    if (!profileOpen && !searchOpen && !quickOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (!profileMenuRef.current?.contains(target)) setProfileOpen(false)
      if (!searchRef.current?.contains(target)) setSearchOpen(false)
      if (!quickRef.current?.contains(target)) setQuickOpen(false)
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => window.removeEventListener("pointerdown", handlePointerDown)
  }, [profileOpen, quickOpen, searchOpen])

  const loadSearchCourses = async () => {
    if (searchCourses.length || searchLoading) return
    setSearchLoading(true)
    setSearchError("")
    try {
      const summaries = await listCourses()
      const details = await Promise.all(summaries.map((course) => getCourse(course.slug).catch(() => course)))
      setSearchCourses(details)
      if (!quickCourseSlug && details[0]) setQuickCourseSlug(details[0].slug)
    } catch {
      setSearchError("Không thể tải dữ liệu tìm kiếm.")
    } finally {
      setSearchLoading(false)
    }
  }

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

  const openQuickDialog = (mode: Exclude<QuickCreateMode, null>) => {
    setQuickMode(mode)
    setQuickOpen(false)
    setQuickTitle("")
    setQuickError("")
    if (!searchCourses.length) void loadSearchCourses()
  }

  const closeQuickDialog = () => {
    if (quickSaving) return
    setQuickMode(null)
    setQuickTitle("")
    setQuickError("")
  }

  const handleQuickCreate = async () => {
    const title = quickTitle.trim()
    if (!title) return
    setQuickSaving(true)
    setQuickError("")
    try {
      if (quickMode === "course") {
        const course = await createCourse({
          title,
          slug: uniqueSlug(slugify(title), searchCourses.map((item) => item.slug), "hoc-phan"),
          description: quickDescription.trim() || "Học phần tự tạo.",
          active: true,
        })
        setSearchCourses((current) => [course, ...current.filter((item) => item.slug !== course.slug)])
        setQuickMode(null)
        router.push(`/courses/${course.slug}`)
      }

      if (quickMode === "deck") {
        const course = searchCourses.find((item) => item.slug === quickCourseSlug)
        if (!course) {
          setQuickError("Chọn học phần trước khi tạo bộ thẻ.")
          return
        }
        const deck = await createCourseDeck(course.slug, {
          title,
          slug: uniqueSlug(slugify(title), (course.sections ?? []).map((item) => item.slug), "bo-the"),
          description: "Bộ thẻ ôn tập trong học phần này.",
          sortOrder: (course.sections?.length ?? 0) + 1,
        })
        setSearchCourses((current) =>
          current.map((item) =>
            item.slug === course.slug
              ? {
                  ...item,
                  sections: [...(item.sections ?? []), deck],
                }
              : item
          )
        )
        setQuickMode(null)
        router.push(`/courses/${course.slug}/decks/${deck.slug}`)
      }
    } catch (error) {
      setQuickError(error instanceof Error ? error.message : "Không thể tạo nhanh.")
    } finally {
      setQuickSaving(false)
    }
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
        <div className={cn("flex items-center justify-between gap-2", sidebarCollapsed && "lg:flex-col lg:justify-center")}>
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
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Đóng điều hướng">
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
          <div className={cn("block", sidebarCollapsed && "lg:hidden")}>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          <div
            className={cn(
              "hidden size-9 items-center justify-center overflow-hidden rounded-full border border-sidebar-border text-sm font-semibold text-sidebar-foreground",
              sidebarCollapsed && "lg:flex"
            )}
            title={user.name}
          >
            <UserAvatar user={user} />
          </div>
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
        <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Đóng lớp phủ điều hướng" onClick={() => setMenuOpen(false)} />
      ) : null}

      <div className={cn("transition-[padding] duration-200 lg:pl-48", sidebarCollapsed && "lg:pl-20")}>
        <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
            <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Mở điều hướng">
              <Menu />
            </Button>

            <div ref={searchRef} className="relative min-w-0 flex-1 md:max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value)
                      setSearchOpen(true)
                    }}
                    onFocus={() => {
                      setSearchOpen(true)
                      void loadSearchCourses()
                    }}
                    placeholder="Tìm học phần, câu hỏi..."
                    className="h-9 rounded-full pl-9 pr-4"
                  />
                  <select
                    value={searchFilter}
                    onChange={(event) => setSearchFilter(event.target.value as SearchFilter)}
                    className="hidden"
                    aria-label="Bộ lọc tìm kiếm"
                  >
                    <option value="all">Tất cả</option>
                    <option value="course">Học phần</option>
                    <option value="question">Câu hỏi</option>
                  </select>
                </div>

                <div ref={quickRef} className="relative">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => {
                      setQuickOpen((current) => !current)
                      void loadSearchCourses()
                    }}
                    aria-label="Tạo nhanh"
                    title="Tạo nhanh"
                  >
                    <Plus className="size-4" />
                  </Button>
                  {quickOpen ? (
                    <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-md border border-border bg-background shadow-xl">
                      <button
                        type="button"
                        onClick={() => openQuickDialog("course")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <FolderPlus className="size-4" />
                        Tạo học phần
                      </button>
                      <button
                        type="button"
                        onClick={() => openQuickDialog("deck")}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      >
                        <BookOpen className="size-4" />
                        Tạo bộ thẻ
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              {searchOpen ? (
                <SearchPanel
                  query={normalizedQuery}
                  loading={searchLoading}
                  error={searchError}
                  courses={courseResults}
                  questions={questionResults}
                  filter={searchFilter}
                  onFilterChange={setSearchFilter}
                  onOpen={(href) => {
                    setSearchOpen(false)
                    setSearchQuery("")
                    router.push(href)
                  }}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-3">
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

      {quickMode ? (
        <QuickCreateDialog
          mode={quickMode}
          title={quickTitle}
          description={quickDescription}
          courseSlug={quickCourseSlug}
          courses={searchCourses}
          loadingCourses={searchLoading}
          saving={quickSaving}
          error={quickError}
          onTitleChange={setQuickTitle}
          onDescriptionChange={setQuickDescription}
          onCourseChange={setQuickCourseSlug}
          onClose={closeQuickDialog}
          onSave={handleQuickCreate}
        />
      ) : null}
    </div>
  )
}

function SearchPanel({
  query,
  loading,
  error,
  courses,
  questions,
  filter,
  onFilterChange,
  onOpen,
}: {
  query: string
  loading: boolean
  error: string
  courses: Course[]
  questions: QuestionSearchResult[]
  filter: SearchFilter
  onFilterChange: (filter: SearchFilter) => void
  onOpen: (href: string) => void
}) {
  if (!query) {
    return (
      <div className="absolute left-0 right-0 top-12 z-50 rounded-md border border-border bg-background p-3 shadow-xl">
        <p className="text-sm text-muted-foreground">Nhập tên học phần hoặc nội dung câu hỏi để tìm.</p>
      </div>
    )
  }

  return (
    <div className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-md border border-border bg-background shadow-xl">
      <div className="border-b border-border px-3 pt-3">
        <p className="text-sm font-semibold">Kết quả cho &quot;{query}&quot;</p>
        <div className="mt-3 flex gap-6 overflow-x-auto">
          {[
            { value: "all", label: "Tất cả kết quả" },
            { value: "course", label: "Học phần" },
            { value: "question", label: "Câu hỏi" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onFilterChange(tab.value as SearchFilter)}
              className={cn(
                "shrink-0 border-b-2 pb-2 text-sm font-semibold transition-colors",
                filter === tab.value
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-2">
      {loading ? <p className="px-3 py-2 text-sm text-muted-foreground">Đang tìm...</p> : null}
      {error ? <p className="px-3 py-2 text-sm text-destructive">{error}</p> : null}
      {!loading && !error && !courses.length && !questions.length ? (
        <p className="px-3 py-2 text-sm text-muted-foreground">Không có kết quả phù hợp.</p>
      ) : null}
      {courses.length ? (
        <div className="py-1">
          <p className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Học phần</p>
          {courses.map((course) => (
            <button
              key={course.id}
              type="button"
              onClick={() => onOpen(`/courses/${course.slug}`)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <BookOpen className="size-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{course.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{course.questionCount} câu hỏi</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {questions.length ? (
        <div className="py-1">
          <p className="px-3 py-1 text-xs font-medium uppercase text-muted-foreground">Câu hỏi</p>
          {questions.map(({ course, deck, question }) => (
            <button
              key={question.id}
              type="button"
              onClick={() => onOpen(`/courses/${course.slug}/decks/${deck.slug}`)}
              className="flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
            >
              <FileQuestion className="mt-0.5 size-4 text-muted-foreground" />
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium">{question.question}</span>
                <span className="line-clamp-1 text-xs text-muted-foreground">
                  {course.title} / {deck.title}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
      </div>
    </div>
  )
}

function QuickCreateDialog({
  mode,
  title,
  description,
  courseSlug,
  courses,
  loadingCourses,
  saving,
  error,
  onTitleChange,
  onDescriptionChange,
  onCourseChange,
  onClose,
  onSave,
}: {
  mode: Exclude<QuickCreateMode, null>
  title: string
  description: string
  courseSlug: string
  courses: Course[]
  loadingCourses: boolean
  saving: boolean
  error: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCourseChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-md border border-border bg-background p-5 shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{mode === "course" ? "Tạo học phần" : "Tạo bộ thẻ"}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          {mode === "deck" ? (
            <select
              value={courseSlug}
              onChange={(event) => onCourseChange(event.target.value)}
              disabled={loadingCourses}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-foreground/10"
            >
              <option value="">Chọn học phần</option>
              {courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title}
                </option>
              ))}
            </select>
          ) : null}
          <Input autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder={mode === "course" ? "Tên học phần" : "Tên bộ thẻ"} />
          {mode === "course" ? (
            <Textarea value={description} onChange={(event) => onDescriptionChange(event.target.value)} className="min-h-20 resize-none" />
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={onSave} disabled={saving || !title.trim() || (mode === "deck" && !courseSlug)}>
              <Plus className="size-4" />
              Tạo
            </Button>
          </div>
        </div>
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

function uniqueSlug(baseSlug: string, usedSlugs: string[], fallback: string) {
  let candidate = baseSlug || fallback
  let suffix = 2
  const used = new Set(usedSlugs)
  while (used.has(candidate)) {
    candidate = `${baseSlug || fallback}-${suffix}`
    suffix++
  }
  return candidate
}

function slugify(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return normalized
}

function applyAppTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  window.localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }))
}
