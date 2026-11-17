"use client"

import { LazyMotion, MotionConfig, domAnimation, m } from "motion/react"

// Marketing-page animation. LazyMotion + `m` keeps the bundle small;
// reducedMotion="user" turns transforms off for people who ask for less
// motion, and the `[data-reveal]` rule in globals.css also shows revealed
// content at once for them (and without JavaScript).

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  )
}

const EASE = [0.21, 0.47, 0.32, 0.98] as const

/** Fades and lifts its content in once, when it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  /** Seconds, for staggering siblings. */
  delay?: number
}) {
  return (
    <m.div
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    >
      {children}
    </m.div>
  )
}
