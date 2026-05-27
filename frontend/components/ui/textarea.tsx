import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-none border-x-0 border-t-0 border-b border-input bg-transparent px-0 py-2 text-base shadow-none transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-transparent dark:aria-invalid:border-destructive/50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
