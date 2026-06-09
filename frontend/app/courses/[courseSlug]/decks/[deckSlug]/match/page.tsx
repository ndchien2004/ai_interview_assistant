import { AppShell } from "@/components/common/app-shell"
import { CourseDeckMatchView } from "@/components/views/courses/course-deck-match-view"

export default async function CourseDeckMatchPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params

  return (
    <AppShell>
      <CourseDeckMatchView courseSlug={courseSlug} deckSlug={deckSlug} />
    </AppShell>
  )
}
