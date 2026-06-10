import { AppShell } from "@/components/common/app-shell"
import { PracticeModeView } from "@/components/views/practice/practice-mode-view"

export default async function CourseDeckTestPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params
  const backHref = `/courses/${courseSlug}/decks/${deckSlug}`

  return (
    <AppShell>
      <PracticeModeView mode="TEST" courseSlug={courseSlug} deckSlug={deckSlug} backHref={backHref} backLabel="Bộ thẻ" />
    </AppShell>
  )
}
