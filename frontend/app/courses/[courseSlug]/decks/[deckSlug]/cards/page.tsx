import { AppShell } from "@/components/common/app-shell"
import { CourseDeckCardsView } from "@/components/views/courses/course-deck-cards-view"

export default async function CourseDeckCardsPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params

  return (
    <AppShell>
      <CourseDeckCardsView courseSlug={courseSlug} deckSlug={deckSlug} />
    </AppShell>
  )
}
