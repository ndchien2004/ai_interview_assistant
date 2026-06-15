import { cn } from "@/lib/utils"

type ScoreCardProps = {
  label: string
  value: string
  detail: string
  tone?: "default" | "success" | "warning"
}

export function ScoreCard({ label, value, detail, tone = "default" }: ScoreCardProps) {
  return (
    <div
      className={cn(
        "rounded-md border-2 border-[#172018] bg-white p-4 shadow-[4px_4px_0_#172018] dark:border-white/80 dark:bg-card dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]",
        tone === "success" && "bg-emerald-200 dark:bg-emerald-950/50",
        tone === "warning" && "bg-amber-200 dark:bg-amber-950/50"
      )}
    >
      <p className="text-sm font-extrabold text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-extrabold tracking-normal",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{detail}</p>
    </div>
  )
}
