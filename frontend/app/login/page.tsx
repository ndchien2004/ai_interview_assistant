import Link from "next/link"

import { AuthForm } from "@/components/forms/auth-form"

export default function LoginPage() {
  const artImageUrl = process.env.NEXT_PUBLIC_AUTH_ART_IMAGE_URL

  return (
    <main className="relative h-screen overflow-hidden bg-background text-foreground">
      {artImageUrl ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center opacity-65"
          style={{ backgroundImage: `url(${artImageUrl})` }}
        />
      ) : null}
      <div aria-hidden="true" className="absolute inset-0 bg-background/70" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_72%_48%,transparent_0,transparent_34%,var(--background)_78%)]"
      />

      <section className="relative z-10 flex h-screen items-center px-5 py-5 sm:px-8 lg:px-16">
        <div className="w-full max-w-[400px] rounded-2xl border border-border/80 bg-background/88 px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.12)] backdrop-blur-md sm:px-8 sm:py-8">
          <Link href="/" className="mb-9 inline-flex text-sm font-semibold tracking-tight">
            AI Interview Assistant
          </Link>
          <AuthForm mode="login" compact />
        </div>
      </section>
    </main>
  )
}
