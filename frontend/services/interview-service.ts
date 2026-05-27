"use client"

import {
  getCurrentUser,
  getStoredEvaluations,
  getStoredSessions,
  makeId,
  setStoredEvaluations,
  setStoredSessions,
} from "@/services/auth-service"
import { sampleQuestionPrompts } from "@/services/mock-data"
import type {
  Answer,
  Evaluation,
  InterviewSession,
  Question,
  QuestionCategory,
  SkillScore,
  TranscriptMessage,
} from "@/types"

type CreateSessionInput = {
  resumeId: string
  targetRole: string
  seniority: InterviewSession["seniority"]
  questionCount: number
}

const categories: QuestionCategory[] = ["technical", "experience", "behavioral", "system-design"]

const difficultyFor = (seniority: InterviewSession["seniority"]): Question["difficulty"] => {
  if (seniority === "Senior") return "senior"
  if (seniority === "Middle") return "mid"
  return "junior"
}

const buildQuestions = (input: CreateSessionInput): Question[] =>
  Array.from({ length: input.questionCount }, (_, index) => ({
    id: makeId("question"),
    prompt:
      sampleQuestionPrompts[index % sampleQuestionPrompts.length] +
      ` Frame your answer for a ${input.seniority.toLowerCase()} ${input.targetRole} interview.`,
    category: categories[index % categories.length],
    difficulty: difficultyFor(input.seniority),
    expectedSignals: ["clear structure", "resume evidence", "specific tradeoffs", "practical outcome"],
  }))

export async function listInterviewSessions() {
  const user = getCurrentUser()
  const sessions = getStoredSessions()

  if (!user) return []
  return sessions.filter((session) => session.userId === user.id || session.userId === "user-demo")
}

export async function createInterviewSession(input: CreateSessionInput) {
  const user = getCurrentUser()

  if (!user) {
    throw new Error("You must be signed in to create an interview.")
  }

  const session: InterviewSession = {
    id: makeId("session"),
    userId: user.id,
    resumeId: input.resumeId,
    targetRole: input.targetRole,
    seniority: input.seniority,
    questionCount: input.questionCount,
    status: "in-progress",
    createdAt: new Date().toISOString(),
    questions: buildQuestions(input),
    answers: [],
  }

  setStoredSessions([session, ...getStoredSessions()])

  return session
}

export async function getInterviewSession(id: string) {
  return getStoredSessions().find((session) => session.id === id) ?? null
}

export async function saveInterviewAnswers(sessionId: string, answers: Answer[]) {
  const sessions = getStoredSessions()
  const nextSessions = sessions.map((session) =>
    session.id === sessionId ? { ...session, answers, status: "in-progress" as const } : session
  )

  setStoredSessions(nextSessions)
  return nextSessions.find((session) => session.id === sessionId) ?? null
}

export async function evaluateInterview(sessionId: string, answers: Answer[]) {
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
  const skills = context.skills?.length ? context.skills : ["Technical depth", "Communication", "Role fit"]
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
    interviewDomain: context.domain,
    summary:
      "The mock evaluator sees a solid interview signal. The strongest next step is making each answer more outcome-driven and easier to scan verbally.",
    createdAt: new Date().toISOString(),
  }

  const nextSessions = sessions.map((item) =>
    item.id === sessionId
      ? {
          ...item,
          answers,
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

export async function getEvaluation(id: string) {
  return getStoredEvaluations().find((evaluation) => evaluation.id === id) ?? null
}

export async function getEvaluationBySessionId(sessionId: string) {
  return getStoredEvaluations().find((evaluation) => evaluation.sessionId === sessionId) ?? null
}
