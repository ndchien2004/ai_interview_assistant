"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import {
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Flame,
  Layers3,
  Mail,
  Star,
  Trophy,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreatorSection } from "@/components/views/marketing/creator-section"
import { DemoFlashcardSection } from "@/components/views/marketing/demo-flashcard-section"

const stats = [
  { value: "20'", label: "mỗi phiên học", tone: "bg-emerald-300 text-emerald-950" },
  { value: "3", label: "chế độ luyện", tone: "bg-sky-300 text-sky-950" },
  { value: "10+", label: "bộ thẻ mẫu", tone: "bg-amber-300 text-amber-950" },
]

const studyPath = [
  { title: "Chọn bộ thẻ", icon: Layers3, color: "bg-sky-400" },
  { title: "Lật và trả lời", icon: Zap, color: "bg-amber-400" },
  { title: "Ôn câu còn yếu", icon: Brain, color: "bg-emerald-400" },
  { title: "Sẵn sàng phỏng vấn", icon: Trophy, color: "bg-rose-400" },
]

const chips = ["Java Core", "OOP", "HashMap", "SQL", "Thiết kế hệ thống", "Phỏng vấn hành vi"]
const marqueeChips = Array.from({ length: 4 }, () => chips).flat()

export function LandingPage() {
  const rootRef = useRef<HTMLElement | null>(null)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const floatRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    const root = rootRef.current
    const board = boardRef.current
    if (!root || !board) return

    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ctx = gsap.context(() => {
      const floatSet = new Set(floatRefs.current.filter(Boolean))
      const parallaxCards = cardRefs.current.filter(Boolean).filter((card) => !floatSet.has(card))

      if (!reduceMotion) {
        gsap.set(".hero-pop", { y: 24, opacity: 0, scale: 0.97 })
        gsap.set(".nav-pop", { y: -16, opacity: 0 })
        gsap.set(".path-step", {
          opacity: 0,
          y: 80,
          z: -180,
          rotateX: -36,
          rotateY: -20,
          transformPerspective: 1100,
          transformOrigin: "center bottom",
        })
        gsap.set(".path-line", { scaleX: 0, transformOrigin: "left center" })
        gsap.set(cardRefs.current.filter(Boolean), {
          y: 54,
          opacity: 0,
          rotateX: 16,
          rotateY: -16,
          transformPerspective: 1000,
        })

        gsap
          .timeline({ defaults: { ease: "back.out(1.25)" } })
          .to(".nav-pop", { y: 0, opacity: 1, duration: 0.7 })
          .to(".hero-pop", { y: 0, opacity: 1, scale: 1, duration: 0.72, stagger: 0.07 }, "-=0.35")
          .to(
            cardRefs.current.filter(Boolean),
            { y: 0, opacity: 1, rotateX: 0, rotateY: 0, duration: 0.8, stagger: 0.08 },
            "-=0.55"
          )
          .call(() => {
            floatRefs.current.filter(Boolean).forEach((item, index) => {
              const distance = index === 2 ? 12 : index % 2 === 0 ? -10 : 10
              const drift = index % 2 === 0 ? 6 : -6

              gsap.to(item, {
                y: distance,
                x: drift,
                duration: 3.8 + index * 0.35,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: index * 0.22,
              })
            })
          })

        const pathSteps = gsap.utils.toArray<HTMLElement>(".path-step")
        gsap
          .timeline({
            scrollTrigger: {
              trigger: ".path-section",
              start: "top 68%",
              once: true,
            },
          })
          .to(".path-line", { scaleX: 1, duration: 0.85, ease: "power3.out" })
          .to(
            pathSteps,
            {
              opacity: 1,
              y: 0,
              z: 0,
              rotateX: 0,
              rotateY: 0,
              duration: 0.78,
              ease: "back.out(1.55)",
              stagger: 0.16,
            },
            "-=0.35"
          )
          .add(() => {
            pathSteps.forEach((item, index) => {
              const distance = index % 2 === 0 ? -10 : 10
              const rotation = [-4, 3.5, -3, 4][index] ?? 0

              gsap
                .timeline({ repeat: -1, delay: index * 0.18 })
                .to(item, { y: distance, rotateZ: rotation, duration: 2.8, ease: "sine.inOut" })
                .to(item, { y: -distance, rotateZ: -rotation, duration: 5.6, ease: "sine.inOut" })
                .to(item, { y: 0, rotateZ: 0, duration: 2.8, ease: "sine.inOut" })
            })
          })
      }

      const onMove = (event: PointerEvent) => {
        if (reduceMotion) return
        const rect = board.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width - 0.5
        const y = (event.clientY - rect.top) / rect.height - 0.5

        gsap.to(board, {
          rotateY: x * 8,
          rotateX: y * -6,
          transformPerspective: 1000,
          transformOrigin: "center",
          duration: 0.65,
          ease: "power2.out",
        })
        gsap.to(parallaxCards, {
          x: (index) => x * (index + 1) * 8,
          duration: 0.65,
          ease: "power2.out",
        })
      }

      const onLeave = () => {
        if (reduceMotion) return
        gsap.to(board, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "power2.out" })
        gsap.to(parallaxCards, { x: 0, duration: 0.7, ease: "power2.out" })
      }

      board.addEventListener("pointermove", onMove)
      board.addEventListener("pointerleave", onLeave)

      return () => {
        board.removeEventListener("pointermove", onMove)
        board.removeEventListener("pointerleave", onLeave)
      }
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <main ref={rootRef} className="min-h-screen overflow-hidden bg-[#fff8e8] text-[#172018]">
      <section className="relative min-h-svh overflow-hidden lg:h-svh">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(115deg,#fff8e8_0%,#ffe9b8_33%,#cdf7ed_68%,#dff0ff_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(23,32,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,32,24,0.08)_1px,transparent_1px)] [background-size:42px_42px]"
        />
        <div aria-hidden="true" className="absolute left-0 top-[16%] h-20 w-full -rotate-2 bg-[#ff7a59]/18" />
        <div aria-hidden="true" className="absolute bottom-[8%] left-0 h-24 w-full rotate-2 bg-[#34d399]/20" />
        <div aria-hidden="true" className="absolute right-[-8%] top-0 h-full w-[42%] skew-x-[-12deg] bg-[#2563eb]/10" />

        <header className="nav-pop relative z-20 mx-auto flex min-h-[76px] w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-[#172018] bg-white px-3 py-2 text-sm font-extrabold shadow-[5px_5px_0_#172018]">
              <BookOpenCheck className="size-5 text-emerald-600" />
              FreeCard
            </Link>
            <div className="hidden rounded-full border-2 border-[#172018] bg-[#fef08a] px-4 py-2 text-sm font-extrabold shadow-[4px_4px_0_#172018] md:inline-flex">
              Hôm nay học ít thôi, nhưng nhớ thật lâu
            </div>
          </div>
          <nav className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:flex-none">
            <Button asChild className="h-9 px-2.5 text-xs border-2 border-[#172018] bg-[#fef08a] text-[#172018] shadow-[3px_3px_0_#172018] hover:bg-[#fde047] sm:h-10 sm:px-3.5 sm:text-sm sm:shadow-[4px_4px_0_#172018]">
              <Link href="/login">Đăng nhập</Link>
            </Button>
            <Button asChild className="h-9 px-2.5 text-xs bg-[#172018] text-white shadow-[3px_3px_0_#f59e0b] hover:bg-[#2d3b2f] sm:h-10 sm:px-3.5 sm:text-sm">
              <Link href="/register">Tạo tài khoản</Link>
            </Button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-start gap-8 px-4 pb-10 pt-4 sm:px-6 sm:pt-8 lg:h-[calc(100svh-76px)] lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:pb-4 lg:pt-1">
          <div className="max-w-2xl">
            <h1 className="hero-pop max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-normal text-[#172018] min-[380px]:text-5xl sm:text-6xl lg:text-7xl xl:text-[5.25rem]">
              Ôn phỏng vấn vui hơn một chút.
            </h1>
            <p className="hero-pop mt-5 max-w-xl text-base font-medium leading-7 text-[#405044] sm:text-lg">
              FreeCard biến kiến thức khô thành những vòng luyện tập ngắn, có nhịp, có thành tựu nhỏ để bạn muốn quay lại học mỗi ngày.
            </p>

            <div className="hero-pop mt-6 grid max-w-xl grid-cols-3 gap-2 sm:mt-7 sm:gap-3">
              {stats.map((item) => (
                <div key={item.label} className={`rounded-md border-2 border-[#172018] px-3 py-3 shadow-[3px_3px_0_#172018] sm:px-4 sm:shadow-[4px_4px_0_#172018] ${item.tone}`}>
                  <p className="text-xl font-extrabold sm:text-2xl">{item.value}</p>
                  <p className="mt-1 text-[11px] font-bold leading-4 sm:text-xs sm:leading-5">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-pop relative flex min-h-[470px] items-center justify-center py-4 sm:min-h-[460px] lg:min-h-[510px] lg:py-0" style={{ perspective: "1200px" }}>
            <div className="relative h-[450px] w-full max-w-[380px] sm:h-[460px] sm:max-w-[690px] lg:h-[510px] lg:translate-x-[10px] lg:translate-y-[55px] lg:scale-[1.06] xl:translate-x-[-10px]">
              <div ref={boardRef} className="relative h-full min-h-[450px] transform-gpu sm:min-h-[460px] lg:min-h-[510px]" style={{ transformStyle: "preserve-3d" }}>
              <div
                ref={(node) => {
                  cardRefs.current[0] = node
                }}
                className="absolute left-[5%] top-[25%] z-10 w-[84%] rotate-[-4deg] rounded-md border-2 border-[#172018] bg-white p-4 shadow-[7px_7px_0_#172018] sm:left-[9%] sm:top-[8%] sm:w-[72%] sm:p-5 sm:shadow-[12px_12px_0_#172018]"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#d9f99d] px-3 py-1 text-xs font-extrabold text-lime-900">Câu hôm nay</span>
                  <Star className="size-6 fill-amber-300 text-amber-500" />
                </div>
                <p className="mt-6 text-xl font-extrabold leading-tight sm:mt-8 sm:text-2xl">HashMap xử lý va chạm như thế nào?</p>
                <div className="mt-6 flex items-center justify-between gap-3 sm:mt-8">
                  <span className="text-xs font-bold text-[#68756b] sm:text-sm">12 / 40 câu</span>
                  <span className="rounded-full border-2 border-[#172018] bg-[#38bdf8] px-3 py-1 text-xs font-extrabold text-sky-950 sm:text-sm">
                    Lật thẻ
                  </span>
                </div>
              </div>

              <div
                ref={(node) => {
                  cardRefs.current[1] = node
                  floatRefs.current[0] = node
                }}
                className="absolute right-[3%] top-[7%] z-30 w-36 rotate-[6deg] rounded-md border-2 border-[#172018] bg-[#fef08a] p-3 shadow-[6px_6px_0_#172018] min-[380px]:w-40 sm:right-[-8%] sm:top-[23%] sm:w-56 sm:p-4 sm:shadow-[9px_9px_0_#172018] lg:right-[-15%]"
              >
                <div className="flex items-center gap-2">
                  <Flame className="size-5 fill-orange-400 text-orange-600 sm:size-6" />
                  <div>
                    <p className="text-xs font-extrabold uppercase">Chuỗi học</p>
                    <p className="text-xl font-extrabold sm:text-2xl">7 ngày</p>
                  </div>
                </div>
              </div>

              <div
                ref={(node) => {
                  cardRefs.current[2] = node
                  floatRefs.current[1] = node
                }}
                className="absolute left-[2%] top-0 z-40 w-[49%] rotate-[3deg] rounded-md border-2 border-[#172018] bg-[#bae6fd] p-3 shadow-[6px_6px_0_#172018] sm:left-[-4%] sm:top-[-8%] sm:w-[43%] sm:p-4 sm:shadow-[9px_9px_0_#172018] lg:left-[-7%] lg:top-[-12%]"
              >
                <p className="text-sm font-extrabold">Tiến độ tuần</p>
                <div className="mt-3 h-3 overflow-hidden rounded-full border-2 border-[#172018] bg-white sm:mt-4 sm:h-4">
                  <div className="h-full w-[68%] rounded-full bg-[#22c55e]" />
                </div>
                <p className="mt-3 text-xs font-bold text-sky-950">68% mục tiêu đã hoàn thành</p>
              </div>

              <div
                ref={(node) => {
                  cardRefs.current[3] = node
                  floatRefs.current[2] = node
                }}
                className="absolute bottom-[1%] left-[9%] z-20 w-[82%] -rotate-[3deg] rounded-md border-2 border-[#172018] bg-[#fecdd3] p-4 shadow-[6px_6px_0_#172018] sm:bottom-auto sm:left-[27%] sm:top-[51%] sm:w-[43%] sm:shadow-[9px_9px_0_#172018]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-extrabold">Sắp phỏng vấn?</p>
                  <CheckCircle2 className="size-6 text-emerald-700" />
                </div>
                <p className="mt-3 text-2xl font-extrabold sm:text-3xl">Luyện 15 câu</p>
                <p className="mt-1 text-xs font-bold text-rose-950">Tập nói đáp án trước khi xem gợi ý.</p>
              </div>

              <div className="absolute right-[22%] top-[2%] z-50 hidden rounded-full border-2 border-[#172018] bg-[#fb7185] px-4 py-2 text-sm font-extrabold text-white shadow-[5px_5px_0_#172018] sm:block">
                +120 điểm tự tin
              </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CreatorSection />

      <DemoFlashcardSection />

      <section className="relative overflow-hidden border-y-2 border-[#172018] bg-[#172018] py-4 text-white">
        <div className="ticker-track flex w-max animate-[freecard-marquee_28s_linear_infinite] gap-3 whitespace-nowrap will-change-transform">
          {marqueeChips.map((chip, index) => (
            <span key={`${chip}-${index}`} className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-extrabold">
              {chip}
            </span>
          ))}
        </div>
      </section>

      <section className="path-section relative flex bg-[#cdf7ed] px-4 py-12 sm:px-6 sm:py-16 md:min-h-[92svh] md:items-center lg:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border-2 border-[#172018] bg-white px-4 py-2 text-sm font-extrabold shadow-[4px_4px_0_#172018]">
              Lộ trình học có cảm giác tiến lên
            </p>
            <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Mỗi bước nhỏ đều có phần thưởng tinh thần.
            </h2>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 md:mt-10 md:block md:min-h-[380px]">
            <div aria-hidden="true" className="path-line absolute left-4 right-4 top-[55%] hidden h-1 -translate-y-1/2 -rotate-3 rounded-full bg-[#172018] md:block" />
            {studyPath.map((item, index) => {
              const Icon = item.icon
              const positionClassName = [
                "md:left-[1%] md:top-0 md:rotate-[-4deg]",
                "md:left-[27%] md:top-24 md:rotate-[3deg]",
                "md:right-[27%] md:top-8 md:rotate-[-2deg]",
                "md:right-[1%] md:top-32 md:rotate-[4deg]",
              ][index]

              return (
                <article
                  key={item.title}
                  className={`path-step relative rounded-md border-2 border-[#172018] bg-white p-5 shadow-[6px_6px_0_#172018] md:absolute md:w-[24%] md:shadow-[8px_8px_0_#172018] ${positionClassName}`}
                >
                  <div className={`flex size-14 items-center justify-center rounded-full border-2 border-[#172018] ${item.color}`}>
                    <Icon className="size-6 text-[#172018]" />
                  </div>
                  <p className="mt-5 text-xs font-extrabold uppercase text-[#647067]">Bước {index + 1}</p>
                  <h3 className="mt-2 text-xl font-extrabold">{item.title}</h3>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-[#172018] bg-[#172018] px-5 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold">
            <BookOpenCheck className="size-5 text-emerald-300" />
            FreeCard
          </Link>
          <p className="text-sm font-medium text-white/65">
            Học gọn hơn, ôn vui hơn, tự tin hơn trước buổi phỏng vấn.
          </p>
          <div className="flex items-center gap-3">
            <FooterSocialLink href="https://www.facebook.com/ndchien12/" label="Facebook">
              <FacebookIcon className="size-5" />
            </FooterSocialLink>
            <FooterSocialLink href="https://mail.google.com/mail/?view=cm&fs=1&to=Ndcproduction123%40gmail.com" label="Email">
              <Mail className="size-5" />
            </FooterSocialLink>
            <FooterSocialLink href="https://github.com/ndchien2004" label="GitHub">
              <GithubIcon className="size-5" />
            </FooterSocialLink>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FooterSocialLink({
  children,
  href,
  label,
}: {
  children: React.ReactNode
  href: string
  label: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white hover:text-[#172018]"
    >
      {children}
    </a>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M22 12.06C22 6.48 17.52 2 11.94 2S2 6.48 2 12.06c0 5.03 3.68 9.2 8.49 9.94v-7.03H7.97v-2.91h2.52V9.84c0-2.49 1.48-3.86 3.75-3.86 1.09 0 2.23.2 2.23.2v2.45h-1.26c-1.24 0-1.63.77-1.63 1.56v1.87h2.77l-.44 2.91h-2.33V22c4.81-.74 8.42-4.91 8.42-9.94Z" />
    </svg>
  )
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.08 1.83 2.82 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.45 11.45 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22v3.3c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z" />
    </svg>
  )
}
