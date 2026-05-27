import { cn } from "@/lib/utils"

type ScoreCardProps = {
  label: string
  value: string
  detail: string
  tone?: "default" | "success" | "warning"
}

export function ScoreCard({ label, value, detail, tone = "default" }: ScoreCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-2 text-3xl font-semibold tracking-normal",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700"
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}
