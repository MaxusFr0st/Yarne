import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Heart,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  User,
} from "lucide-react";
import { fetchMyOrders, type OrderDto } from "../api/orders";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useApp } from "../context/AppContext";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { OrderLineDetails, accountOrderItemToLineDetails } from "../components/OrderLineDetails";
import { useProducts } from "../hooks/useProducts";

const easing = [0.25, 0.1, 0.25, 1] as const;
const IMAGE_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath fill='%232D241E' fill-opacity='0.3' d='M80 200h240M200 80v240' stroke='%232D241E' stroke-opacity='0.2'/%3E%3C/svg%3E";

type OrderStatus = "pending" | "accepted" | "inproduction" | "made" | "shipped" | "received" | "canceled";
type Tab = "overview" | "orders" | "profile";
type LocaleCode = "uk" | "en";

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: {
    id: number;
    productCode: string;
    name: string;
    subtitle?: string | null;
    colorName?: string | null;
    furnitureColorName?: string | null;
    sizeName?: string | null;
    withLace?: boolean | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    image: string;
  }[];
  total: number;
  estimatedDelivery?: string;
}

function toOrderStatus(value: string): OrderStatus {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (normalized === "accepted" || normalized === "confirmed" || normalized === "processing") return "accepted";
  if (normalized === "inproduction") return "inproduction";
  if (normalized === "made") return "made";
  if (normalized === "shipped") return "shipped";
  if (normalized === "received" || normalized === "delivered") return "received";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "pending";
}

function toDisplayDate(value: string, locale: LocaleCode): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function mapOrderDto(order: OrderDto): Order {
  return {
    id: `#KG-${String(order.id).padStart(5, "0")}`,
    date: order.orderDate,
    status: toOrderStatus(order.status),
    estimatedDelivery: order.estimatedDelivery || undefined,
    total: Number(order.total),
    items: order.items.map((item) => ({
      id: item.id,
      productCode: item.productCode,
      name: item.productName,
      subtitle: item.productSubtitle,
      colorName: item.colorName,
      furnitureColorName: item.furnitureColorName,
      sizeName: item.sizeName,
      withLace: item.withLace,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      lineTotal: Number(item.lineTotal),
      image: item.productImageUrl || IMAGE_PLACEHOLDER,
    })),
  };
}

const STATUS_STYLE: Record<OrderStatus, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: { color: "#6B6B6B", bg: "rgba(107,107,107,0.08)", icon: <AlertCircle size={13} /> },
  accepted: { color: "#9B6B2E", bg: "rgba(155,107,46,0.1)", icon: <Clock size={13} /> },
  inproduction: { color: "#7C5C2E", bg: "rgba(124,92,46,0.12)", icon: <Clock size={13} /> },
  made: { color: "#4A5D4A", bg: "rgba(74,93,74,0.1)", icon: <Package size={13} /> },
  shipped: { color: "#0A1128", bg: "rgba(10,17,40,0.08)", icon: <Package size={13} /> },
  received: { color: "#2D6A4F", bg: "rgba(45,106,79,0.08)", icon: <CheckCircle2 size={13} /> },
  canceled: { color: "#4A0E0E", bg: "rgba(74,14,14,0.08)", icon: <AlertCircle size={13} /> },
};

const DELIVERY_PROGRESS_CONFIG: Record<OrderStatus, { progress: number; color: string }> = {
  pending: { progress: 10, color: "#6B6B6B" },
  accepted: { progress: 25, color: "#9B6B2E" },
  inproduction: { progress: 45, color: "#7C5C2E" },
  made: { progress: 65, color: "#4A5D4A" },
  shipped: { progress: 85, color: "#0A1128" },
  received: { progress: 100, color: "#2D6A4F" },
  canceled: { progress: 100, color: "#4A0E0E" },
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const cfg = STATUS_STYLE[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.06em",
      }}
    >
      {cfg.icon}
      {t(`account.status.${status}`)}
    </span>
  );
}

function DeliveryProgressPreview({ status }: { status: OrderStatus }) {
  const { t } = useTranslation();
  const cfg = DELIVERY_PROGRESS_CONFIG[status];
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {t(`account.deliveryProgress.${status}`)}
        </span>
        <span className="text-[11px] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {cfg.progress}%
        </span>
      </div>
      <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(45,36,30,0.08)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cfg.progress}%`, backgroundColor: cfg.color }} />
      </div>
    </div>
  );
}

function OrderRow({ order, productImageByCode }: { order: Order; productImageByCode: Map<string, string> }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-[24px] overflow-hidden transition-all duration-300" style={{ backgroundColor: "#F5F2ED", border: "1px solid rgba(45,36,30,0.1)" }}>
      <button onClick={() => setExpanded((prev) => !prev)} className="w-full flex items-center justify-between p-5 md:p-6 text-left group">
        <div className="flex items-start gap-5 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
            <Package size={16} style={{ color: "#2D241E" }} />
          </div>
          <div className="min-w-0 w-full">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 500 }}>
                {order.id}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-[#2D241E]/50 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {toDisplayDate(order.date, locale)} · {t("account.orderRow.itemCount", { count: order.items.length })} · <PriceTag amount={order.total} locale={locale} variant="line" withUnit />
            </p>
            <DeliveryProgressPreview status={order.status} />
          </div>
        </div>
        <ChevronDown
          size={18}
          className="flex-shrink-0 ml-4 transition-transform duration-300"
          style={{ color: "#2D241E", opacity: 0.45, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easing }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6 pt-0 border-t" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
              <div className="space-y-3 mt-5">
                {order.items.map((item) => {
                  const productHref = item.productCode ? `/product/${item.productCode}` : "/collection";
                  const imageSrc = productImageByCode.get(item.productCode) || item.image;
                  const line = accountOrderItemToLineDetails(item);
                  return (
                    <LangLink
                      key={item.id}
                      to={productHref}
                      className="block py-3 px-4 rounded-[16px] transition-colors hover:bg-[#2D241E]/[0.05]"
                      style={{ backgroundColor: "rgba(45,36,30,0.03)" }}
                      aria-label={t("account.orderRow.openProduct", { name: item.name })}
                    >
                      <div className="flex gap-3">
                        <div className="w-12 h-14 rounded-[10px] overflow-hidden bg-[#EDE9E2] flex-shrink-0">
                          <ImageWithFallback src={imageSrc} alt={item.name} className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.98rem", fontWeight: 500 }}>
                            {item.name}
                          </p>
                          <OrderLineDetails line={line} locale={locale} className="mt-2 pt-2 border-t border-[#2D241E]/8" />
                        </div>
                      </div>
                    </LangLink>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 mt-5 pt-5 items-center" style={{ borderTop: "1px solid rgba(45,36,30,0.06)" }}>
                {order.estimatedDelivery && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} style={{ color: "#2D241E", opacity: 0.45 }} />
                    <span className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color: "#2D241E", opacity: 0.6 }}>
                      {t("account.orderRow.estDelivery")}: {toDisplayDate(order.estimatedDelivery, locale)}
                    </span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[#2D241E]" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", opacity: 0.5 }}>
                    {t("account.orderRow.total")}
                  </span>
                  <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 500 }}>
                    <PriceTag amount={order.total} locale={locale} variant="emphasis" withUnit />
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AccountPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { user, isLoggedIn, openLogin, logout, wishlist } = useApp();
  const { products } = useProducts();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    setProfileForm((prev) => ({
      ...prev,
      name: user?.name ?? "",
      email: user?.email ?? "",
    }));
  }, [user?.name, user?.email]);

  useEffect(() => {
    if (!isLoggedIn) return;
    setOrdersLoading(true);
    setOrdersError(null);
    fetchMyOrders()
      .then((data) => setOrders(data.map(mapOrderDto)))
      .catch((e) => setOrdersError(e instanceof Error ? e.message : t("account.errors.loadOrders")))
      .finally(() => setOrdersLoading(false));
  }, [isLoggedIn, t]);

  const productImageByCode = useMemo(
    () =>
      new Map(
        products.map((product) => [
          product.id,
          product.colors[0]?.images?.[0] || product.colors[0]?.image || IMAGE_PLACEHOLDER,
        ])
      ),
    [products]
  );

  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const receivedCount = useMemo(() => orders.filter((order) => order.status === "received").length, [orders]);

  const stats: { key: "orders" | "wishlisted" | "totalSpent"; value: ReactNode }[] = [
    { key: "orders", value: orders.length.toLocaleString() },
    { key: "wishlisted", value: wishlist.length.toLocaleString() },
    { key: "totalSpent", value: <PriceTag amount={totalSpent} locale={locale} variant="emphasis" withUnit /> },
  ];

  const overviewCards = [
    { icon: <ShoppingBag size={20} />, label: t("account.overview.cards.totalOrders"), value: orders.length.toLocaleString() },
    { icon: <CheckCircle2 size={20} />, label: t("account.overview.cards.received"), value: receivedCount.toLocaleString() },
    { icon: <Heart size={20} />, label: t("account.overview.cards.wishlisted"), value: wishlist.length.toLocaleString() },
  ];

  const handleSaveProfile = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-[100svh] flex items-center justify-center" style={{ backgroundColor: "#F5F2ED", paddingTop: "100px" }}>
        <motion.div className="text-center max-w-sm px-6" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easing }}>
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
            <User size={32} style={{ color: "#2D241E", opacity: 0.4 }} />
          </div>
          <h1 className="text-[#2D241E] mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400 }}>
            {t("account.guest.title")}
          </h1>
          <p className="text-[#2D241E]/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}>
            {t("account.guest.subtitle")}
          </p>
          <button
            onClick={openLogin}
            className="w-full py-4 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90 uppercase tracking-widest"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.15em" }}
          >
            {t("account.guest.signIn")}
          </button>
          <LangLink to="/collection" className="block mt-4 text-[#2D241E]/50 hover:text-[#4A0E0E] transition-colors text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {t("account.guest.continueBrowsing")}
          </LangLink>
        </motion.div>
      </main>
    );
  }

  const displayName = user?.name || t("account.header.anonymousName");
  const displayEmail = user?.email ?? "";

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
      <section className="pt-32 pb-12 md:pt-40 md:pb-16" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <motion.div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: easing }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#2D241E" }}>
              <span className="text-[#F5F2ED]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.8rem", fontWeight: 400 }}>
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <p className="text-[#2D241E]/40 tracking-widest uppercase mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em", fontSize: "0.65rem" }}>
                {t("account.header.eyebrow")}
              </p>
              <h1 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 400, lineHeight: 1.2 }}>
                {displayName}
              </h1>
              <p className="text-[#2D241E]/50 mt-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
                {displayEmail}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 min-w-full md:min-w-[360px]">
              {stats.map((stat) => (
                <div key={stat.key} className="text-center">
                  {typeof stat.value === "string" ? (
                    <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 500 }}>
                      {stat.value}
                    </p>
                  ) : (
                    <div className="flex justify-center">{stat.value}</div>
                  )}
                  <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                    {t(`account.stats.${stat.key}`)}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="sticky z-30" style={{ top: "80px", backgroundColor: "rgba(245,242,237,0.94)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-4">
          <div className="w-full md:w-fit rounded-full p-1 flex gap-1 overflow-x-auto" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
            {(["overview", "orders", "profile"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm transition-colors duration-300"
                style={{ fontFamily: "'DM Sans', sans-serif", color: activeTab === tab ? "#F5F2ED" : "#2D241E" }}
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="account-tab-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: "#2D241E" }}
                    transition={{ duration: 0.25, ease: easing }}
                  />
                )}
                <span className="relative z-10">{t(`account.tabs.${tab}`)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: easing }}>
              <div className="grid md:grid-cols-3 gap-4 mb-12">
                {overviewCards.map((card, idx) => (
                  <motion.div
                    key={card.label}
                    className="rounded-[24px] p-6"
                    style={{ backgroundColor: "#EDE9E2" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.07, duration: 0.45, ease: easing }}
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(45,36,30,0.08)", color: "#4A0E0E" }}>
                      {card.icon}
                    </div>
                    <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.7rem", fontWeight: 500 }}>
                      {card.value}
                    </p>
                    <p className="text-[#2D241E]/50 text-xs mt-0.5 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
                      {card.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}>
                  {t("account.overview.recentOrdersTitle")}
                </h2>
                <button onClick={() => setActiveTab("orders")} className="flex items-center gap-2 text-[#2D241E]/55 hover:text-[#4A0E0E] transition-colors text-xs uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                  {t("account.overview.viewAll")}
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-4">
                {orders.slice(0, 3).map((order) => (
                  <OrderRow key={order.id} order={order} productImageByCode={productImageByCode} />
                ))}
                {!ordersLoading && orders.length === 0 && (
                  <p className="text-[#2D241E]/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {t("account.overview.emptyOrders")}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "orders" && (
            <motion.div key="orders" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: easing }}>
              <div className="mb-8 flex items-center justify-between">
                <h2 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}>
                  {t("account.orders.title")}
                </h2>
                <span className="text-[#2D241E]/45 text-xs uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                  {t("account.orders.count", { count: orders.length })}
                </span>
              </div>

              {ordersLoading && (
                <p className="text-[#2D241E]/45 text-sm mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {t("account.orders.loading")}
                </p>
              )}
              {ordersError && (
                <p className="text-[#4A0E0E] text-sm mb-3" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {ordersError}
                </p>
              )}

              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderRow key={order.id} order={order} productImageByCode={productImageByCode} />
                ))}
                {!ordersLoading && orders.length === 0 && !ordersError && (
                  <p className="text-[#2D241E]/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {t("account.orders.empty")}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4, ease: easing }}>
              <h2 className="text-[#2D241E] mb-7" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}>
                {t("account.profile.title")}
              </h2>

              <div className="grid lg:grid-cols-2 gap-6">
                <section className="rounded-[28px] p-7" style={{ backgroundColor: "#EDE9E2" }}>
                  <h3 className="text-[#2D241E] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 500 }}>
                    {t("account.profile.sections.personal")}
                  </h3>
                  <div className="space-y-5">
                    {[
                      { key: "name", label: t("account.profile.labels.fullName"), icon: <User size={14} /> },
                      { key: "email", label: t("account.profile.labels.emailAddress"), icon: <Mail size={14} /> },
                      { key: "phone", label: t("account.profile.labels.phoneNumber"), icon: <Phone size={14} /> },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="flex items-center gap-2 text-xs mb-2 uppercase tracking-widest text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                          {field.icon}
                          {field.label}
                        </label>
                        <input
                          type="text"
                          value={profileForm[field.key as keyof typeof profileForm]}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className="w-full bg-transparent border-0 border-b pb-2 focus:outline-none text-[#2D241E]"
                          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", borderBottom: "1.5px solid rgba(45,36,30,0.16)" }}
                          onFocus={(e) => (e.target.style.borderBottomColor = "#4A0E0E")}
                          onBlur={(e) => (e.target.style.borderBottomColor = "rgba(45,36,30,0.16)")}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[28px] p-7" style={{ backgroundColor: "#EDE9E2" }}>
                  <h3 className="text-[#2D241E] mb-6" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 500 }}>
                    {t("account.profile.sections.address")}
                  </h3>

                  <label className="flex items-center gap-2 text-xs mb-2 uppercase tracking-widest text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                    <MapPin size={14} />
                    {t("account.profile.labels.shippingAddress")}
                  </label>
                  <textarea
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    className="w-full bg-transparent border-0 border-b pb-2 focus:outline-none text-[#2D241E] resize-none"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.92rem", borderBottom: "1.5px solid rgba(45,36,30,0.16)", lineHeight: 1.7 }}
                    onFocus={(e) => (e.target.style.borderBottomColor = "#4A0E0E")}
                    onBlur={(e) => (e.target.style.borderBottomColor = "rgba(45,36,30,0.16)")}
                  />

                  <div className="mt-8">
                    <p className="text-[#2D241E]/45 text-xs mb-4 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                      {t("account.profile.sections.emailPreferences")}
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: t("account.profile.preferences.arrivals"), checked: true },
                        { label: t("account.profile.preferences.orderUpdates"), checked: true },
                      ].map((pref) => (
                        <label key={pref.label} className="flex items-center gap-3 cursor-pointer">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ border: pref.checked ? "none" : "1.5px solid rgba(45,36,30,0.2)", backgroundColor: pref.checked ? "#2D241E" : "transparent" }}
                          >
                            {pref.checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#F5F2ED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-[#2D241E]/75" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {pref.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
                <button
                  onClick={handleSaveProfile}
                  className="px-10 py-4 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90 flex items-center gap-2 uppercase tracking-widest"
                  style={{ backgroundColor: saveSuccess ? "#2D6A4F" : "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.14em" }}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 size={14} />
                      {t("account.profile.actions.saved")}
                    </>
                  ) : (
                    t("account.profile.actions.saveChanges")
                  )}
                </button>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-6 py-4 rounded-full border transition-all duration-300 hover:border-[#4A0E0E] hover:text-[#4A0E0E]"
                  style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.56)" }}
                >
                  <LogOut size={14} />
                  <span className="uppercase tracking-widest">{t("account.profile.actions.signOut")}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
