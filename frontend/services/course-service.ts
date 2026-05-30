"use client"

import javaFullstackQuestionBank from "@/data/java_fullstack_cv_interview_bank.json"
import { getAuthToken, makeId } from "@/services/auth-service"
import type {
  Course,
  CourseImportPayload,
  CourseImportResponse,
  CourseProgress,
  CourseSection,
  ImportDelimiterMode,
  ParsedImportPreview,
  PracticeQuestion,
  QuestionDifficulty,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-fullstack-cv-interview-bank"
const IMPORTED_QUESTIONS_KEY = "java-fullstack-imported-questions"
const LOCAL_PROGRESS_KEY = "java-fullstack-progress"

const headers = () => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const canUseApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: headers() })
  if (!response.ok) throw new Error(`API request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export async function listCourses() {
  if (canUseApi()) {
    try {
      return await apiGet<Course[]>("/api/courses")
    } catch {
      return [mockJavaCourse()]
    }
  }
  return [mockJavaCourse()]
}

export async function getCourse(slug = COURSE_SLUG) {
  if (canUseApi()) {
    try {
      return await apiGet<Course>(`/api/courses/${slug}`)
    } catch {
      return mockJavaCourse()
    }
  }
  return mockJavaCourse()
}

export async function importCourseQuestions(slug = COURSE_SLUG, payload: CourseImportPayload) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courses/${slug}/imports`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Import request failed: ${response.status}`)
      return response.json() as Promise<CourseImportResponse>
    } catch {
      return importQuestionsLocally(slug, payload)
    }
  }

  return importQuestionsLocally(slug, payload)
}

export async function getCourseProgress(slug = COURSE_SLUG) {
  if (canUseApi()) {
    try {
      return await apiGet<CourseProgress>(`/api/courses/${slug}/progress`)
    } catch {
      return readMockProgress(slug, mockJavaCourse())
    }
  }
  return readMockProgress(slug, mockJavaCourse())
}

export type AdminCoursePayload = {
  title: string
  slug: string
  description: string
  active: boolean
}

export type AdminSectionPayload = {
  courseId: string
  title: string
  slug: string
  description: string
  sortOrder: number
}

export type AdminQuestionPayload = {
  courseId: string
  sectionId: string
  question: string
  shortAnswer: string
  detailedAnswer: string
  keyPoints: string[]
  commonMistakes: string[]
  difficulty: QuestionDifficulty
  topic: string
  tags: string[]
  codeSnippet?: string | null
  sortOrder: number
}

export async function createAdminCourse(payload: AdminCoursePayload) {
  return apiAdmin<Course>("/api/admin/courses", "POST", payload)
}

export async function updateAdminCourse(courseId: string, payload: AdminCoursePayload) {
  return apiAdmin<Course>(`/api/admin/courses/${courseId}`, "PUT", payload)
}

export async function archiveAdminCourse(courseId: string) {
  return apiAdmin<void>(`/api/admin/courses/${courseId}`, "DELETE")
}

export async function createAdminSection(courseId: string, payload: Omit<AdminSectionPayload, "courseId">) {
  return apiAdmin<CourseSection>(`/api/admin/courses/${courseId}/sections`, "POST", payload)
}

export async function createAdminQuestion(payload: AdminQuestionPayload) {
  return apiAdmin<PracticeQuestion>("/api/admin/questions", "POST", payload)
}

export async function updateAdminQuestion(questionId: string, payload: AdminQuestionPayload) {
  return apiAdmin<PracticeQuestion>(`/api/admin/questions/${questionId}`, "PUT", payload)
}

export async function deleteAdminQuestion(questionId: string) {
  return apiAdmin<void>(`/api/admin/questions/${questionId}`, "DELETE")
}

async function apiAdmin<T>(path: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  if (!canUseApi()) {
    throw new Error("Admin CRUD is ready for the Spring Boot API. Connect an admin JWT to persist changes.")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) throw new Error(`Admin request failed: ${response.status}`)
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function readMockProgress(slug: string, course: Course): CourseProgress {
  const progress = readLocalProgress()
  const questions = course.sections?.flatMap((section) => section.questions) ?? []
  const attempted = questions.filter((question) => progress[question.id]).length
  const mastered = questions.filter((question) => progress[question.id]?.confidence === "MASTERED").length
  const scoreMap: Record<string, number> = { AGAIN: 1, HARD: 2, GOOD: 3, MASTERED: 4 }
  const averageConfidence =
    attempted === 0
      ? 0
      : questions.reduce((total, question) => total + (scoreMap[progress[question.id]?.confidence ?? "AGAIN"] || 0), 0) /
        attempted

  const topics = Object.values(
    questions.reduce<Record<string, { topic: string; total: number; attempted: number; mastered: number }>>(
      (acc, question) => {
        acc[question.topic] ??= { topic: question.topic, total: 0, attempted: 0, mastered: 0 }
        acc[question.topic].total += 1
        if (progress[question.id]) acc[question.topic].attempted += 1
        if (progress[question.id]?.confidence === "MASTERED") acc[question.topic].mastered += 1
        return acc
      },
      {}
    )
  )

  return {
    courseSlug: slug,
    totalQuestions: questions.length,
    attemptedQuestions: attempted,
    masteredQuestions: mastered,
    masteryPercentage: questions.length ? Math.round((mastered / questions.length) * 100) : 0,
    averageConfidence,
    topics,
  }
}

export function readLocalProgress() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_PROGRESS_KEY) ?? "{}") as Record<
      string,
      { confidence: string; answerText?: string }
    >
  } catch {
    return {}
  }
}

export function writeLocalProgress(questionId: string, confidence: string, answerText?: string) {
  const progress = readLocalProgress()
  progress[questionId] = { confidence, answerText }
  window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress))
}

function mockJavaCourse(): Course {
  const bank = javaFullstackQuestionBank as QuestionBankSeed
  const sections: CourseSection[] = bank.sections.map((section, sectionIndex) => ({
    id: makeId(`section-${section.slug}`),
    slug: section.slug,
    title: section.title,
    description: section.description,
    sortOrder: section.sortOrder || sectionIndex + 1,
    questions: section.questions.map((question, questionIndex) => buildSeedQuestion(section, question, questionIndex)),
  }))

  const importedQuestions = readImportedQuestions()
  for (const question of importedQuestions) {
    const sectionSlug = slugify(question.topic)
    let section = sections.find((item) => item.slug === sectionSlug)
    if (!section) {
      section = {
        id: `section-${sectionSlug}`,
        slug: sectionSlug,
        title: question.topic,
        description: `Imported flashcards for ${question.topic}.`,
        sortOrder: sections.length + 1,
        questions: [],
      }
      sections.push(section)
    }
    section.questions.push(question)
  }

  return {
    id: "course-java-fullstack-cv",
    slug: bank.slug,
    title: bank.title,
    description: bank.description,
    active: true,
    questionCount: sections.reduce((total, section) => total + section.questions.length, 0),
    sections,
  }
}

export function parseImportRows(content: string, delimiterMode: ImportDelimiterMode): ParsedImportPreview {
  const validRows: ParsedImportPreview["validRows"] = []
  const invalidRows: ParsedImportPreview["invalidRows"] = []
  let skippedCount = 0

  content
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .forEach((raw, index) => {
      const rowNumber = index + 1
      if (!raw.trim()) {
        skippedCount += 1
        return
      }

      const delimiter = delimiterFor(raw, delimiterMode)
      if (!delimiter) {
        invalidRows.push({ rowNumber, raw, reason: "No supported delimiter found" })
        return
      }

      const delimiterIndex = raw.indexOf(delimiter)
      const question = raw.slice(0, delimiterIndex).trim()
      const answer = raw.slice(delimiterIndex + delimiter.length).trim()

      if (!question || !answer) {
        invalidRows.push({ rowNumber, raw, reason: "Question and answer are required" })
        return
      }

      validRows.push({ rowNumber, question, answer, raw })
    })

  return {
    validRows,
    invalidRows,
    skippedCount: skippedCount + invalidRows.length,
  }
}

function delimiterFor(row: string, delimiterMode: ImportDelimiterMode) {
  if (delimiterMode === "TAB") return row.includes("\t") ? "\t" : null
  if (delimiterMode === "PIPE") return row.includes("|") ? "|" : null
  if (delimiterMode === "COMMA") return row.includes(",") ? "," : null
  if (row.includes("\t")) return "\t"
  if (row.includes("|")) return "|"
  return row.includes(",") ? "," : null
}

function importQuestionsLocally(slug: string, payload: CourseImportPayload): CourseImportResponse {
  const preview = parseImportRows(payload.content, payload.delimiterMode)
  if (!preview.validRows.length) {
    throw new Error("Import content does not contain any valid flashcards")
  }

  const existing = readImportedQuestions()
  const sortOffset = mockJavaCourse().questionCount
  const createdQuestions: PracticeQuestion[] = preview.validRows.map((row, index) => ({
    id: makeId("imported-question"),
    question: row.question,
    shortAnswer: row.answer,
    detailedAnswer: row.answer,
    keyPoints: [row.answer],
    commonMistakes: ["Marking the card as mastered before you can recall the answer."],
    difficulty: payload.difficulty,
    topic: payload.topic.trim(),
    tags: ["imported", "user-flashcard"],
    codeSnippet: null,
    sortOrder: sortOffset + index + 1,
  }))

  writeImportedQuestions([...existing, ...createdQuestions])

  return {
    importedCount: createdQuestions.length,
    skippedCount: preview.skippedCount,
    invalidRows: preview.invalidRows,
    createdQuestions,
  }
}

function readImportedQuestions() {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(IMPORTED_QUESTIONS_KEY) ?? "[]") as PracticeQuestion[]
  } catch {
    return []
  }
}

function writeImportedQuestions(questions: PracticeQuestion[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(IMPORTED_QUESTIONS_KEY, JSON.stringify(questions))
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
  return slug || "imported-flashcards"
}

function buildSeedQuestion(section: QuestionBankSectionSeed, seed: QuestionBankQuestionSeed, index: number): PracticeQuestion {
  return {
    id: `${section.slug}-${index + 1}`,
    question: seed.question,
    shortAnswer: seed.answerGuide,
    detailedAnswer: `${seed.answerGuide} In a strong interview answer, connect this to a CV project, mention tradeoffs, and close with a concrete production example.`,
    keyPoints: seed.keyPoints,
    commonMistakes: [
      "Only giving a memorized definition without a project example.",
      `Skipping tradeoffs, failure modes, or production constraints for ${section.title}.`,
      "Not adjusting depth to the target role and seniority.",
    ],
    difficulty: seed.difficulty,
    topic: section.title,
    tags: seed.tags,
    codeSnippet: seed.codeSnippet?.trim() ? seed.codeSnippet : null,
    sortOrder: index + 1,
  }
}

type QuestionBankSeed = {
  slug: string
  title: string
  description: string
  sections: QuestionBankSectionSeed[]
}

type QuestionBankSectionSeed = {
  slug: string
  title: string
  description: string
  sortOrder: number
  questions: QuestionBankQuestionSeed[]
}

type QuestionBankQuestionSeed = {
  question: string
  difficulty: QuestionDifficulty
  answerGuide: string
  keyPoints: string[]
  tags: string[]
  codeSnippet?: string
}
