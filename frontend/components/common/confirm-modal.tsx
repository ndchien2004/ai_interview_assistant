"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

type ConfirmModalProps = {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="w-full max-w-md overflow-hidden rounded-md border-2 border-[#172018] bg-background shadow-[9px_9px_0_#172018] dark:border-white/80 dark:shadow-[9px_9px_0_rgba(255,255,255,0.24)]"
      >
        <div className="flex gap-4 px-5 py-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#172018] bg-rose-200 text-destructive shadow-[3px_3px_0_#172018] dark:border-white/80">
            <AlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="text-lg font-extrabold tracking-tight">
              {title}
            </h2>
            <p id="confirm-description" className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t-2 border-[#172018] bg-muted/30 px-5 py-3 dark:border-white/80">
          <Button variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
