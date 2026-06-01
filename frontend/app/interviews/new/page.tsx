import { AppShell } from "@/components/common/app-shell"
import { NewInterviewView } from "@/components/views/interview/new-interview-view"

type NewInterviewPageProps = {
  searchParams: Promise<{ mode?: string }>
}

export default async function NewInterviewPage({ searchParams }: NewInterviewPageProps) {
  const { mode } = await searchParams

  return (
    <AppShell>
      <NewInterviewView initialMode={mode === "live" ? "LIVE" : "WRITTEN"} />
    </AppShell>
  )
}
