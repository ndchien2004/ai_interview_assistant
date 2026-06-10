"use client"

import Link from "next/link"
import { ArrowLeft, CheckCircle2, Circle, Clock3, XCircle } from "lucide-react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { FlashcardStatusFilter, PracticeQuestion, QuestionDifficulty } from "@/types"

type IconType = React.ComponentType<{ className?: string }>

export function SessionTopBar({
  title,
  eyebrow,
  icon: Icon,
  backHref,
  backLabel,
  meta,
  timer,
  progressValue,
  action,
}: {
  title: string
  eyebrow?: string
  icon?: IconType
  backHref: string
  backLabel: string
  meta?: string
  timer?: string | null
  progressValue?: number
  action?: React.ReactNode
}) {
  return (
    <section className="sticky top-16 z-10 -mx-4 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Button variant="ghost" size="sm" asChild className="-ml-2">
              <Link href={backHref}>
                <ArrowLeft className="size-4" />
                {backLabel}
              </Link>
            </Button>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {Icon ? <Icon className="size-4" /> : null}
              {eyebrow}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {meta ? <Pill>{meta}</Pill> : null}
            {timer ? (
              <Pill>
                <Clock3 className="size-3.5" />
                {timer}
              </Pill>
            ) : null}
            {action}
          </div>
        </div>
        {typeof progressValue === "number" ? <Progress value={progressValue} /> : null}
      </div>
    </section>
  )
}

export function Panel({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card p-4 shadow-sm", className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function MetricStrip({
  items,
  className,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" }>
  className?: string
}) {
  return (
    <section className={cn("grid gap-3 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p
            className={cn(
              "mt-1 break-words text-2xl font-semibold tracking-tight",
              item.tone === "good" && "text-emerald-600 dark:text-emerald-400",
              item.tone === "warn" && "text-amber-600 dark:text-amber-400",
              item.tone === "bad" && "text-red-600 dark:text-red-400"
            )}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  )
}

export function FilterChip({
  selected,
  children,
  onClick,
  disabled,
}: {
  selected?: boolean
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:bg-muted"
      )}
    >
      {selected ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5 text-muted-foreground" />}
      {children}
    </button>
  )
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="grid rounded-md border border-border bg-muted/40 p-1 sm:inline-grid sm:auto-cols-fr sm:grid-flow-col">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "min-h-9 rounded-sm px-3 text-sm font-medium transition-colors",
            value === option.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function QuestionMeta({ question }: { question: PracticeQuestion }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill>{question.topic}</Pill>
      <Pill>{difficultyLabel(question.difficulty)}</Pill>
      {question.tags.slice(0, 3).map((tag) => (
        <Pill key={tag}>{tag}</Pill>
      ))}
    </div>
  )
}

export function QuestionBlock({ question }: { question: PracticeQuestion }) {
  return (
    <section className="space-y-5 rounded-md border border-border bg-card p-5 shadow-sm">
      <QuestionMeta question={question} />
      <h2 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{question.question}</h2>
      {question.codeSnippet ? (
        <pre className="max-h-[360px] overflow-auto rounded-md border border-border bg-muted/40 p-4 text-sm leading-6">
          <code>{question.codeSnippet}</code>
        </pre>
      ) : null}
    </section>
  )
}

export function AnswerOption({
  label,
  selected,
  correct,
  incorrect,
  disabled,
  children,
  onClick,
}: {
  label: string
  selected?: boolean
  correct?: boolean
  incorrect?: boolean
  disabled?: boolean
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid min-h-16 grid-cols-[36px_1fr] items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-left text-sm shadow-sm transition-colors hover:bg-muted disabled:cursor-default",
        selected && "border-primary bg-muted",
        correct && "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200",
        incorrect && "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200"
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-full border border-current text-xs font-semibold">
        {label}
      </span>
      <span className="min-w-0 leading-6">{children}</span>
    </button>
  )
}

export function FeedbackPanel({
  correct,
  answer,
  explanation,
  children,
}: {
  correct: boolean
  answer: string
  explanation: string
  children: React.ReactNode
}) {
  return (
    <section
      className={cn(
        "rounded-md border p-4 shadow-sm",
        correct
          ? "border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/30"
          : "border-red-200 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30"
      )}
    >
      <div className={cn("flex items-center gap-2 text-sm font-semibold", correct ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300")}>
        {correct ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" />}
        {correct ? "Chính xác" : "Chưa đúng"}
      </div>
      <p className="mt-3 text-sm font-medium">Đáp án đúng: {answer}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{explanation}</p>
      <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

export function optionLabel(index: number) {
  return ["A", "B", "C", "D"][index] ?? "?"
}

export function difficultyLabel(value: QuestionDifficulty | string) {
  if (value === "BEGINNER") return "Cơ bản"
  if (value === "INTERMEDIATE") return "Trung bình"
  return "Nâng cao"
}

export function statusLabel(value: FlashcardStatusFilter) {
  if (value === "UNSEEN") return "Chưa học"
  if (value === "LEARNING") return "Đang học"
  if (value === "MASTERED") return "Đã thuộc"
  return "Tất cả"
}

export function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}
