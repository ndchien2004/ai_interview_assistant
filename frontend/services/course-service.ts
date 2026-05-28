"use client"

import { getAuthToken, makeId } from "@/services/auth-service"
import type {
  Course,
  CourseImportPayload,
  CourseImportResponse,
  CourseProgress,
  CourseSection,
  ImportDelimiterMode,
  ParsedImportPreview,
  PracticeQuestion,
  QuestionDifficulty,
} from "@/types"
import vietnameseJavaCoreFlashcards from "@/data/java_core_interview_questions_vi.json"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL
const COURSE_SLUG = "java-core-interview-mastery"
const IMPORTED_QUESTIONS_KEY = "java-core-imported-questions"

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

export type AdminCoursePayload = {
  title: string
  slug: string
  description: string
  active: boolean
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
  const questions = course.sections?.flatMap((section) => section.questions) ?? []
  const attempted = questions.filter((question) => progress[question.id]).length
  const mastered = questions.filter((question) => progress[question.id]?.confidence === "MASTERED").length
  const scoreMap: Record<string, number> = { AGAIN: 1, HARD: 2, GOOD: 3, MASTERED: 4 }
  const averageConfidence =
    attempted === 0
      ? 0
      : questions.reduce((total, question) => total + (scoreMap[progress[question.id]?.confidence ?? "AGAIN"] || 0), 0) /
        attempted

  const topics = Object.values(
    questions.reduce<Record<string, { topic: string; total: number; attempted: number; mastered: number }>>(
      (acc, question) => {
        acc[question.topic] ??= { topic: question.topic, total: 0, attempted: 0, mastered: 0 }
        acc[question.topic].total += 1
        if (progress[question.id]) acc[question.topic].attempted += 1
        if (progress[question.id]?.confidence === "MASTERED") acc[question.topic].mastered += 1
        return acc
      },
      {}
    )
  )

  return {
    courseSlug: slug,
    totalQuestions: questions.length,
    attemptedQuestions: attempted,
    masteredQuestions: mastered,
    masteryPercentage: questions.length ? Math.round((mastered / questions.length) * 100) : 0,
    averageConfidence,
    topics,
  }
}

export function readLocalProgress() {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.localStorage.getItem("java-core-progress") ?? "{}") as Record<
      string,
      { confidence: string; answerText?: string }
    >
  } catch {
    return {}
  }
}

export function writeLocalProgress(questionId: string, confidence: string, answerText?: string) {
  const progress = readLocalProgress()
  progress[questionId] = { confidence, answerText }
  window.localStorage.setItem("java-core-progress", JSON.stringify(progress))
}

function mockJavaCourse(): Course {
  const sections: CourseSection[] = topicSeeds().map((topic, topicIndex) => ({
    id: makeId(`section-${topic.slug}`),
    slug: topic.slug,
    title: topic.title,
    description: `Practice interview questions for ${topic.title}.`,
    sortOrder: topicIndex + 1,
    questions: topic.prompts.map((prompt, index) => buildQuestion(topic, prompt, index)),
  }))

  sections.push({
    id: "section-imported-java-core-vi",
    slug: "imported-java-core-vi",
    title: "Imported Java Core VI",
    description: "Flashcards imported from the Vietnamese Java Core CSV file.",
    sortOrder: sections.length + 1,
    questions: vietnameseJavaCoreFlashcards.map((row, index) => ({
      id: `imported-java-core-vi-${index + 1}`,
      question: row.question,
      shortAnswer: row.answer,
      detailedAnswer: row.answer,
      keyPoints: [row.answer],
      commonMistakes: ["Đánh dấu đã thuộc trước khi có thể tự nhớ lại câu trả lời."],
      difficulty: "BEGINNER",
      topic: "Imported Java Core VI",
      tags: ["java-core", "imported", "user-flashcard", "vietnamese"],
      codeSnippet: null,
      sortOrder: 101 + index,
    })),
  })

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
    id: "course-java-core",
    slug: COURSE_SLUG,
    title: "Java Core Interview Mastery",
    description:
      "A structured 100-question Java Core course for interview preparation, covering syntax, OOP, collections, exceptions, generics, Java 8, streams, concurrency, JVM, and I/O.",
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

function buildQuestion(
  topic: { slug: string; title: string; concepts: string[] },
  prompt: string,
  index: number
): PracticeQuestion {
  const difficulty: QuestionDifficulty = index % 5 === 4 ? "ADVANCED" : index % 2 === 1 ? "INTERMEDIATE" : "BEGINNER"

  return {
    id: `${topic.slug}-${index + 1}`,
    question: prompt,
    shortAnswer: `Define the ${topic.title} concept, explain why it matters, and mention ${topic.concepts
      .slice(0, 3)
      .join(", ")}.`,
    detailedAnswer: `A strong answer starts with the core definition, then explains runtime behavior, tradeoffs, and a practical example. Connect the answer to ${topic.concepts.join(
      ", "
    )}.`,
    keyPoints: topic.concepts,
    commonMistakes: [
      "Giving only a memorized definition.",
      "Skipping edge cases or runtime behavior.",
      "Not comparing the concept with nearby Java alternatives.",
    ],
    difficulty,
    topic: topic.title,
    tags: ["java-core", topic.slug, difficulty.toLowerCase()],
    codeSnippet: ["streams-and-lambdas", "multithreading-and-concurrency", "collections-framework"].includes(topic.slug)
      ? "// Explain this snippet and its tradeoffs\n"
      : null,
    sortOrder: index + 1,
  }
}

function topicSeeds(): Array<{ slug: string; title: string; concepts: string[]; prompts: string[] }> {
  return [
    topic("java-basics-and-syntax", "Java Basics and Syntax", ["primitive vs reference types", "pass-by-value", "operators", "control flow"], [
      "Explain why Java is considered platform independent and how bytecode fits into that story.",
      "What is the difference between primitive types and reference types in Java?",
      "Does Java pass parameters by value or by reference? Explain with an object example.",
      "How do final variables, final methods, and final classes differ?",
      "What happens when integer overflow occurs in Java?",
      "Explain static fields, static methods, and static initialization blocks.",
      "What is the difference between == and equals for Java objects?",
      "How does Java handle variable scope inside loops, methods, and blocks?",
    ]),
    topic("oop", "OOP", ["encapsulation", "inheritance", "polymorphism", "abstraction", "composition"], [
      "Explain encapsulation and give a Java example where it improves maintainability.",
      "What is polymorphism in Java, and how do overriding and dynamic dispatch work?",
      "Compare abstract classes and interfaces in modern Java.",
      "When would you prefer composition over inheritance?",
      "Explain method overloading versus method overriding.",
      "What is constructor chaining, and how do this() and super() work?",
      "Why should equals and hashCode be implemented together?",
      "What are access modifiers and how do they support API design?",
      "Explain the Liskov Substitution Principle with a Java inheritance example.",
      "What is an immutable class, and how would you design one?",
      "How do nested, inner, local, and anonymous classes differ?",
      "What are sealed classes and what problem do they solve?",
    ]),
    topic("string-and-wrapper-classes", "String and Wrapper Classes", ["immutability", "String pool", "equals vs ==", "autoboxing"], [
      "Why is String immutable in Java?",
      "Explain the String pool and when intern() is useful or risky.",
      "Compare String, StringBuilder, and StringBuffer.",
      "Why can == be misleading when comparing Strings?",
      "What is autoboxing and unboxing, and where can it cause bugs?",
      "Explain wrapper class caching for Integer and Boolean.",
      "How do you handle null safely when working with wrapper types?",
      "What are common performance pitfalls in repeated String concatenation?",
    ]),
    topic("collections-framework", "Collections Framework", ["List vs Set vs Map", "hashing", "ordering", "iteration", "complexity"], [
      "Compare ArrayList and LinkedList for access, insertion, and memory use.",
      "How does HashMap work internally at a high level?",
      "Why must hashCode be stable for keys stored in HashMap?",
      "Compare HashSet, LinkedHashSet, and TreeSet.",
      "Compare HashMap, LinkedHashMap, TreeMap, and ConcurrentHashMap.",
      "What is fail-fast iteration and why does ConcurrentModificationException happen?",
      "How would you choose between List, Set, and Map for a business feature?",
      "Explain Comparable versus Comparator.",
      "What are the time complexities of common ArrayList and HashMap operations?",
      "How does resizing affect HashMap performance?",
      "What is the difference between Iterator remove and collection remove during iteration?",
      "When should you use Collections.unmodifiableList or List.copyOf?",
      "Explain Queue, Deque, and PriorityQueue use cases.",
      "How do equals and hashCode affect Set uniqueness?",
    ]),
    topic("exceptions", "Exceptions", ["checked exceptions", "unchecked exceptions", "try-with-resources", "custom exceptions"], [
      "Compare checked and unchecked exceptions.",
      "When should you create a custom exception?",
      "How does try-with-resources work?",
      "What is exception chaining and why is it useful?",
      "Why is catching Exception or Throwable usually a smell?",
      "How should a service layer translate low-level exceptions?",
      "What happens when finally returns or throws an exception?",
    ]),
    topic("generics", "Generics", ["type safety", "wildcards", "type erasure", "bounded types"], [
      "What problem do generics solve in Java?",
      "Explain type erasure and one limitation it creates.",
      "What is the difference between List<? extends Number> and List<? super Integer>?",
      "What are bounded type parameters?",
      "Why cannot you create a generic array directly?",
      "How do raw types break type safety?",
      "Explain PECS: producer extends, consumer super.",
    ]),
    topic("java-8-features", "Java 8 Features", ["default methods", "Optional", "functional interfaces", "method references"], [
      "What is a functional interface?",
      "Compare lambda expressions and anonymous classes.",
      "What are method references and when do they improve readability?",
      "How should Optional be used, and how should it not be used?",
      "What are default methods in interfaces?",
      "Explain java.time improvements over Date and Calendar.",
      "How do Predicate, Function, Consumer, and Supplier differ?",
      "What is the difference between map and flatMap?",
      "How can default methods create multiple inheritance conflicts?",
      "Explain effectively final variables in lambdas.",
      "When should Optional not be used as a field or parameter?",
      "What changed in interfaces after Java 8?",
    ]),
    topic("streams-and-lambdas", "Streams and Lambdas", ["lazy evaluation", "intermediate operations", "terminal operations", "parallel streams"], [
      "Explain intermediate and terminal stream operations.",
      "Why are streams lazy?",
      "Compare map, filter, reduce, and collect.",
      "When can parallel streams hurt performance?",
      "How do you debug a stream pipeline?",
      "What is the difference between findFirst and findAny?",
      "How do collectors like groupingBy and partitioningBy work?",
      "What side effects should be avoided inside stream operations?",
    ]),
    topic("multithreading-and-concurrency", "Multithreading and Concurrency", ["thread lifecycle", "synchronization", "volatile", "locks", "executors"], [
      "Explain the Java thread lifecycle.",
      "Compare synchronized methods and synchronized blocks.",
      "What does volatile guarantee and what does it not guarantee?",
      "Compare Runnable, Callable, Future, and CompletableFuture.",
      "What is a race condition and how can it be prevented?",
      "Explain deadlock and how to reduce the risk.",
      "When would you use ReentrantLock instead of synchronized?",
      "What is the ExecutorService and why is it preferred over manual threads?",
      "Explain thread-safe collections in Java.",
      "What are atomic classes and CAS?",
      "How does wait/notify differ from sleep?",
      "What is the difference between concurrency and parallelism?",
    ]),
    topic("jvm-memory-gc", "JVM, Memory, GC", ["heap", "stack", "metaspace", "GC roots", "garbage collectors"], [
      "Explain heap, stack, and metaspace.",
      "How does garbage collection decide an object is unreachable?",
      "What are GC roots?",
      "What can cause a memory leak in Java despite garbage collection?",
      "Compare minor GC and major/full GC conceptually.",
      "How would you investigate OutOfMemoryError?",
      "What is the difference between stack overflow and heap exhaustion?",
      "How do strong, soft, weak, and phantom references differ?",
    ]),
    topic("io-serialization-date-time", "I/O, Serialization, Date/Time", ["streams", "serialization", "NIO", "java.time"], [
      "Compare byte streams and character streams.",
      "What is Java serialization and why can it be risky?",
      "How does NIO differ from classic IO?",
      "Why is java.time preferred over Date and Calendar?",
    ]),
  ]
}

function topic(slug: string, title: string, concepts: string[], prompts: string[]) {
  return { slug, title, concepts, prompts }
}
