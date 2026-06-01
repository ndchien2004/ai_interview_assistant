"use client"

import {
  getAuthToken,
  getCurrentUser,
  getStoredEvaluations,
  getStoredSessions,
  makeId,
  setStoredEvaluations,
  setStoredSessions,
} from "@/services/auth-service"
import { sampleQuestionPrompts } from "@/services/mock-data"
import { getResumeById } from "@/services/resume-service"
import type {
  Answer,
  Evaluation,
  InterviewSession,
  Question,
  QuestionCategory,
  QuestionFeedback,
  Resume,
  SkillScore,
  TranscriptMessage,
} from "@/types"

type CreateSessionInput = {
  resumeId: string
  targetRole: string
  seniority: InterviewSession["seniority"]
  questionCount: number
  focusAreas?: string[]
  mode?: InterviewSession["mode"]
  domain?: string
  evaluationSkills?: string[]
}

export type RealtimeSessionResponse = {
  enabled: boolean
  clientSecret?: string | null
  model: string
  voice: string
  message?: string | null
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

const canUseApi = () => Boolean(API_BASE_URL && getAuthToken()?.startsWith("ey"))

const authHeaders = (): Record<string, string> => {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const difficultyFor = (seniority: InterviewSession["seniority"]): Question["difficulty"] => {
  if (seniority === "Senior") return "senior"
  if (seniority === "Middle") return "mid"
  return "junior"
}

const questionPlan = (count: number): QuestionCategory[] => {
  const plan: QuestionCategory[] = ["technical", "experience", "behavioral"]
  if (count >= 4) plan.push("system-design")
  if (count >= 5) plan.splice(1, 0, "technical")
  while (plan.length < count) {
    plan.push(plan.length % 2 === 0 ? "experience" : "technical")
  }
  return plan.slice(0, count)
}

const buildQuestions = (input: CreateSessionInput, resume: Resume | null): Question[] => {
  const plan = questionPlan(input.questionCount)
  const focusAreas = input.focusAreas?.length ? input.focusAreas : resume?.skills.slice(0, 3) ?? []
  const project = resume?.projectHighlights?.[0] ?? "your most relevant resume project"
  const skill = focusAreas[0] ?? resume?.skills[0] ?? "a core skill"

  return plan.map((category, index) => ({
    id: makeId("question"),
    prompt:
      category === "experience"
        ? `Tell me about ${project}. What was your role, what was hard, and what outcome came from it?`
        : category === "system-design"
          ? `Design a production-ready ${input.targetRole} feature using ${skill}. Cover API shape, UI states, persistence, and failure modes.`
          : category === "behavioral"
            ? `Describe a time you had to learn or debug something quickly while working toward a ${input.targetRole} goal.`
            : `${sampleQuestionPrompts[index % sampleQuestionPrompts.length]} Frame your answer for a ${input.seniority.toLowerCase()} ${input.targetRole} interview using ${skill}.`,
    category,
    difficulty: difficultyFor(input.seniority),
    expectedSignals: [
      "clear structure",
      "resume evidence",
      "specific tradeoffs",
      "practical outcome",
      ...focusAreas.slice(0, 2).map((item) => `evidence for ${item}`),
    ],
  }))
}

export async function listInterviewSessions() {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load interviews.")
      return response.json() as Promise<InterviewSession[]>
    } catch {
      return listLocalInterviewSessions()
    }
  }

  return listLocalInterviewSessions()
}

function listLocalInterviewSessions() {
  const user = getCurrentUser()
  const sessions = getStoredSessions()

  if (!user) return []
  return sessions.filter((session) => session.userId === user.id || session.userId === "user-demo")
}

export async function createInterviewSession(input: CreateSessionInput) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to create interview."))
      return response.json() as Promise<InterviewSession>
    } catch {
      return createLocalInterviewSession(input)
    }
  }

  return createLocalInterviewSession(input)
}

async function createLocalInterviewSession(input: CreateSessionInput) {
  const user = getCurrentUser()

  if (!user) {
    throw new Error("You must be signed in to create an interview.")
  }

  const resume = await getResumeById(input.resumeId)
  const focusAreas = input.focusAreas?.length ? input.focusAreas : resume?.skills.slice(0, 3) ?? []
  const session: InterviewSession = {
    id: makeId("session"),
    userId: user.id,
    resumeId: input.resumeId,
    targetRole: input.targetRole,
    seniority: input.seniority,
    questionCount: input.questionCount,
    status: "in-progress",
    createdAt: new Date().toISOString(),
    questions: buildQuestions(input, resume),
    answers: [],
    sourceResumeSummary: resume?.summary ?? "",
    focusAreas,
    questionPlan: questionPlan(input.questionCount),
    generationMode: "HYBRID",
    mode: input.mode ?? "WRITTEN",
    domain: input.domain ?? input.targetRole,
    evaluationSkills: input.evaluationSkills?.length
      ? input.evaluationSkills
      : ["Technical depth", "Communication", "Problem solving"],
    transcript: [],
  }

  setStoredSessions([session, ...getStoredSessions()])

  return session
}

export async function getInterviewSession(id: string) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${id}`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load interview.")
      return response.json() as Promise<InterviewSession>
    } catch {
      return getStoredSessions().find((session) => session.id === id) ?? null
    }
  }

  return getStoredSessions().find((session) => session.id === id) ?? null
}

export async function saveInterviewAnswers(sessionId: string, answers: Answer[]) {
  return saveInterviewAnswersWithContext(sessionId, answers)
}

export async function createRealtimeInterviewSession(sessionId: string): Promise<RealtimeSessionResponse> {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/realtime/session`, {
        method: "POST",
        headers: authHeaders(),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to create realtime session."))
      return response.json() as Promise<RealtimeSessionResponse>
    } catch (caught) {
      return {
        enabled: false,
        clientSecret: null,
        model: "gpt-realtime",
        voice: "marin",
        message: caught instanceof Error ? caught.message : "Realtime voice is unavailable.",
      }
    }
  }

  return {
    enabled: false,
    clientSecret: null,
    model: "demo",
    voice: "demo",
    message: "Realtime voice requires the backend API. Typed live practice is available in demo mode.",
  }
}

export async function saveInterviewTranscript(sessionId: string, transcript: TranscriptMessage[]) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/transcript`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ transcript }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to save transcript."))
      return response.json() as Promise<TranscriptMessage[]>
    } catch {
      return saveLocalInterviewTranscript(sessionId, transcript)
    }
  }

  return saveLocalInterviewTranscript(sessionId, transcript)
}

export async function saveInterviewAnswersWithContext(
  sessionId: string,
  answers: Answer[],
  transcript?: TranscriptMessage[]
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/answers`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ answers, transcript }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to save answers."))
      return response.json() as Promise<InterviewSession>
    } catch {
      return saveLocalInterviewAnswers(sessionId, answers, transcript)
    }
  }

  return saveLocalInterviewAnswers(sessionId, answers, transcript)
}

function saveLocalInterviewAnswers(sessionId: string, answers: Answer[], transcript?: TranscriptMessage[]) {
  const sessions = getStoredSessions()
  const nextSessions = sessions.map((session) =>
    session.id === sessionId
      ? { ...session, answers, transcript: transcript ?? session.transcript, status: "in-progress" as const }
      : session
  )

  setStoredSessions(nextSessions)
  return nextSessions.find((session) => session.id === sessionId) ?? null
}

function saveLocalInterviewTranscript(sessionId: string, transcript: TranscriptMessage[]) {
  const sessions = getStoredSessions()
  setStoredSessions(
    sessions.map((session) =>
      session.id === sessionId
        ? { ...session, transcript, status: session.status === "completed" ? session.status : ("in-progress" as const) }
        : session
    )
  )
  return transcript
}

export async function evaluateInterview(sessionId: string, answers: Answer[]) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ answers }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to evaluate interview."))
      return response.json() as Promise<Evaluation>
    } catch (caught) {
      throw caught instanceof Error ? caught : new Error("Unable to evaluate interview.")
    }
  }

  return evaluateInterviewWithContext(sessionId, answers, {})
}

export async function evaluateInterviewWithContext(
  sessionId: string,
  answers: Answer[],
  context: {
    transcript?: TranscriptMessage[]
    skills?: string[]
    domain?: string
  }
) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ answers, transcript: context.transcript }),
      })
      if (!response.ok) throw new Error(await errorMessage(response, "Unable to evaluate interview."))
      return response.json() as Promise<Evaluation>
    } catch (caught) {
      throw caught instanceof Error ? caught : new Error("Unable to evaluate interview.")
    }
  }

  const sessions = getStoredSessions()
  const session = sessions.find((item) => item.id === sessionId)

  if (!session) {
    throw new Error("Interview session not found.")
  }

  const answeredCount = answers.filter((answer) => answer.response.trim().length > 0).length
  const averageLength =
    answers.reduce((total, answer) => total + answer.response.trim().length, 0) /
    Math.max(answeredCount, 1)
  const completeness = Math.round((answeredCount / Math.max(session.questions.length, 1)) * 100)
  const detailScore = Math.min(92, Math.round(58 + averageLength / 12))
  const totalScore = Math.round(detailScore * 0.65 + completeness * 0.35)
  const skills = context.skills?.length
    ? context.skills
    : session.evaluationSkills?.length
      ? session.evaluationSkills
      : ["Technical depth", "Communication", "Role fit"]
  const skillScores: SkillScore[] = skills.map((skill, index) => {
    const score = Math.max(45, Math.min(96, totalScore + (index % 2 === 0 ? 4 : -3) - index))

    return {
      name: skill,
      score,
      rationale:
        score >= 80
          ? "Strong signal with relevant details and confident structure."
          : "Promising signal, but needs more specific examples and outcomes.",
    }
  })
  const perQuestionFeedback = buildLocalQuestionFeedback(session, answers, totalScore)

  const evaluation: Evaluation = {
    id: makeId("eval"),
    sessionId,
    totalScore,
    categoryScores: {
      technical: Math.min(95, totalScore + 3),
      communication: Math.max(45, totalScore - 4),
      experience: Math.min(94, totalScore + 1),
      problemSolving: Math.min(96, totalScore + 5),
    },
    strengths: [
      "Uses concrete project details from the resume.",
      "Shows practical awareness of product and engineering tradeoffs.",
      "Answers are aligned with the target role.",
    ],
    weaknesses: [
      "Add more measurable outcomes to make examples more credible.",
      "Keep answers tighter by opening with the conclusion first.",
    ],
    improvementRoadmap: [
      "Prepare one STAR story for architecture, debugging, and teamwork.",
      "Practice two-minute answers with a clear result at the end.",
      "Review API security, upload validation, and testing strategy.",
    ],
    transcript: context.transcript,
    skillScores,
    interviewDomain: context.domain ?? session.domain,
    evaluationMode: "FALLBACK",
    provider: "LOCAL",
    model: "local",
    perQuestionFeedback,
    summary:
      "Fallback evaluation generated locally because the AI provider was unavailable. The strongest next step is making each answer more outcome-driven and easier to scan verbally.",
    createdAt: new Date().toISOString(),
  }

  const nextSessions = sessions.map((item) =>
    item.id === sessionId
      ? {
          ...item,
          answers,
          transcript: context.transcript ?? item.transcript,
          status: "completed" as const,
          completedAt: new Date().toISOString(),
          evaluationId: evaluation.id,
        }
      : item
  )

  setStoredSessions(nextSessions)
  setStoredEvaluations([evaluation, ...getStoredEvaluations()])

  return evaluation
}

function buildLocalQuestionFeedback(
  session: InterviewSession,
  answers: Answer[],
  totalScore: number
): QuestionFeedback[] {
  const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.response]))
  return session.questions.map((question) => {
    const answerText = answersByQuestionId.get(question.id) ?? ""
    const answered = answerText.trim().length > 0
    const missingSignals = answered
      ? question.expectedSignals.filter((signal) => !answerText.toLowerCase().includes(signal.toLowerCase())).slice(0, 4)
      : question.expectedSignals.slice(0, 4)

    return {
      questionId: question.id,
      questionPrompt: question.prompt,
      answerText,
      score: answered ? Math.max(35, Math.min(92, totalScore + Math.round(answerText.length / 80))) : 15,
      rationale: answered
        ? "Local fallback found a usable answer. Add sharper evidence, tradeoffs, and measurable outcomes to make it interview-ready."
        : "No substantial answer was provided for this question.",
      missingSignals,
      suggestedAnswer: `Open with a direct conclusion, cite a concrete CV project, explain tradeoffs, cover ${
        missingSignals.length ? missingSignals.join(", ") : "the expected signals"
      }, and close with an outcome.`,
    }
  })
}

export async function getEvaluation(id: string) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/evaluations/${id}`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load evaluation.")
      return response.json() as Promise<Evaluation>
    } catch (caught) {
      throw caught instanceof Error ? caught : new Error("Unable to load evaluation.")
    }
  }

  return getStoredEvaluations().find((evaluation) => evaluation.id === id) ?? null
}

export async function getEvaluationBySessionId(sessionId: string) {
  if (canUseApi()) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews/${sessionId}/evaluation`, { headers: authHeaders() })
      if (!response.ok) throw new Error("Unable to load evaluation.")
      return response.json() as Promise<Evaluation>
    } catch (caught) {
      throw caught instanceof Error ? caught : new Error("Unable to load evaluation.")
    }
  }

  return getStoredEvaluations().find((evaluation) => evaluation.sessionId === sessionId) ?? null
}

async function errorMessage(response: Response, fallback: string) {
  try {
    const json = await response.json()
    return json.message ?? fallback
  } catch {
    return fallback
  }
}
