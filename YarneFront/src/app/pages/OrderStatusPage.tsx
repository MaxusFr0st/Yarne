import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { motion, useReducedMotion } from "motion/react";
import { Check, Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { fetchOrderStatus, setOrderPaymentChoice, uploadOrderReceipt, type PaymentChoice, type PublicOrderStatus } from "../api/orders";
import { ApiRequestError } from "../api/errors";
import { FOCUS_RING, LABEL, PILL, PILL_INK, PILL_OUTLINE, SANS, SERIF } from "../components/care/careUi";
import { PriceTag } from "../components/PriceTag";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../context/AppContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { LangLink } from "../i18n/LangLink";
import { formatPrice } from "../i18n/format";
import { useLocale } from "../i18n/useLocale";
import { orderStatusKey } from "../utils/orderStatusKey";
import { localizedCatalogName } from "../utils/localizedName";

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; order: PublicOrderStatus }
  | { kind: "notFound" }
  | { kind: "error" };

/** The four steps a customer sees; a canceled order shows its own state instead. */
const STEP_KEYS = ["received", "accepted", "shipped", "collected"] as const;

const easing = [0.25, 0.1, 0.25, 1] as const;

function stepIndex(statusKey: ReturnType<typeof orderStatusKey>): number {
  switch (statusKey) {
    case "shipped":
      return 2;
    case "received":
      return 3;
    case "accepted":
    case "inproduction":
    case "made":
      return 1;
    default:
      return 0;
  }
}

function readPayParam(value: string | null): PaymentChoice | null {
  if (value === "transfer") return "Transfer";
  if (value === "pickup") return "Pickup";
  return null;
}

const CARD = "rounded-[16px] p-4 md:p-5";
const INPUT =
  "w-full h-12 rounded-[12px] border border-[#2D241E]/15 bg-white px-4 text-[0.9rem] text-[#2D241E] placeholder:text-[#2D241E]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40";

/**
 * The order's own page, opened with the link token from the emails and the receipt (no sign-in):
 * where the order stands, what was ordered, how to pay and, at the bottom, an offer to keep it in an account.
 * Public by design but unlisted: scripts/server.mjs keeps it out of the sitemap and the index.
 */
export function OrderStatusPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const { token = "" } = useParams<{ token: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  usePageTitle(t("orderStatus.tabTitle"));

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const payParamHandled = useRef(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setState({ kind: "loading" });
      try {
        const order = await fetchOrderStatus(token);
        setState({ kind: "ready", order });
        return order;
      } catch (error) {
        if (!quiet) setState(error instanceof ApiRequestError && error.status === 404 ? { kind: "notFound" } : { kind: "error" });
        return null;
      }
    },
    [token],
  );

  useEffect(() => {
    payParamHandled.current = false;
    void load();
  }, [load]);

  const order = state.kind === "ready" ? state.order : null;

  // Payment choice: saved when chosen, and when the page was opened from an email button (?pay=transfer|pickup).
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState(false);
  const [paySaved, setPaySaved] = useState(false);
  const choosePayment = useCallback(
    async (choice: PaymentChoice) => {
      setPaySaving(true);
      setPayError(false);
      setPaySaved(false);
      try {
        const updated = await setOrderPaymentChoice(token, choice);
        setState({ kind: "ready", order: updated });
        setPaySaved(true);
      } catch {
        setPayError(true);
      } finally {
        setPaySaving(false);
      }
    },
    [token],
  );

  // Receipt: one optional image of the transfer, replaceable until the owner confirms the payment.
  const [receiptState, setReceiptState] = useState<"idle" | "uploading" | "type" | "size" | "error">("idle");
  const fileInput = useRef<HTMLInputElement>(null);
  const sendReceipt = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setReceiptState("size");
      return;
    }
    setReceiptState("uploading");
    try {
      setState({ kind: "ready", order: await uploadOrderReceipt(token, file) });
      setReceiptState("idle");
    } catch (error) {
      setReceiptState(error instanceof ApiRequestError && error.status === 400 ? "type" : "error");
    }
    if (fileInput.current) fileInput.current.value = "";
  };

  // "Copied" for two seconds on the button that was pressed.
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(copyTimer.current), []);
  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(field);
      field.select();
      const done = document.execCommand("copy");
      field.remove();
      if (!done) return;
    }
    setCopiedKey(key);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopiedKey(null), 2000);
  };

  useEffect(() => {
    if (!order || payParamHandled.current) return;
    payParamHandled.current = true;
    const fromEmail = readPayParam(searchParams.get("pay"));
    if (searchParams.has("pay")) {
      const next = new URLSearchParams(searchParams);
      next.delete("pay");
      setSearchParams(next, { replace: true });
    }
    if (fromEmail && order.canChoosePayment && order.paymentChoice !== fromEmail) void choosePayment(fromEmail);
  }, [order, searchParams, setSearchParams, choosePayment]);

  // Account offer.
  const [password, setPassword] = useState("");
  const [accountWorking, setAccountWorking] = useState(false);
  const [accountError, setAccountError] = useState(false);
  const [accountDone, setAccountDone] = useState(false);
  const { register, login } = useAuth();
  const submitAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!order?.email || accountWorking) return;
    setAccountWorking(true);
    setAccountError(false);
    const result = order.accountExistsForEmail
      ? await login(order.email, password, token)
      : await register({ email: order.email, password, statusToken: token });
    setAccountWorking(false);
    if (!result.ok) {
      setAccountError(true);
      return;
    }
    setPassword("");
    setAccountDone(true);
    void load(true);
  };

  const fade = (delay = 0) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay, ease: easing } };

  const shell = (children: ReactNode) => (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "var(--app-svh)" }}>
      <div className="max-w-[640px] mx-auto px-5 md:px-8 pt-[calc(var(--main-header-h)+1.25rem)] pb-16 md:pb-24">{children}</div>
    </main>
  );

  if (state.kind === "loading") {
    return shell(
      <div aria-busy="true" role="status" className="flex flex-col gap-5">
        <span className="sr-only">{t("orderStatus.loading")}</span>
        <Skeleton className="h-4 w-24 rounded bg-[#E5E0D8]" />
        <Skeleton className="h-10 w-48 rounded bg-[#E5E0D8]" />
        <Skeleton className="h-6 w-full rounded bg-[#E5E0D8]" />
        <Skeleton className="h-20 w-full rounded-[16px] bg-[#E5E0D8]" />
        <Skeleton className="h-20 w-full rounded-[16px] bg-[#E5E0D8]" />
      </div>,
    );
  }

  if (state.kind === "notFound") {
    return shell(
      <motion.div className="flex flex-col items-start gap-4 pt-10" {...fade()}>
        <h1 className="text-[#2D241E]" style={{ ...SERIF, fontSize: "clamp(1.8rem, 5vw, 2.4rem)", fontWeight: 500 }}>
          {t("orderStatus.notFound.title")}
        </h1>
        <p className="text-[#2D241E]/65" style={{ ...SANS, fontSize: "0.95rem", lineHeight: 1.7 }}>
          {t("orderStatus.notFound.text")}
        </p>
        <LangLink to="/" className={`${PILL} ${PILL_INK} h-12 px-8 justify-center mt-2`}>
          {t("orderStatus.notFound.cta")}
        </LangLink>
      </motion.div>,
    );
  }

  if (state.kind === "error") {
    return shell(
      <motion.div className="flex flex-col items-start gap-4 pt-10" role="alert" {...fade()}>
        <h1 className="text-[#2D241E]" style={{ ...SERIF, fontSize: "clamp(1.8rem, 5vw, 2.4rem)", fontWeight: 500 }}>
          {t("orderStatus.error.title")}
        </h1>
        <p className="text-[#2D241E]/65" style={{ ...SANS, fontSize: "0.95rem", lineHeight: 1.7 }}>
          {t("orderStatus.error.text")}
        </p>
        <button type="button" onClick={() => void load()} className={`${PILL} ${PILL_INK} h-12 px-8 justify-center mt-2`}>
          {t("orderStatus.error.retry")}
        </button>
      </motion.div>,
    );
  }

  const data = state.order;
  const statusKey = orderStatusKey(data.status);
  const canceled = statusKey === "canceled";
  const current = stepIndex(statusKey);
  const number = data.orderNumber ?? "";
  const dateLabel = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "long" }).format(new Date(data.orderDate));
  const sentenceKey = canceled
    ? "canceled"
    : statusKey === "pending"
      ? "pending"
      : statusKey === "made"
        ? "made"
        : statusKey === "shipped"
          ? data.isForeignDelivery
            ? "shippedAbroad"
            : "shipped"
          : statusKey === "received"
            ? "received"
            : "accepted";
  const paymentLabel = data.paymentChoice === "Transfer"
    ? t("orderStatus.paymentTransfer")
    : data.paymentChoice === "Pickup"
      ? t("orderStatus.paymentPickup")
      : t("orderStatus.paymentNone");
  // Offered once the order is accepted, until it is sent (the emails' buttons arrive after acceptance).
  const showPayChoice = data.canChoosePayment && !canceled && statusKey !== "pending";
  const alreadyInAccount = data.isAttachedToAccount || (!!user && !!data.email && user.email.toLowerCase() === data.email.toLowerCase());
  const showAccountOffer = !!data.email && (!alreadyInAccount || accountDone);

  const row = (label: string, value: ReactNode) => (
    <div className="flex justify-between gap-4 text-[0.9rem]">
      <dt className="text-[#2D241E]/65">{label}</dt>
      <dd className="text-right text-[#2D241E] min-w-0 break-words">{value}</dd>
    </div>
  );

  const payOption = (choice: PaymentChoice, label: string) => {
    const selected = data.paymentChoice === choice;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={paySaving}
        onClick={() => {
          if (!selected) void choosePayment(choice);
        }}
        className={`${PILL} h-12 px-5 justify-center w-full disabled:opacity-60 ${selected ? PILL_INK : PILL_OUTLINE}`}
      >
        {selected && <Check size={15} strokeWidth={2} aria-hidden />}
        {label}
      </button>
    );
  };

  return shell(
    <motion.div className="flex flex-col gap-5" {...fade()}>
      <header>
        <h1 className="flex flex-col gap-1">
          <span className={`${LABEL} text-[11px] text-[#2D241E]/55`} style={SANS}>
            {t("orderStatus.orderLabel")}
          </span>
          <span className="text-[#2D241E]" style={{ ...SERIF, fontSize: "clamp(2rem, 7vw, 2.8rem)", fontWeight: 600, letterSpacing: "0.02em", lineHeight: 1.1 }}>
            {number}
          </span>
        </h1>
      </header>

      {canceled ? (
        <div className={`${CARD} bg-[#EDE9E2]`} role="status">
          <p className={`${LABEL} text-[11px] text-[#4A0E0E]`} style={SANS}>
            {t("orderStatus.canceledLabel")}
          </p>
          {data.cancelReason && (
            <p className="mt-2 text-[0.9rem] text-[#2D241E]" style={{ ...SANS, lineHeight: 1.6 }}>
              <span className="text-[#2D241E]/65">{t("orderStatus.reasonLabel")}: </span>
              {data.cancelReason}
            </p>
          )}
        </div>
      ) : (
        <ol className="grid grid-cols-4 gap-1.5" aria-label={t("orderStatus.progressLabel")} style={SANS}>
          {STEP_KEYS.map((key, index) => {
            const on = index <= current;
            return (
              <li key={key} aria-current={index === current ? "step" : undefined} className={`flex flex-col gap-1.5 min-w-0 text-[0.72rem] ${on ? "text-[#2D241E] font-bold" : "text-[#2D241E]/65"}`}>
                <span className={`block h-1 rounded-sm ${on ? "bg-[#4A0E0E]" : "bg-[#2D241E]/15"}`} aria-hidden />
                {t(`orderStatus.steps.${key}`)}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-[#2D241E]/70 text-[0.9rem]" style={{ ...SANS, lineHeight: 1.6 }}>
        {t(`orderStatus.sentence.${sentenceKey}`, { date: dateLabel })}
        {sentenceKey === "accepted" && ` ${t("orderStatus.shipsWithin")}`}
      </p>

      <hr className="border-0 h-px bg-[#2D241E]/15" />

      <ul className="flex flex-col gap-4">
        {data.items.map((item, index) => {
          const details = [
            localizedCatalogName(item.colorName ?? "", item.colorNameUk, locale),
            localizedCatalogName(item.sizeName ?? "", item.sizeNameUk, locale),
            item.withLace === true ? t("orderStatus.strapWith") : item.withLace === false ? t("orderStatus.strapWithout") : "",
            item.furnitureColorName ? t("orderStatus.hardware", { name: localizedCatalogName(item.furnitureColorName, item.furnitureColorNameUk, locale) }) : "",
          ].filter(Boolean);
          return (
            <li key={`${item.productCode}-${index}`} className="grid grid-cols-[54px_minmax(0,1fr)_auto] gap-3 items-center" style={SANS}>
              <div className="w-[54px] h-[68px] rounded-[12px] bg-[#EDE9E2] overflow-hidden">
                {item.productImageUrl && <img src={item.productImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="text-[0.95rem] text-[#2D241E]" style={{ fontWeight: 700 }}>
                  {item.productName}
                </p>
                {details.length > 0 && <p className="text-[0.85rem] text-[#2D241E]/65">{details.join(" · ")}</p>}
              </div>
              <div className="text-right">
                <PriceTag amount={item.unitPrice} eurAmount={item.eurUnitPrice} locale={locale} variant="line" />
                {item.quantity > 1 && <p className="text-[0.8rem] text-[#2D241E]/65">{t("orderStatus.quantity", { count: item.quantity })}</p>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-baseline justify-between gap-4" style={SANS}>
        <span className="text-[0.9rem] text-[#2D241E]/65">{t("orderStatus.total")}</span>
        <PriceTag amount={data.total} eurAmount={data.eurTotal} locale={locale} variant="emphasis" withUnit />
      </div>

      <dl className="flex flex-col gap-3" style={SANS}>
        {row(
          data.isForeignDelivery ? t("orderStatus.deliveryAbroad") : t("orderStatus.delivery"),
          (data.isForeignDelivery
            ? [data.deliveryCountryName, data.deliveryCityName, data.deliveryCarrier === "NovaPost" ? data.deliveryWarehouseName : data.deliveryAddress, data.deliveryPostalCode]
            : [data.deliveryCityName, data.deliveryWarehouseName]
          )
            .filter(Boolean)
            .join(", "),
        )}
        {(!canceled || data.paymentChoice) && row(t("orderStatus.payment"), paymentLabel)}
        {(!canceled || data.ttnNumber) && row(
          t("orderStatus.ttn"),
          data.ttnNumber ? (
            <>
              <span style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>{data.ttnNumber}</span>
              {data.trackingStatus && <span className="block text-[0.8rem] text-[#2D241E]/65">{`${t("orderStatus.ttnTracking")}: ${data.trackingStatus}`}</span>}
            </>
          ) : (
            <span className="text-[#2D241E]/65">{t("orderStatus.ttnPending")}</span>
          ),
        )}
      </dl>

      {data.paymentReceivedAt && !canceled && (
        <section className={`${CARD} bg-[#EDE9E2] flex flex-col gap-1.5`} aria-labelledby="order-paid-title" style={SANS} role="status">
          <h2 id="order-paid-title" className="text-[#2D241E]" style={{ ...SERIF, fontSize: "1.4rem", fontWeight: 600, lineHeight: 1.15 }}>
            {t("orderStatus.paid.title")}
          </h2>
          <p className="text-[0.9rem] text-[#2D241E]/75">
            {t("orderStatus.paid.amount")}: {formatPrice(data.total, locale)} · {t("orderStatus.paid.date")}:{" "}
            {new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(data.paymentReceivedAt))}
          </p>
        </section>
      )}

      {showPayChoice && !data.paymentReceivedAt && (
        <section className={`${CARD} bg-[#EDE9E2] flex flex-col gap-3`} aria-labelledby="order-pay-title" style={SANS}>
          <h2 id="order-pay-title" className="text-[#2D241E]" style={{ ...SERIF, fontSize: "1.4rem", fontWeight: 600, lineHeight: 1.15 }}>
            {t("orderStatus.pay.title")}
          </h2>
          <p className="text-[0.9rem] text-[#2D241E]/70">{t("orderStatus.pay.amount", { total: formatPrice(data.total, locale) })}</p>
          <div role="radiogroup" aria-label={t("orderStatus.pay.title")} className={`grid gap-2.5 ${data.isForeignDelivery ? "" : "sm:grid-cols-2"}`}>
            {payOption("Transfer", t("orderStatus.pay.transfer"))}
            {!data.isForeignDelivery && payOption("Pickup", t("orderStatus.pay.pickup"))}
          </div>
          {!data.isForeignDelivery && <p className="text-[0.8rem] text-[#2D241E]/65">{t("orderStatus.pay.fee")}</p>}
          {data.paymentChoice === "Transfer" && (
            <div className="rounded-[12px] p-3.5 text-[0.9rem] text-[#2D241E] bg-[#F5F2ED] flex flex-col gap-2.5">
              <p className={`${LABEL} text-[10.5px] text-[#2D241E]/65`}>{t("orderStatus.pay.detailsTitle")}</p>
              {data.transferDetails ? (
                (
                  [
                    ["recipient", t("orderStatus.pay.recipient"), data.transferDetails.recipient],
                    ["card", t("orderStatus.pay.card"), data.transferDetails.cardNumber],
                    ["iban", t("orderStatus.pay.iban"), data.transferDetails.iban],
                    ["reference", t("orderStatus.pay.reference"), data.transferDetails.reference],
                  ] as const
                )
                  .filter(([, , value]) => value)
                  .map(([key, label, value]) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.75rem] text-[#2D241E]/60">{label}</p>
                        <p className="break-words" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void copyValue(key, value)}
                        className={`shrink-0 h-11 px-3.5 inline-flex items-center gap-1.5 rounded-full border border-[#2D241E]/25 text-[0.75rem] text-[#2D241E] cursor-pointer hover:bg-[#2D241E]/5 transition-colors ${FOCUS_RING}`}
                      >
                        {copiedKey === key ? <Check size={14} strokeWidth={2} aria-hidden /> : <Copy size={14} strokeWidth={1.5} aria-hidden />}
                        <span aria-live="polite">{copiedKey === key ? t("orderStatus.pay.copied") : t("orderStatus.pay.copy")}</span>
                      </button>
                    </div>
                  ))
              ) : (
                <p>{t("orderStatus.pay.detailsPending")}</p>
              )}
            </div>
          )}
          {data.paymentChoice === "Transfer" && data.canUploadReceipt && (
            <div className="flex flex-col gap-2">
              {data.receiptUploadedAt ? (
                <p className="text-[0.9rem] text-[#2D241E]" role="status">{t("orderStatus.receipt.received")}</p>
              ) : (
                <p className="text-[0.8rem] text-[#2D241E]/65">{t("orderStatus.receipt.optional")}</p>
              )}
              <input
                ref={fileInput}
                id="order-receipt-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic"
                className="sr-only"
                onChange={(event) => void sendReceipt(event.target.files?.[0])}
              />
              <label
                htmlFor="order-receipt-file"
                className={`${PILL} ${PILL_OUTLINE} h-12 px-5 justify-center w-full focus-within:ring-2 ${receiptState === "uploading" ? "opacity-60 pointer-events-none" : ""}`}
              >
                {receiptState === "uploading" ? t("orderStatus.receipt.uploading") : data.receiptUploadedAt ? t("orderStatus.receipt.replace") : t("orderStatus.receipt.add")}
              </label>
              <p className="text-[0.75rem] text-[#2D241E]/60">{t("orderStatus.receipt.privacy")}</p>
              {(receiptState === "type" || receiptState === "size" || receiptState === "error") && (
                <p className="text-[0.85rem]" role="alert" style={{ color: "#8A1C1C" }}>
                  {receiptState === "type" ? t("orderStatus.receipt.errorType") : receiptState === "size" ? t("orderStatus.receipt.errorSize") : t("orderStatus.receipt.error")}
                </p>
              )}
            </div>
          )}
          {data.paymentChoice === "Transfer" && !data.isForeignDelivery && (
            <button
              type="button"
              disabled={paySaving}
              onClick={() => void choosePayment("Pickup")}
              className={`self-start min-h-11 text-[0.85rem] text-[#2D241E] underline underline-offset-2 cursor-pointer ${FOCUS_RING}`}
            >
              {t("orderStatus.receipt.changeMind")}
            </button>
          )}
          <p className="text-[0.8rem] text-[#2D241E]/65" aria-live="polite">
            {paySaving ? t("orderStatus.pay.saving") : payError ? t("orderStatus.pay.error") : paySaved ? t("orderStatus.pay.saved") : t("orderStatus.pay.changeable")}
          </p>
        </section>
      )}

      {showAccountOffer && (
        <section className={`${CARD} bg-[#EDE9E2] flex flex-col gap-3`} aria-labelledby="order-account-title" style={SANS}>
          <h2 id="order-account-title" className="text-[#2D241E]" style={{ ...SERIF, fontSize: "1.4rem", fontWeight: 600, lineHeight: 1.15 }}>
            {t("orderStatus.account.title")}
          </h2>
          {accountDone ? (
            <p className="text-[0.9rem] text-[#2D241E]/75" role="status">
              {t("orderStatus.account.done")}
            </p>
          ) : (
            <form onSubmit={submitAccount} className="flex flex-col gap-3">
              <p className="text-[0.9rem] text-[#2D241E]/70">{data.accountExistsForEmail ? t("orderStatus.account.existingText") : t("orderStatus.account.text")}</p>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="order-account-email" className="text-[0.8rem] text-[#2D241E]/70">
                  {t("orderStatus.account.emailLabel")}
                </label>
                <input id="order-account-email" type="email" value={data.email ?? ""} readOnly autoComplete="email" className={INPUT} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="order-account-password" className="text-[0.8rem] text-[#2D241E]/70">
                  {data.accountExistsForEmail ? t("orderStatus.account.passwordLabel") : t("orderStatus.account.newPasswordLabel")}
                </label>
                <input
                  id="order-account-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={data.accountExistsForEmail ? undefined : 8}
                  autoComplete={data.accountExistsForEmail ? "current-password" : "new-password"}
                  aria-describedby={data.accountExistsForEmail ? undefined : "order-account-hint"}
                  className={INPUT}
                />
                {!data.accountExistsForEmail && (
                  <p id="order-account-hint" className="text-[0.75rem] text-[#2D241E]/60">
                    {t("orderStatus.account.passwordHint")}
                  </p>
                )}
              </div>
              {accountError && (
                <p className="text-[0.85rem]" role="alert" style={{ color: "#8A1C1C" }}>
                  {data.accountExistsForEmail ? t("orderStatus.account.signInError") : t("orderStatus.account.createError")}
                </p>
              )}
              <button
                type="submit"
                disabled={accountWorking || password.length === 0}
                className={`${PILL} ${PILL_INK} h-[50px] px-6 justify-center w-full disabled:opacity-60`}
              >
                {accountWorking ? t("orderStatus.account.working") : data.accountExistsForEmail ? t("orderStatus.account.signIn") : t("orderStatus.account.create")}
              </button>
            </form>
          )}
        </section>
      )}
    </motion.div>,
  );
}
