import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  value,
  className,
  ...props
}: React.ComponentProps<"div"> & { value: number }) {
  return (
    <div
      data-slot="progress"
      className={cn(
        "h-3 w-full overflow-hidden rounded-full border-2 border-[#172018] bg-white shadow-[3px_3px_0_#172018] dark:border-white/80 dark:bg-background dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
        className
      )}
      {...props}
    >
      <div
        className="h-full rounded-full bg-[#22c55e] transition-all dark:bg-accent"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export { Progress }
