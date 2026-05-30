"use client"

import Link from "next/link"
import { ArrowLeft, FileUp, Upload } from "lucide-react"
import { ChangeEvent, useMemo, useState } from "react"

import { StateBlock } from "@/components/state-block"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { importCourseQuestions, parseImportRows } from "@/services/course-service"
import type { ImportDelimiterMode, QuestionDifficulty } from "@/types"

const examples = [
  "What is JVM?\tJava Virtual Machine",
  "What is polymorphism? | Same interface, different runtime behavior",
  "What is HashMap?,A key-value data structure backed by hashing",
]

export function CourseImportView() {
  const [topic, setTopic] = useState("Imported Java Full-stack")
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>("BEGINNER")
  const [delimiterMode, setDelimiterMode] = useState<ImportDelimiterMode>("AUTO")
  const [content, setContent] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [importing, setImporting] = useState(false)

  const preview = useMemo(() => parseImportRows(content, delimiterMode), [content, delimiterMode])

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith(".txt") && !file.name.endsWith(".csv")) {
      setError("Only .txt and .csv files are supported in this import flow.")
      return
    }

    setError("")
    setContent(await file.text())
  }

  const handleImport = async () => {
    setError("")
    setMessage("")
    setImporting(true)

    try {
      const result = await importCourseQuestions("java-fullstack-cv-interview-bank", {
        topic,
        difficulty,
        delimiterMode,
        content,
      })
      setMessage(`Imported ${result.importedCount} flashcards. ${result.skippedCount} rows skipped.`)
      setContent("")
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Unable to import flashcards.")
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/courses/java-core">
              <ArrowLeft className="size-4" />
              Java + Full-stack
            </Link>
          </Button>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Import Flashcards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste Quizlet-style rows or upload a .txt/.csv file.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/courses/java-core/flashcards">Study Flashcards</Link>
        </Button>
      </div>

      <section className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-6">
          <div className="border-y border-border py-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileUp className="size-4" />
              Supported rows
            </div>
            <div className="mt-4 divide-y divide-border text-sm text-muted-foreground">
              {examples.map((example) => (
                <code key={example} className="block py-2 font-mono text-xs text-foreground">
                  {example}
                </code>
              ))}
            </div>
          </div>

          <div className="grid gap-4 border-y border-border py-5">
            <label className="text-sm font-medium" htmlFor="topic">
              Topic
            </label>
            <Input id="topic" value={topic} onChange={(event) => setTopic(event.target.value)} />

            <label className="text-sm font-medium" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value as QuestionDifficulty)}
              className="h-9 border border-border bg-background px-2 text-sm"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>

            <label className="text-sm font-medium" htmlFor="delimiter">
              Delimiter
            </label>
            <select
              id="delimiter"
              value={delimiterMode}
              onChange={(event) => setDelimiterMode(event.target.value as ImportDelimiterMode)}
              className="h-9 border border-border bg-background px-2 text-sm"
            >
              <option value="AUTO">Auto</option>
              <option value="TAB">Tab</option>
              <option value="PIPE">Pipe</option>
              <option value="COMMA">Comma</option>
            </select>

            <label className="text-sm font-medium" htmlFor="file">
              File
            </label>
            <Input id="file" type="file" accept=".txt,.csv,text/plain,text/csv" onChange={handleFile} />
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="content">
              Import content
            </label>
            <Textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Paste question and answer rows here..."
              className="min-h-56 resize-y border border-border bg-transparent px-3 py-3"
            />
          </div>

          {message ? <p className="border-y border-border py-3 text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="border-y border-destructive/40 py-3 text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-y border-border py-4">
            <p className="text-sm text-muted-foreground">
              {preview.validRows.length} valid / {preview.invalidRows.length} invalid
            </p>
            <Button disabled={!preview.validRows.length || importing || !topic.trim()} onClick={handleImport}>
              <Upload className="size-4" />
              Import Flashcards
            </Button>
          </div>

          <PreviewTable preview={preview} />
        </div>
      </section>
    </div>
  )
}

function PreviewTable({ preview }: { preview: ReturnType<typeof parseImportRows> }) {
  if (!preview.validRows.length && !preview.invalidRows.length) {
    return <StateBlock title="No rows yet" description="Paste rows or upload a file to preview import results." />
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {preview.validRows.slice(0, 12).map((row) => (
        <div key={`valid-${row.rowNumber}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[70px_1fr_1fr]">
          <span className="text-muted-foreground">#{row.rowNumber}</span>
          <span>{row.question}</span>
          <span className="text-muted-foreground">{row.answer}</span>
        </div>
      ))}
      {preview.invalidRows.slice(0, 8).map((row) => (
        <div key={`invalid-${row.rowNumber}`} className="grid gap-2 py-3 text-sm sm:grid-cols-[70px_1fr_180px]">
          <span className="text-destructive">#{row.rowNumber}</span>
          <span className="text-muted-foreground">{row.raw}</span>
          <span className="text-destructive">{row.reason}</span>
        </div>
      ))}
    </div>
  )
}
