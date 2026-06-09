"use client"

import { useRouter } from "next/navigation"
import { BookOpenCheck, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { useEffect, useState } from "react"

import { LoadingSpinner } from "@/components/common/loading-spinner"
import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createCourse, deleteCourse, listCourses, updateCourse } from "@/services/course-service"
import type { Course } from "@/types"

const emptyCourseForm = {
  title: "Học ôn thi toán",
  description: "Học phần tự tạo để gom các bộ thẻ ôn tập.",
}

export function CourseDecksView() {
  const [courses, setCourses] = useState<Course[]>([])
  const [title, setTitle] = useState(emptyCourseForm.title)
  const [description, setDescription] = useState(emptyCourseForm.description)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    let active = true
    listCourses()
      .then((rows) => {
        if (active) setCourses(rows)
      })
      .catch(() => {
        if (active) setError("Không thể tải danh sách học phần.")
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const resetForm = () => {
    setEditingCourse(null)
    setTitle(emptyCourseForm.title)
    setDescription(emptyCourseForm.description)
    setError("")
  }

  const startEdit = (course: Course) => {
    setEditingCourse(course)
    setTitle(course.title)
    setDescription(course.description)
    setError("")
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        slug: uniqueSlug(slugify(title), courses, editingCourse?.slug),
        description: description.trim(),
        active: true,
      }
      const saved = editingCourse ? await updateCourse(editingCourse.slug, payload) : await createCourse(payload)
      setCourses((current) => [saved, ...current.filter((item) => item.slug !== editingCourse?.slug && item.slug !== saved.slug)])
      if (!editingCourse) resetForm()
      else setEditingCourse(saved)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không thể lưu học phần.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Xóa học phần "${course.title}"?`)) return
    setError("")
    setDeletingSlug(course.slug)
    try {
      await deleteCourse(course.slug)
      setCourses((current) => current.filter((item) => item.slug !== course.slug))
      if (editingCourse?.slug === course.slug) resetForm()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không thể xóa học phần.")
    } finally {
      setDeletingSlug("")
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="space-y-6">
      <section className="border-b border-border pb-5">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BookOpenCheck className="size-4" />
          Bộ thẻ
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Học phần</h1>
        <p className="mt-2 max-w-3xl text-base leading-7 text-muted-foreground">
          Mỗi học phần có thể chứa nhiều bộ thẻ nhỏ. Vào học phần để tạo bộ thẻ, import câu hỏi và chọn kiểu học.
        </p>
      </section>

      <section className="grid items-start gap-7 lg:grid-cols-[1fr_360px]">
        <div className="grid content-start gap-3 self-start">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              deleting={deletingSlug === course.slug}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          ))}
          {!courses.length ? <StateBlock title="Chưa có học phần" description="Tạo học phần đầu tiên để bắt đầu gom bộ thẻ." /> : null}
        </div>

        <aside className="space-y-4 rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {editingCourse ? <Pencil className="size-4" /> : <Plus className="size-4" />}
              {editingCourse ? "Sửa học phần" : "Tạo học phần"}
            </div>
            {editingCourse ? (
              <Button variant="ghost" size="icon-sm" onClick={resetForm} aria-label="Hủy sửa">
                <RotateCcw className="size-4" />
              </Button>
            ) : null}
          </div>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên học phần" />
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-20 resize-none" />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button disabled={saving || !title.trim() || !description.trim()} onClick={handleSave} className="w-full">
            {editingCourse ? <Pencil className="size-4" /> : <Plus className="size-4" />}
            {editingCourse ? "Lưu học phần" : "Tạo học phần"}
          </Button>
        </aside>
      </section>
    </div>
  )
}

function CourseCard({
  course,
  deleting,
  onEdit,
  onDelete,
}: {
  course: Course
  deleting: boolean
  onEdit: (course: Course) => void
  onDelete: (course: Course) => void
}) {
  const router = useRouter()

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/courses/${course.slug}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") router.push(`/courses/${course.slug}`)
      }}
      className="cursor-pointer rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-foreground/35 hover:bg-muted/30"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{course.title}</h2>
          <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{course.description}</p>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{course.questionCount} câu hỏi</p>
        </div>
        <div className="flex gap-2 sm:justify-end">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(course)
            }}
            aria-label={`Sửa ${course.title}`}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={deleting}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(course)
            }}
            aria-label={`Xóa ${course.title}`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  )
}

function uniqueSlug(baseSlug: string, courses: Course[], currentSlug?: string) {
  let candidate = baseSlug || "hoc-phan"
  let suffix = 2
  const usedSlugs = new Set(courses.map((course) => course.slug).filter((slug) => slug !== currentSlug))
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
  return normalized || "hoc-phan"
}
