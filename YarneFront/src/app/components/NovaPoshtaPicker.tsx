import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const WIDGET_ORIGIN = "https://widget.novapost.com";
const WIDGET_URL = "https://widget.novapost.com/division/index.html";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export interface NovaPoshtaSelection {
  cityRef: string;
  cityName: string;
  warehouseRef: string;
  warehouseName: string;
}

interface NovaPoshtaWidgetMessage {
  externalId?: string;
  shortName?: string;
  name?: string;
  refCity?: {
    externalId?: string;
    shortName?: string;
    name?: string;
  };
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
  const [open, setOpen] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number | ""; longitude: number | "" }>({
    latitude: "",
    longitude: "",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useBodyScrollLock(open);

  const handleMessage = useCallback(
    (event: MessageEvent<NovaPoshtaWidgetMessage>) => {
      if (event.origin !== WIDGET_ORIGIN) return;
      const data = event.data;
      const warehouseRef = data?.externalId;
      const cityRef = data?.refCity?.externalId;
      if (!warehouseRef || !cityRef) return;

      onSelect({
        warehouseRef,
        warehouseName: data.shortName || data.name || "",
        cityRef,
        cityName: data.refCity?.shortName || data.refCity?.name || "",
      });
      setOpen(false);
    },
    [onSelect]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, handleMessage]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Hand the widget its config whenever we have something new to tell it. This has to be an
  // effect keyed on both readiness and coordinates: the previous version assigned
  // iframe.onload inside the geolocation callback, but by the time the user answers the
  // browser's permission prompt the frame has already fired load — so the handler never ran
  // again and approving "Share location" did nothing at all. Re-posting on every change also
  // means the initial (empty) config still lands if permission is denied or never answered.
  useEffect(() => {
    if (!open || !frameLoaded) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        placeName: value?.cityName ?? "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        domain: window.location.hostname,
      },
      WIDGET_ORIGIN
    );
  }, [open, frameLoaded, coords, value?.cityName]);

  const openFrame = useCallback(() => {
    setFrameLoaded(false);
    setCoords({ latitude: "", longitude: "" });
    setOpen(true);
    // Geolocation only resolves on a secure origin, and the prompt is answered long after
    // this returns — the effect above is what actually delivers the result.
    navigator.geolocation?.getCurrentPosition(
      (position) => setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => {
        /* denied or unavailable — the widget simply opens without centring on the user */
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 }
    );
  }, []);

  const dark = tone === "dark";
  const primaryLine = value ? value.warehouseName : t("checkout.deliveryChoose");
  const secondaryLine = value ? value.cityName : t("checkout.deliveryChooseHint");

  const trigger = (
    <button
      type="button"
      onClick={openFrame}
      aria-haspopup="dialog"
      className="w-full flex items-center gap-3 rounded-[14px] px-3.5 py-3 text-left cursor-pointer transition-colors duration-200"
      style={{
        backgroundColor: dark ? "rgba(245,242,237,0.10)" : "#fff",
        border: `1px solid ${dark ? "rgba(245,242,237,0.18)" : "rgba(45,36,30,0.14)"}`,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Logo keeps a light tile on both tones so the red mark stays legible. */}
      <span
        className="shrink-0 flex items-center justify-center rounded-[10px]"
        style={{ width: 34, height: 34, backgroundColor: dark ? "#F5F2ED" : "#F8F5F0" }}
      >
        <NovaPoshtaMark size={18} />
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

  const panelMotion = reduceMotion
    ? { initial: false as const, animate: {}, exit: {} }
    : compact
      ? { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } }
      : { initial: { opacity: 0, scale: 0.97, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 12 } };

  const dialog = (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex justify-center items-end sm:items-center sm:p-6"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          style={{ backgroundColor: "rgba(45,36,30,0.55)", backdropFilter: "blur(3px)" }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t("checkout.deliveryPickerTitle")}
            className="relative w-full sm:max-w-[560px] flex flex-col overflow-hidden rounded-t-[26px] sm:rounded-[24px]"
            style={{
              backgroundColor: "#F3EFE8",
              height: compact ? "86svh" : "min(78svh, 700px)",
              boxShadow: "0 -12px 48px rgba(45,36,30,0.28)",
            }}
            {...panelMotion}
            transition={{ duration: reduceMotion ? 0 : 0.36, ease: EASE_OUT }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Grab affordance — the sheet reads as draggable-adjacent on phones even though
                dismissal is via the backdrop or the close control. */}
            <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
              <span className="block rounded-full" style={{ width: 40, height: 4, backgroundColor: "rgba(45,36,30,0.18)" }} />
            </div>

            <header
              className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-5 py-3"
              style={{ borderBottom: "1px solid rgba(45,36,30,0.10)" }}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <NovaPoshtaMark size={17} />
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

            <div className="relative flex-1 min-h-0" style={{ backgroundColor: "#fff" }}>
              {!frameLoaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.8rem",
                    color: "rgba(45,36,30,0.45)",
                  }}
                >
                  {t("checkout.deliveryPickerLoading")}
                </div>
              )}
              <iframe
                ref={iframeRef}
                title={t("checkout.deliveryPickerTitle")}
                src={WIDGET_URL}
                allow="geolocation"
                onLoad={() => setFrameLoaded(true)}
                className="w-full h-full block border-0"
                style={{ opacity: frameLoaded ? 1 : 0, transition: "opacity 220ms ease" }}
              />
            </div>
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
