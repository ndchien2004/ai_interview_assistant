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
    <div className="fixed inset-0 z-[100] grid place-items-center bg-background/55 p-4 backdrop-blur-md" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-white/15 bg-background/80 p-5 shadow-[0_24px_90px_-44px_rgba(15,23,42,0.85)] backdrop-blur-2xl dark:bg-white/[0.055]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.22),transparent_42%,rgba(255,255,255,0.05))] dark:bg-[linear-gradient(120deg,rgba(255,255,255,0.10),transparent_42%,rgba(255,255,255,0.035))]" />

        <div className="relative flex items-start gap-4">
          <div
            className={
              danger
                ? "grid size-10 shrink-0 place-items-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive"
                : "grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary"
            }
          >
            <AlertTriangle className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-dialog-title" className="text-base font-semibold">
                {title}
              </h2>
              <Button variant="ghost" size="icon-sm" onClick={onClose} disabled={loading} aria-label="Đóng">
                <X className="size-4" />
              </Button>
            </div>
            {description ? <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div> : null}
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
