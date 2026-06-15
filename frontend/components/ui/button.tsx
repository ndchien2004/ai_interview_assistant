import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button relative z-0 inline-flex shrink-0 items-center justify-center bg-clip-padding text-sm font-extrabold whitespace-nowrap transition-all outline-none select-none hover:z-10 focus-visible:z-10 focus-visible:ring-3 focus-visible:ring-ring/45 disabled:pointer-events-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-55 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "rounded-md border-2 border-[#172018] bg-primary text-primary-foreground shadow-[4px_4px_0_#172018] motion-safe:sm:hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[5px_5px_0_#172018] active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white/85 dark:shadow-[4px_4px_0_rgba(255,255,255,0.28)] dark:hover:shadow-[5px_5px_0_rgba(255,255,255,0.34)]",
        outline:
          "rounded-md border-2 border-[#172018] bg-background text-foreground shadow-[4px_4px_0_#172018] motion-safe:sm:hover:-translate-y-0.5 hover:bg-accent hover:shadow-[5px_5px_0_#172018] active:translate-x-1 active:translate-y-1 active:shadow-none aria-expanded:bg-accent dark:border-white/85 dark:shadow-[4px_4px_0_rgba(255,255,255,0.28)] dark:hover:shadow-[5px_5px_0_rgba(255,255,255,0.34)]",
        secondary:
          "rounded-md border-2 border-[#172018] bg-secondary text-secondary-foreground shadow-[4px_4px_0_#172018] motion-safe:sm:hover:-translate-y-0.5 hover:bg-secondary/90 hover:shadow-[5px_5px_0_#172018] active:translate-x-1 active:translate-y-1 active:shadow-none aria-expanded:bg-secondary dark:border-white/85 dark:shadow-[4px_4px_0_rgba(255,255,255,0.28)]",
        ghost:
          "rounded-md border-2 border-transparent shadow-none hover:border-border hover:bg-muted hover:text-foreground aria-expanded:border-border aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "rounded-md border-2 border-[#172018] bg-destructive text-white shadow-[4px_4px_0_#172018] motion-safe:sm:hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[5px_5px_0_#172018] active:translate-x-1 active:translate-y-1 active:shadow-none focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:border-white/85 dark:shadow-[4px_4px_0_rgba(255,255,255,0.28)] dark:focus-visible:ring-destructive/40",
        link: "rounded-none border-0 px-0 text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-1.5 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-12 gap-1.5 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs":
          "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
