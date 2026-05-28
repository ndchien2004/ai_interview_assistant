"use client"

import { getAuthToken, makeId } from "@/services/auth-service"
import { getCourse, readLocalProgress, writeLocalProgress } from "@/services/course-service"
import type {
  FlashcardStudyFilters,
  PracticeConfidence,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionMode,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-core-interview-mastery"

const headers = () => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const canUseApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

export async function createPracticeSession(courseSlug = COURSE_SLUG) {
  return createSession(courseSlug, "INTERVIEW")
}

export async function createFlashcardSession(courseSlug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  return createSession(courseSlug, "FLASHCARD", filters)
}

async function createSession(courseSlug: string, mode: PracticeSessionMode, filters: FlashcardStudyFilters = {}) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ courseSlug, mode, ...filters }),
      })
      if (!response.ok) throw new Error("Unable to start practice session.")
      return response.json() as Promise<PracticeSession>
    } catch {
      return createLocalPracticeSession(courseSlug, mode, filters)
    }
  }

  return createLocalPracticeSession(courseSlug, mode, filters)
}

async function createLocalPracticeSession(courseSlug: string, mode: PracticeSessionMode, filters: FlashcardStudyFilters = {}) {
  const course = await getCourse(courseSlug)
  const questions = filterQuestions(course.sections?.flatMap((section) => section.questions) ?? [], filters)
  const nextQuestion =
    mode === "FLASHCARD" ? selectNextLocalFlashcardQuestion(questions) : selectNextLocalQuestion(questions)
  const session = {
    id: makeId("practice"),
    courseSlug,
    mode,
    filters,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    createdAt: new Date().toISOString(),
    nextQuestion,
    attempts: [],
  } satisfies PracticeSession

  writeLocalSession(session)
  return session
}

export async function getPracticeSession(sessionId: string) {
  if (canUseApi()) {
    const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${sessionId}`, {
      headers: headers(),
    })
    if (!response.ok) throw new Error("Unable to load practice session.")
    return response.json() as Promise<PracticeSession>
  }

  const sessions = readLocalSessions()
  const session = sessions.find((item) => item.id === sessionId)
  if (!session) throw new Error("Practice session was not found.")
  return session
}

export async function submitPracticeAttempt(
  session: PracticeSession,
  questionId: string,
  answerText: string,
  confidence: PracticeConfidence
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${session.id}/attempts`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ questionId, answerText, confidence }),
      })
      if (!response.ok) throw new Error("Unable to submit practice attempt.")
      return response.json() as Promise<PracticeSession>
    } catch {
      return submitLocalPracticeAttempt(session, questionId, answerText, confidence)
    }
  }

  return submitLocalPracticeAttempt(session, questionId, answerText, confidence)
}

export async function submitFlashcardResult(
  session: PracticeSession,
  questionId: string,
  remembered: boolean
) {
  return submitPracticeAttempt(session, questionId, "", remembered ? "MASTERED" : "AGAIN")
}

async function submitLocalPracticeAttempt(
  session: PracticeSession,
  questionId: string,
  answerText: string,
  confidence: PracticeConfidence
) {
  writeLocalProgress(questionId, confidence, answerText)
  const course = await getCourse(session.courseSlug)
  const questions = filterQuestions(course.sections?.flatMap((section) => section.questions) ?? [], session.filters ?? {})
  const nextQuestion =
    session.mode === "FLASHCARD"
      ? selectNextLocalFlashcardQuestion(questions, questionId)
      : selectNextLocalQuestion(questions, questionId)
  const nextSession = {
    ...session,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    completedAt: nextQuestion ? null : new Date().toISOString(),
    nextQuestion,
    attempts: [
      ...session.attempts,
      {
        id: makeId("attempt"),
        questionId,
        answerText,
        confidence,
        createdAt: new Date().toISOString(),
      },
    ],
  } satisfies PracticeSession

  writeLocalSession(nextSession)
  return nextSession
}

function filterQuestions(questions: PracticeQuestion[], filters: FlashcardStudyFilters) {
  const progress = readLocalProgress()
  return questions.filter((question) => {
    if (filters.topic && question.topic !== filters.topic) return false
    if (filters.difficulty && question.difficulty !== filters.difficulty) return false

    const confidence = progress[question.id]?.confidence
    if (filters.status === "UNSEEN") return !confidence
    if (filters.status === "LEARNING") return Boolean(confidence && confidence !== "MASTERED")
    if (filters.status === "MASTERED") return confidence === "MASTERED"
    return true
  })
}

function selectNextLocalQuestion(questions: PracticeQuestion[], excludeQuestionId?: string) {
  const progress = readLocalProgress()
  return (
    questions.find((question) => question.id !== excludeQuestionId && !progress[question.id]) ??
    questions.find((question) => question.id !== excludeQuestionId && progress[question.id]?.confidence !== "MASTERED") ??
    null
  )
}

function selectNextLocalFlashcardQuestion(questions: PracticeQuestion[], excludeQuestionId?: string) {
  const progress = readLocalProgress()
  const hasMasteredOnlyDeck = questions.length > 0 && questions.every((question) => progress[question.id]?.confidence === "MASTERED")

  if (hasMasteredOnlyDeck) {
    return (
      questions.find((question) => question.id !== excludeQuestionId) ??
      questions[0] ??
      null
    )
  }

  return (
    questions.find((question) => question.id !== excludeQuestionId && !progress[question.id]) ??
    questions.find(
      (question) =>
        question.id !== excludeQuestionId && progress[question.id]?.confidence !== "MASTERED"
    ) ??
    questions.find((question) => progress[question.id]?.confidence !== "MASTERED") ??
    null
  )
}

function readLocalSessions() {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem("java-core-sessions") ?? "[]") as PracticeSession[]
  } catch {
    return []
  }
}

function writeLocalSession(session: PracticeSession) {
  if (typeof window === "undefined") return
  const sessions = readLocalSessions()
  const nextSessions = [session, ...sessions.filter((item) => item.id !== session.id)].slice(0, 20)
  window.localStorage.setItem("java-core-sessions", JSON.stringify(nextSessions))
}
