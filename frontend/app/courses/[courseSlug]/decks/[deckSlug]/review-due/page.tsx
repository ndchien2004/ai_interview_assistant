import { AppShell } from "@/components/common/app-shell"
import { JavaCoreStudySessionView } from "@/components/views/practice/java-core-study-session-view"

export default async function CourseDeckReviewDuePage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params
  const backHref = `/courses/${courseSlug}/decks/${deckSlug}`

  return (
    <AppShell>
      <JavaCoreStudySessionView mode="REVIEW_DUE" courseSlug={courseSlug} deckSlug={deckSlug} backHref={backHref} backLabel="Bộ thẻ" />
    </AppShell>
  )
}
