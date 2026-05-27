import { AlertCircle, Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

type StateBlockProps = {
  title: string
  description: string
  tone?: "empty" | "error"
  className?: string
}

export function StateBlock({ title, description, tone = "empty", className }: StateBlockProps) {
  const Icon = tone === "error" ? AlertCircle : Inbox

  return (
    <div
      className={cn(
        "flex min-h-44 flex-col items-center justify-center border-y border-dashed border-border/80 bg-transparent p-8 text-center",
        className
      )}
    >
      <Icon className="mb-3 size-8 text-muted-foreground" />
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
