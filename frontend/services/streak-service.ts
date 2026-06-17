"use client"

import { readLocalProgress } from "@/services/course-service"
import { listPracticeSessions } from "@/services/practice-service"

export type StudyDay = {
  dateKey: string
  count: number
}

export type RecentStudyDay = StudyDay & {
  date: Date
  label: string
  active: boolean
  isToday: boolean
}

export type StudyStreakSummary = {
  current: number
  longest: number
  studiedToday: boolean
  lastStudyAt: string | null
  studyDays: StudyDay[]
  recentDays: RecentStudyDay[]
}

export const EMPTY_STREAK_SUMMARY: StudyStreakSummary = {
  current: 0,
  longest: 0,
  studiedToday: false,
  lastStudyAt: null,
  studyDays: [],
  recentDays: buildRecentDays([]),
}

export async function loadStudyStreakSummary(): Promise<StudyStreakSummary> {
  if (typeof window === "undefined") return EMPTY_STREAK_SUMMARY

  const counts = new Map<string, number>()
  const timestamps: string[] = []

  Object.values(readLocalProgress()).forEach((progress) => {
    if (progress.lastAttemptAt) {
      addDate(counts, progress.lastAttemptAt)
      timestamps.push(progress.lastAttemptAt)
    }
  })

  const sessions = await listPracticeSessions()
  sessions.forEach((session) => {
    const sessionDate = session.completedAt ?? session.createdAt
    addDate(counts, sessionDate)
    if (sessionDate) timestamps.push(sessionDate)
    session.attempts.forEach((attempt) => {
      addDate(counts, attempt.createdAt)
      timestamps.push(attempt.createdAt)
    })
  })

  const studyDays = Array.from(counts.entries())
    .map(([dateKey, count]) => ({ dateKey, count }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const streakStats = calculateStreakStats(studyDays)
  const todayKey = toDateKey(new Date())

  return {
    current: streakStats.current,
    longest: streakStats.longest,
    studiedToday: counts.has(todayKey),
    lastStudyAt: timestamps.sort().at(-1) ?? null,
    studyDays,
    recentDays: buildRecentDays(studyDays),
  }
}

export function calculateStreakStats(days: StudyDay[]) {
  const daySet = new Set(days.map((day) => day.dateKey))
  const sorted = Array.from(daySet).sort()
  let longest = 0
  let run = 0
  let previous: Date | null = null

  for (const dateKey of sorted) {
    const current = parseDateKey(dateKey)
    if (previous && daysBetween(previous, current) === 1) run += 1
    else run = 1
    longest = Math.max(longest, run)
    previous = current
  }

  const today = startOfDay(new Date())
  const yesterday = addDays(today, -1)
  let cursor = daySet.has(toDateKey(today)) ? today : daySet.has(toDateKey(yesterday)) ? yesterday : null
  let current = 0
  while (cursor && daySet.has(toDateKey(cursor))) {
    current += 1
    cursor = addDays(cursor, -1)
  }

  return { current, longest }
}

export function buildCalendarMonth(month: Date) {
  const first = startOfMonth(month)
  const startOffset = (first.getDay() + 6) % 7
  const start = addDays(first, -startOffset)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((startOffset + daysInMonth) / 7) * 7

  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(start, index)
    return {
      date,
      dateKey: toDateKey(date),
      inCurrentMonth: date.getMonth() === month.getMonth(),
    }
  })
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function buildRecentDays(studyDays: StudyDay[]) {
  const counts = new Map(studyDays.map((day) => [day.dateKey, day.count]))
  const today = startOfDay(new Date())

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index - 6)
    const dateKey = toDateKey(date)
    const count = counts.get(dateKey) ?? 0
    return {
      date,
      dateKey,
      count,
      label: new Intl.DateTimeFormat("vi-VN", { weekday: "short" }).format(date),
      active: count > 0,
      isToday: dateKey === toDateKey(today),
    }
  })
}

function addDate(counts: Map<string, number>, value?: string | null) {
  if (!value) return
  const dateKey = toDateKey(new Date(value))
  counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1)
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000)
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}
