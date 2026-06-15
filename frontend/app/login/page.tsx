import Link from "next/link"
import { BookOpenCheck } from "lucide-react"

import { AuthForm } from "@/components/forms/auth-form"

export default function LoginPage() {
  const artImageUrl = process.env.NEXT_PUBLIC_AUTH_ART_IMAGE_URL

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff8e8] text-foreground dark:bg-background">
      {artImageUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${artImageUrl})` }}
        />
      ) : null}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(115deg,#fff8e8_0%,#ffe9b8_36%,#cdf7ed_70%,#dff0ff_100%)] dark:bg-none" />
      <div aria-hidden="true" className="neo-grid-bg absolute inset-0 opacity-70" />
      <div aria-hidden="true" className="absolute left-0 top-[18%] h-20 w-full -rotate-2 bg-[#ff7a59]/18" />
      <div aria-hidden="true" className="absolute bottom-[10%] left-0 h-24 w-full rotate-2 bg-[#34d399]/20" />

      <section className="relative z-10 flex min-h-screen items-center px-5 py-8 sm:px-8 lg:px-16">
        <div className="w-full max-w-[430px] rotate-[-1deg] rounded-md border-2 border-[#172018] bg-white px-6 py-7 shadow-[10px_10px_0_#172018] dark:border-white/85 dark:bg-card dark:shadow-[10px_10px_0_rgba(255,255,255,0.24)] sm:px-8 sm:py-8">
          <Link href="/" className="mb-9 inline-flex items-center gap-2 rounded-full border-2 border-[#172018] bg-[#fef08a] px-3 py-2 text-sm font-extrabold tracking-tight text-[#172018] shadow-[4px_4px_0_#172018] dark:border-white/85">
            <BookOpenCheck className="size-5 text-emerald-700" />
            FreeCard
          </Link>
          <AuthForm mode="login" compact />
        </div>
      </section>
    </main>
  )
}
