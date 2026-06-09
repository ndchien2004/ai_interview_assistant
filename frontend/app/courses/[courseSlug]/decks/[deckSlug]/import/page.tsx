import { AppShell } from "@/components/common/app-shell"
import { CourseDeckImportView } from "@/components/views/courses/course-deck-import-view"

export default async function CourseDeckImportPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params

  return (
    <AppShell>
      <CourseDeckImportView courseSlug={courseSlug} deckSlug={deckSlug} />
    </AppShell>
  )
}
