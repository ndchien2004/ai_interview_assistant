"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Mic, MicOff, PauseCircle, Plus, Send, Square, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import {
  createRealtimeInterviewSession,
  evaluateInterviewWithContext,
  saveInterviewAnswersWithContext,
  saveInterviewTranscript,
} from "@/services/interview-service"
import { makeId } from "@/services/auth-service"
import type { Answer, InterviewSession, TranscriptMessage } from "@/types"
import { cn } from "@/lib/utils"

type LiveChatInterviewRoomProps = {
  session: InterviewSession
}

type LiveStatus = "idle" | "connecting" | "connected" | "listening" | "speaking" | "error"

type RealtimeServerEvent = {
  type?: string
  transcript?: string
  delta?: string
  text?: string
  item?: unknown
  response?: unknown
  error?: {
    message?: string
  }
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

export function LiveChatInterviewRoom({ session }: LiveChatInterviewRoomProps) {
  const router = useRouter()
  const transcriptEndRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const assistantDraftRef = useRef("")
  const messagesRef = useRef<TranscriptMessage[]>([])
  const answersRef = useRef<Answer[]>([])
  const activeIndexRef = useRef(0)

  const initialActiveIndex = Math.min(session.answers?.length ?? 0, Math.max(session.questions.length - 1, 0))
  const [answers, setAnswers] = useState<Answer[]>(session.answers ?? [])
  const [messages, setMessages] = useState<TranscriptMessage[]>(() => initialTranscript(session))
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex)
  const [draft, setDraft] = useState("")
  const [assistantDraft, setAssistantDraft] = useState("")
  const [plusOpen, setPlusOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<LiveStatus>("idle")
  const [muted, setMuted] = useState(false)
  const [fallbackReason, setFallbackReason] = useState("")
  const [error, setError] = useState("")

  const activeQuestion = session.questions[activeIndex]
  const answeredCount = useMemo(
    () => new Set(answers.filter((answer) => answer.response.trim()).map((answer) => answer.questionId)).size,
    [answers]
  )
  const progress = Math.round((answeredCount / Math.max(session.questions.length, 1)) * 100)
  const isLastQuestion = activeIndex >= session.questions.length - 1
  const canSend = Boolean(activeQuestion && draft.trim() && !saving)
  const liveConnected = status === "connected" || status === "listening" || status === "speaking"

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    answersRef.current = answers
  }, [answers])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages, assistantDraft])

  const disconnectRealtime = useCallback(() => {
    dataChannelRef.current?.close()
    dataChannelRef.current = null
    peerRef.current?.close()
    peerRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
  }, [])

  useEffect(() => {
    return () => disconnectRealtime()
  }, [disconnectRealtime])

  const persistTranscript = useCallback((nextMessages: TranscriptMessage[]) => {
    void saveInterviewTranscript(session.id, nextMessages)
  }, [session.id])

  const updateMessages = useCallback(
    (updater: (current: TranscriptMessage[]) => TranscriptMessage[]) => {
      setMessages((current) => {
        const nextMessages = updater(current)
        messagesRef.current = nextMessages
        persistTranscript(nextMessages)
        return nextMessages
      })
    },
    [persistTranscript]
  )

  const mergeAnswer = useCallback((questionId: string, content: string) => {
    const text = content.trim()
    if (!text) return answersRef.current

    const existingIndex = answersRef.current.findIndex((answer) => answer.questionId === questionId)
    const nextAnswers =
      existingIndex >= 0
        ? answersRef.current.map((answer, index) =>
            index === existingIndex
              ? {
                  ...answer,
                  response: answer.response.trim()
                    ? `${answer.response.trim()}\n${text}`
                    : text,
                }
              : answer
          )
        : [...answersRef.current, { questionId, response: text }]

    answersRef.current = nextAnswers
    setAnswers(nextAnswers)
    return nextAnswers
  }, [])

  const sendRealtimeEvent = (event: Record<string, unknown>) => {
    const channel = dataChannelRef.current
    if (!channel || channel.readyState !== "open") return false
    channel.send(JSON.stringify(event))
    return true
  }

  const askRealtimeQuestion = useCallback((questionIndex: number, prefix: string) => {
    const question = session.questions[questionIndex]
    if (!question) return

    const signals = question.expectedSignals.length
      ? `Expected signals: ${question.expectedSignals.join(", ")}.`
      : "Expected signals: clear structure, concrete evidence, and role fit."

    sendRealtimeEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${prefix}\nQuestion ${questionIndex + 1}/${session.questions.length}: ${question.prompt}\n${signals}\nAsk this question now. Keep your spoken response brief.`,
          },
        ],
      },
    })
    sendRealtimeEvent({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        max_output_tokens: 450,
      },
    })
  }, [session.questions])

  const startRealtime = async () => {
    setError("")
    setFallbackReason("")
    setStatus("connecting")

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not available in this browser.")
      }

      const realtime = await createRealtimeInterviewSession(session.id)
      if (!realtime.enabled || !realtime.clientSecret) {
        setFallbackReason(realtime.message ?? "Realtime voice is not enabled.")
        setStatus("idle")
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      localStreamRef.current = stream

      const peer = new RTCPeerConnection()
      peerRef.current = peer
      stream.getAudioTracks().forEach((track) => peer.addTrack(track, stream))

      peer.ontrack = (event) => {
        if (audioRef.current) {
          audioRef.current.srcObject = event.streams[0]
        }
      }
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setStatus("connected")
        if (peer.connectionState === "failed" || peer.connectionState === "disconnected") {
          setStatus("error")
          setFallbackReason("Realtime connection dropped. Typed live practice is still available.")
        }
      }

      const channel = peer.createDataChannel("oai-events")
      dataChannelRef.current = channel
      channel.addEventListener("open", () => {
        setStatus("listening")
        askRealtimeQuestion(activeIndexRef.current, "Start the live interview with a short greeting.")
      })
      channel.addEventListener("message", (event) => handleRealtimeEvent(event.data))

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${realtime.clientSecret}`,
          "Content-Type": "application/sdp",
        },
      })
      if (!sdpResponse.ok) {
        throw new Error(await openAiRealtimeErrorMessage(sdpResponse))
      }

      await peer.setRemoteDescription({
        type: "answer",
        sdp: await sdpResponse.text(),
      })
    } catch (caught) {
      disconnectRealtime()
      setStatus("error")
      setFallbackReason("Realtime voice failed to start. Typed live practice is still available.")
      setError(caught instanceof Error ? caught.message : "Unable to start realtime voice.")
    }
  }

  const handleRealtimeEvent = (raw: string) => {
    let event: RealtimeServerEvent
    try {
      event = JSON.parse(raw) as RealtimeServerEvent
    } catch {
      return
    }

    if (event.type === "error") {
      setError(event.error?.message ?? "Realtime session returned an error.")
      setStatus("error")
      return
    }
    if (event.type === "input_audio_buffer.speech_started") {
      setStatus("listening")
      return
    }
    if (event.type === "response.created") {
      setStatus("speaking")
      return
    }
    if (event.type === "response.done") {
      finalizeAssistantDraft()
      setStatus("listening")
      return
    }

    const assistantDelta = event.delta ?? (event.type?.includes("delta") ? event.text : "")
    if (
      assistantDelta &&
      (event.type?.includes("audio_transcript") || event.type?.includes("output_text"))
    ) {
      assistantDraftRef.current += assistantDelta
      setAssistantDraft(assistantDraftRef.current)
      setStatus("speaking")
      return
    }

    if (event.type?.includes("audio_transcript.done") || event.type?.includes("output_text.done")) {
      finalizeAssistantDraft(event.transcript ?? event.text)
      setStatus("listening")
      return
    }

    if (event.type === "conversation.item.input_audio_transcription.completed" && event.transcript) {
      const question = session.questions[activeIndexRef.current]
      if (!question) return
      const candidateText = event.transcript.trim()
      if (!candidateText) return
      const nextAnswers = mergeAnswer(question.id, candidateText)
      updateMessages((current) => [...current, createMessage("candidate", candidateText, question.id)])
      void saveInterviewAnswersWithContext(session.id, nextAnswers, messagesRef.current)
    }
  }

  const finalizeAssistantDraft = (fallback?: string) => {
    const text = (fallback ?? assistantDraftRef.current).trim()
    assistantDraftRef.current = ""
    setAssistantDraft("")
    if (!text) return
    const question = session.questions[activeIndexRef.current]
    updateMessages((current) => [...current, createMessage("interviewer", text, question?.id)])
  }

  const toggleMute = () => {
    const nextMuted = !muted
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setMuted(nextMuted)
  }

  const interrupt = () => {
    sendRealtimeEvent({ type: "response.cancel" })
    finalizeAssistantDraft()
    setStatus("listening")
  }

  const nextQuestion = async () => {
    if (isLastQuestion) {
      await finishInterview()
      return
    }
    const nextIndex = activeIndex + 1
    setActiveIndex(nextIndex)
    const question = session.questions[nextIndex]
    updateMessages((current) => [...current, createMessage("system", `Moving to question ${nextIndex + 1}.`) ])
    if (liveConnected) {
      askRealtimeQuestion(nextIndex, "Move to the next interview question.")
    } else if (question) {
      updateMessages((current) => [...current, createMessage("interviewer", question.prompt, question.id)])
    }
  }

  const submitTypedAnswer = async () => {
    if (!activeQuestion || !draft.trim()) return
    const answerText = draft.trim()
    const nextAnswers = mergeAnswer(activeQuestion.id, answerText)
    const nextMessages = [...messagesRef.current, createMessage("candidate", answerText, activeQuestion.id)]
    setDraft("")
    setMessages(nextMessages)
    messagesRef.current = nextMessages
    persistTranscript(nextMessages)
    await saveInterviewAnswersWithContext(session.id, nextAnswers, nextMessages)
    if (isLastQuestion) {
      await finishInterview(nextAnswers, [...nextMessages, createMessage("system", "All answers captured. Generating your evaluation.")])
    } else {
      await nextQuestion()
    }
  }

  const finishInterview = async (
    nextAnswers = answersRef.current,
    nextMessages = messagesRef.current
  ) => {
    if (!nextAnswers.length) {
      setError("Answer at least one question before ending the interview.")
      return
    }
    setSaving(true)
    setError("")
    disconnectRealtime()
    try {
      await saveInterviewAnswersWithContext(session.id, nextAnswers, nextMessages)
      const evaluation = await evaluateInterviewWithContext(session.id, nextAnswers, {
        transcript: nextMessages,
        skills: session.evaluationSkills,
        domain: session.domain,
      })
      router.push(`/results/${evaluation.id}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to evaluate live interview.")
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col">
      <audio ref={audioRef} autoPlay />

      <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{session.domain || "Live interview"}</p>
          <h1 className="truncate text-lg font-semibold">{session.targetRole}</h1>
        </div>
        <div className="flex min-w-[220px] items-center gap-3">
          <div className="hidden flex-1 sm:block">
            <Progress value={progress} />
          </div>
          <span className="hidden text-xs text-muted-foreground md:inline">
            {answeredCount}/{session.questions.length}
          </span>
          <Button variant="outline" onClick={() => finishInterview()} disabled={saving || !answers.length}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Square className="size-4" />}
            End
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-1 py-6 pb-44">
          {messages.length <= 2 ? (
            <div className="flex min-h-[42vh] items-center justify-center text-center">
              <div>
                <h2 className="text-2xl font-semibold">Ready for your {session.targetRole} interview?</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  {session.seniority} - {session.questionCount} questions - {session.domain || "General interview"}
                </p>
                {!liveConnected ? (
                  <Button className="mt-6" onClick={startRealtime} disabled={status === "connecting"}>
                    {status === "connecting" ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
                    Start live
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "candidate" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[86%] whitespace-pre-wrap text-sm leading-7",
                    message.role === "candidate"
                      ? "rounded-2xl bg-primary px-4 py-2.5 text-primary-foreground"
                      : message.role === "system"
                        ? "mx-auto text-xs text-muted-foreground"
                        : "text-foreground"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {assistantDraft ? (
              <div className="flex justify-start">
                <div className="max-w-[86%] whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {assistantDraft}
                </div>
              </div>
            ) : null}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-background/95 pb-3 pt-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            {fallbackReason ? <p className="mb-2 text-sm text-muted-foreground">{fallbackReason}</p> : null}
            {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
            <div className="relative rounded-[2rem] border border-border bg-background px-3 py-2 shadow-lg">
              {plusOpen ? (
                <div className="absolute bottom-16 left-3 w-56 rounded-lg border border-border bg-background p-2 text-sm shadow-xl">
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                    onClick={() => setDraft((value) => `${value}${value ? "\n" : ""}Note: `)}
                  >
                    Insert note
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                    onClick={() => setDraft(session.sourceResumeSummary ?? "")}
                  >
                    Attach resume context
                  </button>
                  <button
                    type="button"
                    className="block w-full rounded-md px-3 py-2 text-left hover:bg-muted"
                    onClick={() => setDraft("")}
                  >
                    Clear draft
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setPlusOpen((open) => !open)} aria-label="Open composer menu">
                  <Plus />
                </Button>
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={liveConnected ? "Optional typed note..." : "Type your answer..."}
                  className="max-h-40 min-h-10 flex-1 resize-none border-0 px-0 py-2 focus-visible:ring-0"
                />
                {!liveConnected ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    onClick={startRealtime}
                    disabled={status === "connecting"}
                    aria-label="Start realtime voice"
                  >
                    {status === "connecting" ? <Loader2 className="size-4 animate-spin" /> : <Mic />}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant={muted ? "destructive" : "secondary"}
                      size="icon-sm"
                      onClick={toggleMute}
                      aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                      className={cn(status === "listening" && !muted && "animate-pulse")}
                    >
                      {muted ? <MicOff /> : <Mic />}
                    </Button>
                    <Button type="button" variant="outline" size="icon-sm" onClick={interrupt} aria-label="Interrupt AI">
                      <PauseCircle />
                    </Button>
                  </>
                )}
                {draft.trim() ? (
                  <Button type="button" onClick={submitTypedAnswer} disabled={!canSend}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    Send
                  </Button>
                ) : (
                  <Button type="button" onClick={nextQuestion} disabled={saving || (!answers.length && !liveConnected)}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : isLastQuestion ? <Check className="size-4" /> : <Send className="size-4" />}
                    {saving ? "Ending..." : isLastQuestion ? "Finish" : "Next"}
                  </Button>
                )}
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              AI feedback may be inaccurate. Review important details.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function initialTranscript(session: InterviewSession) {
  if (session.transcript?.length) {
    return session.transcript
  }
  const firstQuestion = session.questions[0]
  return [
    createMessage("system", `Live interview started for ${session.targetRole}.`),
    firstQuestion
      ? createMessage("interviewer", firstQuestion.prompt, firstQuestion.id)
      : createMessage("interviewer", "Let's begin when you are ready."),
  ]
}

async function openAiRealtimeErrorMessage(response: Response) {
  const fallback = `OpenAI realtime call failed with HTTP ${response.status}.`
  let details = ""

  try {
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const json = await response.json()
      details = json?.error?.message ?? json?.message ?? ""
    } else {
      details = await response.text()
    }
  } catch {
    details = ""
  }

  if (response.status === 429) {
    return details
      ? `OpenAI Realtime is rate limited or out of quota: ${details}`
      : "OpenAI Realtime is rate limited or out of quota. Check your OpenAI billing, realtime model access, and retry after a short wait."
  }

  if (response.status === 401 || response.status === 403) {
    return details
      ? `OpenAI Realtime authentication failed: ${details}`
      : "OpenAI Realtime authentication failed. Check OPENAI_API_KEY and realtime model access."
  }

  return details ? `${fallback} ${details}` : fallback
}
