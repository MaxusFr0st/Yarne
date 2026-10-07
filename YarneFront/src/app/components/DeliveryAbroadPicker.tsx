import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DeliverySheet, DeliveryTrigger } from "./DeliverySheet";
import { NovaPoshtaMark } from "./NovaPoshtaPicker";
import { useLocale } from "../i18n/useLocale";
import { countryName, findCountry, NOVA_POST_COUNTRIES } from "../utils/deliveryCountries";

const SDK_URL = "https://integration-widget.novapost.com/sdk.min.js";

/** What the shopper chose for delivery abroad. A branch carries what Nova Post's picker reported. */
export type AbroadChoice =
  | { kind: "branch"; countryCode: string; branchId: string; branchName: string; city: string }
  | { kind: "courier"; countryCode: string }
  | { kind: "other" };

type NovaPostWidgetInstance = { destroy: () => void };
type NovaPostWidgetConfig = {
  container: string | HTMLElement;
  variant: "map";
  viewMode: "container";
  autoShow: boolean;
  country: string;
  locale: string;
  onSelect: (payload: unknown) => void;
  onError: (error: unknown) => void;
};
declare global {
  interface Window {
    NovaPostWidget?: { NovaPostWidget: new (config: NovaPostWidgetConfig) => NovaPostWidgetInstance };
  }
}

let sdkLoading: Promise<void> | null = null;

/** Nova Post's official SDK, fetched the first time a branch picker opens and never before. */
function loadNovaPostSdk(): Promise<void> {
  if (window.NovaPostWidget) return Promise.resolve();
  if (!sdkLoading) {
    sdkLoading = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => (window.NovaPostWidget ? resolve() : reject(new Error("Nova Post SDK missing")));
      script.onerror = () => reject(new Error("Nova Post SDK failed to load"));
      document.head.appendChild(script);
    }).catch((error) => {
      sdkLoading = null;
      document.querySelector(`script[src="${SDK_URL}"]`)?.remove();
      throw error;
    });
  }
  return sdkLoading;
}

/** The first non-empty text found under any of the given dotted paths of an object of unknown shape. */
function textAt(source: unknown, ...paths: string[]): string {
  for (const path of paths) {
    const value = path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), source);
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

/** Turns Nova Post's onSelect payload into what the order stores: the branch id, its name or address, and its city. */
export function readNovaPostSelection(payload: unknown): { branchId: string; branchName: string; city: string } | null {
  const branchId = textAt(payload, "id", "externalId", "number", "code", "division.id");
  if (!branchId) return null;
  const number = textAt(payload, "number", "division.number");
  const name = textAt(payload, "name", "shortName", "description", "address", "division.name", "addressName");
  const address = textAt(payload, "address", "addressName", "street", "division.address");
  const branchName = [name && name !== address ? name : number ? `№${number}` : "", address].filter(Boolean).join(": ") || name || address || branchId;
  const city = textAt(payload, "city.name", "city.title", "settlement.name", "cityName", "locality.name", "city", "settlement");
  return { branchId, branchName, city };
}

const SHEET_BG = "#F3EFE8";

export function DeliveryAbroadPicker({
  value,
  onChange,
  tone = "dark",
}: {
  value: AbroadChoice | null;
  onChange: (choice: AbroadChoice) => void;
  tone?: "light" | "dark";
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"country" | "branch">("country");
  const [country, setCountry] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [widget, setWidget] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [entered, setEntered] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  const openSheet = () => {
    const known = value && value.kind !== "other" ? findCountry(value.countryCode) : undefined;
    setCountry(known ? known.code : null);
    setStep(known ? "branch" : "country");
    setQuery("");
    setEntered(false);
    setWidget("loading");
    setOpen(true);
  };
  const close = useCallback(() => setOpen(false), []);

  // Step 2: Nova Post's own picker for the chosen country, mounted into this sheet and removed when it closes or changes.
  useEffect(() => {
    if (!open || step !== "branch" || !country || !entered || !container.current) return;
    let instance: NovaPostWidgetInstance | null = null;
    let cancelled = false;
    setWidget("loading");
    void loadNovaPostSdk()
      .then(() => {
        if (cancelled || !container.current || !window.NovaPostWidget) return;
        instance = new window.NovaPostWidget.NovaPostWidget({
          container: container.current,
          variant: "map",
          viewMode: "container",
          autoShow: true,
          country,
          locale,
          onSelect: (payload) => {
            // Logged once so the payload's real shape can be checked against readNovaPostSelection.
            console.info("[NovaPost] onSelect", payload);
            const picked = readNovaPostSelection(payload);
            if (!picked) return;
            onChange({ kind: "branch", countryCode: country, ...picked });
            setOpen(false);
          },
          onError: () => setWidget("error"),
        });
        setWidget("ready");
      })
      .catch(() => {
        if (!cancelled) setWidget("error");
      });
    return () => {
      cancelled = true;
      try {
        instance?.destroy();
      } catch {
        /* the sheet is closing anyway */
      }
    };
    // onChange is a fresh function each render of the page; the mount must not restart for it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, country, entered, locale, attempt]);

  const chosen = value && value.kind !== "other" ? findCountry(value.countryCode) : undefined;
  let primary = t("checkout.abroad.country");
  let secondary = t("checkout.abroad.countryHint");
  if (value?.kind === "other") {
    primary = t("checkout.abroad.other");
    secondary = t("checkout.abroad.change");
  } else if (value?.kind === "branch" && chosen) {
    primary = value.branchName;
    secondary = `${countryName(chosen, locale)} · ${value.city}`;
  } else if (value?.kind === "courier" && chosen) {
    primary = countryName(chosen, locale);
    secondary = t("checkout.abroad.byAddress");
  }
  const icon = chosen ? <NovaPoshtaMark size={18} /> : <Globe size={18} strokeWidth={1.5} color="#2D241E" aria-hidden />;

  const needle = query.trim().toLowerCase();
  const countries = NOVA_POST_COUNTRIES.filter((c) => !needle || c.uk.toLowerCase().includes(needle) || c.en.toLowerCase().includes(needle));
  const showOther = !needle || t("checkout.abroad.other").toLowerCase().includes(needle) || "other".includes(needle);

  const rowClass =
    "w-full min-h-[52px] flex items-center justify-between gap-3 px-3 rounded-[12px] text-left cursor-pointer hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30";

  return (
    <>
      <DeliveryTrigger icon={icon} primary={primary} secondary={secondary} filled={!!value} tone={tone} onClick={openSheet} />
      <DeliverySheet
        open={open}
        onClose={close}
        title={step === "country" ? t("checkout.abroad.sheetCountry") : t("checkout.abroad.sheetBranch")}
        closeLabel={t("checkout.abroad.closeSheet")}
        headerIcon={step === "country" ? <Globe size={17} strokeWidth={1.5} color="#2D241E" aria-hidden /> : <NovaPoshtaMark size={17} />}
        headerLeading={
          step === "branch" ? (
            <button
              type="button"
              onClick={() => setStep("country")}
              className="min-h-11 -ml-1 pr-2 inline-flex items-center gap-1 text-[0.85rem] text-[#2D241E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 rounded-md"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <ChevronLeft size={16} strokeWidth={1.5} aria-hidden />
              {t("checkout.abroad.back")}
            </button>
          ) : undefined
        }
        onEntered={() => setEntered(true)}
      >
        {step === "country" ? (
          <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: SHEET_BG, fontFamily: "'DM Sans', sans-serif" }}>
            <div className="shrink-0 px-4 pt-3 pb-2">
              <label htmlFor="abroad-country-search" className="sr-only">
                {t("checkout.abroad.search")}
              </label>
              <input
                id="abroad-country-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("checkout.abroad.search")}
                autoComplete="off"
                className="w-full h-11 rounded-[12px] px-3.5 text-[0.9rem] text-[#2D241E] bg-white border border-[#2D241E]/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
              />
            </div>
            {/* Room under the last row: the browser's bottom toolbar and the home indicator must never cover it. */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-2" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
              {countries.length > 0 && (
                <p className="px-3 pt-1 pb-1 uppercase text-[0.65rem] tracking-[0.12em] text-[#2D241E]/55">{t("checkout.abroad.groupNovaPost")}</p>
              )}
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={rowClass}
                  onClick={() => {
                    setCountry(c.code);
                    setStep("branch");
                  }}
                >
                  <span className="text-[0.95rem] text-[#2D241E]">{countryName(c, locale)}</span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[#2D241E]/45" aria-hidden />
                </button>
              ))}
              {showOther && (
                <button
                  type="button"
                  className={`${rowClass} mt-1`}
                  onClick={() => {
                    onChange({ kind: "other" });
                    setOpen(false);
                  }}
                >
                  <span className="flex flex-col">
                    <span className="text-[0.95rem] text-[#2D241E]">{t("checkout.abroad.other")}</span>
                    <span className="text-[0.75rem] text-[#2D241E]/55">{t("checkout.abroad.otherHint")}</span>
                  </span>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-[#2D241E]/45" aria-hidden />
                </button>
              )}
              {countries.length === 0 && !showOther && <p className="px-3 py-4 text-[0.85rem] text-[#2D241E]/55">{t("checkout.abroad.noCountries")}</p>}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col" style={{ backgroundColor: SHEET_BG }}>
            {/* The widget gets the whole visible height above the footer row: no trimming tricks, nothing hangs below the sheet. */}
            <div className="relative flex-1 min-h-0 bg-white">
              <div ref={container} className="absolute inset-0 overflow-auto" />
              {widget !== "ready" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-white" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", color: "rgba(45,36,30,0.55)" }}>
                  {widget === "loading" ? (
                    t("checkout.abroad.loading")
                  ) : (
                    <>
                      <span role="alert">{t("checkout.abroad.widgetError")}</span>
                      <button type="button" onClick={() => setAttempt((n) => n + 1)} className="min-h-11 px-5 rounded-full border border-[#2D241E]/25 text-[#2D241E] cursor-pointer">
                        ↻
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Always visible, outside the widget frame, clear of the home indicator. */}
            <div className="shrink-0 px-4 pt-2.5" style={{ borderTop: "1px solid rgba(45,36,30,0.10)", paddingBottom: "calc(12px + env(safe-area-inset-bottom))", fontFamily: "'DM Sans', sans-serif" }}>
              <button
                type="button"
                onClick={() => {
                  if (!country) return;
                  onChange({ kind: "courier", countryCode: country });
                  setOpen(false);
                }}
                className="w-full min-h-11 text-left text-[0.85rem] text-[#2D241E] underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 rounded-md"
              >
                {t("checkout.abroad.courier")}
              </button>
            </div>
          </div>
        )}
      </DeliverySheet>
    </>
  );
}
