import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeliverySheet, DeliveryTrigger } from "./DeliverySheet";

const WIDGET_ORIGIN = "https://widget.novapost.com";
const WIDGET_URL = "https://widget.novapost.com/division/index.html";
/** How long the widget gets to load before the sheet offers a retry instead. */
const LOAD_WAIT_MS = 10_000;
/**
 * Height the widget frame is grown by so its own trailing blank strip is clipped away.
 * Nova Poshta leaves dead space under the branch list; it is inside a cross-origin document,
 * so overflowing and clipping is the only lever we have on it.
 */
const WIDGET_TRIM_PX = 56;

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
export function NovaPoshtaMark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M11.9401 16.4237H16.0596V21.271H19.2101L15.39 25.0911C14.6227 25.8585 13.3791 25.8585 12.6118 25.0911L8.79166 21.271H11.9401V16.4237ZM21.2688 19.2102V8.78972L25.091 12.6098C25.8583 13.3772 25.8583 14.6207 25.091 15.3881L21.2688 19.2102ZM16.0596 6.73099V11.5763H11.9401V6.73099H8.78958L12.6097 2.90882C13.377 2.14148 14.6206 2.14148 15.3879 2.90882L19.2101 6.73099H16.0596ZM2.90868 12.6098L6.72877 8.78972V19.2102L2.90868 15.3901C2.14133 14.6228 2.14133 13.3772 2.90868 12.6098Z"
        fill="#DA291C"
      />
    </svg>
  );
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
  const [open, setOpen] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  /** True once the sheet has finished animating in — gates the iframe mount. */
  const [entered, setEntered] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  /** Bumped by "Try again" to remount the iframe. */
  const [frameKey, setFrameKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const postedRef = useRef(false);
  const loadedRef = useRef(false);

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

  // The widget reads its starting place once, at startup, from its query string: a city
  // already chosen reopens the picker there. (Shopper geolocation was tried and removed: the
  // widget only maps it to the nearest Ukrainian branch, which is useless abroad, and shoppers
  // saw a location prompt that changed nothing visible.)
  const widgetSrc = value?.cityName
    ? `${WIDGET_URL}?${new URLSearchParams({ placeName: value.cityName })}`
    : WIDGET_URL;

  // The config message still goes EXACTLY ONCE per open (it carries our domain). Posting a
  // second one into an already-initialised widget leaves it stuck on its loading state.
  useEffect(() => {
    if (!open || !frameLoaded || postedRef.current) return;
    postedRef.current = true;
    iframeRef.current?.contentWindow?.postMessage(
      {
        placeName: value?.cityName ?? "",
        domain: window.location.hostname,
      },
      WIDGET_ORIGIN
    );
  }, [open, frameLoaded, value?.cityName]);

  // The widget only messages us when a branch is picked, and a blocked or unreachable frame
  // still fires `load` (on Chrome's error page), so neither tells us it worked. Instead: no
  // `load` within LOAD_WAIT_MS, or a no-cors request for the widget page failing at the
  // network level, means the map is not coming and the sheet offers a retry.
  const frameMounted = open && entered;
  useEffect(() => {
    if (!frameMounted) return;
    let cancelled = false;
    const fail = () => {
      if (!cancelled) setLoadFailed(true);
    };
    fetch(WIDGET_URL, { mode: "no-cors", cache: "no-store" }).catch(fail);
    const timer = window.setTimeout(() => {
      if (!loadedRef.current) fail();
    }, LOAD_WAIT_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [frameMounted, frameKey]);

  const retryFrame = useCallback(() => {
    postedRef.current = false;
    loadedRef.current = false;
    setFrameLoaded(false);
    setLoadFailed(false);
    setFrameKey((k) => k + 1);
  }, []);

  const openFrame = useCallback(() => {
    postedRef.current = false;
    loadedRef.current = false;
    setFrameLoaded(false);
    setLoadFailed(false);
    setEntered(false);
    setOpen(true);
  }, []);

  const closeSheet = useCallback(() => setOpen(false), []);

  return (
    <>
      <DeliveryTrigger
        icon={<NovaPoshtaMark size={18} />}
        primary={value ? value.warehouseName : t("checkout.deliveryChoose")}
        secondary={value ? value.cityName : t("checkout.deliveryChooseHint")}
        filled={!!value}
        tone={tone}
        onClick={openFrame}
      />
      <DeliverySheet
        open={open}
        onClose={closeSheet}
        title={t("checkout.deliveryPickerTitle")}
        closeLabel={t("checkout.deliveryPickerClose")}
        headerIcon={<NovaPoshtaMark size={17} />}
        onEntered={() => setEntered(true)}
      >
        {/* overflow-hidden pairs with the iframe's extra height below: the widget renders
            a strip of empty space under its branch list that we cannot reach or restyle
            from outside a cross-origin frame, so instead the frame is grown past this
            container and that strip is clipped off the bottom. */}
        <div className="relative flex-1 min-h-0 overflow-hidden" style={{ backgroundColor: "#fff" }}>
          {loadFailed ? (
            <div
              role="alert"
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center"
              style={{ backgroundColor: "#fff", fontFamily: "'DM Sans', sans-serif" }}
            >
              <p style={{ fontSize: "0.8rem", color: "rgba(45,36,30,0.6)" }}>{t("checkout.deliveryPickerFailed")}</p>
              <button
                type="button"
                onClick={retryFrame}
                className="rounded-full px-5 min-h-[44px] uppercase"
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.12em",
                  color: "#2D241E",
                  border: "1px solid rgba(45,36,30,0.22)",
                }}
              >
                {t("checkout.deliveryPickerRetry")}
              </button>
            </div>
          ) : !frameLoaded && (
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
          {/* Mounted only once the sheet has finished travelling. Fetching, parsing and
              laying out a third-party document is a long main-thread frame, and starting
              it on the same tick as the slide was what made the opening stutter. The
              loading label above covers the extra beat. */}
          {entered && !loadFailed && (
            <iframe
              key={frameKey}
              ref={iframeRef}
              title={t("checkout.deliveryPickerTitle")}
              src={widgetSrc}
              onLoad={() => {
                loadedRef.current = true;
                setFrameLoaded(true);
              }}
              className="w-full block border-0 absolute inset-x-0 top-0"
              style={{
                // Taller than the visible area on purpose — the parent clips the excess,
                // taking the widget's own trailing blank strip with it. Tune WIDGET_TRIM_PX
                // if their layout changes; too large starts eating the list itself.
                height: `calc(100% + ${WIDGET_TRIM_PX}px)`,
                opacity: frameLoaded ? 1 : 0,
                transition: "opacity 220ms ease",
              }}
            />
          )}
        </div>
      </DeliverySheet>
    </>
  );
}
