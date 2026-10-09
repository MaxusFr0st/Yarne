import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createOrder, fetchNovaPoshtaShippingPrice, newClientRequestId, orderEurTotal, type OrderDto } from "../api/orders";
import { fetchCustomerProfile } from "../api/auth";
import { ApiRequestError } from "../api/errors";
import { useApp, type CartItem } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { showsEur } from "../i18n/format";
import { PriceTag } from "../components/PriceTag";
import { OrderLineDetails, cartItemToLineDetails } from "../components/OrderLineDetails";
import { useContactContent } from "../hooks/useCareServiceContent";
import { cartItemsTotal, mergePlacedOrderDisplay } from "../utils/mergePlacedOrderItems";
import { NovaPoshtaPicker, type NovaPoshtaSelection } from "../components/NovaPoshtaPicker";
import { DeliveryAbroadPicker, type AbroadChoice } from "../components/DeliveryAbroadPicker";
import { DeliveryModeSwitch } from "../components/DeliveryModeSwitch";
import { findCountry, formatAbroadPhone, isBlockedCountry, isInternationalPhone, isLatinName, countryName, normalizeAbroadPhone } from "../utils/deliveryCountries";
import { orderStatusKey } from "../utils/orderStatusKey";
import { CheckoutField } from "../components/CheckoutField";
import { useSessionState, clearSessionState } from "../hooks/useSessionState";
import { useDebouncedError } from "../hooks/useDebouncedError";
import { formatUaPhone, formatUaSubscriber, inspectUaPhone, isCompleteUaPhone, toE164Ua } from "../utils/phoneUa";

const easing = [0.25, 0.1, 0.25, 1] as const;

/** The confirmation of the order just placed, kept so a reload of this page shows it again instead of an empty bag. */
const PLACED_ORDER_KEY = "yarne.placedOrder.v1";
const PLACED_ORDER_KEEP_MS = 30 * 24 * 60 * 60 * 1000;

function readPlacedOrder(): OrderDto | null {
  try {
    const raw = window.localStorage.getItem(PLACED_ORDER_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { savedAt?: number; order?: OrderDto };
    if (!saved.order || typeof saved.savedAt !== "number" || Date.now() - saved.savedAt > PLACED_ORDER_KEEP_MS) {
      window.localStorage.removeItem(PLACED_ORDER_KEY);
      return null;
    }
    return saved.order;
  } catch {
    return null;
  }
}

/** Only what the receipt shows: number, date, email, status, the status link's token and the lines. No phone, name or address. */
function rememberPlacedOrder(order: OrderDto): void {
  try {
    const { recipientFirstName, recipientLastName, recipientPhone, customerPhoneNumber, deliveryCityRef, deliveryWarehouseRef, ...kept } = order;
    void recipientFirstName; void recipientLastName; void recipientPhone; void customerPhoneNumber; void deliveryCityRef; void deliveryWarehouseRef;
    window.localStorage.setItem(PLACED_ORDER_KEY, JSON.stringify({ savedAt: Date.now(), order: { ...kept, customerName: "" } }));
  } catch {
    /* private mode or quota: the receipt just will not survive a reload */
  }
}
/** Nova Poshta delivers within Ukraine — the recipient name a courier reads must be Cyrillic. */
const CYRILLIC_NAME_PATTERN = /^[Ѐ-ӿ'ʼ’\- ]*$/;
function isCyrillicName(value: string): boolean {
  return CYRILLIC_NAME_PATTERN.test(value);
}
/** Order lines shown before the list becomes a scroll region. */
const VISIBLE_ORDER_ITEMS = 3;
/** Generous enough for any real Ukrainian name, short enough to stop paste-bombing a field. */
const NAME_MAX = 40;
/** Quiet period after the last keystroke before the phone field reports a problem. */
const PHONE_SETTLE_MS = 600;
/** sessionStorage keys — a reload keeps checkout progress, closing the tab drops it. */
const S = {
  email: "yarne.checkout.email",
  firstName: "yarne.checkout.firstName",
  lastName: "yarne.checkout.lastName",
  phone: "yarne.checkout.phone",
  delivery: "yarne.checkout.delivery",
} as const;
const ORDER_ITEM_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath d='M120 220l50-60 50 60 30-40 40 60H110z' fill='%232D241E' fill-opacity='0.18'/%3E%3Ccircle cx='150' cy='150' r='18' fill='%232D241E' fill-opacity='0.18'/%3E%3C/svg%3E";

function toDisplayDate(value: string, locale: "uk" | "en"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateLocale = locale === "uk" ? "uk-UA" : "en-US";
  return date.toLocaleString(dateLocale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The one authored moment on this surface: the summary panel stops being a form and becomes a
 * receipt. The form's content clears before the gap it leaves closes (fading and squashing at
 * once reads as a glitch), then the receipt rises through the space and the mark is struck.
 * Seconds, keyed here so the sequence can be read in one place.
 */
const SEAL = {
  // These two are tuned against each other, not chosen separately: whatever time the collapse
  // runs past the fade is time the panel stands open and empty. At 0.16/0.42 that gap was 260ms
  // and read as a blank dark box rather than a closing one.
  fade: 0.2,
  collapse: 0.34,
  receiptIn: 0.5,
  receiptDelay: 0.14,
  ring: 0.3,
  tick: 0.5,
  line: 0.42,
} as const;
/** Confident arrival: decelerates hard, settles without overshoot. */
const glide = [0.16, 1, 0.3, 1] as const;

/**
 * Drawn, not stamped — the ring closes, then the tick is struck through it, the way a hand
 * marks an order as taken. lucide's CheckCircle2 is a single static path, and this is the one
 * beat of the whole storefront that earns its own geometry.
 */
function OrderSealMark({ still }: { still: boolean }) {
  const draw = still ? { pathLength: 1 } : { pathLength: 0 };
  return (
    <span className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
      {!still && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border"
          style={{ borderColor: "currentColor" }}
          initial={{ scale: 0.55, opacity: 0.5 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 0.7, delay: SEAL.tick, ease: glide }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width={18}
        height={18}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <motion.circle
          cx="12"
          cy="12"
          r="9.75"
          initial={draw}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.44, delay: SEAL.ring, ease: glide }}
        />
        <motion.path
          d="M7.6 12.3l2.9 2.9 5.9-6.4"
          initial={draw}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: SEAL.tick, ease: glide }}
        />
      </svg>
    </span>
  );
}

type MissingField = "email" | "firstName" | "lastName" | "phone" | "delivery" | "abroadCountry" | "abroadCity" | "abroadAddress";

const MISSING_FIELD_IDS: Record<MissingField, string> = {
  email: "checkout-email",
  firstName: "checkout-recipient-first-name",
  lastName: "checkout-recipient-last-name",
  phone: "checkout-recipient-phone",
  delivery: "checkout-delivery-picker",
  abroadCountry: "checkout-abroad-country",
  abroadCity: "checkout-abroad-city",
  abroadAddress: "checkout-abroad-address",
};

/** Same line colour CheckoutField uses for an invalid input. */
const MISSING_OUTLINE = { boxShadow: "0 0 0 1px rgba(242,184,184,0.85)" } as const;

export function CheckoutPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { cartItems, cartTotal, cartEurTotal, isLoggedIn, user, clearCart } = useApp();
  // Session-scoped so an accidental reload no longer wipes a half-filled checkout.
  const [email, setEmail] = useSessionState(S.email, "");
  const [recipientFirstName, setRecipientFirstName] = useSessionState(S.firstName, "");
  const [recipientLastName, setRecipientLastName] = useSessionState(S.lastName, "");
  const [recipientPhone, setRecipientPhone] = useSessionState(S.phone, "");
  const [delivery, setDelivery] = useSessionState<NovaPoshtaSelection | null>(S.delivery, null);
  // Delivery abroad: Ukraine is the default for Ukrainian visitors, abroad for English ones. Ukraine mode is the page as it always was.
  const [abroad, setAbroad] = useState(locale === "en");
  const [abroadChoice, setAbroadChoice] = useState<AbroadChoice | null>(null);
  const [abroadCountryName, setAbroadCountryName] = useState("");
  const [abroadCity, setAbroadCity] = useState("");
  const [abroadZip, setAbroadZip] = useState("");
  const [abroadAddress, setAbroadAddress] = useState("");
  const [abroadPhone, setAbroadPhone] = useState("");
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);
  const [shippingEstimateLoading, setShippingEstimateLoading] = useState(false);
  // Raw keystrokes, kept only so "letters typed" can be reported before we reformat away
  // the evidence.
  const [phoneRaw, setPhoneRaw] = useState("");
  // Errors appear on blur, not on the first keystroke — flagging a field the user has not
  // finished filling reads as nagging.
  const [touched, setTouched] = useState({ email: false, firstName: false, lastName: false, phone: false });
  /** The first thing still missing when Place order was pressed; it is outlined until it is put right. */
  const [missing, setMissing] = useState<MissingField | null>(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A reload shows the receipt of the order just placed (an empty bag means that order was placed); a new bag starts afresh.
  const [placedOrder, setPlacedOrder] = useState<OrderDto | null>(() => (cartItems.length === 0 ? readPlacedOrder() : null));
  useEffect(() => {
    if (cartItems.length > 0) {
      try {
        window.localStorage.removeItem(PLACED_ORDER_KEY);
      } catch {
        /* nothing to clear */
      }
    }
  }, [cartItems.length]);
  const [orderSnapshot, setOrderSnapshot] = useState<CartItem[]>([]);
  const [snapshotTotal, setSnapshotTotal] = useState(0);
  const reduceMotion = useReducedMotion();
  // Reduced motion keeps the sequence's meaning and drops its waiting: the panel still closes
  // and the receipt still arrives, but nothing is staged in time or travels across the screen.
  const beat = (seconds: number) => (reduceMotion ? 0 : seconds);

  // The receipt replaces a form that stood taller than the screen, so the panel closes out from
  // under the reader and strands them beside whatever now sits at their old offset — the order
  // was accepted somewhere above them and nothing said so. Carry them back up to it.
  // Deliberately `top: 0` rather than the panel's own offset: the page is still collapsing while
  // this scroll runs, and 0 is the only target that cannot be invalidated mid-flight. Native
  // smooth scroll, so a user who starts scrolling themselves takes over instead of fighting it.
  useEffect(() => {
    if (!placedOrder) return;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [placedOrder, reduceMotion]);

  const activeItems = placedOrder
    ? mergePlacedOrderDisplay(placedOrder, orderSnapshot)
    : cartItems;

  const displaySubtotal = placedOrder ? Number(placedOrder.total) || snapshotTotal : cartTotal;
  const displayTotal = displaySubtotal;
  const displaySubtotalEur = placedOrder ? (placedOrder.eurTotal ?? orderEurTotal(placedOrder)) : cartEurTotal;
  const displayTotalEur = displaySubtotalEur;
  // Delivery abroad is paid in euro whatever the site language; within Ukraine the language decides what is shown (and hryvnia is paid).
  const payInEuro = placedOrder ? placedOrder.paymentCurrency === "EUR" : abroad;
  const priceCurrency = payInEuro ? ("EUR" as const) : undefined;
  const { content: contactContent } = useContactContent();
  // A line with no € price cannot be ordered for delivery abroad: say so before the order is placed, not after it fails.
  const abroadMissingEuro = abroad && !placedOrder && cartEurTotal == null;

  // The list holds every line, but only VISIBLE_ORDER_ITEMS of them before it turns into a
  // scroll region. The cap is measured from the real rows rather than hardcoded in px: row
  // height varies with locale, font loading and the md: breakpoint, and a guessed pixel
  // value cuts through the middle of a row, which reads as a rendering bug instead of an
  // intentional scroll. Taking the 4th row's offset gives an exact edge and picks up the
  // divide-y borders for free.
  const itemsListRef = useRef<HTMLDivElement | null>(null);
  const [itemsMaxHeight, setItemsMaxHeight] = useState<number | undefined>(undefined);
  const [itemsScrollHint, setItemsScrollHint] = useState(false);

  const syncScrollHint = useCallback(() => {
    const el = itemsListRef.current;
    if (!el) return;
    // Fade the bottom edge only while content remains below — scrollbars are hidden here,
    // so without it a capped list gives no sign that there is anything more to see.
    setItemsScrollHint(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useLayoutEffect(() => {
    const el = itemsListRef.current;
    if (!el) return;
    const measure = () => {
      const rows = Array.from(el.children) as HTMLElement[];
      setItemsMaxHeight(
        rows.length > VISIBLE_ORDER_ITEMS
          ? rows[VISIBLE_ORDER_ITEMS].offsetTop - rows[0].offsetTop
          : undefined
      );
      syncScrollHint();
    };
    measure();
    // Rows resize as product images and webfonts land, so remeasure rather than trust
    // the first pass.
    const observer = new ResizeObserver(measure);
    Array.from(el.children).forEach((row) => observer.observe(row));
    return () => observer.disconnect();
  }, [activeItems.length, syncScrollHint]);

  const normalizedEmail = email.trim();
  const isEmailValid = isLoggedIn || /^\S+@\S+\.\S+$/.test(normalizedEmail);

  // The API gets a clean +380XXXXXXXXX regardless of how the field was typed or pasted.
  const normalizedRecipientPhone = toE164Ua(recipientPhone);

  // Validation waits for a pause. Judging a number mid-keystroke means flashing "incomplete"
  // at someone who is simply still typing it, so nothing is reported until PHONE_SETTLE_MS
  // after the last input — and each further keystroke restarts that clock. Leaving the field
  // counts as finishing, so blur reports straight away.
  const phoneLive = phoneRaw || recipientPhone;
  const [phoneSettled, setPhoneSettled] = useState<string | null>(null);
  useEffect(() => {
    if (!phoneLive) {
      setPhoneSettled(null);
      return;
    }
    setPhoneSettled(null);
    const id = window.setTimeout(() => setPhoneSettled(phoneLive), PHONE_SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [phoneLive]);

  const phoneProblem = phoneSettled !== null ? inspectUaPhone(phoneSettled) : null;
  const phoneError =
    phoneProblem === "letters"
      ? t("checkout.errorPhoneLetters")
      : phoneProblem === "tooLong"
        ? t("checkout.errorPhoneTooLong")
        : phoneProblem === "tooShort"
          ? t("checkout.errorPhoneTooShort")
          : null;

  const firstNameCyrillic = useDebouncedError(
    recipientFirstName,
    (v) => (v.trim() && !(abroad ? isLatinName(v) : isCyrillicName(v)) ? "invalid" : null)
  );
  const lastNameCyrillic = useDebouncedError(
    recipientLastName,
    (v) => (v.trim() && !(abroad ? isLatinName(v) : isCyrillicName(v)) ? "invalid" : null)
  );

  const isRecipientValid =
    recipientFirstName.trim().length > 0 &&
    isCyrillicName(recipientFirstName) &&
    recipientLastName.trim().length > 0 &&
    isCyrillicName(recipientLastName) &&
    isCompleteUaPhone(recipientPhone);
  const isDeliveryValid = delivery !== null;

  // Abroad: Latin names, an international number with the country's dial code, and a branch or a typed address.
  const abroadCountry = abroadChoice && abroadChoice.kind !== "other" ? findCountry(abroadChoice.countryCode) : undefined;
  const abroadDial = abroadCountry?.dial ?? "+";
  const abroadBlocked = abroadChoice?.kind === "other" && isBlockedCountry(abroadCountryName);
  const isAbroadRecipientValid =
    recipientFirstName.trim().length > 0 &&
    isLatinName(recipientFirstName) &&
    recipientLastName.trim().length > 0 &&
    isLatinName(recipientLastName) &&
    isInternationalPhone(abroadDial, abroadPhone);
  const isAbroadDeliveryValid =
    abroadChoice !== null &&
    (abroadChoice.kind === "branch" ||
      (abroadCity.trim().length > 0 &&
        abroadAddress.trim().length > 0 &&
        (abroadChoice.kind === "courier" || (abroadCountryName.trim().length > 0 && !abroadBlocked))));
  const recipientOk = abroad ? isAbroadRecipientValid : isRecipientValid;
  const deliveryOk = abroad ? isAbroadDeliveryValid : isDeliveryValid;

  // Informational only — Nova Poshta collects this from the recipient in cash on pickup, it
  // is never added to what we charge, so a failed estimate just means the row stays hidden.
  useEffect(() => {
    // No estimate abroad: Nova Post's cost is emailed before payment.
    if (abroad || !delivery || cartTotal <= 0) {
      setShippingEstimate(null);
      return;
    }
    let cancelled = false;
    setShippingEstimateLoading(true);
    fetchNovaPoshtaShippingPrice(delivery.cityRef, cartTotal)
      .then((price) => {
        if (!cancelled) setShippingEstimate(price);
      })
      .catch(() => {
        if (!cancelled) setShippingEstimate(null);
      })
      .finally(() => {
        if (!cancelled) setShippingEstimateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [delivery, cartTotal, abroad]);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void fetchCustomerProfile()
      .then((profile) => {
        if (cancelled || !profile.phoneNumber) return;
        // Stored numbers arrive in whatever shape they were saved — normalise so the field
        // shows the same +380 XX XXX XX XX as one typed by hand.
        setRecipientPhone((current) => (current.trim().length > 0 ? current : formatUaSubscriber(profile.phoneNumber ?? "")));
      })
      .catch(() => {
        // profile optional for checkout
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!user?.name) return;
    const [first, ...rest] = user.name.trim().split(/\s+/);
    setRecipientFirstName((current) => (current.trim().length > 0 ? current : first ?? ""));
    setRecipientLastName((current) => (current.trim().length > 0 ? current : rest.join(" ")));
  }, [user?.name]);

  // A country change (or an autofill that landed before it) re-reads the number: the dial code is the prefix, never part of the value.
  useEffect(() => {
    setAbroadPhone((current) => formatAbroadPhone(normalizeAbroadPhone(current, abroadDial)));
  }, [abroadDial]);

  const abroadFullPhone = `${abroadDial === "+" ? "+" : abroadDial}${abroadPhone.replace(/\D/g, "")}`;

  // In the order the form is read, so the first gap is the one pointed at.
  const nameOk = (v: string) => v.trim().length > 0 && (abroad ? isLatinName(v) : isCyrillicName(v));
  const phoneOk = abroad ? isInternationalPhone(abroadDial, abroadPhone) : isCompleteUaPhone(recipientPhone);
  const firstMissing = (): MissingField | null => {
    if (!isEmailValid) return "email";
    if (!nameOk(recipientFirstName)) return "firstName";
    if (!nameOk(recipientLastName)) return "lastName";
    if (!phoneOk) return "phone";
    if (!abroad) return isDeliveryValid ? null : "delivery";
    if (!abroadChoice) return "delivery";
    if (abroadChoice.kind === "branch") return null;
    if (abroadChoice.kind === "other" && (abroadCountryName.trim().length === 0 || abroadBlocked)) return "abroadCountry";
    if (abroadCity.trim().length === 0) return "abroadCity";
    if (abroadAddress.trim().length === 0) return "abroadAddress";
    return null;
  };
  // Shown on a field only while it is the one pointed at and still empty.
  const requiredError = (field: MissingField, empty: boolean) => (missing === field && empty ? t("checkout.errorRequired") : null);

  // One id per order attempt: a second press after a failure carries the same id, so an order that did go through is not created twice.
  const requestIdRef = useRef<{ id: string; cart: string } | null>(null);

  const placeOrder = async () => {
    if (cartItems.length === 0 || placingOrder) return;
    const gap = firstMissing();
    if (gap) {
      setMissing(gap);
      setError(null);
      const target = document.getElementById(MISSING_FIELD_IDS[gap]);
      target?.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      target?.focus({ preventScroll: true });
      return;
    }
    setMissing(null);
    setPlacingOrder(true);
    setError(null);
    const snapshot = [...cartItems];
    // The recipient and delivery are part of it: a customer who corrects the address after a
    // timeout is placing a different order, not retrying the same one.
    const cartSignature = [
      snapshot
        .map((item) => [item.productId, item.colorId ?? item.color, item.size, item.furnitureColor ?? "", item.withLace ? 1 : 0, item.quantity].join("|"))
        .join(";"),
      recipientFirstName.trim(),
      recipientLastName.trim(),
      abroad ? abroadFullPhone : normalizedRecipientPhone,
      isLoggedIn ? "" : normalizedEmail,
      abroad
        ? JSON.stringify([abroadChoice, abroadCountryName.trim(), abroadCity.trim(), abroadZip.trim(), abroadAddress.trim()])
        : [delivery?.cityRef, delivery?.warehouseRef].join("|"),
    ].join("#");
    if (requestIdRef.current?.cart !== cartSignature) requestIdRef.current = { id: newClientRequestId(), cart: cartSignature };
    const clientRequestId = requestIdRef.current.id;
    setOrderSnapshot(snapshot);
    setSnapshotTotal(cartItemsTotal(snapshot));

    try {
      const order = await createOrder({
        clientRequestId,
        locale,
        phoneNumber: abroad ? abroadFullPhone : normalizedRecipientPhone,
        email: isLoggedIn ? undefined : normalizedEmail,
        recipientFirstName: recipientFirstName.trim(),
        recipientLastName: recipientLastName.trim(),
        recipientPhone: abroad ? abroadFullPhone : normalizedRecipientPhone,
        ...(abroad && abroadChoice
          ? {
              isForeignDelivery: true,
              deliveryCountryCode: abroadChoice.kind === "other" ? "" : abroadChoice.countryCode,
              deliveryCountryName: abroadChoice.kind === "other" ? abroadCountryName.trim() : abroadCountry ? countryName(abroadCountry, "en") : "",
              deliveryCarrier: abroadChoice.kind === "branch" ? ("NovaPost" as const) : ("Other" as const),
              deliveryCityRef: "",
              deliveryCityName: abroadChoice.kind === "branch" ? abroadChoice.city || abroadCountryName : abroadCity.trim(),
              deliveryWarehouseRef: abroadChoice.kind === "branch" ? abroadChoice.branchId : "",
              deliveryWarehouseName: abroadChoice.kind === "branch" ? abroadChoice.branchName : "",
              deliveryPostalCode: abroadChoice.kind === "branch" ? undefined : abroadZip.trim() || undefined,
              deliveryAddress: abroadChoice.kind === "branch" ? undefined : abroadAddress.trim(),
            }
          : {
              deliveryCityRef: delivery!.cityRef,
              deliveryCityName: delivery!.cityName,
              deliveryWarehouseRef: delivery!.warehouseRef,
              deliveryWarehouseName: delivery!.warehouseName,
            }),
        items: snapshot.map((item) => ({
          productIdOrCode: item.productId,
          quantity: item.quantity,
          productSubtitle: item.subtitle,
          colorName: item.color,
          colorId: item.colorId,
          furnitureColorName: item.furnitureColor ?? undefined,
          sizeName: item.size,
          withLace: item.withLace ?? undefined,
        })),
      });
      requestIdRef.current = null;
      setPlacedOrder(order);
      rememberPlacedOrder(order);
      clearCart();
      // The order exists server-side now — keeping the recipient's details in storage would
      // only pre-fill someone else's next visit on a shared device.
      clearSessionState(...Object.values(S));
    } catch (e) {
      // Only a 4xx carries a sentence written for the customer; anything else is the server failing.
      const refused = e instanceof ApiRequestError && e.status >= 400 && e.status < 500;
      setError(abroad && refused && /euro price/i.test(e.message) ? t("checkout.abroad.noEuroPrice", { email: contactContent.email }) : refused ? e.message : t("checkout.errors.unableToPlaceOrder"));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cartItems.length === 0 && !placedOrder) {
    return (
      <main className="min-h-[var(--app-svh)] flex items-center justify-center px-6" style={{ backgroundColor: "#F3EFE8", paddingTop: "120px" }}>
        <motion.div
          className="text-center max-w-[500px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
            <Package size={24} className="text-[#2D241E]/70" />
          </div>
          <h1 className="text-[#2D241E] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400 }}>
            {t("checkout.emptyTitle")}
          </h1>
          <p className="text-[#2D241E]/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
            {t("checkout.emptySubtitle")}
          </p>
          <LangLink
            to="/collection"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.13em" }}
          >
            <span>{t("checkout.goShopping")}</span>
            <ArrowRight size={15} />
          </LangLink>
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: "#F3EFE8", minHeight: "var(--app-svh)" }}>
      <section className="pt-[calc(var(--main-header-h)+20px)] pb-5 md:pt-[calc(var(--main-header-h)+32px)] md:pb-7">
        <div className="max-w-[1300px] mx-auto px-5 md:px-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easing }}
          >
            <h1 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.7rem, 5vw, 2.4rem)", fontWeight: 500 }}>
              {t("checkout.title")}
            </h1>
            {/* Only the placed-order line survives — it carries the order number. The
                pre-purchase "review your details" line restated the heading, and the
                eyebrow above it labelled a heading that already names itself. */}
            {placedOrder && (
              <motion.p
                className="text-[#2D241E]/50 mt-2"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: SEAL.line, delay: beat(SEAL.receiptDelay), ease: glide }}
              >
                {t("checkout.placedMessage", { id: placedOrder.orderNumber ?? placedOrder.id })}
              </motion.p>
            )}
          </motion.div>
        </div>
      </section>

      <div className="max-w-[1300px] mx-auto px-5 md:px-14 pb-10 md:pb-16 grid lg:grid-cols-[1.2fr_0.9fr] gap-6">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          // min-w-0: grid items default to min-width:auto, so they refuse to shrink below
          // their content's min-content width — and `truncate` sets white-space:nowrap,
          // which makes that the *full* product name. Without this the card blew ~140px
          // past the viewport instead of letting the truncation do its job.
          className="min-w-0 rounded-[20px] md:rounded-[28px] p-4 md:p-9"
          style={{ backgroundColor: "#fff", boxShadow: "0 16px 40px -16px rgba(45,36,30,0.1)" }}
        >
          <p
            className="text-[#2D241E]/45 uppercase mb-4 md:mb-5"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em" }}
          >
            {t("checkout.orderDetails")} · {t("checkout.itemCount", { count: activeItems.length })}
          </p>

          <div
            ref={itemsListRef}
            onScroll={syncScrollHint}
            className="divide-y divide-[#2D241E]/8 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              maxHeight: itemsMaxHeight,
              // Soft-edge the last visible row while more remains below.
              maskImage: itemsScrollHint
                ? "linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)"
                : undefined,
              WebkitMaskImage: itemsScrollHint
                ? "linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)"
                : undefined,
            }}
          >
            {activeItems.map((item) => {
              const productHref = item.productId ? `/product/${item.productId}` : "/collection";
              const imageSrc = item.image || ORDER_ITEM_PLACEHOLDER;
              return (
                <LangLink
                  key={item.cartId}
                  to={productHref}
                  className="flex items-center gap-3 md:gap-4 rounded-[16px] px-2 py-2.5 md:px-2.5 md:py-3 transition-colors duration-200 hover:bg-[#F3EEE5]"
                  aria-label={t("checkout.openProduct", { name: item.name })}
                >
                  {/* 3:4, matching what admin actually stores — ImageCropDialog crops every
                      upload to 3/4 before it reaches us. A 4:5 box left ~2px of background
                      down each side; this fills exactly, with object-contain still there so a
                      differently-shaped legacy image letterboxes rather than losing pixels. */}
                  <div className="w-[60px] h-[80px] md:w-[68px] md:h-[90px] rounded-[12px] overflow-hidden bg-[#F8F5F0] flex-shrink-0">
                    <ImageWithFallback src={imageSrc} alt={item.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#2D241E] truncate" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 500 }}>
                      {item.name}
                    </p>
                    <OrderLineDetails
                      line={cartItemToLineDetails(item)}
                      locale={locale}
                      currency={priceCurrency}
                      variant="compact"
                      className="mt-1"
                    />
                  </div>
                </LangLink>
              );
            })}
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: easing }}
          // Single-column, the receipt leads: before checkout the panel is the thing you act on
          // after reviewing the items, but once the order exists it is the thing you came back
          // for, and the items are the supporting detail. Two columns already show both, so the
          // reorder resets at lg.
          className={`min-w-0 rounded-[20px] md:rounded-[28px] p-5 md:p-9 h-fit lg:sticky lg:top-28 ${
            placedOrder ? "order-first lg:order-none" : ""
          }`}
          style={{ backgroundColor: "#2D241E", color: "#F5F2ED" }}
        >
          <p
            className="uppercase mb-4 md:mb-5"
            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", color: "rgba(245,242,237,0.55)" }}
          >
            {t("checkout.summary")}
          </p>

          <div className="space-y-3 pb-4 border-b" style={{ borderColor: "rgba(245,242,237,0.15)" }}>
            <div className="flex items-center justify-between text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.subtotal")}</span>
              <PriceTag amount={displaySubtotal} eurAmount={displaySubtotalEur} currency={priceCurrency} locale={locale} variant="line" tone="light" withUnit />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="uppercase" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.65)" }}>
              {t("checkout.total")}
            </span>
            <PriceTag amount={displayTotal} eurAmount={displayTotalEur} currency={priceCurrency} locale={locale} variant="emphasis" tone="light" withUnit />
          </div>
          {showsEur(locale) && !payInEuro && displayTotalEur != null && (
            <p
              className="mt-1.5 text-right"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(245,242,237,0.4)" }}
            >
              {t("checkout.eurReferenceNote")}
            </p>
          )}

          <AnimatePresence initial={false}>
            {!placedOrder && (
              <motion.div
                key="checkout-form"
                // flex-col so the children's own top margins stay inside the box being measured —
                // through a plain block they collapse out of it and the closing panel keeps a
                // 20px ghost of the form. `-m-1 p-1` nets to zero layout while giving the clip
                // 4px of bleed, so overflow-hidden can stay on permanently (it has to be on
                // before the exit starts) without shaving a focus ring off the edge inputs.
                className="flex flex-col overflow-hidden -m-1 p-1"
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  height: { duration: beat(SEAL.collapse), ease: glide },
                  opacity: { duration: reduceMotion ? 0.12 : SEAL.fade, ease: "easeOut" },
                }}
              >
              {!isLoggedIn && (
                <div className="mt-5">
                  <p
                    className="uppercase mb-2"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.55)" }}
                  >
                    {t("checkout.email")}
                  </p>
                  <CheckoutField
                    id="checkout-email"
                    label={t("checkout.email")}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={254}
                    value={email}
                    error={requiredError("email", !email.trim()) ?? ((touched.email || missing === "email") && email.trim() && !isEmailValid ? t("checkout.errorEmail") : null)}
                    onBlur={() => setTouched((s) => ({ ...s, email: true }))}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.emailPlaceholder")}
                  />
                </div>
              )}

              <div className="mt-5 space-y-2.5">
                <p
                  className="uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.55)" }}
                >
                  {t("checkout.recipient")}
                </p>
                {/* One column until there is room for two: the visible labels here are the
                    placeholders (the <label>s are sr-only), and at phone widths a half-width
                    field clipped "Прізвище отримувача" by ~59px, leaving the field unnamed. */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
                  <CheckoutField
                    id="checkout-recipient-first-name"
                    label={abroad ? t("checkout.abroad.firstNameLatin") : t("checkout.recipientFirstName")}
                    type="text"
                    autoComplete="given-name"
                    maxLength={NAME_MAX}
                    value={recipientFirstName}
                    error={
                      requiredError("firstName", !recipientFirstName.trim()) ?? (touched.firstName && recipientFirstName.length >= NAME_MAX
                        ? t("checkout.errorNameTooLong")
                        : firstNameCyrillic.error || (missing === "firstName" && !nameOk(recipientFirstName))
                          ? (abroad ? t("checkout.abroad.errorNameLatin") : t("checkout.errorNameCyrillicOnly"))
                          : null)
                    }
                    onBlur={() => {
                      setTouched((s) => ({ ...s, firstName: true }));
                      firstNameCyrillic.reportNow();
                    }}
                    onChange={(e) => {
                      setRecipientFirstName(e.target.value.slice(0, NAME_MAX));
                      if (error) setError(null);
                    }}
                    placeholder={abroad ? t("checkout.abroad.firstNameLatin") : t("checkout.recipientFirstName")}
                  />
                  <CheckoutField
                    id="checkout-recipient-last-name"
                    label={abroad ? t("checkout.abroad.lastNameLatin") : t("checkout.recipientLastName")}
                    type="text"
                    autoComplete="family-name"
                    maxLength={NAME_MAX}
                    value={recipientLastName}
                    error={
                      requiredError("lastName", !recipientLastName.trim()) ?? (touched.lastName && recipientLastName.length >= NAME_MAX
                        ? t("checkout.errorNameTooLong")
                        : lastNameCyrillic.error || (missing === "lastName" && !nameOk(recipientLastName))
                          ? (abroad ? t("checkout.abroad.errorNameLatin") : t("checkout.errorNameCyrillicOnly"))
                          : null)
                    }
                    onBlur={() => {
                      setTouched((s) => ({ ...s, lastName: true }));
                      lastNameCyrillic.reportNow();
                    }}
                    onChange={(e) => {
                      setRecipientLastName(e.target.value.slice(0, NAME_MAX));
                      if (error) setError(null);
                    }}
                    placeholder={abroad ? t("checkout.abroad.lastNameLatin") : t("checkout.recipientLastName")}
                  />
                </div>
                {/* inputMode="tel" keeps the phone keypad on mobile; the value is reformatted
                    on every keystroke so the field always reads +380 XX XXX XX XX. Letters are
                    reported rather than silently dropped, so a wrong keyboard is obvious. */}
                {abroad ? (
                  <CheckoutField
                    id="checkout-recipient-phone"
                    label={t("checkout.recipientPhone")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    prefix={abroadDial}
                    value={abroadPhone}
                    error={requiredError("phone", !abroadPhone) ?? ((touched.phone || missing === "phone") && abroadPhone && !isInternationalPhone(abroadDial, abroadPhone) ? t("checkout.abroad.errorPhone") : null)}
                    onBlur={() => setTouched((s) => ({ ...s, phone: true }))}
                    onChange={(e) => {
                      setAbroadPhone(formatAbroadPhone(normalizeAbroadPhone(e.target.value, abroadDial)));
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.phonePlaceholder")}
                  />
                ) : (
                <CheckoutField
                  id="checkout-recipient-phone"
                  label={t("checkout.recipientPhone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  prefix="+380"
                  value={recipientPhone}
                  error={requiredError("phone", !recipientPhone) ?? phoneError ?? (missing === "phone" && !phoneOk ? t("checkout.errorPhoneTooShort") : null)}
                  onBlur={() => {
                    setTouched((s) => ({ ...s, phone: true }));
                    // Leaving the field is the user saying they are done — no need to wait out
                    // the settle timer before telling them what is wrong.
                    if (phoneLive) setPhoneSettled(phoneLive);
                  }}
                  onChange={(e) => {
                    const next = e.target.value;
                    setPhoneRaw(next);
                    setRecipientPhone(
                      inspectUaPhone(next) === "letters" ? next : formatUaSubscriber(next)
                    );
                    if (error) setError(null);
                  }}
                  placeholder={t("checkout.phonePlaceholder")}
                />
                )}
              </div>

              <div className="mt-5">
                <p
                  className="uppercase mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.55)" }}
                >
                  {t("checkout.delivery")}
                </p>
                <DeliveryModeSwitch
                  abroad={abroad}
                  onChange={(next) => {
                    setAbroad(next);
                    if (error) setError(null);
                  }}
                />
                {!abroad && (
                <>
                <div id={MISSING_FIELD_IDS.delivery} tabIndex={-1} className="rounded-[14px] outline-none" style={missing === "delivery" && !isDeliveryValid ? MISSING_OUTLINE : undefined}>
                <NovaPoshtaPicker
                  value={delivery}
                  onSelect={(selection) => {
                    setDelivery(selection);
                    if (error) setError(null);
                  }}
                  tone="dark"
                />
                </div>
                {delivery && (shippingEstimateLoading || shippingEstimate !== null) && (
                  <div className="flex items-baseline justify-between mt-3 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span style={{ color: "rgba(245,242,237,0.5)" }}>{t("checkout.shippingEstimateLabel")}</span>
                    {shippingEstimateLoading ? (
                      <span style={{ color: "rgba(245,242,237,0.5)" }}>{t("checkout.shippingEstimateCalculating")}</span>
                    ) : (
                      <span className="flex items-baseline gap-1.5">
                        <PriceTag amount={shippingEstimate!} locale={locale} variant="line" tone="light" withUnit />
                        <span style={{ fontSize: "0.68rem", color: "rgba(245,242,237,0.4)" }}>
                          {t("checkout.shippingEstimateNote")}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                {delivery && (
                  <p className="mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(245,242,237,0.4)" }}>
                    {t("checkout.payLater")}
                  </p>
                )}
                </>
                )}
                {abroad && (
                  <>
                    <div id={MISSING_FIELD_IDS.delivery} tabIndex={-1} className="rounded-[14px] outline-none" style={missing === "delivery" && !abroadChoice ? MISSING_OUTLINE : undefined}>
                      <DeliveryAbroadPicker value={abroadChoice} onChange={setAbroadChoice} tone="dark" />
                    </div>
                    {abroadChoice && abroadChoice.kind !== "branch" && (
                      <div className="mt-2.5 space-y-2.5">
                        {abroadChoice.kind === "other" && (
                          <CheckoutField
                            id="checkout-abroad-country"
                            label={t("checkout.abroad.fieldCountry")}
                            type="text"
                            autoComplete="country-name"
                            maxLength={100}
                            value={abroadCountryName}
                            error={abroadBlocked ? t("checkout.abroad.errorBlocked") : requiredError("abroadCountry", !abroadCountryName.trim())}
                            onChange={(e) => setAbroadCountryName(e.target.value)}
                            placeholder={t("checkout.abroad.fieldCountry")}
                          />
                        )}
                        <div className="grid grid-cols-2 gap-2.5">
                          <CheckoutField
                            id="checkout-abroad-city"
                            label={t("checkout.abroad.fieldCity")}
                            type="text"
                            autoComplete="address-level2"
                            maxLength={100}
                            value={abroadCity}
                            error={requiredError("abroadCity", !abroadCity.trim())}
                            onChange={(e) => setAbroadCity(e.target.value)}
                            placeholder={t("checkout.abroad.fieldCity")}
                          />
                          <CheckoutField
                            id="checkout-abroad-zip"
                            label={t("checkout.abroad.fieldZip")}
                            type="text"
                            autoComplete="postal-code"
                            maxLength={20}
                            value={abroadZip}
                            onChange={(e) => setAbroadZip(e.target.value)}
                            placeholder={t("checkout.abroad.fieldZip")}
                          />
                        </div>
                        <CheckoutField
                          id="checkout-abroad-address"
                          label={t("checkout.abroad.fieldAddress")}
                          type="text"
                          autoComplete="street-address"
                          maxLength={300}
                          value={abroadAddress}
                          error={requiredError("abroadAddress", !abroadAddress.trim())}
                          onChange={(e) => setAbroadAddress(e.target.value)}
                          placeholder={t("checkout.abroad.fieldAddress")}
                        />
                      </div>
                    )}
                    {abroadChoice && (
                      <p className="mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(245,242,237,0.4)" }}>
                        {abroadChoice.kind === "other" ? t("checkout.abroad.noteOther") : t("checkout.abroad.noteNovaPost")}
                      </p>
                    )}
                    {abroadMissingEuro && (
                      <p className="mt-2" role="alert" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "#F2B8B8" }}>
                        {t("checkout.abroad.noEuroPrice", { email: contactContent.email })}
                      </p>
                    )}
                    {abroadChoice && (
                      <p className="mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", color: "rgba(245,242,237,0.4)" }}>
                        {t("checkout.abroad.pay")}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* The button leaves with the fields it submits — left in its own branch it
                  vanished on the first frame while everything above it was still closing. */}
              {error && (
                <p className="mt-4 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#F2B8B8" }}>
                  {error}
                </p>
              )}
              <button
                onClick={placeOrder}
                // Never greyed out for an unfinished form: pressing it points at the first thing still missing.
                disabled={placingOrder || cartItems.length === 0 || abroadMissingEuro}
                className="mt-6 w-full h-[52px] rounded-[26px] uppercase transition-opacity duration-300 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: "#F5F2ED", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.14em" }}
              >
                {placingOrder ? t("checkout.placingOrder") : t("checkout.placeOrder")}
              </button>
              </motion.div>
            )}
          </AnimatePresence>

          {placedOrder && (
            <motion.div
              className="mt-6"
              // The receipt is the only confirmation on screen once the panel has closed, so it
              // announces itself rather than relying on the sequence being watched.
              role="status"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: SEAL.receiptIn, delay: beat(SEAL.receiptDelay), ease: glide }}
            >
              <div className="rounded-[16px] p-4 mb-4" style={{ backgroundColor: "rgba(245,242,237,0.08)" }}>
                <div className="flex items-center gap-2 mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "#9FDCAE" }}>
                  <OrderSealMark still={!!reduceMotion} />
                  {t("checkout.orderPlaced")}
                </div>
                <motion.p
                  className="text-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,242,237,0.65)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: SEAL.line, delay: beat(SEAL.tick), ease: glide }}
                >
                  {placedOrder.orderNumber ?? `#${placedOrder.id}`} · {toDisplayDate(placedOrder.orderDate, locale)}
                </motion.p>
                <motion.p
                  className="text-sm mt-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,242,237,0.65)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: SEAL.line, delay: beat(SEAL.tick), ease: glide }}
                >
                  {t("checkout.detailsSentTo", { email: placedOrder.customerEmail })}
                </motion.p>
              </div>
              {/* Payment method line removed — the store bills one way, so naming it here
                  was noise. Status now goes through the same account.status.* keys the
                  account page uses, instead of printing the API's raw English enum. */}
              <motion.div
                className="space-y-2 text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: SEAL.line, delay: beat(SEAL.tick + 0.08), ease: glide }}
              >
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.status")}: <span style={{ color: "#F5F2ED" }}>{t(`account.status.${orderStatusKey(placedOrder.status)}`)}</span></p>
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.itemsInOrder")}: <span style={{ color: "#F5F2ED" }}>{placedOrder.items.length}</span></p>
              </motion.div>
              {/* A guest has no account to open: their link is the order's own status page. */}
              <LangLink
                to={!isLoggedIn && placedOrder.statusToken ? `/order/${placedOrder.statusToken}` : "/account"}
                className="mt-6 inline-flex items-center gap-2 hover:opacity-80 transition-opacity text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F2ED" }}
              >
                {!isLoggedIn && placedOrder.statusToken ? t("checkout.checkStatus") : t("checkout.viewInAccount")}
                <ArrowRight size={14} />
              </LangLink>
            </motion.div>
          )}
        </motion.aside>
      </div>
    </main>
  );
}
