import { AppShell } from "@/components/common/app-shell"
import { ResultView } from "@/components/views/results/result-view"

type ResultPageProps = {
  params: Promise<{ id: string }>
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { id } = await params

  return (
    <AppShell>
      <ResultView evaluationId={id} />
    </AppShell>
  )
}
