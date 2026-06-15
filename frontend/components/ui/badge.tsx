import * as React from "react"

import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "uppercase tracking-normal",
        neo.pill,
        className
      )}
      {...props}
    />
  )
}

export { Badge }
