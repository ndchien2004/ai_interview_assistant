import { AppShell } from "@/components/common/app-shell"
import { JavaCoreStudySessionView } from "@/components/views/practice/java-core-study-session-view"

export default function JavaCoreLearnPage() {
  return (
    <AppShell>
      <JavaCoreStudySessionView mode="LEARN" />
    </AppShell>
  )
}
