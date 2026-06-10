import { AppShell } from "@/components/common/app-shell"
import { PracticeModeView } from "@/components/views/practice/practice-mode-view"

export default async function CourseDeckLearnPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params
  const backHref = `/courses/${courseSlug}/decks/${deckSlug}`

  return (
    <AppShell>
      <PracticeModeView mode="LEARN" courseSlug={courseSlug} deckSlug={deckSlug} backHref={backHref} backLabel="Bộ thẻ" />
    </AppShell>
  )
}
