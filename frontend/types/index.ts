export type User = {
  id: string
  name: string
  email: string
  headline: string
  dateOfBirth?: string | null
  dateOfBirthSetAt?: string | null
  nameChangeCount?: number
  nameLastChangedAt?: string | null
  avatarUrl?: string | null
  authProvider?: "LOCAL" | "GOOGLE" | "LOCAL_AND_GOOGLE"
  passwordSet?: boolean
  role?: "USER" | "ADMIN"
  createdAt: string
}

export type QuestionDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED"

export type ImportDelimiterMode = "AUTO" | "TAB" | "COMMA" | "PIPE"

export type PracticeConfidence = "AGAIN" | "HARD" | "GOOD" | "MASTERED"

export type PracticeSessionMode = "FLASHCARD" | "LEARN" | "TEST" | "REVIEW_DUE" | "MATCH"

export type StudyMode = "FLASHCARD" | "LEARN" | "TEST" | "REVIEW_DUE" | "MATCH"

export type PracticeSessionFeedbackMode = "IMMEDIATE" | "END_ONLY"

export type FlashcardStatusFilter = "ALL" | "UNSEEN" | "LEARNING" | "MASTERED"

export type FlashcardStudyFilters = {
  deckSlug?: string
  deckSlugs?: string[]
  topic?: string
  topics?: string[]
  difficulty?: QuestionDifficulty
  difficulties?: QuestionDifficulty[]
  status?: FlashcardStatusFilter
  due?: boolean
  q?: string
  query?: string
  questionLimit?: number
  timeLimitMinutes?: number
  shuffle?: boolean
  feedbackMode?: PracticeSessionFeedbackMode
}

export type SessionSetupFilters = {
  scope: "COURSE" | "DECKS"
  deckSlugs: string[]
  topics: string[]
  difficulties: QuestionDifficulty[]
  status: FlashcardStatusFilter
  query: string
  questionLimit: number
  timeLimitMinutes?: number
  shuffle: boolean
  feedbackMode: PracticeSessionFeedbackMode
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
  deckSlugs?: string[]
  topic?: string | null
  topics?: string[]
  difficulty?: QuestionDifficulty | null
  difficulties?: QuestionDifficulty[]
  statusFilter?: FlashcardStatusFilter | null
  query?: string | null
  questionLimit?: number | null
  timeLimitSeconds?: number | null
  expiresAt?: string | null
  shuffle?: boolean
  feedbackMode?: PracticeSessionFeedbackMode
  questionCount?: number
  answeredCount?: number
  status: "IN_PROGRESS" | "COMPLETED"
  createdAt: string
  completedAt?: string | null
  nextQuestion?: PracticeQuestion | null
  questions?: PracticeQuestion[]
  attempts: PracticeAttempt[]
  lastProgress?: QuestionProgress | null
}
