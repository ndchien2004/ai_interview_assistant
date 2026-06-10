import { AppShell } from "@/components/common/app-shell"
import { PracticeModeView } from "@/components/views/practice/practice-mode-view"

export default async function CourseDeckMatchPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params

  return (
    <AppShell>
      <PracticeModeView mode="MATCH" courseSlug={courseSlug} deckSlug={deckSlug} backHref={`/courses/${courseSlug}/decks/${deckSlug}`} backLabel="Bộ thẻ" />
    </AppShell>
  )
}
