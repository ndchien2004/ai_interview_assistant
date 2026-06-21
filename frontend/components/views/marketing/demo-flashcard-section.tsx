"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

const demoCard = {
  topic: "Java Core",
  question: "HashMap xử lý va chạm như thế nào?",
  answer:
    "Khi nhiều key rơi vào cùng một bucket, HashMap lưu các entry trong danh sách liên kết. Nếu bucket quá dài, Java 8 có thể chuyển sang cây đỏ-đen để tra cứu ổn định hơn.",
  note: "Hãy thử tự trả lời trong đầu trước khi lật thẻ.",
}

export function DemoFlashcardSection() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".demo-pop")

      if (reduceMotion) {
        gsap.set(items, { clearProps: "all" })
        return
      }

      gsap.set(items, { y: 30, opacity: 0, scale: 0.98 })
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            once: true,
          },
          defaults: { ease: "power3.out" },
        })
        .to(items, { y: 0, opacity: 1, scale: 1, duration: 0.68, stagger: 0.08 })
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#cdf7ed] px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
      <div aria-hidden="true" className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(23,32,24,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(23,32,24,0.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div aria-hidden="true" className="absolute left-0 top-8 h-20 w-full -rotate-2 bg-[#fef08a]/45" />

      <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="max-w-2xl">
          <h2 className="demo-pop text-3xl font-extrabold leading-[1.06] tracking-normal text-[#172018] min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
            Học thử một thẻ ngay tại đây.
          </h2>
          <p className="demo-pop mt-5 max-w-xl text-base font-medium leading-7 text-[#405044] sm:text-lg">
            Trước khi tạo tài khoản, bạn có thể thử cảm giác học của FreeCard: đọc câu hỏi, tự nhớ câu trả lời, rồi lật thẻ để kiểm tra.
          </p>
          <div className="demo-pop mt-7 flex flex-col gap-3 min-[420px]:flex-row">
            <Button
              type="button"
              onClick={() => setIsFlipped((value) => !value)}
              className="border-2 border-[#172018] bg-[#fef08a] text-[#172018] shadow-[4px_4px_0_#172018] hover:bg-[#fde047]"
            >
              <RotateCcw className="size-4" />
              {isFlipped ? "Xem lại câu hỏi" : "Lật thẻ"}
            </Button>
            <Button asChild className="bg-[#172018] text-white shadow-[3px_3px_0_#f59e0b] hover:bg-[#2d3b2f]">
              <Link href="/register">Bắt đầu học miễn phí</Link>
            </Button>
          </div>
        </div>

        <div className="demo-pop mx-auto w-full max-w-xl">
          <div className="relative min-h-[330px] sm:min-h-[360px]" style={{ perspective: "1200px" }}>
            <div
              className="absolute inset-0 rounded-md transition-transform duration-500 ease-out"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
            >
              <DemoCardFace type="question" />
              <DemoCardFace type="answer" />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {["Đọc câu hỏi", "Tự trả lời", "Lật để kiểm tra"].map((step, index) => (
              <div key={step} className="rounded-md border-2 border-[#172018] bg-white px-3 py-2 text-center text-[11px] font-extrabold leading-4 shadow-[3px_3px_0_#172018] sm:text-xs">
                {index + 1}. {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function DemoCardFace({ type }: { type: "question" | "answer" }) {
  const isAnswer = type === "answer"

  return (
    <article
      className={`absolute inset-0 flex flex-col justify-between rounded-md border-2 border-[#172018] p-5 shadow-[9px_9px_0_#172018] sm:p-7 ${
        isAnswer ? "bg-[#fff8e8]" : "bg-white"
      }`}
      style={{
        backfaceVisibility: "hidden",
        transform: isAnswer ? "rotateY(180deg)" : "rotateY(0deg)",
      }}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-full border-2 border-[#172018] px-3 py-1 text-xs font-extrabold shadow-[3px_3px_0_#172018] ${isAnswer ? "bg-[#bae6fd] text-sky-950" : "bg-[#d9f99d] text-lime-950"}`}>
            {isAnswer ? "Đáp án gợi ý" : demoCard.topic}
          </span>
          <span className="text-xs font-extrabold uppercase text-[#647067]">{isAnswer ? "Mặt sau" : "Mặt trước"}</span>
        </div>

        <h3 className="mt-8 text-2xl font-extrabold leading-tight text-[#172018] sm:text-3xl">
          {isAnswer ? "Va chạm được xử lý theo bucket." : demoCard.question}
        </h3>
        <p className="mt-5 text-sm font-medium leading-7 text-[#526057] sm:text-base">
          {isAnswer ? demoCard.answer : demoCard.note}
        </p>
      </div>

      <div className="mt-7 flex items-center justify-between border-t-2 border-[#172018] pt-4">
        <span className="text-xs font-extrabold uppercase text-[#647067]">Thẻ mẫu</span>
        <span className="rounded-full bg-[#172018] px-3 py-1 text-xs font-extrabold text-white">1 / 1</span>
      </div>
    </article>
  )
}
