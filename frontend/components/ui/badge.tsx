import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-none border border-border/80 !bg-transparent px-2 py-0.5 text-xs font-medium uppercase tracking-[0.08em] !text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
