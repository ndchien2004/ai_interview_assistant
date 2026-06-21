"use client"

import Image from "next/image"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

const creatorImageUrl =
  "https://res.cloudinary.com/dzwimbvjh/image/upload/v1781836803/freecard/creator/creator-chien-profile.jpg"

const creatorSkills = [
  { label: "Lập trình full-stack", mobileWide: true },
  { label: "Next.js" },
  { label: "TypeScript" },
  { label: "Tailwind CSS" },
  { label: "Java" },
  { label: "Spring Boot" },
  { label: "Hibernate" },
  { label: "Yêu thích UI/UX", mobileWide: true },
  { label: "Xây dựng cùng AI", mobileWide: true },
]

const creatorFocus = [
  { label: "Giao diện", value: "Gọn, rõ, có nhịp" },
  { label: "Hệ thống", value: "Chắc, dễ mở rộng" },
  { label: "Sản phẩm", value: "Hữu ích trước, đẹp sau" },
]

export function CreatorSection() {
  const sectionRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    gsap.registerPlugin(ScrollTrigger)

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const ctx = gsap.context(() => {
      const copyItems = gsap.utils.toArray<HTMLElement>(".creator-copy")
      const badges = gsap.utils.toArray<HTMLElement>(".creator-badge")
      const cardItems = gsap.utils.toArray<HTMLElement>(".creator-card-item")

      if (reduceMotion) {
        gsap.set([".creator-skill-board", ".creator-card", ...copyItems, ...badges, ...cardItems], { clearProps: "all" })
        return
      }

      gsap.set(copyItems, { y: 26, opacity: 0 })
      gsap.set(".creator-skill-board", {
        y: 22,
        opacity: 0,
      })
      gsap.set(badges, {
        y: 20,
        opacity: 0,
        scale: 0.94,
        rotateZ: (index) => (index % 2 === 0 ? -1.5 : 1.5),
        filter: "blur(7px)",
      })
      gsap.set(".creator-card", {
        y: 42,
        opacity: 0,
        rotateX: 8,
        rotateY: -8,
        transformPerspective: 1100,
        transformOrigin: "center",
      })
      gsap.set(cardItems, { y: 18, opacity: 0 })
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top 72%",
            once: true,
          },
          defaults: { ease: "power3.out" },
        })
        .to(copyItems, { y: 0, opacity: 1, duration: 0.72, stagger: 0.1 })
        .to(".creator-skill-board", { y: 0, opacity: 1, duration: 0.56 }, "-=0.22")
        .to(
          badges,
          {
            y: 0,
            opacity: 1,
            scale: 1,
            rotateZ: 0,
            filter: "blur(0px)",
            duration: 0.56,
            stagger: { each: 0.045, from: "start" },
          },
          "-=0.25"
        )
        .to(".creator-card", { y: 0, opacity: 1, rotateX: 0, rotateY: 0, duration: 0.78 }, "-=0.45")
        .to(cardItems, { y: 0, opacity: 1, duration: 0.48, stagger: 0.08 }, "-=0.35")
    }, section)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#fff8e8] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-[#172018]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(160deg,transparent_0%,transparent_62%,rgba(205,247,237,0.5)_62%,rgba(205,247,237,0.5)_100%)] sm:bg-[linear-gradient(110deg,transparent_0%,transparent_44%,rgba(205,247,237,0.58)_44%,rgba(205,247,237,0.58)_68%,transparent_68%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-20 bg-[#dff0ff]/35 sm:h-24 sm:bg-[#dff0ff]/45" />

      <div className="relative mx-auto grid max-w-7xl gap-8 sm:gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="max-w-2xl">
          <h2 className="creator-copy text-3xl font-extrabold leading-[1.05] tracking-normal text-[#172018] min-[380px]:text-4xl sm:text-5xl lg:text-6xl">
            Người tạo ra FreeCard
          </h2>
          <p className="creator-copy mt-5 max-w-xl text-base font-medium leading-7 text-[#405044] sm:text-lg">
            Xin chào, mình là Chiến — người xây dựng website này. Mình thích kết hợp hệ thống, giao diện và UI/UX để tạo ra những sản phẩm vừa hữu ích, vừa dễ dùng và thú vị.
          </p>

          <div className="creator-skill-board mt-7 grid max-w-xl grid-cols-2 gap-3 px-0.5 pb-1 pr-1 sm:flex sm:max-w-2xl sm:flex-wrap sm:gap-2.5 sm:pb-1.5 sm:pr-1.5">
            {creatorSkills.map((skill) => (
              <span
                key={skill.label}
                className={`creator-badge flex min-h-11 items-center justify-center rounded-md border-2 border-[#172018] bg-white/88 px-3 py-2 text-center text-xs font-extrabold leading-4 text-[#172018] shadow-[3px_3px_0_#172018] transition-transform hover:-translate-y-0.5 hover:bg-[#cdf7ed] sm:inline-flex sm:min-h-0 sm:rounded-full sm:px-3.5 sm:text-left sm:text-sm ${
                  skill.mobileWide ? "col-span-2" : ""
                }`}
              >
                {skill.label}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl px-1 sm:px-0 lg:mr-0 lg:max-w-2xl">
          <article className="creator-card relative overflow-hidden rounded-md border-2 border-[#172018] bg-white/82 p-4 shadow-[6px_6px_0_#172018] backdrop-blur-md sm:p-5 sm:shadow-[10px_10px_0_#172018] lg:p-6">
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,248,232,0.82),rgba(205,247,237,0.52)_48%,rgba(223,240,255,0.58))]" />
            <div className="relative grid gap-5 lg:grid-cols-[minmax(210px,0.74fr)_1.26fr] lg:items-start">
              <div className="creator-card-item">
                <div className="relative aspect-square w-full overflow-hidden rounded-md border-2 border-[#172018] bg-[#172018] shadow-[7px_7px_0_#f59e0b] sm:shadow-[8px_8px_0_#f59e0b]">
                  <Image
                    src={creatorImageUrl}
                    alt="Chân dung Chiến, người tạo ra FreeCard"
                    fill
                    sizes="(min-width: 1024px) 235px, (min-width: 640px) 520px, calc(100vw - 56px)"
                    className="object-cover object-[50%_42%]"
                    priority={false}
                  />
                  <div aria-hidden="true" className="absolute inset-0 ring-1 ring-inset ring-white/25" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="creator-card-item">
                  <h3 className="text-3xl font-extrabold leading-tight text-[#172018] sm:text-4xl lg:text-[2.55rem]">Nguyễn Đức Chiến</h3>
                  <p className="mt-3 text-sm font-medium leading-6 text-[#526057] sm:text-base sm:leading-7 lg:max-w-md">
                    Mình xây sản phẩm này như một nơi học tập nhẹ hơn, có cấu trúc hơn và bớt cảm giác phải gồng khi ôn phỏng vấn.
                  </p>
                </div>

                <div className="creator-card-item mt-5 h-px bg-[#172018]/18" />

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {creatorFocus.map((item) => (
                    <div key={item.label} className="creator-card-item rounded-md border border-[#172018]/15 bg-white/45 p-3">
                      <p className="text-xs font-extrabold uppercase text-[#647067]">{item.label}</p>
                      <p className="mt-1 text-sm font-extrabold leading-5 text-[#172018]">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="creator-card-item mt-5 border-t-2 border-[#172018] pt-4">
                  <p className="text-sm font-extrabold leading-6 text-[#172018]">
                    “Code tốt là code giúp người dùng đi tiếp mà không phải nghĩ quá nhiều.”
                  </p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
