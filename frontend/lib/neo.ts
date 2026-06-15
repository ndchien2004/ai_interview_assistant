export const neo = {
  ink: "#172018",
  tones: {
    plain: "bg-white text-[#172018] dark:bg-card dark:text-card-foreground",
    mint: "bg-[#fef08a] text-[#172018] dark:bg-amber-950/60 dark:text-amber-100",
    sky: "bg-[#dff0ff] text-[#172018] dark:bg-sky-950/50 dark:text-sky-100",
    yellow: "bg-[#fef08a] text-[#172018] dark:bg-amber-950/60 dark:text-amber-100",
    rose: "bg-[#fecdd3] text-[#172018] dark:bg-rose-950/50 dark:text-rose-100",
  },
  panel:
    "rounded-md border-2 border-[#172018] bg-card text-card-foreground shadow-[6px_6px_0_#172018] dark:border-white/85 dark:shadow-[6px_6px_0_rgba(255,255,255,0.28)]",
  panelSoft:
    "rounded-md border-2 border-[#172018] bg-background text-foreground shadow-[4px_4px_0_#172018] dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.25)]",
  card:
    "rounded-md border-2 border-[#172018] bg-white text-[#172018] shadow-[6px_6px_0_#172018] dark:border-white/85 dark:bg-card dark:text-card-foreground dark:shadow-[6px_6px_0_rgba(255,255,255,0.28)]",
  mutedPanel:
    "rounded-md border-2 border-[#172018] bg-muted text-foreground shadow-[4px_4px_0_#172018] dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]",
  input:
    "rounded-md border-2 border-[#172018] bg-white shadow-[3px_3px_0_#172018] focus-visible:shadow-[4px_4px_0_#172018] dark:border-white/80 dark:bg-background dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
  pill:
    "inline-flex items-center gap-1.5 rounded-full border-2 border-[#172018] bg-white px-3 py-1 text-xs font-extrabold text-[#172018] shadow-[3px_3px_0_#172018] dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
  button:
    "relative z-0 rounded-md border-2 border-[#172018] font-extrabold shadow-[4px_4px_0_#172018] transition-transform hover:z-10 focus-visible:z-10 motion-safe:sm:hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#172018] active:translate-x-1 active:translate-y-1 active:shadow-none dark:border-white/85 dark:shadow-[4px_4px_0_rgba(255,255,255,0.28)] dark:hover:shadow-[5px_5px_0_rgba(255,255,255,0.34)]",
  header:
    "rounded-md border-2 border-[#172018] bg-[#fff8e8] p-5 shadow-[6px_6px_0_#172018] dark:border-white/80 dark:bg-card dark:shadow-[6px_6px_0_rgba(255,255,255,0.24)]",
  section:
    "rounded-md border-2 border-[#172018] bg-card p-5 shadow-[6px_6px_0_#172018] dark:border-white/80 dark:shadow-[6px_6px_0_rgba(255,255,255,0.24)]",
  row:
    "relative z-0 rounded-md border-2 border-[#172018] bg-card shadow-[4px_4px_0_#172018] transition-all hover:z-10 focus-within:z-10 focus-visible:z-10 motion-safe:sm:hover:-translate-y-0.5 hover:bg-muted/45 dark:border-white/80 dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]",
  select:
    "h-11 w-full rounded-md border-2 border-[#172018] bg-white px-3 text-sm font-semibold shadow-[3px_3px_0_#172018] outline-none focus-visible:ring-3 focus-visible:ring-ring/35 disabled:opacity-50 dark:border-white/80 dark:bg-background dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
  notice:
    "rounded-md border-2 border-[#172018] bg-[#dff0ff] px-4 py-3 text-sm font-semibold text-[#172018] shadow-[4px_4px_0_#172018] dark:border-white/80 dark:bg-card dark:text-card-foreground dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]",
  toggle:
    "relative z-0 rounded-md border-2 border-[#172018] bg-white px-4 py-3 shadow-[3px_3px_0_#172018] transition-all hover:z-10 focus-within:z-10 motion-safe:sm:hover:-translate-y-0.5 hover:bg-[#fef08a] dark:border-white/80 dark:bg-card dark:shadow-[3px_3px_0_rgba(255,255,255,0.24)]",
  actionCard:
    "relative z-0 rounded-md border-2 border-[#172018] bg-card p-4 shadow-[5px_5px_0_#172018] transition-all hover:z-10 focus-within:z-10 motion-safe:sm:hover:-translate-y-0.5 hover:bg-muted/45 dark:border-white/80 dark:shadow-[5px_5px_0_rgba(255,255,255,0.24)]",
  lift:
    "relative z-0 transition-all hover:z-10 focus-within:z-10 focus-visible:z-10 motion-safe:sm:hover:-translate-y-0.5",
  liftSm:
    "relative z-0 transition-all hover:z-10 focus-within:z-10 focus-visible:z-10 motion-safe:sm:hover:-translate-y-px",
  interactive:
    "relative z-0 transition-all hover:z-10 focus-within:z-10 focus-visible:z-10 motion-safe:sm:hover:-translate-y-0.5",
  stack: "relative isolate",
  noClip: "overflow-visible",
  shadowPad: "pb-2 pr-2",
  scrollPanel: "overflow-y-auto overscroll-contain pb-3 pr-2",
  rotations: {
    left: "-rotate-2",
    right: "rotate-2",
    lift: "rotate-3",
    tuck: "-rotate-3",
  },
} as const
