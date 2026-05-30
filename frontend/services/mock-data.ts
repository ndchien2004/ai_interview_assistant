import type { Evaluation, InterviewSession, Resume, User } from "@/types"

export const demoUser: User = {
  id: "user-demo",
  name: "Alex Morgan",
  email: "alex@example.com",
  headline: "Full-stack developer preparing for AI-assisted interviews",
  createdAt: "2026-05-01T09:00:00.000Z",
}

export const demoResumes: Resume[] = [
  {
    id: "resume-frontend",
    userId: demoUser.id,
    fileName: "alex-morgan-fullstack-resume.pdf",
    fileSize: 428_000,
    uploadedAt: "2026-05-20T10:30:00.000Z",
    parsedText:
      "Full-stack developer with React, Next.js, Spring Boot, PostgreSQL, Docker, REST APIs, authentication, and AI integration experience. Built dashboards, interview tooling, analytics screens, and production-style services.",
    roleSignals: ["Next.js", "Spring Boot", "PostgreSQL", "Docker"],
    skills: ["React", "TypeScript", "Java", "REST APIs", "JWT", "Tailwind CSS"],
  },
]

export const demoSessions: InterviewSession[] = [
  {
    id: "session-fullstack",
    userId: demoUser.id,
    resumeId: "resume-frontend",
    targetRole: "Full-stack Developer",
    seniority: "Junior",
    questionCount: 5,
    status: "completed",
    createdAt: "2026-05-22T14:00:00.000Z",
    completedAt: "2026-05-22T14:28:00.000Z",
    evaluationId: "eval-fullstack",
    questions: [
      {
        id: "q-architecture",
        prompt:
          "Walk me through how you would design the frontend-to-backend flow for a resume upload and AI question generation feature.",
        category: "system-design",
        difficulty: "junior",
        expectedSignals: ["REST boundary", "upload validation", "async state", "error handling"],
      },
      {
        id: "q-auth",
        prompt:
          "How would you protect authenticated dashboard routes in a Next.js app that talks to a Spring Boot API?",
        category: "technical",
        difficulty: "junior",
        expectedSignals: ["JWT", "route guard", "token expiry", "API interceptor"],
      },
      {
        id: "q-project",
        prompt:
          "Tell me about a project where you connected frontend state to backend data and handled loading or failure states.",
        category: "experience",
        difficulty: "junior",
        expectedSignals: ["ownership", "tradeoffs", "user experience", "debugging"],
      },
    ],
    answers: [
      {
        questionId: "q-architecture",
        response:
          "I would validate PDF files on the frontend, send multipart form data to the backend, parse text there, persist resume metadata, then call an endpoint that creates a session and returns structured questions.",
      },
      {
        questionId: "q-auth",
        response:
          "I would store a JWT after login, attach it to API requests, redirect unauthenticated users, and handle 401 responses by clearing the session.",
      },
    ],
  },
]

export const demoEvaluations: Evaluation[] = [
  {
    id: "eval-fullstack",
    sessionId: "session-fullstack",
    totalScore: 82,
    categoryScores: {
      technical: 84,
      communication: 78,
      experience: 80,
      problemSolving: 86,
    },
    strengths: [
      "Explains system boundaries clearly.",
      "Connects answers to practical implementation details.",
      "Shows awareness of authentication and error states.",
    ],
    weaknesses: [
      "Could give more specific metrics and project outcomes.",
      "Some answers need a clearer beginning, middle, and conclusion.",
    ],
    improvementRoadmap: [
      "Prepare two STAR stories about debugging and ownership.",
      "Practice explaining JWT expiry and refresh-token flows.",
      "Add concrete numbers when describing project impact.",
    ],
    evaluationMode: "FALLBACK",
    provider: "LOCAL",
    model: "local",
    perQuestionFeedback: [
      {
        questionId: "q-architecture",
        questionPrompt:
          "Walk me through how you would design the frontend-to-backend flow for a resume upload and AI question generation feature.",
        answerText:
          "I would validate PDF files on the frontend, send multipart form data to the backend, parse text there, persist resume metadata, then call an endpoint that creates a session and returns structured questions.",
        score: 84,
        rationale: "Clear end-to-end flow with API and persistence awareness. It would be stronger with queueing, retry, and observability details.",
        missingSignals: ["async state", "error handling"],
        suggestedAnswer:
          "Start with the user flow, define upload validation and API boundaries, persist resume/session state, handle async parsing and retries, then close with monitoring and failure states.",
      },
      {
        questionId: "q-auth",
        questionPrompt:
          "How would you protect authenticated dashboard routes in a Next.js app that talks to a Spring Boot API?",
        answerText:
          "I would store a JWT after login, attach it to API requests, redirect unauthenticated users, and handle 401 responses by clearing the session.",
        score: 78,
        rationale: "Covers the core JWT route-protection path, but needs expiry, refresh, storage tradeoffs, and backend authorization checks.",
        missingSignals: ["token expiry", "API interceptor"],
        suggestedAnswer:
          "Mention route guards, secure token storage tradeoffs, request interceptors, 401 handling, expiry/refresh behavior, and backend role checks.",
      },
    ],
    summary:
      "Strong junior full-stack signal with practical architecture instincts. The next improvement is making answers more concise and evidence-driven.",
    createdAt: "2026-05-22T14:29:00.000Z",
  },
]

export const sampleQuestionPrompts = [
  "Which project on your resume best proves you can ship production-ready software, and why?",
  "How would you explain the architecture of this project to a senior engineer?",
  "Describe a bug you would expect in this feature and how you would investigate it.",
  "How do you decide what belongs in frontend logic versus backend logic?",
  "What security risks should be considered for resume upload and interview history?",
  "How would you test the critical path from upload to evaluation result?",
  "Tell me about a time you had to learn a new technology quickly.",
  "How would you improve this product after version one is deployed?",
]
