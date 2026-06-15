import { AlertCircle, Inbox } from "lucide-react"

import { neo } from "@/lib/neo"
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
        "flex min-h-44 flex-col items-center justify-center p-8 text-center",
        tone === "error" ? "bg-rose-100 dark:bg-destructive/20" : "bg-white dark:bg-card",
        neo.panelSoft,
        className
      )}
    >
      <Icon className={cn("mb-3 size-8", tone === "error" ? "text-destructive" : "text-amber-600 dark:text-amber-300")} />
      <h2 className="text-base font-extrabold">{title}</h2>
      <p className="mt-1 max-w-md text-sm font-medium text-muted-foreground">{description}</p>
    </div>
  )
}
