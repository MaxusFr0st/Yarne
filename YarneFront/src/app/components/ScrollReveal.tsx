import { motion, useInView, useReducedMotion } from "motion/react";
import type React from "react";
import { useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Stagger delay in seconds */
  delay?: number;
  /** Vertical offset in px — opacity-only on touch */
  y?: number;
  once?: boolean;
  amount?: number;
};

/** Scroll-triggered reveal — useInView + animate (reliable on mobile Safari). */
export function ScrollReveal({
  children,
  className = "",
  style,
  delay = 0,
  y = 22,
  once = true,
  amount = 0.12,
}: ScrollRevealProps) {
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once,
    amount,
    margin: touch ? "0px 0px -8% 0px" : "0px 0px -40px 0px",
  });

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const shiftY = touch ? 0 : y;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      initial={{ opacity: 0, y: shiftY }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: shiftY }}
      transition={{ duration: touch ? 0.5 : 0.55, delay: touch ? delay * 0.5 : delay, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

type SectionEyebrowProps = {
  children: ReactNode;
  className?: string;
};

export function SectionEyebrow({ children, className = "" }: SectionEyebrowProps) {
  return (
    <p
      className={`text-[#2D241E]/40 uppercase tracking-[0.22em] text-[0.65rem] mb-2 ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </p>
  );
}

type SectionTitleProps = {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3";
};

export function SectionTitle({ children, className = "", as: Tag = "h2" }: SectionTitleProps) {
  return (
    <Tag
      className={`text-[#2D241E] font-normal leading-[1.12] ${className}`}
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
        textWrap: "balance",
      } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

type SectionRuleProps = {
  label?: string;
};

export function SectionRule({ label }: SectionRuleProps) {
  return (
    <div
      className="flex items-center gap-4 max-w-[1400px] mx-auto px-6 md:px-10 py-8 md:py-10"
      aria-hidden={!label}
    >
      <span className="h-px flex-1 bg-[#2D241E]/10" />
      {label ? (
        <span
          className="text-[#2D241E]/35 text-[0.62rem] uppercase tracking-[0.3em] shrink-0"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </span>
      ) : null}
      <span className="h-px flex-1 bg-[#2D241E]/10" />
    </div>
  );
}
