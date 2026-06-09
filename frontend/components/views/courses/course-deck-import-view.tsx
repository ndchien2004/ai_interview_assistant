"use client"

import { FileJson, Upload } from "lucide-react"
import { ChangeEvent, useMemo, useState } from "react"

import { StateBlock } from "@/components/common/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Header } from "@/components/views/courses/course-deck-cards-view"
import { importCourseDeckJson, type DeckJsonImportPayload } from "@/services/course-service"

const sampleJson = `{
  "sections": [
    {
      "title": "Mẫu",
      "questions": [
        {
          "question": "2 + 2 bằng mấy?",
          "options": ["4", "3", "5", "22"],
          "correctAnswer": "A",
          "explanation": "2 + 2 = 4.",
          "difficulty": "BEGINNER",
          "tags": ["math"]
        }
      ]
    }
  ]
}`

export function CourseDeckImportView({ courseSlug, deckSlug }: { courseSlug: string; deckSlug: string }) {
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

  const questionCount = parsed?.sections.reduce((total, section) => total + (section.questions?.length ?? 0), 0) ?? 0

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith(".json")) {
      setError("Vui lòng chọn file .json.")
      return
    }
    setError("")
    setContent(await file.text())
  }

  const handleImport = async () => {
    if (!parsed) {
      setError("JSON chưa hợp lệ.")
      return
    }
    setImporting(true)
    setError("")
    setMessage("")
    try {
      const result = await importCourseDeckJson(courseSlug, deckSlug, parsed)
      setMessage(`Đã import ${result.importedCount} câu hỏi vào bộ thẻ này.`)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Không thể import JSON.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-7">
      <Header href={`/courses/${courseSlug}/decks/${deckSlug}`} label="Bộ thẻ" title="Import JSON" />
      <section className="grid gap-7 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="grid gap-4 border-y border-border py-5">
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
            <p className="mt-3">{parsed ? `${questionCount} câu hỏi` : "JSON chưa hợp lệ"}</p>
          </div>
        </aside>
        <div className="space-y-5">
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} className="min-h-[420px] resize-y font-mono text-xs" />
          {message ? <p className="border-y border-border py-3 text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}
          <div className="flex items-center justify-between gap-3 border-y border-border py-4">
            <p className="text-sm text-muted-foreground">{questionCount} câu sẵn sàng import</p>
            <Button disabled={!parsed || !questionCount || importing} onClick={handleImport}>
              <Upload className="size-4" />
              Import JSON
            </Button>
          </div>
        </div>
      </section>
      {!parsed ? <StateBlock title="JSON chưa hợp lệ" description="Kiểm tra lại dấu ngoặc, dấu phẩy và các trường bắt buộc." /> : null}
    </div>
  )
}
