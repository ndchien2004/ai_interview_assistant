import { AppShell } from "@/components/common/app-shell"
import { CourseDeckDetailView } from "@/components/views/courses/course-deck-detail-view"

export default async function CourseDeckPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params

  return (
    <AppShell>
      <CourseDeckDetailView courseSlug={courseSlug} deckSlug={deckSlug} />
    </AppShell>
  )
}
