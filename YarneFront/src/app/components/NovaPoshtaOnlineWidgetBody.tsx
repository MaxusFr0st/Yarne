import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { NovaPoshtaSelection } from "./NovaPoshtaPicker";

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

/**
 * The cross-origin Nova Poshta widget — extracted verbatim from the pre-split
 * NovaPoshtaPicker (same logic, moved not rewritten) so the online experience
 * is provably unchanged. Mounted by the shell only while online; a fresh
 * mount on every open is what resets frameLoaded/geoSettled/coords each time,
 * replacing the manual setState resets the pre-split openFrame() used to do —
 * same end result (every open starts clean), reached via React's normal mount
 * lifecycle instead of imperative resets, now that this body owns that state.
 */
export function NovaPoshtaOnlineWidgetBody({
  cityName,
  entered,
  onSelect,
  onClose,
}: {
  /** Currently selected city, if any — forwarded to the widget's initial config. */
  cityName: string | undefined;
  /** True once the sheet has finished animating in — gates the iframe mount. */
  entered: boolean;
  onSelect: (selection: NovaPoshtaSelection) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [frameLoaded, setFrameLoaded] = useState(false);
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
      onClose();
    },
    [onSelect, onClose]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  // Config goes to the widget EXACTLY ONCE per mount, and only once both the frame has
  // loaded and geolocation has settled (granted, refused, or timed out).
  //
  // Nova Poshta's own integration posts a single config on load and nothing after. Posting a
  // second one into an already-initialised widget leaves it stuck on its loading state — which
  // is what happened when an earlier version here sent empty coordinates on load and then
  // re-sent real ones the moment the user approved the prompt. So we wait for the answer
  // instead of correcting ourselves afterwards, and postedRef makes a late grant a no-op
  // rather than a second message.
  useEffect(() => {
    if (!frameLoaded || !geoSettled || postedRef.current) return;
    postedRef.current = true;
    iframeRef.current?.contentWindow?.postMessage(
      {
        placeName: cityName ?? "",
        latitude: coords.latitude,
        longitude: coords.longitude,
        domain: window.location.hostname,
      },
      WIDGET_ORIGIN
    );
  }, [frameLoaded, geoSettled, coords, cityName]);

  // Starts the moment this body mounts — i.e. the moment the sheet opens, same timing as the
  // pre-split code's openFrame() starting it on click, since mounting happens synchronously in
  // the same render pass as the shell's setOpen(true).
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoSettled(true);
      return;
    }
    // An unanswered prompt must not hold the picker hostage: settle anyway after the cap and
    // open uncentred. ponytail: a grant that lands after the cap is ignored rather than
    // re-posted — remount the iframe on late coords if that ever proves worth the reload.
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
    return () => clearTimeout(geoTimerRef.current);
  }, []);

  return (
    // overflow-hidden pairs with the iframe's extra height below: the widget renders
    // a strip of empty space under its branch list that we cannot reach or restyle
    // from outside a cross-origin frame, so instead the frame is grown past this
    // container and that strip is clipped off the bottom.
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
  );
}
