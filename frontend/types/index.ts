export type User = {
  id: string
  name: string
  email: string
  headline: string
  createdAt: string
}

export type Resume = {
  id: string
  userId: string
  fileName: string
  fileSize: number
  uploadedAt: string
  parsedText: string
  roleSignals: string[]
  skills: string[]
}

export type QuestionCategory =
  | "technical"
  | "behavioral"
  | "experience"
  | "system-design"

export type Question = {
  id: string
  prompt: string
  category: QuestionCategory
  difficulty: "junior" | "mid" | "senior"
  expectedSignals: string[]
}

export type Answer = {
  questionId: string
  response: string
}

export type TranscriptMessage = {
  id: string
  role: "interviewer" | "candidate" | "system"
  content: string
  createdAt: string
  questionId?: string
}

export type SkillScore = {
  name: string
  score: number
  rationale: string
}

export type InterviewStatus = "draft" | "in-progress" | "completed"

export type InterviewSession = {
  id: string
  userId: string
  resumeId: string
  targetRole: string
  seniority: "Intern" | "Junior" | "Middle" | "Senior"
  questionCount: number
  status: InterviewStatus
  createdAt: string
  completedAt?: string
  questions: Question[]
  answers: Answer[]
  evaluationId?: string
}

export type Evaluation = {
  id: string
  sessionId: string
  totalScore: number
  categoryScores: {
    technical: number
    communication: number
    experience: number
    problemSolving: number
  }
  strengths: string[]
  weaknesses: string[]
  improvementRoadmap: string[]
  transcript?: TranscriptMessage[]
  skillScores?: SkillScore[]
  interviewDomain?: string
  summary: string
  createdAt: string
}
