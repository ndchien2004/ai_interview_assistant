"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, FilePenLine, Layers3, Pencil, Plus, Trash2, Upload, X } from "lucide-react"
import { useEffect, useState } from "react"

import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createCourseDeck, deleteCourseDeck, getCourse, updateCourseDeck } from "@/services/course-service"
import type { Course, CourseSection } from "@/types"

const defaultDeckDescription = "Bộ thẻ ôn tập trong học phần này."

export function CourseDeckListView({ courseSlug }: { courseSlug: string }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [title, setTitle] = useState("")
  const [editingDeck, setEditingDeck] = useState<CourseSection | null>(null)
  const [pendingDeleteDeck, setPendingDeleteDeck] = useState<CourseSection | null>(null)
  const [lastCreatedDeck, setLastCreatedDeck] = useState<CourseSection | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    getCourse(courseSlug)
      .then((data) => {
        if (active) setCourse(data)
      })
      .catch(() => {
        if (active) setError("Không thể tải học phần.")
      })

    return () => {
      active = false
    }
  }, [courseSlug])

  const openCreateDialog = () => {
    setEditingDeck(null)
    setTitle("")
    setError("")
    setDialogOpen(true)
  }

  const openRenameDialog = (deck: CourseSection) => {
    setEditingDeck(deck)
    setTitle(deck.title)
    setError("")
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
    setEditingDeck(null)
    setTitle("")
  }

  const handleSave = async () => {
    if (!course) return
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    setSaving(true)
    setError("")
    try {
      const payload = {
        title: trimmedTitle,
        slug: uniqueSlug(slugify(trimmedTitle), course.sections ?? [], editingDeck?.slug),
        description: editingDeck?.description || defaultDeckDescription,
        sortOrder: editingDeck?.sortOrder ?? (course.sections?.length ?? 0) + 1,
      }
      const deck = editingDeck
        ? await updateCourseDeck(course.slug, editingDeck.slug, payload)
        : await createCourseDeck(course.slug, payload)
      setCourse({
        ...course,
        sections: [...(course.sections ?? []).filter((item) => item.slug !== editingDeck?.slug && item.slug !== deck.slug), deck],
      })
      if (!editingDeck) setLastCreatedDeck(deck)
      setDialogOpen(false)
      setEditingDeck(null)
      setTitle("")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu bộ thẻ.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (deck: CourseSection) => {
    setPendingDeleteDeck(deck)
  }

  const confirmDelete = async () => {
    if (!course || !pendingDeleteDeck) return
    setError("")
    setDeletingSlug(pendingDeleteDeck.slug)
    try {
      await deleteCourseDeck(course.slug, pendingDeleteDeck.slug)
      setCourse({ ...course, sections: (course.sections ?? []).filter((item) => item.slug !== pendingDeleteDeck.slug) })
      if (lastCreatedDeck?.slug === pendingDeleteDeck.slug) setLastCreatedDeck(null)
      setPendingDeleteDeck(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa bộ thẻ.")
    } finally {
      setDeletingSlug("")
    }
  }

  if (error && !course) {
    return <StateBlock tone="error" title="Không mở được học phần" description={error} />
  }

  if (!course) {
    return <LoadingSpinner />
  }

  const decks = [...(course.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/courses">
            <ArrowLeft className="size-4" />
            Học phần
          </Link>
        </Button>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Layers3 className="size-4" />
              {decks.length} bộ thẻ
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{course.title}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">{course.description}</p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="size-4" />
            Tạo bộ thẻ
          </Button>
        </div>
      </section>

      {lastCreatedDeck ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Đã tạo <span className="font-medium text-foreground">{lastCreatedDeck.title}</span>
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/courses/${course.slug}/decks/${lastCreatedDeck.slug}/import`}>
              <Upload className="size-4" />
              Import JSON
            </Link>
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid content-start gap-3">
        {decks.map((deck) => (
          <DeckCard
            key={deck.id}
            courseSlug={course.slug}
            deck={deck}
            deleting={deletingSlug === deck.slug}
            onRename={openRenameDialog}
            onDelete={handleDelete}
          />
        ))}
        {!decks.length ? <StateBlock title="Chưa có bộ thẻ" description="Tạo bộ thẻ đầu tiên trong học phần này." /> : null}
      </section>

      {dialogOpen ? (
        <DeckDialog
          title={title}
          saving={saving}
          editing={Boolean(editingDeck)}
          error={error}
          onTitleChange={setTitle}
          onClose={closeDialog}
          onSave={handleSave}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDeleteDeck)}
        title="Xóa bộ thẻ?"
        description={
          <>
            Bộ thẻ <span className="font-medium text-foreground">{pendingDeleteDeck?.title}</span> và các câu hỏi bên trong sẽ bị xóa.
          </>
        }
        confirmLabel="Xóa bộ thẻ"
        loading={Boolean(deletingSlug)}
        tone="danger"
        onClose={() => {
          if (!deletingSlug) setPendingDeleteDeck(null)
        }}
        onConfirm={confirmDelete}
      />
    </div>
  )
}

function DeckCard({
  courseSlug,
  deck,
  deleting,
  onRename,
  onDelete,
}: {
  courseSlug: string
  deck: CourseSection
  deleting: boolean
  onRename: (deck: CourseSection) => void
  onDelete: (deck: CourseSection) => void
}) {
  const router = useRouter()

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/courses/${courseSlug}/decks/${deck.slug}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") router.push(`/courses/${courseSlug}/decks/${deck.slug}`)
      }}
      className="cursor-pointer rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/35 hover:bg-muted/30"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{deck.title}</h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{deck.questions.length} câu hỏi</p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              router.push(`/courses/${courseSlug}/decks/${deck.slug}/cards`)
            }}
            aria-label={`Sửa thẻ trong ${deck.title}`}
          >
            <FilePenLine className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              onRename(deck)
            }}
            aria-label={`Đổi tên ${deck.title}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={deleting}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(deck)
            }}
            aria-label={`Xóa ${deck.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function DeckDialog({
  title,
  saving,
  editing,
  error,
  onTitleChange,
  onClose,
  onSave,
}: {
  title: string
  saving: boolean
  editing: boolean
  error: string
  onTitleChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-md border border-border bg-card p-5 shadow-lg" role="dialog" aria-modal="true">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{editing ? "Đổi tên bộ thẻ" : "Tạo bộ thẻ"}</h2>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Đóng">
            <X className="size-4" />
          </Button>
        </div>
        <div className="mt-5 space-y-4">
          <Input autoFocus value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Tên bộ thẻ" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={onSave} disabled={saving || !title.trim()}>
              <Plus className="size-4" />
              {editing ? "Lưu" : "Tạo"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function uniqueSlug(baseSlug: string, decks: CourseSection[], currentSlug?: string) {
  let candidate = baseSlug || "bo-the"
  let suffix = 2
  const usedSlugs = new Set(decks.map((deck) => deck.slug).filter((slug) => slug !== currentSlug))
  while (usedSlugs.has(candidate)) {
    candidate = `${baseSlug}-${suffix}`
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
  return normalized || "bo-the"
}
