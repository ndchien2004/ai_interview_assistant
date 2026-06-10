"use client"

import { getAuthToken, makeId } from "@/services/auth-service"
import {
  getCourse,
  notifyCourseProgressChanged,
  readLocalProgress,
  writeLocalChoiceProgress,
  writeLocalMatchProgress,
  writeLocalProgress,
} from "@/services/course-service"
import type {
  Course,
  FlashcardStudyFilters,
  PracticeConfidence,
  PracticeQuestion,
  PracticeSession,
  PracticeSessionMode,
} from "@/types"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-fullstack-flashcard-bank"
const LOCAL_SESSIONS_KEY = "java-fullstack-sessions"
const ACTIVE_SESSIONS_KEY = "java-fullstack-active-sessions"

const headers = () => {
  const token = getAuthToken()
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

const canUseApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

export async function createPracticeSession(courseSlug = COURSE_SLUG) {
  return createSession(courseSlug, "FLASHCARD")
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
    topics: normalizedFilters.topics,
    deckSlug: normalizedFilters.deckSlug,
    deckSlugs: normalizedFilters.deckSlugs,
    difficulty: normalizedFilters.difficulty,
    difficulties: normalizedFilters.difficulties,
    status: normalizedFilters.status,
    query: normalizedFilters.query ?? normalizedFilters.q,
    questionLimit: normalizedFilters.questionLimit,
    timeLimitMinutes: normalizedFilters.timeLimitMinutes,
    shuffle: normalizedFilters.shuffle,
    feedbackMode: normalizedFilters.feedbackMode,
  }

  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ courseSlug, mode, ...requestFilters }),
      })
      if (!response.ok) throw new Error("Unable to start practice session.")
      const session = await response.json() as PracticeSession
      writeLocalSession(session)
      return session
    } catch {
      return createLocalPracticeSession(courseSlug, mode, normalizedFilters)
    }
  }

  return createLocalPracticeSession(courseSlug, mode, normalizedFilters)
}

async function createLocalPracticeSession(courseSlug: string, mode: PracticeSessionMode, filters: FlashcardStudyFilters = {}) {
  const course = await getCourse(courseSlug)
  const questionLimit = clampQuestionLimit(filters.questionLimit, mode === "MATCH" ? 12 : 20)
  const shuffleQuestions = filters.shuffle ?? mode !== "LEARN"
  const questions = selectLocalSessionQuestions(mode, collectCourseQuestions(course, filters), questionLimit, shuffleQuestions)
  const nextQuestion = questions[0] ?? null
  const timeLimitSeconds = filters.timeLimitMinutes && filters.timeLimitMinutes > 0 ? Math.min(filters.timeLimitMinutes, 24 * 60) * 60 : null
  const session = {
    id: makeId("practice"),
    courseSlug,
    mode,
    filters,
    deckSlug: filters.deckSlug,
    deckSlugs: filters.deckSlugs,
    topics: filters.topics,
    difficulties: filters.difficulties,
    query: filters.query ?? filters.q,
    questionLimit,
    timeLimitSeconds,
    expiresAt: timeLimitSeconds ? new Date(Date.now() + timeLimitSeconds * 1000).toISOString() : null,
    shuffle: shuffleQuestions,
    feedbackMode: filters.feedbackMode ?? (mode === "TEST" ? "END_ONLY" : "IMMEDIATE"),
    questionCount: questions.length,
    answeredCount: 0,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    createdAt: new Date().toISOString(),
    nextQuestion,
    questions,
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

export async function getActivePracticeSession(
  courseSlug: string,
  mode: PracticeSessionMode,
  deckSlug?: string
) {
  const activeSessionId = readActiveSessionIds()[sessionScopeKey(courseSlug, mode, deckSlug)]
  if (!activeSessionId) return null

  try {
    const session = await getPracticeSession(activeSessionId)
    if (session.status === "COMPLETED") {
      clearActiveSession(courseSlug, mode, deckSlug)
      return null
    }
    return session
  } catch {
    clearActiveSession(courseSlug, mode, deckSlug)
    return null
  }
}

export async function listActivePracticeSessions(courseSlug = COURSE_SLUG) {
  const activeEntries = Object.entries(readActiveSessionIds()).filter(([key]) => key.startsWith(`${courseSlug}:`))
  const sessions = await Promise.all(
    activeEntries.map(async ([key, sessionId]) => {
      try {
        const session = await getPracticeSession(sessionId)
        if (session.status === "COMPLETED") {
          clearActiveSessionKey(key)
          return null
        }
        return session
      } catch {
        clearActiveSessionKey(key)
        return null
      }
    })
  )

  return sessions
    .filter((session): session is PracticeSession => Boolean(session))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function submitPracticeAttempt(
  session: PracticeSession,
  questionId: string,
  answerText: string,
  confidence: PracticeConfidence
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/${session.id}/answers`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ questionId, answerText, confidence }),
      })
      if (!response.ok) throw new Error("Unable to submit practice attempt.")
      const nextSession = await response.json() as PracticeSession
      writeLocalSession(nextSession)
      notifyCourseProgressChanged(nextSession.courseSlug)
      return nextSession
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
      const nextSession = await response.json() as PracticeSession
      writeLocalSession(nextSession)
      notifyCourseProgressChanged(nextSession.courseSlug)
      return nextSession
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
      const nextSession = await response.json() as PracticeSession
      writeLocalSession(nextSession)
      notifyCourseProgressChanged(nextSession.courseSlug)
      return nextSession
    } catch {
      return submitLocalMatchResult(session, questionIds, mistakeCount, timeSpentSeconds)
    }
  }

  return submitLocalMatchResult(session, questionIds, mistakeCount, timeSpentSeconds)
}

export async function submitTestSession(
  session: PracticeSession,
  answers: Array<{ questionId: string; selectedOptionIndex?: number | null; timeSpentSeconds?: number }>,
  timeSpentSeconds?: number
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/study-sessions/${session.id}/submit`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ answers, timeSpentSeconds }),
      })
      if (!response.ok) throw new Error("Không thể nộp bài kiểm tra.")
      const nextSession = await response.json() as PracticeSession
      writeLocalSession(nextSession)
      notifyCourseProgressChanged(nextSession.courseSlug)
      return nextSession
    } catch {
      return submitLocalTestSession(session, answers, timeSpentSeconds)
    }
  }

  return submitLocalTestSession(session, answers, timeSpentSeconds)
}

async function submitLocalPracticeAttempt(
  session: PracticeSession,
  questionId: string,
  answerText: string,
  confidence: PracticeConfidence
) {
  writeLocalProgress(questionId, confidence, answerText)
  const lastProgress = readLocalProgress()[questionId]
  const attemptedIds = new Set([...session.attempts.map((attempt) => attempt.questionId), questionId])
  const questions = session.questions ?? []
  const nextQuestion = questions.find((question) => !attemptedIds.has(question.id)) ?? null
  const nextSession = {
    ...session,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    completedAt: nextQuestion ? null : new Date().toISOString(),
    nextQuestion,
    answeredCount: attemptedIds.size,
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
  const attemptedIds = new Set([...session.attempts.map((attempt) => attempt.questionId), question.id])
  const questions = session.questions ?? []
  const nextQuestion = questions.find((item) => !attemptedIds.has(item.id)) ?? null
  const nextSession = {
    ...session,
    status: nextQuestion ? "IN_PROGRESS" : "COMPLETED",
    completedAt: nextQuestion ? null : new Date().toISOString(),
    nextQuestion,
    answeredCount: attemptedIds.size,
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
    answeredCount: questionIds.length,
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

async function submitLocalTestSession(
  session: PracticeSession,
  answers: Array<{ questionId: string; selectedOptionIndex?: number | null; timeSpentSeconds?: number }>,
  timeSpentSeconds?: number
) {
  const questionsById = new Map((session.questions ?? []).map((question) => [question.id, question]))
  const attempts = answers.flatMap((answer) => {
    const question = questionsById.get(answer.questionId)
    if (!question || answer.selectedOptionIndex == null) return []
    const correct = answer.selectedOptionIndex === question.correctOptionIndex
    const result = writeLocalChoiceProgress(question, answer.selectedOptionIndex)
    return [
      {
        id: makeId("attempt"),
        questionId: question.id,
        selectedOptionIndex: answer.selectedOptionIndex,
        correct,
        confidence: result.confidence,
        timeSpentSeconds: answer.timeSpentSeconds ?? timeSpentSeconds,
        createdAt: new Date().toISOString(),
      },
    ]
  })
  const nextSession = {
    ...session,
    status: "COMPLETED",
    completedAt: new Date().toISOString(),
    nextQuestion: null,
    answeredCount: attempts.length,
    attempts: [...session.attempts, ...attempts],
  } satisfies PracticeSession

  writeLocalSession(nextSession)
  return nextSession
}

function collectCourseQuestions(course: Course, filters: FlashcardStudyFilters) {
  const deckSlugs = new Set([...(filters.deckSlugs ?? []), filters.deckSlug].filter(Boolean) as string[])
  const sections = deckSlugs.size
    ? course.sections?.filter((section) => deckSlugs.has(section.slug))
    : course.sections
  return filterQuestions(sections?.flatMap((section) => section.questions) ?? [], filters)
}

function filterQuestions(questions: PracticeQuestion[], filters: FlashcardStudyFilters) {
  const progress = readLocalProgress()
  return questions.filter((question) => {
    const topics = new Set([...(filters.topics ?? []), filters.topic].filter(Boolean) as string[])
    const difficulties = new Set([...(filters.difficulties ?? []), filters.difficulty].filter(Boolean) as string[])
    if (topics.size && !topics.has(question.topic)) return false
    if (difficulties.size && !difficulties.has(question.difficulty)) return false

    if (filters.status === "UNSEEN" && hasStartedProgress(progress[question.id])) return false
    if (filters.status === "LEARNING" && !isLearningProgress(progress[question.id])) return false
    if (filters.status === "MASTERED" && !isMasteredProgress(progress[question.id])) return false
    if (typeof filters.due === "boolean") {
      const due = progress[question.id] ? new Date(progress[question.id].nextReviewAt) <= new Date() : false
      if (filters.due !== due) return false
    }
    const query = (filters.query ?? filters.q)?.trim().toLowerCase()
    if (query) {
      const haystack = [question.question, question.shortAnswer, question.topic, question.tags.join(" ")]
        .join(" ")
        .toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
}

function selectLocalSessionQuestions(mode: PracticeSessionMode, questions: PracticeQuestion[], limit: number, shuffleQuestions: boolean) {
  const progress = readLocalProgress()
  const now = new Date()
  const sorted = [...questions].sort((a, b) => {
    if (mode !== "LEARN" && mode !== "FLASHCARD" && mode !== "REVIEW_DUE") return a.sortOrder - b.sortOrder
    return priority(a) - priority(b) || a.sortOrder - b.sortOrder
  })
  const selected = shuffleQuestions ? shuffle(sorted) : sorted
  return selected.slice(0, limit)

  function priority(question: PracticeQuestion) {
    const item = progress[question.id]
    if (item && new Date(item.nextReviewAt) <= now) return 0
    if (!item) return 1
    if (!isMasteredProgress(item)) return 2
    return 3
  }
}

function hasStartedProgress(progress?: ReturnType<typeof readLocalProgress>[string]) {
  return Boolean(progress && (progress.attemptCount ?? 0) > 0)
}

function isMasteredProgress(progress?: ReturnType<typeof readLocalProgress>[string]) {
  return Boolean(progress && hasStartedProgress(progress) && (progress.mastered || (progress.correctStreak ?? 0) >= 3))
}

function isLearningProgress(progress?: ReturnType<typeof readLocalProgress>[string]) {
  return Boolean(progress && hasStartedProgress(progress) && !isMasteredProgress(progress))
}

function clampQuestionLimit(value: number | undefined, fallback: number) {
  if (!value || Number.isNaN(value)) return fallback
  return Math.max(1, Math.min(value, 100))
}

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5)
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
  writeActiveSession(session)
}

function readActiveSessionIds() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_SESSIONS_KEY) ?? "{}") as Record<string, string>
  } catch {
    return {}
  }
}

function writeActiveSession(session: PracticeSession) {
  const mode = session.mode
  if (!mode) return
  const key = sessionScopeKey(session.courseSlug, mode, session.deckSlug ?? session.filters?.deckSlug)
  const active = readActiveSessionIds()
  if (session.status === "COMPLETED") {
    delete active[key]
  } else {
    active[key] = session.id
  }
  window.localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(active))
}

function clearActiveSession(courseSlug: string, mode: PracticeSessionMode, deckSlug?: string) {
  if (typeof window === "undefined") return
  const active = readActiveSessionIds()
  delete active[sessionScopeKey(courseSlug, mode, deckSlug)]
  window.localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(active))
}

function clearActiveSessionKey(key: string) {
  if (typeof window === "undefined") return
  const active = readActiveSessionIds()
  delete active[key]
  window.localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(active))
}

function sessionScopeKey(courseSlug: string, mode: PracticeSessionMode, deckSlug?: string | null) {
  return [courseSlug, mode, deckSlug || "course"].join(":")
}
