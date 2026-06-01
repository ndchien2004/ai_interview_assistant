import { AppShell } from "@/components/common/app-shell"
import { InterviewRoom } from "@/components/views/interview/interview-room"

type InterviewPageProps = {
  params: Promise<{ id: string }>
}

export default async function InterviewPage({ params }: InterviewPageProps) {
  const { id } = await params

  return (
    <AppShell>
      <InterviewRoom sessionId={id} />
    </AppShell>
  )
}
