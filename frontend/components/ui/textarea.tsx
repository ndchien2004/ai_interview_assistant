import * as React from "react"

import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "relative z-0 flex field-sizing-content min-h-24 w-full px-3 py-2 text-base font-semibold transition-[color,box-shadow] outline-none focus-visible:z-10 placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:aria-invalid:border-destructive/50",
        neo.input,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
