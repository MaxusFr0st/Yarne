import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createOrder, fetchNovaPoshtaShippingPrice, type OrderDto } from "../api/orders";
import { fetchCustomerProfile } from "../api/auth";
import { useApp, type CartItem } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { OrderLineDetails, cartItemToLineDetails } from "../components/OrderLineDetails";
import { cartItemsTotal, mergePlacedOrderDisplay } from "../utils/mergePlacedOrderItems";
import { NovaPoshtaPicker, type NovaPoshtaSelection } from "../components/NovaPoshtaPicker";
import { orderStatusKey } from "../utils/orderStatusKey";
import { CheckoutField } from "../components/CheckoutField";
import { useSessionState, clearSessionState } from "../hooks/useSessionState";
import { formatUaPhone, formatUaSubscriber, inspectUaPhone, isCompleteUaPhone, toE164Ua } from "../utils/phoneUa";

const easing = [0.25, 0.1, 0.25, 1] as const;
/** Order lines shown before the list becomes a scroll region. */
const VISIBLE_ORDER_ITEMS = 3;
/** Generous enough for any real Ukrainian name, short enough to stop paste-bombing a field. */
const NAME_MAX = 40;
/** Quiet period after the last keystroke before the phone field reports a problem. */
const PHONE_SETTLE_MS = 500;
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

export function CheckoutPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { cartItems, cartTotal, isLoggedIn, user, clearCart } = useApp();
  // Session-scoped so an accidental reload no longer wipes a half-filled checkout.
  const [email, setEmail] = useSessionState(S.email, "");
  const [recipientFirstName, setRecipientFirstName] = useSessionState(S.firstName, "");
  const [recipientLastName, setRecipientLastName] = useSessionState(S.lastName, "");
  const [recipientPhone, setRecipientPhone] = useSessionState(S.phone, "");
  const [delivery, setDelivery] = useSessionState<NovaPoshtaSelection | null>(S.delivery, null);
  const [shippingEstimate, setShippingEstimate] = useState<number | null>(null);
  const [shippingEstimateLoading, setShippingEstimateLoading] = useState(false);
  // Raw keystrokes, kept only so "letters typed" can be reported before we reformat away
  // the evidence.
  const [phoneRaw, setPhoneRaw] = useState("");
  // Errors appear on blur, not on the first keystroke — flagging a field the user has not
  // finished filling reads as nagging.
  const [touched, setTouched] = useState({ email: false, firstName: false, lastName: false, phone: false });
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderDto | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<CartItem[]>([]);
  const [snapshotTotal, setSnapshotTotal] = useState(0);

  const activeItems = placedOrder
    ? mergePlacedOrderDisplay(placedOrder, orderSnapshot)
    : cartItems;

  const displaySubtotal = placedOrder ? Number(placedOrder.total) || snapshotTotal : cartTotal;
  const displayTotal = displaySubtotal;

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

  const isRecipientValid =
    recipientFirstName.trim().length > 0 &&
    recipientLastName.trim().length > 0 &&
    isCompleteUaPhone(recipientPhone);
  const isDeliveryValid = delivery !== null;

  // Informational only — Nova Poshta collects this from the recipient in cash on pickup, it
  // is never added to what we charge, so a failed estimate just means the row stays hidden.
  useEffect(() => {
    if (!delivery || cartTotal <= 0) {
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
  }, [delivery, cartTotal]);

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

  const placeOrder = async () => {
    if (cartItems.length === 0 || placingOrder) return;
    if (!isEmailValid) {
      setError(t(normalizedEmail.length === 0 ? "checkout.emailRequired" : "checkout.emailInvalid"));
      return;
    }
    if (!isRecipientValid) {
      setError(t("checkout.recipientRequired"));
      return;
    }
    if (!isDeliveryValid || !delivery) {
      setError(t("checkout.deliveryRequired"));
      return;
    }
    setPlacingOrder(true);
    setError(null);
    const snapshot = [...cartItems];
    setOrderSnapshot(snapshot);
    setSnapshotTotal(cartItemsTotal(snapshot));

    try {
      const order = await createOrder({
        phoneNumber: normalizedRecipientPhone,
        email: isLoggedIn ? undefined : normalizedEmail,
        recipientFirstName: recipientFirstName.trim(),
        recipientLastName: recipientLastName.trim(),
        recipientPhone: normalizedRecipientPhone,
        deliveryCityRef: delivery.cityRef,
        deliveryCityName: delivery.cityName,
        deliveryWarehouseRef: delivery.warehouseRef,
        deliveryWarehouseName: delivery.warehouseName,
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
      setPlacedOrder(order);
      clearCart();
      // The order exists server-side now — keeping the recipient's details in storage would
      // only pre-fill someone else's next visit on a shared device.
      clearSessionState(...Object.values(S));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("checkout.errors.unableToPlaceOrder"));
    } finally {
      setPlacingOrder(false);
    }
  };

  if (cartItems.length === 0 && !placedOrder) {
    return (
      <main className="min-h-[100vh] flex items-center justify-center px-6" style={{ backgroundColor: "#F3EFE8", paddingTop: "120px" }}>
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
    <main style={{ backgroundColor: "#F3EFE8", minHeight: "100vh" }}>
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
              <p className="text-[#2D241E]/50 mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
                {t("checkout.placedMessage", { id: placedOrder.id })}
              </p>
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
          className="min-w-0 rounded-[20px] md:rounded-[28px] p-5 md:p-9 h-fit lg:sticky lg:top-28"
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
              <PriceTag amount={displaySubtotal} locale={locale} variant="line" tone="light" withUnit />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="uppercase" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.65)" }}>
              {t("checkout.total")}
            </span>
            <PriceTag amount={displayTotal} locale={locale} variant="emphasis" tone="light" withUnit />
          </div>

          {!placedOrder && (
            <>
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
                    error={touched.email && email.trim() && !isEmailValid ? t("checkout.errorEmail") : null}
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
                    label={t("checkout.recipientFirstName")}
                    type="text"
                    autoComplete="given-name"
                    maxLength={NAME_MAX}
                    value={recipientFirstName}
                    error={touched.firstName && recipientFirstName.length >= NAME_MAX ? t("checkout.errorNameTooLong") : null}
                    onBlur={() => setTouched((s) => ({ ...s, firstName: true }))}
                    onChange={(e) => {
                      setRecipientFirstName(e.target.value.slice(0, NAME_MAX));
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.recipientFirstName")}
                  />
                  <CheckoutField
                    id="checkout-recipient-last-name"
                    label={t("checkout.recipientLastName")}
                    type="text"
                    autoComplete="family-name"
                    maxLength={NAME_MAX}
                    value={recipientLastName}
                    error={touched.lastName && recipientLastName.length >= NAME_MAX ? t("checkout.errorNameTooLong") : null}
                    onBlur={() => setTouched((s) => ({ ...s, lastName: true }))}
                    onChange={(e) => {
                      setRecipientLastName(e.target.value.slice(0, NAME_MAX));
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.recipientLastName")}
                  />
                </div>
                {/* inputMode="tel" keeps the phone keypad on mobile; the value is reformatted
                    on every keystroke so the field always reads +380 XX XXX XX XX. Letters are
                    reported rather than silently dropped, so a wrong keyboard is obvious. */}
                <CheckoutField
                  id="checkout-recipient-phone"
                  label={t("checkout.recipientPhone")}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  prefix="+380"
                  value={recipientPhone}
                  error={phoneError}
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
              </div>

              <div className="mt-5">
                <p
                  className="uppercase mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.55)" }}
                >
                  {t("checkout.delivery")}
                </p>
                <NovaPoshtaPicker
                  value={delivery}
                  onSelect={(selection) => {
                    setDelivery(selection);
                    if (error) setError(null);
                  }}
                  tone="dark"
                />
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
              </div>
            </>
          )}

          {placedOrder ? (
            <div className="mt-6">
              <div className="rounded-[16px] p-4 mb-4" style={{ backgroundColor: "rgba(245,242,237,0.08)" }}>
                <div className="flex items-center gap-2 mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", color: "#9FDCAE" }}>
                  <CheckCircle2 size={15} />
                  {t("checkout.orderPlaced")}
                </div>
                <p className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,242,237,0.65)" }}>
                  #{placedOrder.id} · {toDisplayDate(placedOrder.orderDate, locale)}
                </p>
              </div>
              {/* Payment method line removed — the store bills one way, so naming it here
                  was noise. Status now goes through the same account.status.* keys the
                  account page uses, instead of printing the API's raw English enum. */}
              <div className="space-y-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.status")}: <span style={{ color: "#F5F2ED" }}>{t(`account.status.${orderStatusKey(placedOrder.status)}`)}</span></p>
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.itemsInOrder")}: <span style={{ color: "#F5F2ED" }}>{placedOrder.items.length}</span></p>
              </div>
              <LangLink
                to="/account"
                className="mt-6 inline-flex items-center gap-2 hover:opacity-80 transition-opacity text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "#F5F2ED" }}
              >
                {t("checkout.viewInAccount")}
                <ArrowRight size={14} />
              </LangLink>
            </div>
          ) : (
            <>
              {error && (
                <p className="mt-4 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", color: "#F2B8B8" }}>
                  {error}
                </p>
              )}
            <button
              onClick={placeOrder}
              disabled={placingOrder || cartItems.length === 0 || !isEmailValid || !isRecipientValid || !isDeliveryValid}
              className="mt-6 w-full h-[52px] rounded-[26px] uppercase transition-opacity duration-300 disabled:opacity-60 cursor-pointer"
              style={{ backgroundColor: "#F5F2ED", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.14em" }}
            >
              {placingOrder ? t("checkout.placingOrder") : t("checkout.placeOrder")}
            </button>
            </>
          )}
        </motion.aside>
      </div>
    </main>
  );
}
