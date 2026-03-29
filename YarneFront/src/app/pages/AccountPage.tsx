import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router";
import {
  User,
  Package,
  Settings,
  ChevronDown,
  ChevronRight,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Heart,
  ShoppingBag,
  Star,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit3,
  LogOut,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const easing = [0.25, 0.1, 0.25, 1] as const;

type OrderStatus = "delivered" | "shipped" | "processing" | "pending" | "cancelled";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  color: string;
  size: string;
}

interface Order {
  id: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

const MOCK_ORDERS: Order[] = [
  {
    id: "#KG-10055",
    date: "March 13, 2026",
    status: "processing",
    estimatedDelivery: "March 17–19, 2026",
    items: [
      { name: "Côte Bouclé Jacket", quantity: 1, price: 395, color: "Camel", size: "S" },
    ],
    total: 395,
  },
  {
    id: "#KG-10051",
    date: "March 11, 2026",
    status: "shipped",
    estimatedDelivery: "March 14–15, 2026",
    trackingNumber: "IT782934021IT",
    items: [
      { name: "Arles Cocoon Sweater", quantity: 1, price: 285, color: "Parchment", size: "S" },
    ],
    total: 285,
  },
  {
    id: "#KG-10042",
    date: "March 8, 2026",
    status: "delivered",
    trackingNumber: "IT492834923IT",
    items: [
      { name: "Mistral Turtleneck", quantity: 1, price: 360, color: "Midnight", size: "S" },
    ],
    total: 360,
  },
  {
    id: "#KG-10038",
    date: "February 14, 2026",
    status: "delivered",
    trackingNumber: "PT928374612PT",
    items: [
      { name: "Riviera Cardigan", quantity: 1, price: 245, color: "Bordeaux", size: "M" },
      { name: "Provence Knit Vest", quantity: 1, price: 195, color: "Ecru", size: "XS" },
    ],
    total: 440,
  },
  {
    id: "#KG-10021",
    date: "January 3, 2026",
    status: "delivered",
    trackingNumber: "IT384729103IT",
    items: [
      { name: "Bretagne Pullover", quantity: 1, price: 320, color: "Oat", size: "S" },
    ],
    total: 320,
  },
];

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  delivered: {
    label: "Delivered",
    color: "#2D6A4F",
    bg: "rgba(45,106,79,0.08)",
    icon: <CheckCircle2 size={13} />,
  },
  shipped: {
    label: "Shipped",
    color: "#0A1128",
    bg: "rgba(10,17,40,0.08)",
    icon: <Truck size={13} />,
  },
  processing: {
    label: "Processing",
    color: "#9B6B2E",
    bg: "rgba(155,107,46,0.1)",
    icon: <Clock size={13} />,
  },
  pending: {
    label: "Pending",
    color: "#6B6B6B",
    bg: "rgba(107,107,107,0.08)",
    icon: <AlertCircle size={13} />,
  },
  cancelled: {
    label: "Cancelled",
    color: "#4A0E0E",
    bg: "rgba(74,14,14,0.08)",
    icon: <AlertCircle size={13} />,
  },
};

type Tab = "overview" | "orders" | "profile";

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
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
      {cfg.label}
    </span>
  );
}

function OrderRow({ order }: { order: Order }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-[20px] overflow-hidden transition-all duration-300"
      style={{ backgroundColor: "#F5F2ED", border: "1px solid rgba(45,36,30,0.08)" }}
    >
      {/* Row Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left group"
      >
        <div className="flex items-center gap-6 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "rgba(45,36,30,0.06)" }}
          >
            <Package size={16} style={{ color: "#2D241E" }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-[#2D241E]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 500 }}
              >
                {order.id}
              </span>
              <StatusBadge status={order.status} />
            </div>
            <p
              className="text-[#2D241E]/50 text-xs mt-0.5"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {order.date} · {order.items.length} {order.items.length === 1 ? "item" : "items"} · €{order.total}
            </p>
          </div>
        </div>
        <ChevronDown
          size={18}
          className="flex-shrink-0 ml-4 transition-transform duration-300"
          style={{
            color: "#2D241E",
            opacity: 0.4,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easing }}
            className="overflow-hidden"
          >
            <div
              className="px-5 md:px-6 pb-5 md:pb-6 pt-0 border-t"
              style={{ borderColor: "rgba(45,36,30,0.06)" }}
            >
              {/* Items */}
              <div className="space-y-3 mt-5">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 px-4 rounded-[14px]"
                    style={{ backgroundColor: "rgba(45,36,30,0.03)" }}
                  >
                    <div>
                      <p
                        className="text-[#2D241E]"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem", fontWeight: 500 }}
                      >
                        {item.name}
                      </p>
                      <p
                        className="text-[#2D241E]/50 text-xs mt-0.5"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {item.color} · Size {item.size} · Qty {item.quantity}
                      </p>
                    </div>
                    <span
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}
                    >
                      €{item.price}
                    </span>
                  </div>
                ))}
              </div>

              {/* Order Details */}
              <div className="flex flex-wrap gap-4 mt-5 pt-5" style={{ borderTop: "1px solid rgba(45,36,30,0.06)" }}>
                {order.trackingNumber && (
                  <div className="flex items-center gap-2">
                    <Truck size={13} style={{ color: "#2D241E", opacity: 0.4 }} />
                    <span
                      className="text-xs"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: "#2D241E", opacity: 0.6 }}
                    >
                      Tracking: {order.trackingNumber}
                    </span>
                  </div>
                )}
                {order.estimatedDelivery && (
                  <div className="flex items-center gap-2">
                    <Calendar size={13} style={{ color: "#2D241E", opacity: 0.4 }} />
                    <span
                      className="text-xs"
                      style={{ fontFamily: "'DM Sans', sans-serif", color: "#2D241E", opacity: 0.6 }}
                    >
                      Est. delivery: {order.estimatedDelivery}
                    </span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <span
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", opacity: 0.5 }}
                  >
                    Total
                  </span>
                  <span
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem", fontWeight: 500 }}
                  >
                    €{order.total}
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
  const { user, isLoggedIn, openLogin, logout, wishlist } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "Sophie",
    email: user?.email || "sophie@example.com",
    phone: "+33 6 12 34 56 78",
    address: "14 Rue des Abbesses, 75018 Paris, France",
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  const totalSpent = MOCK_ORDERS.reduce((s, o) => s + o.total, 0);
  const deliveredCount = MOCK_ORDERS.filter((o) => o.status === "delivered").length;

  const handleSaveProfile = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Not logged in
  if (!isLoggedIn) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F2ED", paddingTop: "100px" }}
      >
        <motion.div
          className="text-center max-w-sm px-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: easing }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
            style={{ backgroundColor: "rgba(45,36,30,0.06)" }}
          >
            <User size={32} style={{ color: "#2D241E", opacity: 0.4 }} />
          </div>
          <h1
            className="text-[#2D241E] mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "2rem",
              fontWeight: 400,
            }}
          >
            Welcome back
          </h1>
          <p
            className="text-[#2D241E]/50 mb-8"
            style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
          >
            Sign in to view your orders, manage your profile, and access your wishlist.
          </p>
          <button
            onClick={openLogin}
            className="w-full py-4 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90"
            style={{
              backgroundColor: "#2D241E",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.15em",
            }}
          >
            <span className="uppercase tracking-widest">Sign In</span>
          </button>
          <Link
            to="/collection"
            className="block mt-4 text-[#2D241E]/50 hover:text-[#4A0E0E] transition-colors text-sm"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Continue browsing
          </Link>
        </motion.div>
      </main>
    );
  }

  const displayName = user?.name || "Sophie";
  const displayEmail = user?.email || "sophie@example.com";

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      {/* Page Header */}
      <section
        className="pt-32 pb-12 md:pt-40 md:pb-16"
        style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <motion.div
            className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easing }}
          >
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#2D241E" }}
            >
              <span
                className="text-[#F5F2ED]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.8rem",
                  fontWeight: 400,
                }}
              >
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1">
              <p
                className="text-[#2D241E]/40 tracking-widest uppercase mb-1"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em", fontSize: "0.65rem" }}
              >
                My Account
              </p>
              <h1
                className="text-[#2D241E]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                  fontWeight: 400,
                  lineHeight: 1.2,
                }}
              >
                {displayName}
              </h1>
              <p
                className="text-[#2D241E]/50 mt-1"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
              >
                {displayEmail} · Member since January 2025
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-6 md:gap-10">
              {[
                { label: "Orders", value: MOCK_ORDERS.length.toString() },
                { label: "Wishlist", value: wishlist.length.toString() },
                { label: "Total Spent", value: `€${totalSpent.toLocaleString()}` },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
                  >
                    {stat.value}
                  </p>
                  <p
                    className="text-[#2D241E]/40 text-xs"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs */}
      <div
        className="sticky z-30"
        style={{
          top: "80px",
          backgroundColor: "rgba(245,242,237,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45,36,30,0.08)",
        }}
      >
        <div className="max-w-[1200px] mx-auto px-6 md:px-10">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {(["overview", "orders", "profile"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-5 relative whitespace-nowrap transition-colors duration-300"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.12em",
                  color: activeTab === tab ? "#2D241E" : "rgba(45,36,30,0.4)",
                }}
              >
                <span className="uppercase tracking-widest capitalize">{tab}</span>
                {activeTab === tab && (
                  <motion.div
                    layoutId="account-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "#4A0E0E" }}
                    transition={{ duration: 0.3, ease: easing }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <AnimatePresence mode="wait">
          {/* ── OVERVIEW ── */}
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                  { icon: <ShoppingBag size={20} />, label: "Total Orders", value: MOCK_ORDERS.length },
                  { icon: <CheckCircle2 size={20} />, label: "Delivered", value: deliveredCount },
                  { icon: <Heart size={20} />, label: "Wishlisted", value: wishlist.length },
                  { icon: <Star size={20} />, label: "Loyalty Points", value: "1,480" },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    className="rounded-[24px] p-6"
                    style={{ backgroundColor: "#EDE9E2" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.5, ease: easing }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(45,36,30,0.08)", color: "#4A0E0E" }}
                    >
                      {card.icon}
                    </div>
                    <p
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}
                    >
                      {card.value}
                    </p>
                    <p
                      className="text-[#2D241E]/50 text-xs mt-0.5"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}
                    >
                      {card.label}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="mb-8 flex items-center justify-between">
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
                >
                  Recent Orders
                </h2>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="flex items-center gap-2 text-[#2D241E]/50 hover:text-[#4A0E0E] transition-colors text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                >
                  <span className="uppercase tracking-widest">View all</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              <div className="space-y-3">
                {MOCK_ORDERS.slice(0, 3).map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>

              {/* Membership Banner */}
              <motion.div
                className="mt-10 rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6"
                style={{ backgroundColor: "#2D241E" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: easing }}
              >
                <div className="flex-1">
                  <p
                    className="text-white/50 tracking-widest uppercase mb-2"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em", fontSize: "0.65rem" }}
                  >
                    Membership Status
                  </p>
                  <h3
                    className="text-white mb-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
                  >
                    Gold Member
                  </h3>
                  <p
                    className="text-white/50"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", lineHeight: 1.6 }}
                  >
                    You have 1,480 loyalty points. Spend €520 more to reach Platinum status.
                  </p>
                </div>
                <div className="w-full md:w-48">
                  <div className="flex justify-between text-xs mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    <span className="text-white/50">Gold</span>
                    <span className="text-white/50">Platinum</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: "74%", backgroundColor: "#4A0E0E" }}
                    />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="mb-8 flex items-center justify-between">
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 400 }}
                >
                  Order History
                </h2>
                <span
                  className="text-[#2D241E]/40 text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {MOCK_ORDERS.length} orders
                </span>
              </div>

              <div className="space-y-3">
                {MOCK_ORDERS.map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === "profile" && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="grid md:grid-cols-2 gap-8">
                {/* Personal Information */}
                <div
                  className="rounded-[32px] p-8"
                  style={{ backgroundColor: "#EDE9E2" }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 400 }}
                    >
                      Personal Information
                    </h3>
                    <Edit3 size={15} style={{ color: "#2D241E", opacity: 0.4 }} />
                  </div>

                  <div className="space-y-5">
                    {[
                      { label: "Full Name", icon: <User size={14} />, key: "name" as const },
                      { label: "Email Address", icon: <Mail size={14} />, key: "email" as const },
                      { label: "Phone Number", icon: <Phone size={14} />, key: "phone" as const },
                    ].map((field) => (
                      <div key={field.key}>
                        <label
                          className="flex items-center gap-2 text-xs mb-2"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            letterSpacing: "0.12em",
                            color: "rgba(45,36,30,0.4)",
                          }}
                        >
                          {field.icon}
                          <span className="uppercase tracking-widest">{field.label}</span>
                        </label>
                        <input
                          type="text"
                          value={profileForm[field.key]}
                          onChange={(e) =>
                            setProfileForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          className="w-full bg-transparent border-0 border-b pb-2 focus:outline-none text-[#2D241E] transition-colors duration-300"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.9rem",
                            borderBottom: "1.5px solid rgba(45,36,30,0.15)",
                          }}
                          onFocus={(e) => (e.target.style.borderBottomColor = "#4A0E0E")}
                          onBlur={(e) => (e.target.style.borderBottomColor = "rgba(45,36,30,0.15)")}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Address */}
                <div
                  className="rounded-[32px] p-8"
                  style={{ backgroundColor: "#EDE9E2" }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <h3
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 400 }}
                    >
                      Default Address
                    </h3>
                    <Edit3 size={15} style={{ color: "#2D241E", opacity: 0.4 }} />
                  </div>

                  <div>
                    <label
                      className="flex items-center gap-2 text-xs mb-2"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.12em",
                        color: "rgba(45,36,30,0.4)",
                      }}
                    >
                      <MapPin size={14} />
                      <span className="uppercase tracking-widest">Shipping Address</span>
                    </label>
                    <textarea
                      value={profileForm.address}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, address: e.target.value }))
                      }
                      rows={3}
                      className="w-full bg-transparent border-0 border-b pb-2 focus:outline-none text-[#2D241E] resize-none transition-colors duration-300"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: "0.9rem",
                        borderBottom: "1.5px solid rgba(45,36,30,0.15)",
                        lineHeight: 1.7,
                      }}
                      onFocus={(e) => (e.target.style.borderBottomColor = "#4A0E0E")}
                      onBlur={(e) => (e.target.style.borderBottomColor = "rgba(45,36,30,0.15)")}
                    />
                  </div>

                  {/* Preferences */}
                  <div className="mt-8">
                    <p
                      className="text-[#2D241E]/40 text-xs mb-4 tracking-widest uppercase"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                    >
                      Email Preferences
                    </p>
                    <div className="space-y-3">
                      {[
                        { label: "New arrivals & collections", checked: true },
                        { label: "Order updates & shipping", checked: true },
                        { label: "Loyalty rewards & offers", checked: false },
                      ].map((pref) => (
                        <label key={pref.label} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{
                              border: pref.checked ? "none" : "1.5px solid rgba(45,36,30,0.2)",
                              backgroundColor: pref.checked ? "#2D241E" : "transparent",
                            }}
                          >
                            {pref.checked && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="#F5F2ED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span
                            className="text-sm text-[#2D241E]/70"
                            style={{ fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {pref.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Save & Danger Zone */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
                <button
                  onClick={handleSaveProfile}
                  className="px-10 py-4 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90 flex items-center gap-2"
                  style={{
                    backgroundColor: saveSuccess ? "#2D6A4F" : "#2D241E",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem",
                    letterSpacing: "0.15em",
                  }}
                >
                  {saveSuccess ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span className="uppercase tracking-widest">Saved!</span>
                    </>
                  ) : (
                    <span className="uppercase tracking-widest">Save Changes</span>
                  )}
                </button>

                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-6 py-4 rounded-full border transition-all duration-300 hover:border-[#4A0E0E] hover:text-[#4A0E0E]"
                  style={{
                    borderColor: "rgba(45,36,30,0.2)",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.78rem",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.5)",
                  }}
                >
                  <LogOut size={14} />
                  <span className="uppercase tracking-widest">Sign Out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
