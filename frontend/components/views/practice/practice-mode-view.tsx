"use client"

import { useState } from "react"
import { useEffect } from "react"

import { CourseDeckMatchView } from "@/components/views/courses/course-deck-match-view"
import { JavaCoreStudySessionView } from "@/components/views/practice/java-core-study-session-view"
import { JavaCoreTestView } from "@/components/views/practice/java-core-test-view"
import { SessionSetupView } from "@/components/views/practice/session-setup-view"
import { StateBlock } from "@/components/common/state-block"
import { getActivePracticeSession } from "@/services/practice-service"
import type { PracticeSession, PracticeSessionMode } from "@/types"

type SetupMode = Extract<PracticeSessionMode, "LEARN" | "TEST" | "MATCH">

export function PracticeModeView({
  mode,
  courseSlug,
  deckSlug,
  backHref,
  backLabel,
}: {
  mode: SetupMode
  courseSlug: string
  deckSlug?: string
  backHref: string
  backLabel: string
}) {
  const [session, setSession] = useState<PracticeSession | null>(null)
  const [checkedScope, setCheckedScope] = useState("")
  const scopeKey = `${courseSlug}:${mode}:${deckSlug ?? "course"}`

  useEffect(() => {
    let active = true
    getActivePracticeSession(courseSlug, mode, deckSlug)
      .then((activeSession) => {
        if (!active) return
        setSession(activeSession)
        setCheckedScope(scopeKey)
      })
    return () => {
      active = false
    }
  }, [courseSlug, deckSlug, mode, scopeKey])

  if (checkedScope !== scopeKey) {
    return <StateBlock title="Đang kiểm tra phiên học" description="Đang tìm phiên học còn dang dở của bạn." />
  }

  if (!session) {
    return (
      <SessionSetupView
        mode={mode}
        courseSlug={courseSlug}
        deckSlug={deckSlug}
        backHref={backHref}
        backLabel={backLabel}
        onStart={setSession}
      />
    )
  }

  if (mode === "TEST") {
    return <JavaCoreTestView courseSlug={courseSlug} deckSlug={deckSlug} backHref={backHref} backLabel={backLabel} initialSession={session} />
  }

  if (mode === "MATCH") {
    return <CourseDeckMatchView courseSlug={courseSlug} deckSlug={deckSlug} initialSession={session} backHref={backHref} />
  }

  return (
    <JavaCoreStudySessionView
      mode="LEARN"
      courseSlug={courseSlug}
      deckSlug={deckSlug}
      backHref={backHref}
      backLabel={backLabel}
      initialSession={session}
    />
  )
}
