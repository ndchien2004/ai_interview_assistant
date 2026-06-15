import { Loader2 } from "lucide-react"

import { neo } from "@/lib/neo"
import { cn } from "@/lib/utils"

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("grid min-h-44 place-items-center", className)} role="status" aria-label="Dang tai">
      <div className={cn("grid size-14 place-items-center bg-[#fef08a] text-[#172018]", neo.button)}>
        <Loader2 className="size-7 animate-spin" />
      </div>
    </div>
  )
}
