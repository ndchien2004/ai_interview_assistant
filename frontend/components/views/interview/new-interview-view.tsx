import { Badge } from "@/components/ui/badge"
import { InterviewSetupForm } from "@/components/views/interview/interview-setup-form"

export function NewInterviewView({ initialMode = "WRITTEN" }: { initialMode?: "WRITTEN" | "LIVE" }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <Badge className="mb-3 bg-amber-50 text-amber-800">Question generation</Badge>
          <h1 className="text-3xl font-semibold tracking-normal">Create a mock interview</h1>
          <p className="mt-2 text-muted-foreground">
            Generate a resume-aware question set from your target role, seniority, and CV signals.
          </p>
        </div>
      </div>
      <InterviewSetupForm initialMode={initialMode} />
    </div>
  )
}
