export type User = {
  id: string
  name: string
  email: string
  headline: string
  dateOfBirth?: string | null
  dateOfBirthSetAt?: string | null
  nameChangeCount?: number
  nameLastChangedAt?: string | null
  phoneNumber?: string | null
  phoneVerifiedAt?: string | null
  avatarUrl?: string | null
  authProvider?: "LOCAL" | "GOOGLE" | "LOCAL_AND_GOOGLE"
  passwordSet?: boolean
  role?: "USER" | "ADMIN"
  createdAt: string
}

export type Resume = {
  id: string
  userId: string
  fileName: string
  fileSize: number
  contentType?: string
  uploadedAt: string
  parsedText: string
  summary?: string
  status?: "PROCESSING" | "READY" | "NEEDS_REVIEW" | "FAILED"
  parseError?: string | null
  roleSignals: string[]
  skills: string[]
  senioritySignals?: string[]
  projectHighlights?: string[]
  warnings?: string[]
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

export type EvaluationMode = "AI" | "FALLBACK"
export type EvaluationProvider = "OPENAI" | "GEMINI" | "LOCAL"

export type QuestionFeedback = {
  questionId: string
  questionPrompt: string
  answerText: string
  score: number
  rationale: string
  missingSignals: string[]
  suggestedAnswer: string
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
  sourceResumeSummary?: string
  focusAreas?: string[]
  questionPlan?: QuestionCategory[]
  generationMode?: "HYBRID" | "AI" | "BANK"
  mode?: "WRITTEN" | "LIVE"
  domain?: string
  evaluationSkills?: string[]
  transcript?: TranscriptMessage[]
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
  evaluationMode: EvaluationMode
  provider: EvaluationProvider
  model: string
  perQuestionFeedback: QuestionFeedback[]
  transcript?: TranscriptMessage[]
  skillScores?: SkillScore[]
  interviewDomain?: string
  summary: string
  createdAt: string
}

export type QuestionDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export type ImportDelimiterMode = "AUTO" | "TAB" | "COMMA" | "PIPE"

export type PracticeConfidence = "AGAIN" | "HARD" | "GOOD" | "MASTERED"

export type PracticeSessionMode = "INTERVIEW" | "FLASHCARD" | "LEARN" | "TEST" | "REVIEW_DUE" | "MATCH"

export type StudyMode = "FLASHCARD" | "LEARN" | "TEST" | "REVIEW_DUE" | "MATCH"

export type FlashcardStatusFilter = "ALL" | "UNSEEN" | "LEARNING" | "MASTERED"

export type FlashcardStudyFilters = {
  deckSlug?: string
  topic?: string
  difficulty?: QuestionDifficulty
  status?: FlashcardStatusFilter
  due?: boolean
  q?: string
}

export type PracticeQuestion = {
  id: string
  question: string
  shortAnswer: string
  detailedAnswer: string
  keyPoints: string[]
  commonMistakes: string[]
  options: string[]
  correctOptionIndex: number
  explanation: string
  difficulty: QuestionDifficulty
  topic: string
  tags: string[]
  codeSnippet?: string | null
  sortOrder: number
}

export type CourseImportPayload = {
  topic: string
  difficulty: QuestionDifficulty
  content: string
  delimiterMode: ImportDelimiterMode
}

export type CourseImportRowError = {
  rowNumber: number
  raw: string
  reason: string
}

export type CourseImportResponse = {
  importedCount: number
  skippedCount: number
  invalidRows: CourseImportRowError[]
  createdQuestions: PracticeQuestion[]
}

export type ParsedImportRow = {
  rowNumber: number
  question: string
  answer: string
  raw: string
}

export type ParsedImportPreview = {
  validRows: ParsedImportRow[]
  invalidRows: CourseImportRowError[]
  skippedCount: number
}

export type CourseSection = {
  id: string
  slug: string
  title: string
  description: string
  sortOrder: number
  questions: PracticeQuestion[]
}

export type Course = {
  id: string
  slug: string
  title: string
  description: string
  active: boolean
  questionCount: number
  sections?: CourseSection[]
}

export type TopicProgress = {
  topic: string
  total: number
  attempted: number
  mastered: number
  correct: number
  incorrect: number
  due: number
  learning: number
  masteryPercentage: number
}

export type CourseProgress = {
  courseSlug: string
  totalQuestions: number
  attemptedQuestions: number
  masteredQuestions: number
  correctAnswers: number
  incorrectAnswers: number
  dueQuestions: number
  learningQuestions: number
  streakDays: number
  lastStudyAt?: string | null
  accuracyPercentage: number
  masteryPercentage: number
  averageConfidence: number
  topics: TopicProgress[]
}

export type QuestionProgress = {
  questionId: string
  confidence: PracticeConfidence
  attemptCount: number
  correctCount: number
  incorrectCount: number
  correctStreak: number
  mastered: boolean
  lastAttemptAt: string
  nextReviewAt: string
  due: boolean
  answerText?: string
}

export type PracticeAttempt = {
  id: string
  questionId: string
  answerText?: string | null
  selectedOptionIndex?: number | null
  correct?: boolean | null
  timeSpentSeconds?: number | null
  confidence: PracticeConfidence
  createdAt: string
}

export type PracticeSession = {
  id: string
  courseSlug: string
  mode?: PracticeSessionMode
  filters?: FlashcardStudyFilters
  deckSlug?: string | null
  topic?: string | null
  difficulty?: QuestionDifficulty | null
  statusFilter?: FlashcardStatusFilter | null
  status: "IN_PROGRESS" | "COMPLETED"
  createdAt: string
  completedAt?: string | null
  nextQuestion?: PracticeQuestion | null
  attempts: PracticeAttempt[]
  lastProgress?: QuestionProgress | null
}
