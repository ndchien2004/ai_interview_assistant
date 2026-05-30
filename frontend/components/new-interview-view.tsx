import { Badge } from "@/components/ui/badge"
import { InterviewSetupForm } from "@/components/interview-setup-form"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Mic2 } from "lucide-react"

export function NewInterviewView() {
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
        <Button asChild variant="outline">
          <Link href="/interviews/live">
            <Mic2 className="size-4" />
            Live mode
          </Link>
        </Button>
      </div>
      <InterviewSetupForm />
    </div>
  )
}
