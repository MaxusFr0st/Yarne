import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, ShoppingBag, TriangleAlert, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useLocale } from "../../i18n/useLocale";
import { careText, type CareMaterial, type CareTopic } from "../../utils/careContent";
import { CARE_CONTACT_HREF, EYEBROW, FOCUS_RING, LABEL, SANS, SERIF, useNarrowScreen } from "./careUi";

export type CarePiece = { id: string; name: string };

type Props = {
  material: CareMaterial;
  /** The open topic, or null when the guide is closed. */
  topic: CareTopic | null;
  /** The material's pieces that still exist, in order. */
  pieces: CarePiece[];
  /** The piece chosen on the page, or null for "all pieces". */
  piece: CarePiece | null;
  onClose: () => void;
  onTopic: (topicId: string) => void;
};

// Desktop: the panel moves at one steady speed, in and out. Phones: the sheet moves like the
// Nova Poshta picker's (components/NovaPoshtaPicker.tsx): it decelerates into place and
// accelerates away. The scrim darkens in step with either. Times are for the whole travel.
const SHEET_EASE_OUT = [0.16, 1, 0.3, 1] as const;
const SHEET_EASE_IN = [0.4, 0, 1, 1] as const;
const OPEN_S = 0.66;
const CLOSE_S = 0.46;
const SHEET_OPEN_S = 0.61;
const PANEL_WIDTH = 600;
const SHEET_CLOSE_S = 0.45;
const SHEET_SETTLE_S = 0.31;
/** A swipe down on the sheet's top closes it past this distance (px) or speed (px/ms). */
const SWIPE_CLOSE_DISTANCE = 110;
const SWIPE_CLOSE_VELOCITY = 0.55;
const SWIPE_FLICK_MIN_DISTANCE = 28;
const SCROLL_KEYS: Record<string, number> = { ArrowDown: 60, ArrowUp: -60, PageDown: 400, PageUp: -400 };
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The step-by-step guide for one topic: a side panel on desktop, a bottom sheet on phones.
 * It has no piece picker of its own: the piece chosen on the page applies to every topic.
 */
export function CareGuidePanel({ material, topic, pieces, piece, onClose, onTopic }: Props) {
  const { t } = useTranslation();
  const locale = useLocale();
  const narrow = useNarrowScreen();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = topic !== null;
  // Still on screen: from opening until the closing slide has finished.
  const [present, setPresent] = useState(false);
  useEffect(() => {
    if (open) setPresent(true);
  }, [open]);
  // Phones only. On desktop, fixing the body in place takes the page's scrollbar away, and the
  // page behind (and the header) jumps sideways as the panel opens; there the page is held by
  // not letting the wheel or the keys reach it (below).
  // Held until the sheet is gone: letting the page go mid-slide lays it out again and the
  // slide stutters.
  useBodyScrollLock((open || present) && narrow);

  useEffect(() => {
    if (!open || narrow) return;
    const onWheel = (event: WheelEvent) => {
      const scroller = scrollRef.current;
      if (!scroller || !scroller.contains(event.target as Node)) {
        event.preventDefault();
        return;
      }
      const atTop = scroller.scrollTop <= 0 && event.deltaY < 0;
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1 && event.deltaY > 0;
      if (atTop || atEnd) event.preventDefault();
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [open, narrow]);

  // preventScroll: the panel is still off screen when it takes focus, and the browser would
  // scroll the page to reach it.
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  // How far the panel is from its place, in px: down on phones, to the right on desktop. The
  // enter and exit slides and the finger all drive this one value, so they hand over to each
  // other without a jump.
  const offset = useMotionValue(0);
  const swipe = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);
  const offScreen =
    typeof window === "undefined" ? 900 : narrow ? window.innerHeight : Math.min(PANEL_WIDTH, window.innerWidth);
  const openS = narrow ? SHEET_OPEN_S : OPEN_S;
  const closeS = narrow ? SHEET_CLOSE_S : CLOSE_S;
  const openEase = narrow ? SHEET_EASE_OUT : "linear";
  const closeEase = narrow ? SHEET_EASE_IN : "linear";
  // The scrim clears as the panel goes, under the finger too.
  const scrimOpacity = useTransform(offset, [0, offScreen], [1, 0]);
  const slides = !reduceMotion;
  const closing = useRef(false);
  useEffect(() => {
    if (open) closing.current = false;
  }, [open]);

  /**
   * The panel leaves from wherever it is, and only then is the guide closed. One animation,
   * nothing else moving the panel or the page under it.
   * Once only: a double click on the scrim must not close twice (the second would go Back a
   * page further).
   * `velocity`: the finger's speed on release (px/ms). A sheet let go by a finger is already
   * moving, so it carries on steadily, never slower than the finger, instead of starting again
   * from rest.
   */
  const close = (velocity?: number) => {
    if (closing.current) return;
    closing.current = true;
    if (!slides) {
      onClose();
      return;
    }
    const speed = Math.max(velocity ?? 0, offScreen / (closeS * 1000));
    const duration = Math.max(0, offScreen - offset.get()) / speed / 1000;
    animate(offset, offScreen, { duration, ease: velocity === undefined ? closeEase : "linear", onComplete: onClose });
  };

  const onSwipeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Not from the close button: that is a tap.
    if (!narrow || closing.current || (event.target as Element).closest("button")) return;
    offset.stop();
    swipe.current = { startY: event.clientY - offset.get(), lastY: event.clientY, lastT: event.timeStamp, velocity: 0 };
    try {
      // The finger keeps the sheet even when it slides off this strip.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // No capture: the swipe still works while the finger stays on the strip.
    }
  };
  const onSwipeMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = swipe.current;
    if (!state) return;
    const elapsed = event.timeStamp - state.lastT;
    if (elapsed > 0) state.velocity = (event.clientY - state.lastY) / elapsed;
    state.lastY = event.clientY;
    state.lastT = event.timeStamp;
    offset.set(Math.max(0, event.clientY - state.startY));
  };
  const onSwipeEnd = () => {
    const state = swipe.current;
    if (!state) return;
    swipe.current = null;
    const moved = offset.get();
    // A flick counts only once the sheet has really moved: a tap that jitters must not close it.
    if (moved > SWIPE_CLOSE_DISTANCE || (moved > SWIPE_FLICK_MIN_DISTANCE && state.velocity > SWIPE_CLOSE_VELOCITY)) {
      // Keeps going down from where, and as fast as, the finger left it.
      close(state.velocity);
    } else {
      animate(offset, 0, { duration: SHEET_SETTLE_S, ease: SHEET_EASE_OUT });
    }
  };

  // Previous / next: the new topic starts from its top.
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [topic?.id]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    // Arrow and page keys scroll the steps, never the page behind.
    if (event.key in SCROLL_KEYS) {
      event.preventDefault();
      scrollRef.current?.scrollBy({ top: SCROLL_KEYS[event.key] });
      return;
    }
    if (event.key !== "Tab") return;
    const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!items?.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const away = reduceMotion ? { opacity: 0 } : narrow ? { y: offScreen } : { x: offScreen };
  const inPlace = reduceMotion ? { opacity: 1 } : narrow ? { y: 0 } : { x: 0 };

  const body = () => {
    if (!topic) return null;
    const materialName = careText(material.name, locale);
    const heading = careText(topic.heading, locale) || careText(topic.title, locale);
    const index = material.topics.findIndex((item) => item.id === topic.id);
    const count = material.topics.length;
    const previous = material.topics[(index + count - 1) % count];
    const next = material.topics[(index + 1) % count];
    const note = piece && topic.pieceNotes[piece.id] ? careText(topic.pieceNotes[piece.id], locale) : "";
    const differing = pieces.filter((item) => topic.pieceNotes[item.id]).map((item) => item.name);
    const warning = careText(topic.warning, locale);
    const need = topic.need.map((item) => careText(item, locale)).filter(Boolean);
    const steps = topic.steps.map((item) => careText(item, locale)).filter(Boolean);
    const muted = "text-[13px] md:text-[13.5px] leading-[1.6] text-[#2D241E]/72";

    return (
      <>
        {/* Sized from the top like the cart's backdrop: on iPhone a fixed `bottom: 0` stops short
            of the screen bottom Safari's translucent bar renders through. */}
        <motion.div
          className="fixed inset-x-0 top-0 z-[60]"
          style={{
            height: "calc(var(--app-svh) + var(--browser-bar-b))",
            backgroundColor: "rgba(45,36,30,0.48)",
            ...(slides ? { opacity: scrimOpacity } : undefined),
          }}
          {...(slides
            ? undefined
            : {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                exit: { opacity: 0, transition: { duration: CLOSE_S, ease: "linear" } },
                transition: { duration: OPEN_S, ease: "linear" },
              })}
          onClick={() => close()}
        />
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={heading}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className={`fixed z-[60] flex flex-col outline-none bg-[#F5F2ED] text-[#2D241E] ${
            narrow ? "inset-x-0 rounded-t-[28px]" : "top-0 right-0 w-[600px] max-w-full"
          }`}
          style={{
            ...SANS,
            ...(narrow
              ? {
                  top: "calc(var(--app-svh) * 0.12)",
                  height: "calc(var(--app-svh) * 0.88 + var(--browser-bar-b))",
                  boxShadow: "0 -24px 64px rgba(45,36,30,0.25)",
                }
              : {
                  height: "calc(var(--app-svh) + var(--browser-bar-b))",
                  boxShadow: "0 40px 120px rgba(45,36,30,0.18), 0 8px 32px rgba(45,36,30,0.08)",
                }),
            paddingBottom: "var(--browser-bar-b)",
            willChange: "transform",
            ...(narrow ? { y: offset } : { x: offset }),
          }}
          initial={away}
          animate={inPlace}
          // The browser's Back closes without `close`: the same slide.
          exit={{ ...away, transition: { duration: closeS, ease: closeEase } }}
          transition={{ duration: openS, ease: openEase }}
        >
          {/* The sheet's top (handle and title row) is where a finger takes hold of it: it follows
              the finger down and closes when let go far or fast enough, else settles back. */}
          <div
            className="shrink-0 max-md:touch-none"
            onPointerDown={onSwipeStart}
            onPointerMove={onSwipeMove}
            onPointerUp={onSwipeEnd}
            onPointerCancel={onSwipeEnd}
          >
          {narrow && (
            <div className="pt-2.5 pb-1 flex justify-center" aria-hidden>
              <span className="w-10 h-1 rounded-full bg-[#2D241E]/20" />
            </div>
          )}
          <div
            className="flex items-center justify-between gap-4 pt-2 pr-4 pb-2 pl-6 md:h-[72px] md:py-0 md:pr-6 md:pl-10 md:border-b md:border-[#2D241E]/10">
            <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>
              {t("care.panel.eyebrow", { material: materialName, topic: careText(topic.title, locale) })}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => close()}
              aria-label={t("care.panel.close")}
              className={`shrink-0 w-11 h-11 rounded-full border border-[#2D241E]/20 flex items-center justify-center cursor-pointer hover:bg-[#2D241E]/5 transition-colors ${FOCUS_RING}`}
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          </div>

          <div
            ref={scrollRef}
            className="grow min-h-0 overflow-y-auto overscroll-contain px-6 pt-1 pb-6 md:px-10 md:pt-8 md:pb-10 flex flex-col gap-[18px] md:gap-6"
          >
            <h2 className="font-normal text-[30px] md:text-[40px] leading-[1.1] md:leading-[1.08]" style={SERIF}>
              {heading}
            </h2>

            {warning && (
              <div className="px-4 py-3.5 md:px-5 md:py-[18px] rounded-[14px] flex gap-3 md:gap-3.5" style={{ backgroundColor: "rgba(155,107,46,0.1)" }}>
                <TriangleAlert size={narrow ? 18 : 20} strokeWidth={1.75} className="shrink-0 mt-px text-[#9B6B2E]" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className={`${LABEL} font-semibold text-[10.5px] md:text-[11.5px] text-[#75482E]`}>{t("care.panel.beforeYouStart")}</p>
                  <p className="text-[13.5px] md:text-sm leading-[1.55] md:leading-[1.6]">{warning}</p>
                </div>
              </div>
            )}

            {piece && note ? (
              <div className="px-4 py-3.5 md:px-5 md:py-[18px] rounded-[14px] flex gap-3 md:gap-3.5" style={{ backgroundColor: "rgba(74,14,14,0.08)" }}>
                <ShoppingBag size={narrow ? 18 : 20} strokeWidth={1.75} className="shrink-0 mt-px text-[#4A0E0E]" aria-hidden />
                <div className="flex flex-col gap-1">
                  <p className={`${LABEL} font-semibold text-[10.5px] md:text-[11.5px] text-[#4A0E0E]`}>
                    {t("care.panel.onlyFor", { piece: piece.name })}
                  </p>
                  <p className="text-[13.5px] md:text-sm leading-[1.55] md:leading-[1.6]">{note}</p>
                </div>
              </div>
            ) : piece ? (
              <p className={muted}>{t("care.panel.nothingDifferent", { piece: piece.name })}</p>
            ) : differing.length > 0 ? (
              <p className={muted}>{t("care.panel.someDiffer", { pieces: differing.join(", ") })}</p>
            ) : null}

            {need.length > 0 && (
              <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
                <p className={`${LABEL} text-[10.5px] md:text-[11.5px] text-[#2D241E]/72 mr-1`}>{t("care.panel.youllNeed")}</p>
                {need.map((item, i) => (
                  <span key={i} className="px-3 py-1.5 md:px-[13px] md:py-[7px] rounded-full border border-[#2D241E]/20 text-[12.5px] md:text-[13px]">
                    {item}
                  </span>
                ))}
              </div>
            )}

            <ol className="flex flex-col">
              {steps.map((step, i) => (
                <li key={i} className="flex gap-3.5 md:gap-5 py-3.5 md:py-4 border-t border-[#2D241E]/10">
                  <span
                    className="shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full border border-[#4A0E0E] text-[#4A0E0E] flex items-center justify-center text-[17px] md:text-xl leading-none"
                    // Lining figures: the font's default ones hang below the line and sit off-centre.
                    style={{ ...SERIF, fontVariantNumeric: "lining-nums", fontFeatureSettings: '"lnum" 1' }}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="text-sm md:text-[15px] leading-[1.6] pt-[5px] md:pt-2">
                    <span className="sr-only">{i + 1}. </span>
                    {step}
                  </span>
                </li>
              ))}
            </ol>

            <p className={muted}>
              {t("care.panel.notSure")}{" "}
              <a href={CARE_CONTACT_HREF} className="text-[#2D241E] underline underline-offset-2 hover:text-[#4A0E0E]">
                {t("care.panel.askUs")}
              </a>
              <span className="hidden md:inline">, {t("care.panel.orSend")}</span>
              <span className="md:hidden">.</span>
            </p>
          </div>

          {count > 1 && (
            <div className="shrink-0 grid grid-cols-2 gap-2 px-4 pt-3 pb-6 md:flex md:justify-between md:items-center md:px-10 md:py-5 border-t border-[#2D241E]/10">
              <button
                type="button"
                onClick={() => onTopic(previous.id)}
                className={`h-12 md:h-11 px-3 md:pl-3.5 md:pr-5 inline-flex items-center justify-center gap-2 rounded-full border border-[#2D241E]/20 ${LABEL} text-[11px] md:text-[11.5px] cursor-pointer hover:bg-[#2D241E]/5 transition-colors ${FOCUS_RING}`}
              >
                {narrow ? <ArrowLeft size={14} strokeWidth={1.5} aria-hidden /> : <ChevronLeft size={14} strokeWidth={1.5} aria-hidden />}
                <span className="truncate">{careText(previous.title, locale)}</span>
              </button>
              <button
                type="button"
                onClick={() => onTopic(next.id)}
                className={`h-12 md:h-11 px-3 md:pl-5 md:pr-3.5 inline-flex items-center justify-center gap-2 rounded-full bg-[#2D241E] text-[#F5F2ED] ${LABEL} text-[11px] md:text-[11.5px] cursor-pointer hover:opacity-90 transition-opacity ${FOCUS_RING}`}
              >
                <span className="truncate">{careText(next.title, locale)}</span>
                {narrow ? <ArrowRight size={14} strokeWidth={1.5} aria-hidden /> : <ChevronRight size={14} strokeWidth={1.5} aria-hidden />}
              </button>
            </div>
          )}
        </motion.div>
      </>
    );
  };

  // In <body>, outside the page's route fade: the panel sits above the header.
  return createPortal(<AnimatePresence onExitComplete={() => setPresent(false)}>{open && body()}</AnimatePresence>, document.body);
}
