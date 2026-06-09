import { AppShell } from "@/components/common/app-shell"
import { CourseDeckListView } from "@/components/views/courses/course-deck-list-view"

export default async function CoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params

  return (
    <AppShell>
      <CourseDeckListView courseSlug={courseSlug} />
    </AppShell>
  )
}
