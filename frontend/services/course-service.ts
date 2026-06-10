"use client"

import javaFullstackQuestionBank from "@/data/java_fullstack_flashcard_bank.json"
import { getAuthToken, makeId } from "@/services/auth-service"
import type {
  Course,
  CourseImportPayload,
  CourseImportResponse,
  CourseProgress,
  CourseSection,
  FlashcardStudyFilters,
  ImportDelimiterMode,
  ParsedImportPreview,
  PracticeQuestion,
  QuestionProgress,
  QuestionDifficulty,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-fullstack-flashcard-bank"
const IMPORTED_QUESTIONS_KEY = "java-fullstack-imported-questions"
const LOCAL_PROGRESS_KEY = "java-fullstack-progress"
export const COURSE_PROGRESS_CHANGE_EVENT = "freecard-course-progress-change"

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

export async function listCourseQuestions(slug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  if (canUseApi()) {
    try {
      const params = new URLSearchParams()
      const deckSlugs = [...(filters.deckSlugs ?? []), filters.deckSlug].filter(Boolean) as string[]
      const topics = [...(filters.topics ?? []), filters.topic].filter(Boolean) as string[]
      const difficulties = [...(filters.difficulties ?? []), filters.difficulty].filter(Boolean) as QuestionDifficulty[]
      if (deckSlugs.length === 1) params.set("deckSlug", deckSlugs[0])
      if (topics.length === 1) params.set("topic", topics[0])
      if (difficulties.length === 1) params.set("difficulty", difficulties[0])
      if (filters.status && filters.status !== "ALL") params.set("status", filters.status)
      if (typeof filters.due === "boolean") params.set("due", String(filters.due))
      if ((filters.query ?? filters.q)?.trim()) params.set("q", (filters.query ?? filters.q)!.trim())
      const query = params.toString()
      const questions = await apiGet<PracticeQuestion[]>(`/api/courses/${slug}/questions${query ? `?${query}` : ""}`)
      if (deckSlugs.length > 1 || topics.length > 1 || difficulties.length > 1) {
        const course = await getCourse(slug)
        return filterLocalQuestions({ ...course, sections: course.sections?.map((section) => ({
          ...section,
          questions: section.questions.filter((question) => questions.some((item) => item.id === question.id)),
        })) }, filters)
      }
      return questions
    } catch {
      return filterLocalQuestions(mockJavaCourse(), filters)
    }
  }

  return filterLocalQuestions(mockJavaCourse(), filters)
}

export async function createCourse(payload: AdminCoursePayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Không thể tạo học phần: ${response.status}`)
    return response.json() as Promise<Course>
  }

  return {
    id: makeId("course"),
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    active: payload.active,
    questionCount: 0,
    sections: [],
  } satisfies Course
}

export async function updateCourse(slug: string, payload: AdminCoursePayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${slug}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`KhĂ´ng thá»ƒ sá»­a há»c pháº§n: ${response.status}`)
    return response.json() as Promise<Course>
  }

  return {
    id: makeId("course"),
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    active: payload.active,
    questionCount: 0,
    sections: [],
  } satisfies Course
}

export async function deleteCourse(slug: string) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${slug}`, {
      method: "DELETE",
      headers: headers(),
    })
    if (!response.ok) throw new Error(`KhĂ´ng thá»ƒ xĂ³a há»c pháº§n: ${response.status}`)
  }
}

export async function getQuestionProgress(slug = COURSE_SLUG) {
  if (canUseApi()) {
    try {
      return await apiGet<QuestionProgress[]>(`/api/courses/${slug}/progress/questions`)
    } catch {
      return Object.entries(readLocalProgress()).map(([questionId, progress]) => ({ questionId, ...progress }))
    }
  }

  return Object.entries(readLocalProgress()).map(([questionId, progress]) => ({ questionId, ...progress }))
}

export type AdminCoursePayload = {
  title: string
  slug: string
  description: string
  active: boolean
}

export type DeckJsonImportPayload = {
  title?: string
  description?: string
  sections: Array<{
    title: string
    slug?: string
    description?: string
    sortOrder?: number
    questions: Array<{
      question: string
      options: string[]
      correctAnswer: "A" | "B" | "C" | "D"
      explanation: string
      difficulty?: QuestionDifficulty
      tags?: string[]
      codeSnippet?: string
    }>
  }>
}

export async function createDeck(payload: AdminCoursePayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/decks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Không thể tạo bộ thẻ: ${response.status}`)
    return response.json() as Promise<Course>
  }

  return {
    id: makeId("deck"),
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    active: payload.active,
    questionCount: 0,
    sections: [],
  } satisfies Course
}

export type CourseDeckPayload = {
  title: string
  slug: string
  description: string
  sortOrder?: number
}

export type DeckQuestionUpdatePayload = {
  question: string
  options: string[]
  correctOptionIndex: number
  explanation: string
}

export async function createCourseDeck(courseSlug: string, payload: CourseDeckPayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseSlug}/decks`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ ...payload, sortOrder: payload.sortOrder ?? 0 }),
    })
    if (!response.ok) throw new Error(`Không thể tạo bộ thẻ: ${response.status}`)
    return response.json() as Promise<CourseSection>
  }

  return {
    id: makeId("section"),
    slug: payload.slug,
    title: payload.title,
    description: payload.description,
    sortOrder: payload.sortOrder ?? 0,
    questions: [],
  } satisfies CourseSection
}

export async function updateCourseDeck(courseSlug: string, deckSlug: string, payload: CourseDeckPayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseSlug}/decks/${deckSlug}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ ...payload, sortOrder: payload.sortOrder ?? 0 }),
    })
    if (!response.ok) throw new Error(`KhĂ´ng thá»ƒ sá»­a bá»™ tháº»: ${response.status}`)
    return response.json() as Promise<CourseSection>
  }

  return {
    id: makeId("section"),
    slug: payload.slug,
    title: payload.title,
    description: payload.description,
    sortOrder: payload.sortOrder ?? 0,
    questions: [],
  } satisfies CourseSection
}

export async function deleteCourseDeck(courseSlug: string, deckSlug: string) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseSlug}/decks/${deckSlug}`, {
      method: "DELETE",
      headers: headers(),
    })
    if (!response.ok) throw new Error(`KhĂ´ng thá»ƒ xĂ³a bá»™ tháº»: ${response.status}`)
  }
}

export async function updateCourseDeckQuestion(
  courseSlug: string,
  deckSlug: string,
  questionId: string,
  payload: DeckQuestionUpdatePayload
) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseSlug}/decks/${deckSlug}/questions/${questionId}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`KhĂ´ng thá»ƒ sá»­a cĂ¢u há»i: ${response.status}`)
    return response.json() as Promise<PracticeQuestion>
  }

  const existing = getLocalCourseDeck(deckSlug).questions.find((question) => question.id === questionId)
  if (!existing) throw new Error("KhĂ´ng tĂ¬m tháº¥y cĂ¢u há»i.")
  return {
    ...existing,
    question: payload.question,
    options: payload.options,
    correctOptionIndex: payload.correctOptionIndex,
    shortAnswer: payload.options[payload.correctOptionIndex],
    detailedAnswer: payload.explanation,
    explanation: payload.explanation,
    keyPoints: [payload.options[payload.correctOptionIndex]],
  } satisfies PracticeQuestion
}

export async function getCourseDeck(courseSlug: string, deckSlug: string) {
  if (canUseApi()) {
    try {
      return await apiGet<CourseSection>(`/api/courses/${courseSlug}/decks/${deckSlug}`)
    } catch {
      return getLocalCourseDeck(deckSlug)
    }
  }

  return getLocalCourseDeck(deckSlug)
}

export async function importDeckJson(slug: string, payload: DeckJsonImportPayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/decks/${slug}/imports/json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Không thể import JSON: ${response.status}`)
    return response.json() as Promise<CourseImportResponse>
  }

  return importDeckJsonLocally(slug, payload)
}

export async function importCourseDeckJson(courseSlug: string, deckSlug: string, payload: DeckJsonImportPayload) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/courses/${courseSlug}/decks/${deckSlug}/imports/json`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`Không thể import JSON: ${response.status}`)
    return response.json() as Promise<CourseImportResponse>
  }

  return importDeckJsonLocally(deckSlug, {
    ...payload,
    sections: [
      {
        title: getLocalCourseDeck(deckSlug).title,
        questions: payload.sections.flatMap((section) => section.questions),
      },
    ],
  })
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
  options: string[]
  correctOptionIndex: number
  explanation: string
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
  const now = new Date()
  const questions = course.sections?.flatMap((section) => section.questions) ?? []
  const attempted = questions.filter((question) => hasStartedProgress(progress[question.id])).length
  const mastered = questions.filter((question) => isMasteredProgress(progress[question.id])).length
  const correctAnswers = questions.reduce((total, question) => total + (progress[question.id]?.correctCount ?? 0), 0)
  const incorrectAnswers = questions.reduce((total, question) => total + (progress[question.id]?.incorrectCount ?? 0), 0)
  const due = questions.filter((question) => {
    const item = progress[question.id]
    return item ? new Date(item.nextReviewAt) <= now : false
  }).length
  const learning = questions.filter((question) => isLearningProgress(progress[question.id])).length
  const lastStudyAt = Object.values(progress)
    .map((item) => item.lastAttemptAt)
    .sort()
    .at(-1) ?? null
  const scoreMap: Record<string, number> = { AGAIN: 1, HARD: 2, GOOD: 3, MASTERED: 4 }
  const averageConfidence =
    attempted === 0
      ? 0
      : questions.reduce((total, question) => total + (scoreMap[progress[question.id]?.confidence ?? "AGAIN"] || 0), 0) /
        attempted

  const topics = Object.values(
    questions.reduce<Record<string, { topic: string; total: number; attempted: number; mastered: number; correct: number; incorrect: number }>>(
      (acc, question) => {
        acc[question.topic] ??= { topic: question.topic, total: 0, attempted: 0, mastered: 0, correct: 0, incorrect: 0 }
        acc[question.topic].total += 1
        if (hasStartedProgress(progress[question.id])) acc[question.topic].attempted += 1
        if (isMasteredProgress(progress[question.id])) acc[question.topic].mastered += 1
        acc[question.topic].correct += progress[question.id]?.correctCount ?? 0
        acc[question.topic].incorrect += progress[question.id]?.incorrectCount ?? 0
        return acc
      },
      {}
    )
  ).map((topic) => ({
    ...topic,
    due: questions.filter((question) => {
      const item = progress[question.id]
      return question.topic === topic.topic && item ? new Date(item.nextReviewAt) <= now : false
    }).length,
    learning: questions.filter((question) => question.topic === topic.topic && isLearningProgress(progress[question.id]))
      .length,
    masteryPercentage: topic.total ? Math.round((topic.mastered / topic.total) * 100) : 0,
  }))

  return {
    courseSlug: slug,
    totalQuestions: questions.length,
    attemptedQuestions: attempted,
    masteredQuestions: mastered,
    correctAnswers,
    incorrectAnswers,
    dueQuestions: due,
    learningQuestions: learning,
    streakDays: calculateLocalStreak(progress),
    lastStudyAt,
    accuracyPercentage: correctAnswers + incorrectAnswers ? Math.round((correctAnswers / (correctAnswers + incorrectAnswers)) * 100) : 0,
    masteryPercentage: questions.length ? Math.round((mastered / questions.length) * 100) : 0,
    averageConfidence,
    topics,
  }
}

export function readLocalProgress() {
  if (typeof window === "undefined") return {}
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_PROGRESS_KEY) ?? "{}") as Record<
      string,
      Partial<Omit<QuestionProgress, "questionId">>
    >
    const normalized = Object.fromEntries(
      Object.entries(raw).map(([questionId, item]) => {
        const confidence = (item.confidence ?? "AGAIN") as QuestionProgress["confidence"]
        const lastAttemptAt = item.lastAttemptAt ?? new Date().toISOString()
        const nextReviewAt = item.nextReviewAt ?? nextLocalReviewAt(new Date(lastAttemptAt), confidence)
        return [
          questionId,
          {
            confidence,
            answerText: item.answerText,
            attemptCount: item.attemptCount ?? 1,
            correctCount: item.correctCount ?? 0,
            incorrectCount: item.incorrectCount ?? 0,
            correctStreak: item.correctStreak ?? 0,
            mastered: item.mastered ?? (confidence === "MASTERED" || (item.correctStreak ?? 0) >= 3),
            lastAttemptAt,
            nextReviewAt,
            due: new Date(nextReviewAt) <= new Date(),
          },
        ]
      })
    )
    return normalized as Record<string, Omit<QuestionProgress, "questionId">>
  } catch {
    return {}
  }
}

export function writeLocalProgress(questionId: string, confidence: string, answerText?: string) {
  const progress = readLocalProgress()
  const now = new Date()
  const nextReviewAt = nextLocalReviewAt(now, confidence)
  progress[questionId] = {
    confidence: confidence as QuestionProgress["confidence"],
    answerText,
    attemptCount: (progress[questionId]?.attemptCount ?? 0) + 1,
    correctCount: progress[questionId]?.correctCount ?? 0,
    incorrectCount: progress[questionId]?.incorrectCount ?? 0,
    correctStreak: progress[questionId]?.correctStreak ?? 0,
    mastered: confidence === "MASTERED",
    lastAttemptAt: now.toISOString(),
    nextReviewAt,
    due: new Date(nextReviewAt) <= new Date(),
  }
  window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress))
  notifyCourseProgressChanged(COURSE_SLUG)
}

export function writeLocalChoiceProgress(question: PracticeQuestion, selectedOptionIndex: number) {
  const progress = readLocalProgress()
  const previous = progress[question.id]
  const correct = selectedOptionIndex === question.correctOptionIndex
  const correctStreak = correct ? (previous?.correctStreak ?? 0) + 1 : 0
  const confidence: QuestionProgress["confidence"] = correct ? (correctStreak >= 3 ? "MASTERED" : "GOOD") : "AGAIN"
  const now = new Date()
  const nextReviewAt = nextLocalReviewAt(now, confidence)

  progress[question.id] = {
    confidence,
    attemptCount: (previous?.attemptCount ?? 0) + 1,
    correctCount: (previous?.correctCount ?? 0) + (correct ? 1 : 0),
    incorrectCount: (previous?.incorrectCount ?? 0) + (correct ? 0 : 1),
    correctStreak,
    mastered: confidence === "MASTERED" || correctStreak >= 3,
    lastAttemptAt: now.toISOString(),
    nextReviewAt,
    due: new Date(nextReviewAt) <= new Date(),
  }
  window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress))
  notifyCourseProgressChanged(COURSE_SLUG)
  return { questionId: question.id, ...progress[question.id], selectedOptionIndex, correct }
}

export function writeLocalMatchProgress(questionIds: string[]) {
  const progress = readLocalProgress()
  const now = new Date()
  for (const questionId of questionIds) {
    const previous = progress[questionId]
    const correctStreak = (previous?.correctStreak ?? 0) + 1
    const alreadyMastered = isMasteredProgress(previous)
    const confidence: QuestionProgress["confidence"] = alreadyMastered ? "MASTERED" : "GOOD"
    progress[questionId] = {
      confidence,
      attemptCount: (previous?.attemptCount ?? 0) + 1,
      correctCount: (previous?.correctCount ?? 0) + 1,
      incorrectCount: previous?.incorrectCount ?? 0,
      correctStreak,
      mastered: alreadyMastered || correctStreak >= 3,
      lastAttemptAt: now.toISOString(),
      nextReviewAt: nextLocalReviewAt(now, confidence),
      due: false,
    }
  }
  window.localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress))
  notifyCourseProgressChanged(COURSE_SLUG)
}

export function notifyCourseProgressChanged(courseSlug = COURSE_SLUG) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(COURSE_PROGRESS_CHANGE_EVENT, { detail: { courseSlug } }))
}

function filterLocalQuestions(course: Course, filters: FlashcardStudyFilters) {
  const progress = readLocalProgress()
  const now = new Date()
  const query = (filters.query ?? filters.q)?.trim().toLowerCase()
  const deckSlugs = new Set([...(filters.deckSlugs ?? []), filters.deckSlug].filter(Boolean) as string[])
  const topics = new Set([...(filters.topics ?? []), filters.topic].filter(Boolean) as string[])
  const difficulties = new Set([...(filters.difficulties ?? []), filters.difficulty].filter(Boolean) as QuestionDifficulty[])

  return (course.sections?.flatMap((section) => section.questions) ?? []).filter((question) => {
    if (deckSlugs.size) {
      const deckQuestions = course.sections
        ?.filter((item) => deckSlugs.has(item.slug))
        .flatMap((item) => item.questions)
      if (!deckQuestions?.some((item) => item.id === question.id)) return false
    }
    const item = progress[question.id]
    if (topics.size && !topics.has(question.topic)) return false
    if (difficulties.size && !difficulties.has(question.difficulty)) return false
    if (filters.status === "UNSEEN" && hasStartedProgress(item)) return false
    if (filters.status === "LEARNING" && !isLearningProgress(item)) return false
    if (filters.status === "MASTERED" && !isMasteredProgress(item)) return false
    if (typeof filters.due === "boolean") {
      const isDue = item ? new Date(item.nextReviewAt) <= now : false
      if (filters.due !== isDue) return false
    }
    if (query) {
      const haystack = [question.question, question.shortAnswer, question.topic, question.tags.join(" ")]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

function getLocalCourseDeck(deckSlug: string) {
  const course = mockJavaCourse()
  const section = course.sections?.find((item) => item.slug === deckSlug)
  if (!section) throw new Error("Không tìm thấy bộ thẻ.")
  return section
}

function hasStartedProgress(progress?: Omit<QuestionProgress, "questionId">) {
  return Boolean(progress && (progress.attemptCount ?? 0) > 0)
}

function isMasteredProgress(progress?: Omit<QuestionProgress, "questionId">) {
  return Boolean(progress && hasStartedProgress(progress) && (progress.mastered || (progress.correctStreak ?? 0) >= 3))
}

function isLearningProgress(progress?: Omit<QuestionProgress, "questionId">) {
  return Boolean(progress && hasStartedProgress(progress) && !isMasteredProgress(progress))
}

function nextLocalReviewAt(now: Date, confidence: string) {
  const next = new Date(now)
  if (confidence === "AGAIN") next.setMinutes(next.getMinutes() + 10)
  else if (confidence === "HARD") next.setDate(next.getDate() + 1)
  else if (confidence === "GOOD") next.setDate(next.getDate() + 3)
  else next.setDate(next.getDate() + 14)
  return next.toISOString()
}

function calculateLocalStreak(progress: Record<string, Omit<QuestionProgress, "questionId">>) {
  const dates = new Set(
    Object.values(progress)
      .map((item) => item.lastAttemptAt?.slice(0, 10))
      .filter(Boolean)
  )
  const latest = Array.from(dates).sort().at(-1)
  if (!latest) return 0

  const cursor = new Date(`${latest}T00:00:00.000Z`)
  let streak = 0
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
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
    id: "course-java-fullstack-flashcard",
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
    options: [row.answer, "Chưa chính xác", "Không liên quan", "Thiếu dữ kiện"],
    correctOptionIndex: 0,
    explanation: row.answer,
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

function importDeckJsonLocally(slug: string, payload: DeckJsonImportPayload): CourseImportResponse {
  const existing = readImportedQuestions()
  const createdQuestions: PracticeQuestion[] = []
  const invalidRows: CourseImportResponse["invalidRows"] = []
  let sortOrder = mockJavaCourse().questionCount + 1

  payload.sections.forEach((section, sectionIndex) => {
    section.questions.forEach((question, questionIndex) => {
      const rowNumber = sectionIndex * 1000 + questionIndex + 1
      const correctOptionIndex = answerLetterToIndex(question.correctAnswer)
      if (!question.question?.trim() || question.options.length !== 4 || correctOptionIndex < 0) {
        invalidRows.push({ rowNumber, raw: question.question || "", reason: "Câu hỏi phải có 4 đáp án và đáp án đúng A/B/C/D" })
        return
      }
      createdQuestions.push({
        id: makeId("imported-question"),
        question: question.question.trim(),
        shortAnswer: question.options[correctOptionIndex],
        detailedAnswer: question.explanation || question.options[correctOptionIndex],
        keyPoints: [question.options[correctOptionIndex]],
        commonMistakes: ["Đọc câu hỏi quá nhanh."],
        options: question.options.map((option) => option.trim()),
        correctOptionIndex,
        explanation: question.explanation || question.options[correctOptionIndex],
        difficulty: question.difficulty ?? "BEGINNER",
        topic: section.title.trim(),
        tags: question.tags ?? ["imported"],
        codeSnippet: question.codeSnippet || null,
        sortOrder: sortOrder++,
      })
    })
  })

  if (!createdQuestions.length) throw new Error("File JSON không có câu hỏi hợp lệ")
  writeImportedQuestions([...existing, ...createdQuestions])
  return {
    importedCount: createdQuestions.length,
    skippedCount: invalidRows.length,
    invalidRows,
    createdQuestions,
  }
}

function answerLetterToIndex(value: string) {
  return { A: 0, B: 1, C: 2, D: 3 }[value?.trim().toUpperCase() as "A" | "B" | "C" | "D"] ?? -1
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
    shortAnswer: seed.options[answerLetterToIndex(seed.correctAnswer)],
    detailedAnswer: seed.explanation,
    keyPoints: [seed.options[answerLetterToIndex(seed.correctAnswer)]],
    commonMistakes: ["Đọc câu hỏi quá nhanh.", "Chọn đáp án quen mắt mà chưa xem giải thích."],
    options: seed.options,
    correctOptionIndex: answerLetterToIndex(seed.correctAnswer),
    explanation: seed.explanation,
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
  options: string[]
  correctAnswer: "A" | "B" | "C" | "D"
  explanation: string
  tags: string[]
  codeSnippet?: string
}
