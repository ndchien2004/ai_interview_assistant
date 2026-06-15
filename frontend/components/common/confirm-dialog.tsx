"use client"

import { AlertTriangle, X } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

type ConfirmDialogProps = {
  open: boolean
  title: string
  description?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  tone?: "default" | "danger"
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  loading = false,
  tone = "default",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  if (!open) return null

  const danger = tone === "danger"

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/70 p-4 backdrop-blur-sm" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-md border-2 border-[#172018] bg-background p-5 shadow-[9px_9px_0_#172018] dark:border-white/80 dark:shadow-[9px_9px_0_rgba(255,255,255,0.24)]"
      >
        <div className="relative flex items-start gap-4">
          <div
            className={
              danger
                ? "grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#172018] bg-rose-200 text-destructive shadow-[3px_3px_0_#172018] dark:border-white/80"
                : "grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#172018] bg-[#fef08a] text-primary shadow-[3px_3px_0_#172018] dark:border-white/80"
            }
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-dialog-title" className="text-base font-extrabold">
                {title}
              </h2>
              <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={loading} aria-label="Đóng">
                <X className="size-4" />
              </Button>
            </div>
            {description ? <div className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{description}</div> : null}
          </div>
        </div>

        <div className="relative mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "destructive" : "default"} onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
