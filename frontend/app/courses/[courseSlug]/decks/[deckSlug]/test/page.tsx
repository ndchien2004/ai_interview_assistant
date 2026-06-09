import { AppShell } from "@/components/common/app-shell"
import { JavaCoreTestView } from "@/components/views/practice/java-core-test-view"

export default async function CourseDeckTestPage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params
  const backHref = `/courses/${courseSlug}/decks/${deckSlug}`

  return (
    <AppShell>
      <JavaCoreTestView courseSlug={courseSlug} deckSlug={deckSlug} backHref={backHref} backLabel="Bộ thẻ" />
    </AppShell>
  )
}
