import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { NovaPoshtaOnlineWidgetBody } from "./NovaPoshtaOnlineWidgetBody";
import { NovaPoshtaOfflineListBody } from "./NovaPoshtaOfflineListBody";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

export interface NovaPoshtaSelection {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
}

/** Nova Poshta's mark, kept as-is — it is their brand asset, not ours to restyle. */
function NovaPoshtaMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M11.9401 16.4237H16.0596V21.271H19.2101L15.39 25.0911C14.6227 25.8585 13.3791 25.8585 12.6118 25.0911L8.79166 21.271H11.9401V16.4237ZM21.2688 19.2102V8.78972L25.091 12.6098C25.8583 13.3772 25.8583 14.6207 25.091 15.3881L21.2688 19.2102ZM16.0596 6.73099V11.5763H11.9401V6.73099H8.78958L12.6097 2.90882C13.377 2.14148 14.6206 2.14148 15.3879 2.90882L19.2101 6.73099H16.0596ZM2.90868 12.6098L6.72877 8.78972V19.2102L2.90868 15.3901C2.14133 14.6228 2.14133 13.3772 2.90868 12.6098Z"
        fill="#DA291C"
      />
    </svg>
  );
}

/** Width-only check — the sheet/dialog split is about available width, not input type. */
function useCompactViewport(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
  );
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const onChange = () => setCompact(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return compact;
}

export function NovaPoshtaPicker({
  value,
  onSelect,
  tone = "light",
}: {
  value: NovaPoshtaSelection | null;
  onSelect: (selection: NovaPoshtaSelection) => void;
  /** `dark` sits on the checkout summary card; `light` on white surfaces (admin). */
  tone?: "light" | "dark";
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const compact = useCompactViewport();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  /** True once the sheet has finished animating in — gates the online body's iframe mount. */
  const [entered, setEntered] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const openPicker = () => {
    setEntered(false);
    setOpen(true);
  };

  const dark = tone === "dark";
  const primaryLine = value ? value.warehouseName : t("checkout.deliveryChoose");
  const secondaryLine = value ? value.cityName : t("checkout.deliveryChooseHint");

  const trigger = (
    <button
      type="button"
      onClick={openPicker}
      aria-haspopup="dialog"
      className="w-full flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left cursor-pointer transition-colors duration-200"
      style={{
        backgroundColor: dark ? "rgba(245,242,237,0.10)" : "#fff",
        border: `1px solid ${dark ? "rgba(245,242,237,0.18)" : "rgba(45,36,30,0.14)"}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Logo keeps a light tile on both tones so the mark stays legible. Swaps to the offline
          building icon the instant connectivity drops — reflecting which picker mode will
          open, before the sheet is ever tapped, not as a surprise after. */}
      <span
        className="shrink-0 flex items-center justify-center rounded-[10px]"
        style={{ width: 34, height: 34, backgroundColor: dark ? "#F5F2ED" : "#F8F5F0" }}
      >
        {online ? <NovaPoshtaMark size={18} /> : <img src="/NocaPostOfflineIcon.png" alt="" className="w-[22px] h-[22px]" />}
      </span>

      {/* min-w-0 is what lets the truncation below actually engage: without it this flex
          child refuses to shrink under its content, and a long branch name ("Відділення №8
          (до 30 кг на одне місце): вул. …") pushed the whole summary card past the viewport. */}
      <span className="flex-1 min-w-0 flex flex-col">
        <span
          className="truncate"
          style={{
            fontSize: "0.85rem",
            color: dark ? "#F5F2ED" : "#2D241E",
            fontWeight: value ? 500 : 400,
          }}
        >
          {primaryLine}
        </span>
        <span
          className="truncate"
          style={{
            fontSize: "0.75rem",
            marginTop: 1,
            color: dark ? "rgba(245,242,237,0.55)" : "rgba(45,36,30,0.55)",
          }}
        >
          {secondaryLine}
        </span>
      </span>

      <ChevronRight
        size={16}
        strokeWidth={1.5}
        className="shrink-0"
        style={{ color: dark ? "rgba(245,242,237,0.6)" : "rgba(45,36,30,0.45)" }}
      />
    </button>
  );

  // Exit is deliberately quicker than entrance: an arrival wants to feel considered, a
  // dismissal wants to get out of the way. Both ride the same exponential ease-out so the
  // sheet decelerates into place rather than easing symmetrically, which reads as hesitation.
  const panelMotion = reduceMotion
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : compact
      ? {
          initial: { y: "100%" },
          animate: { y: 0, transition: { duration: 0.68, ease: EASE_OUT } },
          exit: { y: "100%", transition: { duration: 0.44, ease: EASE_IN } },
        }
      : {
          initial: { opacity: 0, scale: 0.96, y: 10 },
          animate: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.58, ease: EASE_OUT } },
          exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.36, ease: EASE_IN } },
        };

  // Overlay height is pinned to 100svh rather than left to `inset-0`. For a fixed element,
  // `bottom: 0` resolves against the layout viewport, which on mobile spans the LARGE viewport
  // — the area extending behind the browser's collapsible toolbar. Combined with items-end,
  // that put the sheet's bottom edge underneath iOS Safari's URL bar, cropping it. svh is the
  // SMALL viewport (all browser UI showing), so the bottom edge is always on screen.
  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-x-0 top-0 z-[1000] flex justify-center items-end sm:items-center sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: reduceMotion ? 0 : 0.4, ease: EASE_OUT } }}
          exit={reduceMotion ? undefined : { opacity: 0, transition: { duration: 0.36, ease: EASE_IN } }}
          style={{
            height: "100svh",
            backgroundColor: "rgba(45,36,30,0.55)",
            backdropFilter: "blur(3px)",
          }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("checkout.deliveryPickerTitle")}
            className="relative w-full sm:max-w-[560px] flex flex-col overflow-hidden rounded-t-[26px] sm:rounded-[24px]"
            style={{
              backgroundColor: "#F3EFE8",
              // 92svh, not 86: the online widget is built for a full-height container and
              // its branch list is the tallest thing in the flow, so every point we take off
              // the sheet comes straight out of visible addresses. Still short of the top so
              // it reads as a sheet with the page behind it.
              height: compact ? "92svh" : "min(78svh, 700px)",
              boxShadow: "0 -12px 48px rgba(45,36,30,0.28)",
            }}
            {...panelMotion}
            onAnimationComplete={() => setEntered(true)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab affordance — the sheet reads as draggable-adjacent on phones even though
                dismissal is via the backdrop or the close control. */}
            <div className="sm:hidden pt-2 pb-0.5 flex justify-center shrink-0">
              <span className="block rounded-full" style={{ width: 40, height: 4, backgroundColor: "rgba(45,36,30,0.18)" }} />
            </div>

            <header
              className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-2 sm:py-3"
              style={{ borderBottom: "1px solid rgba(45,36,30,0.10)" }}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {online ? <NovaPoshtaMark size={17} /> : <img src="/NocaPostOfflineIcon.png" alt="" className="w-[17px] h-[17px]" />}
                <span
                  className="uppercase truncate"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.68rem",
                    letterSpacing: "0.14em",
                    color: "rgba(45,36,30,0.55)",
                  }}
                >
                  {t("checkout.deliveryPickerTitle")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("checkout.deliveryPickerClose")}
                className="shrink-0 flex items-center justify-center rounded-full cursor-pointer transition-colors duration-200 hover:bg-[#2D241E]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                style={{ width: 34, height: 34 }}
              >
                <X size={17} strokeWidth={1.5} className="text-[#2D241E]" />
              </button>
            </header>

            {online ? (
              <NovaPoshtaOnlineWidgetBody
                cityName={value?.cityName}
                entered={entered}
                onSelect={onSelect}
                onClose={() => setOpen(false)}
              />
            ) : (
              <NovaPoshtaOfflineListBody onSelect={onSelect} onClose={() => setOpen(false)} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {trigger}
      {/* Portalled to <body>: the checkout summary is a transformed, overflow-clipped card,
          and either of those would otherwise trap a position:fixed overlay inside it. */}
      {typeof document !== "undefined" && createPortal(dialog, document.body)}
    </>
  );
}
