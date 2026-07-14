import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

const easing = [0.25, 0.1, 0.25, 1] as const;

const MAX_WIDTH = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

type MaxWidth = keyof typeof MAX_WIDTH;

type AdminModalShellProps = {
  eyebrow: string;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: MaxWidth;
  bodyClassName?: string;
  footerClassName?: string;
  zIndexClassName?: string;
};

const btnFocus =
  "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]";

export function AdminModalCancelButton({
  onClick,
  children = "Cancel",
  className = "",
}: {
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5 hover:text-[#2D241E] ${btnFocus} ${className}`}
      style={{
        borderColor: "rgba(45,36,30,0.2)",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.78rem",
        letterSpacing: "0.12em",
        color: "rgba(45,36,30,0.6)",
      }}
    >
      <span className="uppercase tracking-widest">{children}</span>
    </button>
  );
}

export function AdminModalPrimaryButton({
  onClick,
  children,
  disabled,
  variant = "ink",
  className = "",
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  variant?: "ink" | "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${btnFocus} ${className}`}
      style={{
        backgroundColor: variant === "danger" ? "#4A0E0E" : "#2D241E",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.78rem",
        letterSpacing: "0.12em",
      }}
    >
      <span className="uppercase tracking-widest">{children}</span>
    </button>
  );
}

export function AdminModalShell({
  eyebrow,
  title,
  onClose,
  children,
  footer,
  maxWidth = "md",
  bodyClassName = "p-8",
  footerClassName = "flex items-center justify-end gap-3 px-8 py-6",
  zIndexClassName = "z-50",
}: AdminModalShellProps) {
  useBodyScrollLock(true);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={`fixed inset-0 ${zIndexClassName} flex items-center justify-center p-4`}
      style={{
        backgroundColor: "rgba(45,36,30,0.52)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        overscrollBehavior: "contain",
      }}
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      role="presentation"
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className={`w-full ${MAX_WIDTH[maxWidth]} rounded-[32px] flex flex-col max-h-[min(90dvh,720px)] overflow-hidden`}
        style={{ backgroundColor: "#F5F2ED" }}
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: easing }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 p-8 pb-6 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
        >
          <div className="min-w-0">
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
            >
              {eyebrow}
            </p>
            <h3
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors flex-shrink-0 ${btnFocus}`}
          >
            <X size={18} style={{ color: "#2D241E" }} />
          </button>
        </div>

        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${bodyClassName}`}>
          {children}
        </div>

        {footer ? (
          <div
            className={`flex-shrink-0 ${footerClassName}`}
            style={{
              borderTop: "1px solid rgba(45,36,30,0.08)",
              backgroundColor: "#F5F2ED",
            }}
          >
            {footer}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}

/** Bilingual catalog label: EN · UK when Ukrainian name is present. */
export function adminBilingualLabel(name: string, nameUk?: string | null) {
  if (!nameUk?.trim()) return name;
  return (
    <>
      {name}
      <span className="text-[#2D241E]/40"> · {nameUk.trim()}</span>
    </>
  );
}
