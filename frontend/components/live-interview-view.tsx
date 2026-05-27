"use client"

import Link from "next/link"
import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, CheckCircle2, Loader2, Mic, MicOff, Radio, Send } from "lucide-react"

import { StateBlock } from "@/components/state-block"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { makeId } from "@/services/auth-service"
import {
  createInterviewSession,
  evaluateInterviewWithContext,
  saveInterviewAnswers,
} from "@/services/interview-service"
import { listResumes } from "@/services/resume-service"
import type { Answer, InterviewSession, Resume, TranscriptMessage } from "@/types"
import { cn } from "@/lib/utils"

const skillOptions = [
  "Technical depth",
  "Communication",
  "Problem solving",
  "System design",
  "Product thinking",
  "Leadership",
]

type SpeechRecognitionResultLike = {
  isFinal: boolean
  0: { transcript: string }
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: SpeechRecognitionResultLike
  }
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

const createMessage = (
  role: TranscriptMessage["role"],
  content: string,
  questionId?: string
): TranscriptMessage => ({
  id: makeId("message"),
  role,
  content,
  questionId,
  createdAt: new Date().toISOString(),
})

export function LiveInterviewView() {
  const router = useRouter()
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState("")
  const [targetRole, setTargetRole] = useState("Full-stack Developer")
  const [seniority, setSeniority] = useState<InterviewSession["seniority"]>("Junior")
  const [domain, setDomain] = useState("Full-stack Web Development")
  const [questionCount, setQuestionCount] = useState(5)
  const [selectedSkills, setSelectedSkills] = useState<string[]>([
    "Technical depth",
    "Communication",
    "Problem solving",
  ])
  const [session, setSession] = useState<InterviewSession | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [draft, setDraft] = useState("")
  const [interimText, setInterimText] = useState("")
  const [listening, setListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [loading, setLoading] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    listResumes().then((items) => {
      setResumes(items)
      setResumeId(items[0]?.id ?? "")
    })
  }, [])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [transcript, interimText])

  const activeQuestion = session?.questions[activeIndex]
  const progress = session ? Math.round((answers.length / session.questions.length) * 100) : 0
  const canSubmitAnswer = draft.trim().length > 0 && !!activeQuestion && !evaluating
  const setupReady = resumeId && targetRole.trim() && domain.trim() && selectedSkills.length > 0

  const recognitionConstructor = useMemo(() => {
    if (typeof window === "undefined") return undefined
    const speechWindow = window as WindowWithSpeech
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition
  }, [])

  const toggleSkill = (skill: string) => {
    setSelectedSkills((current) =>
      current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]
    )
  }

  const handleStart = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!setupReady) {
        throw new Error("Please select a resume, domain, role, and at least one skill.")
      }

      const createdSession = await createInterviewSession({
        resumeId,
        targetRole,
        seniority,
        questionCount,
      })
      const firstQuestion = createdSession.questions[0]
      setSession(createdSession)
      setActiveIndex(0)
      setAnswers([])
      setDraft("")
      setTranscript([
        createMessage(
          "system",
          `Live interview started for ${targetRole} in ${domain}. Focus skills: ${selectedSkills.join(", ")}.`
        ),
        createMessage("interviewer", firstQuestion.prompt, firstQuestion.id),
      ])
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start live interview.")
    } finally {
      setLoading(false)
    }
  }

  const startListening = () => {
    setError("")

    if (!recognitionConstructor) {
      setSpeechSupported(false)
      setError("Voice recognition is not available in this browser. You can type the answer instead.")
      return
    }

    const recognition = new recognitionConstructor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.onresult = (event) => {
      let finalText = ""
      let interim = ""

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) {
          finalText += result[0].transcript
        } else {
          interim += result[0].transcript
        }
      }

      if (finalText.trim()) {
        setDraft((current) => `${current}${current ? " " : ""}${finalText.trim()}`)
      }
      setInterimText(interim)
    }
    recognition.onerror = () => {
      setListening(false)
      setError("Voice recognition stopped. Please try again or type your answer.")
    }
    recognition.onend = () => {
      setListening(false)
      setInterimText("")
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
    setListening(false)
  }

  const handleSubmitAnswer = async () => {
    if (!session || !activeQuestion || !draft.trim()) return

    const answer: Answer = {
      questionId: activeQuestion.id,
      response: draft.trim(),
    }
    const nextAnswers = [...answers, answer]
    let nextTranscript = [
      ...transcript,
      createMessage("candidate", answer.response, activeQuestion.id),
    ]

    setAnswers(nextAnswers)
    setDraft("")
    setInterimText("")

    const isLastQuestion = activeIndex >= session.questions.length - 1
    if (!isLastQuestion) {
      const nextQuestion = session.questions[activeIndex + 1]
      nextTranscript = [
        ...nextTranscript,
        createMessage(
          "interviewer",
          `Thanks. Next question: ${nextQuestion.prompt}`,
          nextQuestion.id
        ),
      ]
      setTranscript(nextTranscript)
      setActiveIndex((current) => current + 1)
      return
    }

    const closingTranscript = [
      ...nextTranscript,
      createMessage("system", "All answers captured. Generating skill-based feedback."),
    ]
    setTranscript(closingTranscript)
    setEvaluating(true)

    try {
      await saveInterviewAnswers(session.id, nextAnswers)
      const evaluation = await evaluateInterviewWithContext(session.id, nextAnswers, {
        transcript: closingTranscript,
        skills: selectedSkills,
        domain,
      })
      router.push(`/results/${evaluation.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to evaluate live interview.")
      setEvaluating(false)
    }
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Badge className="mb-3 bg-emerald-50 text-emerald-800">Realtime-ready mode</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Live voice interview</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Practice in a ChatGPT-style interview room with voice capture, transcript storage, and
            skill-based mock evaluation.
          </p>
        </div>

        {!resumes.length ? (
          <StateBlock
            title="Upload a resume first"
            description="Live interview mode needs resume context before generating questions."
          />
        ) : (
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Configure live session</CardTitle>
              <CardDescription>
                Choose the interview domain and skills that should drive the final scorecard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-5" onSubmit={handleStart}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="live-resume">Resume</Label>
                    <select
                      id="live-resume"
                      value={resumeId}
                      onChange={(event) => setResumeId(event.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {resumes.map((resume) => (
                        <option key={resume.id} value={resume.id}>
                          {resume.fileName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="live-domain">Interview domain</Label>
                    <Input
                      id="live-domain"
                      value={domain}
                      onChange={(event) => setDomain(event.target.value)}
                      placeholder="Backend, Frontend, Data, DevOps..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="live-role">Target role</Label>
                    <Input
                      id="live-role"
                      value={targetRole}
                      onChange={(event) => setTargetRole(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="live-seniority">Seniority</Label>
                    <select
                      id="live-seniority"
                      value={seniority}
                      onChange={(event) =>
                        setSeniority(event.target.value as InterviewSession["seniority"])
                      }
                      className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {["Intern", "Junior", "Middle", "Senior"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="live-count">Question count</Label>
                  <Input
                    id="live-count"
                    type="number"
                    min={3}
                    max={8}
                    value={questionCount}
                    onChange={(event) => setQuestionCount(Number(event.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Evaluation skills</Label>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {skillOptions.map((skill) => (
                      <label
                        key={skill}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm transition-colors",
                          selectedSkills.includes(skill) && "border-primary bg-primary/5"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSkills.includes(skill)}
                          onChange={() => toggleSkill(skill)}
                          className="size-4"
                        />
                        {skill}
                      </label>
                    ))}
                  </div>
                </div>

                {error ? <p className="text-sm text-destructive">{error}</p> : null}

                <Button type="submit" disabled={loading || !setupReady}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Radio className="size-4" />}
                  Start live interview
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="grid min-h-[calc(100vh-8rem)] gap-5 lg:grid-cols-[1fr_340px]">
      <section className="flex min-h-[640px] flex-col overflow-hidden rounded-lg border border-border bg-background shadow-xs">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <Badge className="mb-2 bg-emerald-50 text-emerald-800">{domain}</Badge>
              <h1 className="text-xl font-semibold">{targetRole} live interview</h1>
              <p className="text-sm text-muted-foreground">
                Question {activeIndex + 1} of {session.questions.length}
              </p>
            </div>
            <div className="w-full md:w-56">
              <Progress value={progress} />
              <p className="mt-1 text-right text-xs text-muted-foreground">{progress}% complete</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {transcript.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex",
                message.role === "candidate" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] rounded-lg px-4 py-3 text-sm leading-6",
                  message.role === "candidate"
                    ? "bg-primary text-primary-foreground"
                    : message.role === "system"
                      ? "border border-border bg-muted text-muted-foreground"
                      : "bg-[#edf4ef] text-foreground"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
          {interimText ? (
            <div className="flex justify-end">
              <div className="max-w-[82%] rounded-lg border border-dashed border-primary/40 px-4 py-3 text-sm text-muted-foreground">
                {interimText}
              </div>
            </div>
          ) : null}
          <div ref={transcriptEndRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="flex flex-col gap-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Speak with the orb or type your answer here..."
              className="min-h-28"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={listening ? stopListening : startListening}
                  className={cn(
                    "relative flex size-16 items-center justify-center rounded-full border border-border bg-[#12231d] text-white shadow-lg transition-transform hover:scale-[1.03]",
                    listening && "animate-pulse bg-emerald-700"
                  )}
                  aria-label={listening ? "Stop voice capture" : "Start voice capture"}
                >
                  {listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                  {listening ? (
                    <span className="absolute -inset-2 rounded-full border border-emerald-400/70" />
                  ) : null}
                </button>
                <div>
                  <p className="text-sm font-medium">
                    {listening ? "Listening..." : "Voice orb"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {speechSupported ? "Speech is saved as transcript text." : "Type fallback active."}
                  </p>
                </div>
              </div>
              <Button onClick={handleSubmitAnswer} disabled={!canSubmitAnswer}>
                {evaluating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                {activeIndex === session.questions.length - 1 ? "Finish and evaluate" : "Send answer"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Live scoring focus</CardTitle>
            <CardDescription>These skills will appear in the result scorecard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedSkills.map((skill) => (
              <div key={skill} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-emerald-700" />
                {skill}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Transcript storage</CardTitle>
            <CardDescription>
              Every interviewer question and candidate answer is attached to the final evaluation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/history">
                View saved interviews
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
