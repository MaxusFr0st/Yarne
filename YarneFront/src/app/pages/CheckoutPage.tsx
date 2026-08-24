import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Package } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createOrder, type OrderDto } from "../api/orders";
import { fetchCustomerProfile } from "../api/auth";
import { useApp, type CartItem } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { OrderLineDetails, cartItemToLineDetails } from "../components/OrderLineDetails";
import { cartItemsTotal, mergePlacedOrderDisplay } from "../utils/mergePlacedOrderItems";
import { NovaPoshtaPicker, type NovaPoshtaSelection } from "../components/NovaPoshtaPicker";

const easing = [0.25, 0.1, 0.25, 1] as const;
/** Order lines shown before the list becomes a scroll region. */
const VISIBLE_ORDER_ITEMS = 3;
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
  const [email, setEmail] = useState("");
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [delivery, setDelivery] = useState<NovaPoshtaSelection | null>(null);
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

  const normalizedRecipientPhone = recipientPhone.trim();
  const isRecipientValid =
    recipientFirstName.trim().length > 0 &&
    recipientLastName.trim().length > 0 &&
    normalizedRecipientPhone.length >= 8 &&
    normalizedRecipientPhone.length <= 32;
  const isDeliveryValid = delivery !== null;

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    void fetchCustomerProfile()
      .then((profile) => {
        if (cancelled || !profile.phoneNumber) return;
        setRecipientPhone((current) => (current.trim().length > 0 ? current : profile.phoneNumber ?? ""));
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
                  <div className="w-[52px] h-[64px] md:w-[60px] md:h-[74px] rounded-[12px] overflow-hidden bg-[#F8F5F0] flex-shrink-0">
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
                  <label
                    htmlFor="checkout-email"
                    className="block uppercase mb-2"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", color: "rgba(245,242,237,0.55)" }}
                  >
                    {t("checkout.email")}
                  </label>
                  <input
                    id="checkout-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.emailPlaceholder")}
                    className="w-full rounded-[14px] border-0 px-4 py-3 text-base md:text-[0.88rem] focus:outline-none placeholder-[#F5F2ED]/40"
                    style={{ backgroundColor: "rgba(245,242,237,0.14)", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif" }}
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
                  <div>
                    <label htmlFor="checkout-recipient-first-name" className="sr-only">
                      {t("checkout.recipientFirstName")}
                    </label>
                    <input
                      id="checkout-recipient-first-name"
                      type="text"
                      autoComplete="given-name"
                      value={recipientFirstName}
                      onChange={(e) => {
                        setRecipientFirstName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t("checkout.recipientFirstName")}
                      className="w-full rounded-[14px] border-0 px-4 py-3 text-base md:text-[0.88rem] focus:outline-none placeholder-[#F5F2ED]/40"
                      style={{ backgroundColor: "rgba(245,242,237,0.14)", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-recipient-last-name" className="sr-only">
                      {t("checkout.recipientLastName")}
                    </label>
                    <input
                      id="checkout-recipient-last-name"
                      type="text"
                      autoComplete="family-name"
                      value={recipientLastName}
                      onChange={(e) => {
                        setRecipientLastName(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t("checkout.recipientLastName")}
                      className="w-full rounded-[14px] border-0 px-4 py-3 text-base md:text-[0.88rem] focus:outline-none placeholder-[#F5F2ED]/40"
                      style={{ backgroundColor: "rgba(245,242,237,0.14)", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="checkout-recipient-phone" className="sr-only">
                    {t("checkout.recipientPhone")}
                  </label>
                  <input
                    id="checkout-recipient-phone"
                    type="tel"
                    autoComplete="tel"
                    value={recipientPhone}
                    onChange={(e) => {
                      setRecipientPhone(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder={t("checkout.phonePlaceholder")}
                    className="w-full rounded-[14px] border-0 px-4 py-3 text-base md:text-[0.88rem] focus:outline-none placeholder-[#F5F2ED]/40"
                    style={{ backgroundColor: "rgba(245,242,237,0.14)", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif" }}
                  />
                </div>
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
              <div className="space-y-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.status")}: <span style={{ color: "#F5F2ED" }}>{placedOrder.status}</span></p>
                <p style={{ color: "rgba(245,242,237,0.65)" }}>{t("checkout.payment")}: <span style={{ color: "#F5F2ED" }}>{placedOrder.paymentMethodName}</span></p>
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
