import { motion, useInView, useReducedMotion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { Locale } from "../i18n/config";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import {
  resolveProductGuaranteeText,
  type ProductGuaranteeContent,
} from "../utils/productGuaranteeContent";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

type ProductGuaranteeBlockProps = {
  content: ProductGuaranteeContent;
  locale: Locale;
  showIcon?: boolean;
  className?: string;
};

export function ProductGuaranteeBlock({
  content,
  locale,
  showIcon = true,
  className = "",
}: ProductGuaranteeBlockProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const touch = useTouchMobileLayout();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, {
    once: true,
    amount: 0.2,
    margin: touch ? "0px 0px -8% 0px" : "0px 0px -40px 0px",
  });

  const { title, description } = resolveProductGuaranteeText(content, locale, {
    title: t("product.guarantee.title"),
    description: t("product.guarantee.description"),
  });

  const card = (
    <div className="flex items-start gap-4">
      {showIcon ? (
        <ShieldCheck
          size={20}
          strokeWidth={1.5}
          className="shrink-0 text-[#2D241E]/70 mt-0.5"
          aria-hidden
        />
      ) : null}
      <div className="flex-1 min-w-0">
        <p
          className="text-[#2D241E] text-xs tracking-widest uppercase mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
        >
          {title}
        </p>
        <p
          className="text-[#2D241E]/50 text-xs leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {description}
        </p>
      </div>
    </div>
  );

  if (reduced) {
    return (
      <div
        className={`rounded-[20px] p-5 ${className}`}
        style={{ backgroundColor: "#EDE9E2" }}
      >
        {card}
      </div>
    );
  }

  const shiftY = touch ? 0 : 8;

  return (
    <motion.div
      ref={ref}
      className={`rounded-[20px] p-5 ${className}`}
      style={{ backgroundColor: "#EDE9E2" }}
      initial={{ opacity: 0, y: shiftY }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: shiftY }}
      transition={{ duration: touch ? 0.28 : 0.3, ease: EASE_OUT }}
    >
      {card}
    </motion.div>
  );
}
