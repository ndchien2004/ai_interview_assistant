import { redirect } from "next/navigation"

export default async function CourseDeckReviewDuePage({ params }: { params: Promise<{ courseSlug: string; deckSlug: string }> }) {
  const { courseSlug, deckSlug } = await params
  redirect(`/courses/${courseSlug}/decks/${deckSlug}/learn`)
}
