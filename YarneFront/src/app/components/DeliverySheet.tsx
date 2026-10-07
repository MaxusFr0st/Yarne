import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

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

/**
 * The row that opens a delivery picker: an icon tile, a main line and a muted line, with a chevron.
 * Shared by the Nova Poshta picker and the delivery-abroad picker so both look the same.
 */
export function DeliveryTrigger({
  icon,
  primary,
  secondary,
  filled,
  tone,
  onClick,
}: {
  icon: ReactNode;
  primary: string;
  secondary: string;
  /** Something is already chosen: the main line is set a little heavier. */
  filled: boolean;
  /** `dark` sits on the checkout summary card; `light` on white surfaces (admin). */
  tone: "light" | "dark";
  onClick: () => void;
}) {
  const dark = tone === "dark";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="w-full flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left cursor-pointer transition-colors duration-200"
      style={{
        backgroundColor: dark ? "rgba(245,242,237,0.10)" : "#fff",
        border: `1px solid ${dark ? "rgba(245,242,237,0.18)" : "rgba(45,36,30,0.14)"}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* The icon keeps a light tile on both tones so a brand mark stays legible. */}
      <span
        className="shrink-0 flex items-center justify-center rounded-[10px]"
        style={{ width: 34, height: 34, backgroundColor: dark ? "#F5F2ED" : "#F8F5F0" }}
      >
        {icon}
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
            fontWeight: filled ? 500 : 400,
          }}
        >
          {primary}
        </span>
        <span
          className="truncate"
          style={{
            fontSize: "0.75rem",
            marginTop: 1,
            color: dark ? "rgba(245,242,237,0.55)" : "rgba(45,36,30,0.55)",
          }}
        >
          {secondary}
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
}

/**
 * The bottom sheet (phones) / dialog (wider screens) the delivery pickers open in: portal, scroll
 * lock, Escape, backdrop tap, swipe-down on the grab bar, and the entrance and exit motion.
 * `children` is everything under the header; `onEntered` fires once the entrance has finished.
 */
export function DeliverySheet({
  open,
  onClose,
  title,
  closeLabel,
  headerIcon,
  headerLeading,
  onEntered,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  closeLabel: string;
  headerIcon: ReactNode;
  /** Replaces the title in the header (a back control, say) while keeping the icon and the close button. */
  headerLeading?: ReactNode;
  onEntered?: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const compact = useCompactViewport();
  const dragControls = useDragControls();
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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

  // Phones: the sheet can be swiped down to close. The drag starts only from the grab bar and
  // header: the body may be a cross-origin frame, whose touches never reach this page.
  const startSheetDrag = (e: ReactPointerEvent) => {
    if (!compact || reduceMotion) return;
    if ((e.target as HTMLElement).closest("button")) return; // the close button stays a tap
    dragControls.start(e);
  };
  const endSheetDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  // Overlay height is pinned to the screen height (--app-svh) rather than left to `inset-0`. For a fixed element,
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
            height: "var(--app-svh)",
            backgroundColor: "rgba(45,36,30,0.55)",
            backdropFilter: "blur(3px)",
          }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative w-full sm:max-w-[560px] flex flex-col overflow-hidden rounded-t-[26px] sm:rounded-[24px]"
            style={{
              backgroundColor: "#F3EFE8",
              // 92svh, not 86: Nova Poshta's widget is built for a full-height container and
              // its branch list is the tallest thing in the flow, so every point we take off
              // the sheet comes straight out of visible addresses. Still short of the top so
              // it reads as a sheet with the page behind it.
              height: compact ? "calc(var(--app-svh) * 0.92)" : "min(calc(var(--app-svh) * 0.78), 700px)",
              boxShadow: "0 -12px 48px rgba(45,36,30,0.28)",
            }}
            {...panelMotion}
            drag={compact && !reduceMotion ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            dragSnapToOrigin
            onDragEnd={endSheetDrag}
            onAnimationComplete={() => onEntered?.()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab bar + header: the swipe-down handle on phones. */}
            <div className="shrink-0" onPointerDown={startSheetDrag} style={{ touchAction: compact ? "none" : undefined }}>
            <div className="sm:hidden pt-2 pb-0.5 flex justify-center">
              <span className="block rounded-full" style={{ width: 40, height: 4, backgroundColor: "rgba(45,36,30,0.18)" }} />
            </div>

            <header
              className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2 sm:py-3"
              style={{ borderBottom: "1px solid rgba(45,36,30,0.10)" }}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                {headerIcon}
                {headerLeading ?? (
                  <span
                    className="uppercase truncate"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.68rem",
                      letterSpacing: "0.14em",
                      color: "rgba(45,36,30,0.55)",
                    }}
                  >
                    {title}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="shrink-0 flex items-center justify-center rounded-full cursor-pointer transition-colors duration-200 hover:bg-[#2D241E]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
                style={{ width: 34, height: 34 }}
              >
                <X size={17} strokeWidth={1.5} className="text-[#2D241E]" />
              </button>
            </header>
            </div>

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Portalled to <body>: the checkout summary is a transformed, overflow-clipped card,
  // and either of those would otherwise trap a position:fixed overlay inside it.
  return typeof document !== "undefined" ? createPortal(dialog, document.body) : null;
}
