import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { DeliverySheet, DeliveryTrigger } from "./DeliverySheet";

const WIDGET_ORIGIN = "https://widget.novapost.com";
const WIDGET_URL = "https://widget.novapost.com/division/index.html";
/** How long to wait on the location prompt before opening the widget uncentred. */
const GEO_WAIT_MS = 5_000;
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
  const [geoSettled, setGeoSettled] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number | ""; longitude: number | "" }>({
    latitude: "",
    longitude: "",
  });
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const postedRef = useRef(false);
  const geoTimerRef = useRef<number | undefined>(undefined);

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

  // Config goes to the widget EXACTLY ONCE per open, and only once both the frame has
  // loaded and geolocation has settled (granted, refused, or timed out).
  //
  // Nova Poshta's own integration posts a single config on load and nothing after. Posting a
  // second one into an already-initialised widget leaves it stuck on its loading state — which
  // is what happened when an earlier version here sent empty coordinates on load and then
  // re-sent real ones the moment the user approved the prompt. So we wait for the answer
  // instead of correcting ourselves afterwards, and postedRef makes a late grant a no-op
  // rather than a second message.
  useEffect(() => {
    if (!open || !frameLoaded || !geoSettled || postedRef.current) return;
    postedRef.current = true;
    iframeRef.current?.contentWindow?.postMessage(
      {
        placeName: value?.cityName ?? "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        domain: window.location.hostname,
      },
      WIDGET_ORIGIN
    );
  }, [open, frameLoaded, geoSettled, coords, value?.cityName]);

  useEffect(() => () => clearTimeout(geoTimerRef.current), []);

  const openFrame = useCallback(() => {
    postedRef.current = false;
    setFrameLoaded(false);
    setEntered(false);
    setGeoSettled(false);
    setCoords({ latitude: "", longitude: "" });
    setOpen(true);

    if (!navigator.geolocation) {
      setGeoSettled(true);
      return;
    }
    // An unanswered prompt must not hold the picker hostage: settle anyway after the cap and
    // open uncentred. ponytail: a grant that lands after the cap is ignored rather than
    // re-posted — remount the iframe on late coords if that ever proves worth the reload.
    clearTimeout(geoTimerRef.current);
    geoTimerRef.current = window.setTimeout(() => setGeoSettled(true), GEO_WAIT_MS);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(geoTimerRef.current);
        setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setGeoSettled(true);
      },
      () => {
        clearTimeout(geoTimerRef.current);
        setGeoSettled(true);
      },
      { enableHighAccuracy: false, timeout: GEO_WAIT_MS, maximumAge: 300_000 }
    );
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
          {/* Mounted only once the sheet has finished travelling. Fetching, parsing and
              laying out a third-party document is a long main-thread frame, and starting
              it on the same tick as the slide was what made the opening stutter. The
              loading label above covers the extra beat. */}
          {entered && (
            <iframe
              ref={iframeRef}
              title={t("checkout.deliveryPickerTitle")}
              src={WIDGET_URL}
              allow="geolocation"
              onLoad={() => setFrameLoaded(true)}
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
