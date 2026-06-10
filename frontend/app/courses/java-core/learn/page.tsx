import { AppShell } from "@/components/common/app-shell"
import { PracticeModeView } from "@/components/views/practice/practice-mode-view"

export default function JavaCoreLearnPage() {
  return (
    <AppShell>
      <PracticeModeView mode="LEARN" courseSlug="java-fullstack-flashcard-bank" backHref="/courses/java-core" backLabel="Java Full-stack" />
    </AppShell>
  )
}
