import { cn } from "@/lib/utils"

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("grid min-h-44 place-items-center", className)} role="status" aria-label="Đang tải">
      <div className="size-8 rounded-full border-2 border-muted-foreground/25 border-t-foreground animate-spin" />
    </div>
  )
}
