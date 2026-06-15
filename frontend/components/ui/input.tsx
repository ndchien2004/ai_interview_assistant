import * as React from "react"

import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "relative z-0 h-11 w-full min-w-0 px-3 py-1 text-base font-semibold transition-[color,box-shadow,transform] outline-none focus-visible:z-10 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-extrabold file:text-foreground placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/35 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:aria-invalid:border-destructive/50",
        neo.input,
        className
      )}
      {...props}
    />
  )
}

export { Input }
