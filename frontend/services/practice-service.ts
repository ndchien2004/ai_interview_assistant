"use client"

import { getAuthToken, makeId } from "@/services/auth-service"
import { getCourse, readLocalProgress, writeLocalChoiceProgress, writeLocalMatchProgress, writeLocalProgress } from "@/services/course-service"
import type {
  FlashcardStudyFilters,
  PracticeConfidence,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionMode,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-fullstack-cv-interview-bank"
const LOCAL_SESSIONS_KEY = "java-fullstack-sessions"

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

export async function createLearnSession(courseSlug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  return createSession(courseSlug, "LEARN", filters)
}

export async function createTestSession(courseSlug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  return createSession(courseSlug, "TEST", filters)
}

export async function createReviewDueSession(courseSlug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  return createSession(courseSlug, "REVIEW_DUE", { ...filters, due: true })
}

export async function createMatchSession(courseSlug = COURSE_SLUG, filters: FlashcardStudyFilters = {}) {
  return createSession(courseSlug, "MATCH", filters)
}

async function createSession(courseSlug: string, mode: PracticeSessionMode, filters: FlashcardStudyFilters = {}) {
  const normalizedFilters = mode === "REVIEW_DUE" ? { ...filters, due: true } : filters
  const requestFilters = {
    topic: normalizedFilters.topic,
    deckSlug: normalizedFilters.deckSlug,
    difficulty: normalizedFilters.difficulty,
    status: normalizedFilters.status,
  }

  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ courseSlug, mode, ...requestFilters }),
      })
      if (!response.ok) throw new Error("Unable to start practice session.")
      return response.json() as Promise<PracticeSession>
    } catch {
      return createLocalPracticeSession(courseSlug, mode, normalizedFilters)
    }
  }

  return createLocalPracticeSession(courseSlug, mode, normalizedFilters)
}

async function createLocalPracticeSession(courseSlug: string, mode: PracticeSessionMode, filters: FlashcardStudyFilters = {}) {
  const course = await getCourse(courseSlug)
  const questions = filterQuestions(course.sections?.flatMap((section) => section.questions) ?? [], filters)
  const nextQuestion = selectNextLocalSessionQuestion(mode, questions)
  const session = {
    id: makeId("practice"),
    courseSlug,
    mode,
    filters,
    deckSlug: filters.deckSlug,
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
    const response = await fetch(`${API_BASE_URL}/api/study-sessions/${sessionId}`, {
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

export async function submitMultipleChoiceAnswer(
  session: PracticeSession,
  question: PracticeQuestion,
  selectedOptionIndex: number,
  timeSpentSeconds?: number
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/${session.id}/answers`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ questionId: question.id, selectedOptionIndex, timeSpentSeconds }),
      })
      if (!response.ok) throw new Error("Không thể lưu đáp án.")
      return response.json() as Promise<PracticeSession>
    } catch {
      return submitLocalChoiceAttempt(session, question, selectedOptionIndex)
    }
  }

  return submitLocalChoiceAttempt(session, question, selectedOptionIndex)
}

export async function submitFlashcardResult(
  session: PracticeSession,
  questionId: string,
  remembered: boolean
) {
  return submitPracticeAttempt(session, questionId, "", remembered ? "MASTERED" : "AGAIN")
}

export async function submitMatchResult(session: PracticeSession, questionIds: string[], mistakeCount: number, timeSpentSeconds?: number) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/${session.id}/matches`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ questionIds, mistakeCount, timeSpentSeconds }),
      })
      if (!response.ok) throw new Error("Không thể lưu kết quả ghép thẻ.")
      return response.json() as Promise<PracticeSession>
    } catch {
      return submitLocalMatchResult(session, questionIds, mistakeCount, timeSpentSeconds)
    }
  }

  return submitLocalMatchResult(session, questionIds, mistakeCount, timeSpentSeconds)
}

async function submitLocalPracticeAttempt(
  session: PracticeSession,
  questionId: string,
  answerText: string,
  confidence: PracticeConfidence
) {
  writeLocalProgress(questionId, confidence, answerText)
  const lastProgress = readLocalProgress()[questionId]
  const course = await getCourse(session.courseSlug)
  const attemptedIds = new Set([...session.attempts.map((attempt) => attempt.questionId), questionId])
  const questions = filterQuestions(course.sections?.flatMap((section) => section.questions) ?? [], session.filters ?? {}).filter(
    (question) => session.mode !== "TEST" || !attemptedIds.has(question.id)
  )
  const nextQuestion = selectNextLocalSessionQuestion(session.mode ?? "INTERVIEW", questions, questionId)
  const nextSession = {
    ...session,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    completedAt: nextQuestion ? null : new Date().toISOString(),
    nextQuestion,
    lastProgress: lastProgress ? { questionId, ...lastProgress } : null,
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

async function submitLocalChoiceAttempt(
  session: PracticeSession,
  question: PracticeQuestion,
  selectedOptionIndex: number
) {
  const result = writeLocalChoiceProgress(question, selectedOptionIndex)
  const course = await getCourse(session.courseSlug)
  const attemptedIds = new Set([...session.attempts.map((attempt) => attempt.questionId), question.id])
  const questions = filterQuestions(course.sections?.flatMap((section) => section.questions) ?? [], session.filters ?? {}).filter(
    (item) => session.mode !== "TEST" || !attemptedIds.has(item.id)
  )
  const nextQuestion = selectNextLocalSessionQuestion(session.mode ?? "LEARN", questions, question.id)
  const nextSession = {
    ...session,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    completedAt: nextQuestion ? null : new Date().toISOString(),
    nextQuestion,
    lastProgress: result,
    attempts: [
      ...session.attempts,
      {
        id: makeId("attempt"),
        questionId: question.id,
        selectedOptionIndex,
        correct: result.correct,
        confidence: result.confidence,
        createdAt: new Date().toISOString(),
      },
    ],
  } satisfies PracticeSession

  writeLocalSession(nextSession)
  return nextSession
}

async function submitLocalMatchResult(session: PracticeSession, questionIds: string[], mistakeCount: number, timeSpentSeconds?: number) {
  writeLocalMatchProgress(questionIds)
  const nextSession = {
    ...session,
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
    nextQuestion: null,
    attempts: [
      ...session.attempts,
      ...questionIds.map((questionId) => ({
        id: makeId("attempt"),
        questionId,
        correct: true,
        timeSpentSeconds,
        confidence: "GOOD" as const,
        createdAt: new Date().toISOString(),
      })),
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
    if (filters.status === "UNSEEN" && confidence) return false
    if (filters.status === "LEARNING" && (!confidence || progress[question.id]?.mastered)) return false
    if (filters.status === "MASTERED" && !progress[question.id]?.mastered) return false
    if (typeof filters.due === "boolean") {
      const due = progress[question.id] ? new Date(progress[question.id].nextReviewAt) <= new Date() : false
      if (filters.due !== due) return false
    }
    return true
  })
}

function selectNextLocalSessionQuestion(
  mode: PracticeSessionMode,
  questions: PracticeQuestion[],
  excludeQuestionId?: string
) {
  if (mode === "FLASHCARD" || mode === "LEARN") {
    return selectNextLocalFlashcardQuestion(questions, excludeQuestionId)
  }
  if (mode === "TEST") {
    return questions.find((question) => question.id !== excludeQuestionId) ?? null
  }
  if (mode === "REVIEW_DUE") {
    const progress = readLocalProgress()
    const now = new Date()
    return (
      questions.find((question) => {
        const item = progress[question.id]
        return question.id !== excludeQuestionId && item && new Date(item.nextReviewAt) <= now
      }) ?? null
    )
  }
  return selectNextLocalQuestion(questions, excludeQuestionId)
}

function selectNextLocalQuestion(questions: PracticeQuestion[], excludeQuestionId?: string) {
  const progress = readLocalProgress()
  return (
    questions.find((question) => question.id !== excludeQuestionId && !progress[question.id]) ??
    questions.find((question) => question.id !== excludeQuestionId && !progress[question.id]?.mastered) ??
    null
  )
}

function selectNextLocalFlashcardQuestion(questions: PracticeQuestion[], excludeQuestionId?: string) {
  const progress = readLocalProgress()
  const hasMasteredOnlyDeck = questions.length > 0 && questions.every((question) => progress[question.id]?.mastered)

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
        question.id !== excludeQuestionId && !progress[question.id]?.mastered
    ) ??
    questions.find((question) => !progress[question.id]?.mastered) ??
    null
  )
}

function readLocalSessions() {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_SESSIONS_KEY) ?? "[]") as PracticeSession[]
  } catch {
    return []
  }
}

function writeLocalSession(session: PracticeSession) {
  if (typeof window === "undefined") return
  const sessions = readLocalSessions()
  const nextSessions = [session, ...sessions.filter((item) => item.id !== session.id)].slice(0, 20)
  window.localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(nextSessions))
}
