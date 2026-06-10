import { AppShell } from "@/components/common/app-shell"
import { PracticeModeView } from "@/components/views/practice/practice-mode-view"

export default function JavaCoreTestPage() {
  return (
    <AppShell>
      <PracticeModeView mode="TEST" courseSlug="java-fullstack-flashcard-bank" backHref="/courses/java-core" backLabel="Java Full-stack" />
    </AppShell>
  )
}
