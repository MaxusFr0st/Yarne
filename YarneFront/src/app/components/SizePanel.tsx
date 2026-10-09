import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product, SizeOption } from "../types/product";
import type { Locale } from "../i18n/config";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { localizedCatalogName } from "../utils/localizedName";
import { productName } from "../utils/productText";

// The same easings the delivery sheet uses.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN = [0.4, 0, 1, 1] as const;

const MOBILE_MEDIA = "(max-width: 767px)";

/** Phones get a sheet from the bottom, tablets and computers a panel from the right (the product page's own breakpoint). */
function useSheetLayout(): boolean {
  const [sheet, setSheet] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_MEDIA).matches);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_MEDIA);
    const onChange = () => setSheet(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return sheet;
}

const hasMeasure = (size: SizeOption) =>
  [size.widthCm, size.heightCm, size.depthCm, size.handleCm].some((v) => typeof v === "number" && v > 0);

/** The sizes that have at least one measurement entered. */
export const measuredSizes = (product: Pick<Product, "sizes">): SizeOption[] => product.sizes.filter(hasMeasure);

/** The "Measurements" button is shown only when this is true. */
export const hasSizeMeasurements = (product: Pick<Product, "sizes">): boolean => measuredSizes(product).length > 0;

const FOCUSABLE = 'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

export function SizePanel({
  open,
  onClose,
  product,
  locale,
  activeSize,
}: {
  open: boolean;
  onClose: () => void;
  product: Product;
  locale: Locale;
  /** The size selected on the product page: the panel opens on it. */
  activeSize: string | null;
}) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const sheet = useSheetLayout();
  const dragControls = useDragControls();
  const sizes = measuredSizes(product);
  const [chosen, setChosen] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(open);

  // Opens on the size selected on the page (or the first one with numbers).
  useEffect(() => {
    if (open) setChosen(null);
  }, [open]);
  const current = sizes.find((s) => s.name === chosen) ?? sizes.find((s) => s.name === activeSize) ?? sizes[0];

  // Focus moves in on open and goes back to the button that opened the panel on close.
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(frame);
      opener?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Tab stays inside the dialog.
  const keepFocusInside = (e: ReactKeyboardEvent) => {
    if (e.key !== "Tab") return;
    const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Phones: the sheet can be swiped down from its grab bar, as the delivery sheet can.
  const startDrag = (e: ReactPointerEvent) => {
    if (!sheet || reduceMotion) return;
    if ((e.target as HTMLElement).closest("button")) return;
    dragControls.start(e);
  };
  const endDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

  if (!current) return null;

  const width = current.widthCm ?? null;
  const height = current.heightCm ?? null;
  const rows = [
    { key: "width", label: t("sizePanel.width"), value: current.widthCm },
    { key: "height", label: t("sizePanel.height"), value: current.heightCm },
    { key: "depth", label: t("sizePanel.depth"), value: current.depthCm },
    { key: "handle", label: t("sizePanel.handle"), value: current.handleCm },
  ].filter((row): row is { key: string; label: string; value: number } => typeof row.value === "number" && row.value > 0);
  const cm = (value: number) => t("sizePanel.cm", { value });
  const name = productName(product, locale);
  const photo = product.sizePhotoUrl?.trim();

  const backdropMotion = {
    initial: reduceMotion ? (false as const) : { opacity: 0 },
    animate: { opacity: 1, transition: { duration: reduceMotion ? 0 : sheet ? 0.4 : 0.3, ease: sheet ? EASE_OUT : undefined } },
    exit: reduceMotion ? undefined : { opacity: 0, transition: { duration: sheet ? 0.36 : 0.3, ease: sheet ? EASE_IN : undefined } },
  };
  const panelMotion = reduceMotion
    ? { initial: false as const, animate: {}, exit: {}, transition: { duration: 0 } }
    : sheet
      ? {
          initial: { y: "100%" },
          animate: { y: 0, transition: { duration: 0.68, ease: EASE_OUT } },
          exit: { y: "100%", transition: { duration: 0.44, ease: EASE_IN } },
        }
      : {
          initial: { x: "100%" },
          animate: { x: 0 },
          exit: { x: "100%" },
          transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
        };

  const body = (
    <div className="flex flex-col gap-[14px] px-[22px] pb-6 pt-1 overflow-y-auto overscroll-contain min-h-0">
      {sizes.length > 1 && (
        <div role="group" aria-label={t("sizePanel.sizeSwitch")} className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size.name}
              type="button"
              aria-pressed={size.name === current.name}
              onClick={() => setChosen(size.name)}
              className="rounded-full cursor-pointer touch-manipulation transition-colors duration-200"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                padding: "7px 16px",
                minWidth: 46,
                backgroundColor: size.name === current.name ? "#2D241E" : "transparent",
                color: size.name === current.name ? "#F5F2ED" : "#2D241E",
                border: size.name === current.name ? "1.5px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
              }}
            >
              {localizedCatalogName(size.name, size.nameUk, locale)}
            </button>
          ))}
        </div>
      )}

      {photo ? (
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#EDE9E2]">
          <ImageWithFallback src={photo} alt={t("sizePanel.photoAlt")} className="absolute inset-0 w-full h-full object-cover" />
          {/* Drawn by the site, not painted into the photo, so a changed number changes here and in the table. */}
          {width != null && width > 0 && (
            <span
              className="absolute text-center text-[#2D241E]"
              style={{
                left: "12%",
                right: "12%",
                bottom: 10,
                borderTop: "1.5px solid #2D241E",
                paddingTop: 2,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.72rem",
                fontVariantNumeric: "tabular-nums",
                filter: "drop-shadow(0 0 3px rgba(245,242,237,0.95))",
              }}
            >
              {cm(width)}
            </span>
          )}
          {height != null && height > 0 && (
            <span
              className="absolute text-center text-[#2D241E]"
              style={{
                top: "14%",
                bottom: "22%",
                right: 10,
                borderRight: "1.5px solid #2D241E",
                paddingRight: 3,
                writingMode: "vertical-rl",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.72rem",
                fontVariantNumeric: "tabular-nums",
                filter: "drop-shadow(0 0 3px rgba(245,242,237,0.95))",
              }}
            >
              {cm(height)}
            </span>
          )}
        </div>
      ) : null}

      <div>
        <table className="w-full border-collapse" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", fontVariantNumeric: "tabular-nums" }}>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="text-left font-normal py-2 text-[#2D241E]" style={{ borderBottom: "1px solid rgba(45,36,30,0.1)" }}>
                  {row.label}
                </th>
                <td className="text-right py-2 text-[#2D241E]" style={{ borderBottom: "1px solid rgba(45,36,30,0.1)" }}>
                  {cm(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p
          className="mt-2.5 text-[#2D241E]/[0.68]"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}
        >
          {t("sizePanel.note")}
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="h-[46px] rounded-[23px] cursor-pointer text-[#2D241E] uppercase transition-colors duration-200 hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
        style={{
          border: "1.5px solid #2D241E",
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "0.72rem",
          letterSpacing: "0.14em",
        }}
      >
        {t("sizePanel.close")}
      </button>
    </div>
  );

  const header = (
    <div className="px-[22px] pb-3 pt-1 pr-14 shrink-0">
      <p
        className="uppercase text-[#2D241E]/[0.68]"
        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.14em" }}
      >
        {name}
      </p>
      <h2
        id="size-panel-title"
        className="text-[#2D241E] mt-1"
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 500, lineHeight: 1.1 }}
      >
        {t("sizePanel.title")}
      </h2>
    </div>
  );

  const closeButton = (
    <button
      ref={closeRef}
      type="button"
      onClick={onClose}
      aria-label={t("sizePanel.close")}
      className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full cursor-pointer text-[#2D241E] transition-colors duration-200 hover:bg-[#2D241E]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
      style={{ width: 36, height: 36, backgroundColor: "rgba(45,36,30,0.06)" }}
    >
      <X size={17} strokeWidth={1.5} />
    </button>
  );

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="size-panel-backdrop"
          className={sheet ? "fixed inset-x-0 top-0 z-[1000] flex justify-center items-end" : "fixed inset-x-0 top-0 z-[1000]"}
          style={
            sheet
              ? { height: "var(--app-svh)", backgroundColor: "rgba(45,36,30,0.55)", backdropFilter: "blur(3px)" }
              : { height: "calc(var(--app-svh) + var(--browser-bar-b))", backgroundColor: "rgba(45,36,30,0.3)", backdropFilter: "blur(8px)" }
          }
          {...backdropMotion}
          onClick={onClose}
        >
          {sheet ? (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="size-panel-title"
              className="relative w-full flex flex-col rounded-t-[26px] overflow-hidden"
              style={{
                backgroundColor: "#F3EFE8",
                maxHeight: "calc(var(--app-svh) * 0.86)",
                boxShadow: "0 -12px 48px rgba(45,36,30,0.28)",
              }}
              {...panelMotion}
              drag={!reduceMotion ? "y" : false}
              dragControls={dragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.9 }}
              dragSnapToOrigin
              onDragEnd={endDrag}
              onKeyDown={keepFocusInside}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0" onPointerDown={startDrag} style={{ touchAction: "none" }}>
                <div className="pt-2 pb-3 flex justify-center">
                  <span className="block rounded-full" style={{ width: 40, height: 4, backgroundColor: "rgba(45,36,30,0.18)" }} />
                </div>
                {header}
              </div>
              {closeButton}
              {body}
            </motion.div>
          ) : (
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="size-panel-title"
              className="fixed top-0 right-0 w-full max-w-[480px] flex flex-col"
              style={{
                height: "calc(var(--app-svh) + var(--browser-bar-b))",
                paddingBottom: "var(--browser-bar-b)",
                backgroundColor: "#F3EFE8",
                boxShadow: "-24px 0 80px rgba(45,36,30,0.12)",
              }}
              {...panelMotion}
              onKeyDown={keepFocusInside}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="pt-7 shrink-0">{header}</div>
              {closeButton}
              {body}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  return typeof document !== "undefined" ? createPortal(dialog, document.body) : null;
}
