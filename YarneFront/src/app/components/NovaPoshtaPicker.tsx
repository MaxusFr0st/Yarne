import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

const WIDGET_ORIGIN = "https://widget.novapost.com";
const WIDGET_URL = "https://widget.novapost.com/division/index.html";
const easing = [0.25, 0.1, 0.25, 1] as const;

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

export function NovaPoshtaPicker({
  value,
  onSelect,
}: {
  value: NovaPoshtaSelection | null;
  onSelect: (selection: NovaPoshtaSelection) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const titleId = useId();
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
    [onSelect],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [open, handleMessage]);

  function sendConfig(latitude: number | string, longitude: number | string) {
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.onload = () => {
      iframe.contentWindow?.postMessage(
        { placeName: value?.cityName || "", latitude, longitude, domain: window.location.hostname },
        "*",
      );
    };
  }

  function openPicker() {
    setOpen(true);
    sendConfig("", "");
    navigator.geolocation?.getCurrentPosition(
      (position) => sendConfig(position.coords.latitude, position.coords.longitude),
      () => {},
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="w-full flex items-center gap-3 rounded-[16px] border bg-[#F5F2ED]/80 px-4 py-3 text-left focus:outline-none hover:border-[#2D241E]/25 transition-colors"
        style={{ borderColor: "rgba(45,36,30,0.15)" }}
      >
        <MapPin size={16} className="text-[#2D241E]/45 flex-shrink-0" />
        <span className="flex-1 min-w-0">
          {value ? (
            <>
              <span
                className="block text-[#2D241E] truncate"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}
              >
                {value.warehouseName}
              </span>
              <span
                className="block text-[#2D241E]/45 truncate"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}
              >
                {value.cityName}
              </span>
            </>
          ) : (
            <span
              className="text-[#2D241E]/40"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}
            >
              {t("checkout.deliveryPlaceholder")}
            </span>
          )}
        </span>
        <span
          className="flex-shrink-0 text-[#2D241E]/60 uppercase tracking-widest whitespace-nowrap"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em" }}
        >
          {value ? t("checkout.deliveryChangeWarehouse") : t("checkout.deliverySelectWarehouse")}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50"
              style={{ backgroundColor: "rgba(45,36,30,0.38)", backdropFilter: "blur(10px)" }}
              onClick={() => setOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.3, ease: easing }}
                className="relative w-full max-w-[720px] pointer-events-auto flex flex-col overflow-hidden"
                style={{
                  height: "min(88vh, 760px)",
                  backgroundColor: "#F5F2ED",
                  borderRadius: "clamp(20px, 4vw, 32px)",
                  border: "1px solid rgba(45,36,30,0.08)",
                  boxShadow: "0 24px 64px rgba(45,36,30,0.25)",
                }}
              >
                <div
                  className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                  style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
                >
                  <h2
                    id={titleId}
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 400 }}
                  >
                    {t("checkout.novaPoshtaModalTitle")}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label={t("checkout.novaPoshtaClose")}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[#2D241E]/40 hover:text-[#2D241E] hover:bg-[#2D241E]/8 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
                <iframe
                  ref={iframeRef}
                  title="Nova Poshta"
                  src={WIDGET_URL}
                  allow="geolocation"
                  className="flex-1 w-full border-none"
                />
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
