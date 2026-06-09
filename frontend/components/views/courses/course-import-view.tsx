"use client"

import Link from "next/link"
import { ArrowLeft, FileJson, Upload } from "lucide-react"
import { ChangeEvent, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createDeck, importDeckJson, type DeckJsonImportPayload } from "@/services/course-service"

const sampleJson = `{
  "title": "Java cơ bản",
  "description": "Bộ câu hỏi tự tạo",
  "sections": [
    {
      "title": "Java Core",
      "questions": [
        {
          "question": "JVM dùng để làm gì?",
          "options": ["Chạy bytecode Java", "Tạo CSS", "Quản lý DNS", "Thiết kế database"],
          "correctAnswer": "A",
          "explanation": "JVM thực thi bytecode đã được biên dịch từ mã nguồn Java.",
          "difficulty": "BEGINNER",
          "tags": ["java", "jvm"]
        }
      ]
    }
  ]
}`

export function CourseImportView() {
  const [title, setTitle] = useState("Bộ thẻ của tôi")
  const [slug, setSlug] = useState("bo-the-cua-toi")
  const [description, setDescription] = useState("Bộ câu hỏi trắc nghiệm tự import vào FreeCard.")
  const [content, setContent] = useState(sampleJson)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)

  const parsed = useMemo(() => {
    try {
      return JSON.parse(content) as DeckJsonImportPayload
    } catch {
      return null
    }
  }, [content])

  const questionCount =
    parsed?.sections.reduce((total, section) => total + (section.questions?.length ?? 0), 0) ?? 0

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".json")) {
      setError("Vui lòng chọn file .json theo mẫu FreeCard.")
      return
    }

    setError("")
    setContent(await file.text())
  }

  const handleImport = async () => {
    setError("")
    setMessage("")
    if (!parsed) {
      setError("JSON chưa hợp lệ. Hãy kiểm tra dấu ngoặc, dấu phẩy và tên trường.")
      return
    }

    setImporting(true)
    try {
      const deck = await createDeck({
        title: title.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim(),
        active: true,
      })
      const result = await importDeckJson(deck.slug, parsed)
      setMessage(`Đã import ${result.importedCount} câu hỏi vào bộ thẻ "${deck.title}".`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Không thể import bộ câu hỏi.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/courses">
              <ArrowLeft className="size-4" />
              Bộ thẻ
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Tạo / Import bộ thẻ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import JSON gồm câu hỏi, 4 đáp án, đáp án đúng và giải thích.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/courses/java-core/learn">Học ngay</Link>
        </Button>
      </div>

      <section className="grid gap-7 lg:grid-cols-[360px_1fr]">
        <div className="space-y-5">
          <div className="grid gap-4 border-y border-border py-5">
            <label className="text-sm font-medium" htmlFor="title">
              Tên bộ thẻ
            </label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />

            <label className="text-sm font-medium" htmlFor="slug">
              Slug
            </label>
            <Input id="slug" value={slug} onChange={(event) => setSlug(event.target.value)} />

            <label className="text-sm font-medium" htmlFor="description">
              Mô tả
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-24 resize-none"
            />

            <label className="text-sm font-medium" htmlFor="file">
              File JSON
            </label>
            <Input id="file" type="file" accept=".json,application/json" onChange={handleFile} />
          </div>

          <div className="border-y border-border py-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 font-semibold text-foreground">
              <FileJson className="size-4" />
              Kiểm tra nhanh
            </div>
            <p className="mt-3">{parsed ? `${parsed.sections.length} chủ đề / ${questionCount} câu hỏi` : "JSON chưa hợp lệ"}</p>
            <p className="mt-2">Mỗi câu bắt buộc có đúng 4 đáp án và `correctAnswer` là A, B, C hoặc D.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="content">
              Nội dung JSON
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[420px] resize-y border border-border bg-transparent px-3 py-3 font-mono text-xs"
            />
          </div>

          {message ? <p className="border-y border-border py-3 text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
            <p className="text-sm text-muted-foreground">{questionCount} câu sẵn sàng import</p>
            <Button disabled={!parsed || !questionCount || importing || !title.trim() || !slug.trim()} onClick={handleImport}>
              <Upload className="size-4" />
              Import JSON
            </Button>
          </div>
        </div>
      </section>

      {!parsed ? <StateBlock title="JSON chưa hợp lệ" description="Bạn có thể quay về mẫu mặc định hoặc xem tài liệu hướng dẫn trong thư mục docs." /> : null}
    </div>
  )
}
