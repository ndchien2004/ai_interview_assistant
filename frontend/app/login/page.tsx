import Link from "next/link"
import { Sparkles } from "lucide-react"

import { AuthForm } from "@/components/auth-form"

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <Sparkles className="size-5 text-foreground" />
          AI Interview Assistant
        </Link>
        <AuthForm mode="login" />
      </div>
    </main>
  )
}
