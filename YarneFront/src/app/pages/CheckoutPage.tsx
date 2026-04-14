import { useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Package, ShoppingBag } from "lucide-react";
import { createOrder, type OrderDto } from "../api/orders";
import { useApp, type CartItem } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const easing = [0.25, 0.1, 0.25, 1] as const;

function toDisplayDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CheckoutPage() {
  const { cartItems, cartTotal, isLoggedIn, user, openLogin, clearCart } = useApp();
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<OrderDto | null>(null);
  const [orderSnapshot, setOrderSnapshot] = useState<CartItem[]>([]);

  const shipping = useMemo(() => (cartTotal >= 200 ? 0 : 15), [cartTotal]);
  const grandTotal = useMemo(() => cartTotal + shipping, [cartTotal, shipping]);
  const activeItems = placedOrder ? orderSnapshot : cartItems;

  const placeOrder = async () => {
    if (!isLoggedIn || cartItems.length === 0 || placingOrder) return;
    setPlacingOrder(true);
    setError(null);
    const snapshot = [...cartItems];
    setOrderSnapshot(snapshot);

    try {
      const order = await createOrder({
        items: snapshot.map((item) => ({
          productIdOrCode: item.productId,
          quantity: item.quantity,
        })),
      });
      setPlacedOrder(order);
      clearCart();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to place order right now.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F5F2ED", paddingTop: "120px" }}>
        <motion.div
          className="w-full max-w-[520px] rounded-[32px] p-10 text-center"
          style={{ border: "1px solid rgba(45,36,30,0.1)", backgroundColor: "rgba(245,242,237,0.85)" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
        >
          <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
            <ShoppingBag size={26} className="text-[#2D241E]/70" />
          </div>
          <h1 className="text-[#2D241E] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400 }}>
            Sign in to checkout
          </h1>
          <p className="text-[#2D241E]/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
            Log in to review your order details and place your order.
          </p>
          <button
            onClick={openLogin}
            className="w-full py-4 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.13em" }}
          >
            Open Login
          </button>
          <Link to="/collection" className="inline-block mt-4 text-[#2D241E]/50 hover:text-[#4A0E0E] transition-colors" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
            Back to collection
          </Link>
        </motion.div>
      </main>
    );
  }

  if (cartItems.length === 0 && !placedOrder) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#F5F2ED", paddingTop: "120px" }}>
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
            Your bag is empty
          </h1>
          <p className="text-[#2D241E]/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}>
            Add pieces to your bag to review checkout details.
          </p>
          <Link
            to="/collection"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 hover:opacity-90"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.13em" }}
          >
            <span>Go Shopping</span>
            <ArrowRight size={15} />
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      <section className="pt-32 pb-12 md:pt-40 md:pb-14" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
        <div className="max-w-[1300px] mx-auto px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easing }}
          >
            <p className="text-[#2D241E]/40 uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", letterSpacing: "0.15em" }}>
              Checkout
            </p>
            <h1 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 400 }}>
              Review your order
            </h1>
            <p className="text-[#2D241E]/50 mt-2" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
              {placedOrder
                ? `Order #${placedOrder.id} was placed successfully.`
                : `${user?.name ?? "Customer"}, confirm all details before placing your order.`}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-[1300px] mx-auto px-6 md:px-10 py-10 md:py-14 grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easing }}
          className="rounded-[30px] p-6 md:p-8"
          style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(245,242,237,0.8)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.7rem", fontWeight: 400 }}>
              Order details
            </h2>
            <span className="text-[#2D241E]/45 uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
              {activeItems.length} items
            </span>
          </div>

          <div className="space-y-4">
            {activeItems.map((item) => (
              <div
                key={item.cartId}
                className="rounded-[22px] p-4 md:p-5 flex gap-4"
                style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(45,36,30,0.02)" }}
              >
                <div className="w-20 h-24 rounded-[16px] overflow-hidden bg-[#EDE9E2] flex-shrink-0">
                  <ImageWithFallback src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.08rem", fontWeight: 500 }}>
                      {item.name}
                    </p>
                    <p className="text-[#2D241E]/55 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {item.color} · Size {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                  <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 500 }}>
                    €{(item.price * item.quantity).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-5 text-sm text-[#4A0E0E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </p>
          )}
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: easing }}
          className="rounded-[30px] p-6 md:p-8 h-fit lg:sticky lg:top-28"
          style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "#EDE9E2" }}
        >
          <h3 className="text-[#2D241E] mb-5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}>
            Summary
          </h3>

          <div className="space-y-3 pb-5 border-b border-[#2D241E]/10">
            <div className="flex items-center justify-between text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="text-[#2D241E]/60">Subtotal</span>
              <span className="text-[#2D241E]">€{cartTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span className="text-[#2D241E]/60">Shipping</span>
              <span className="text-[#2D241E]">{shipping === 0 ? "Free" : `€${shipping.toLocaleString()}`}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[#2D241E]/70 uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                Total
              </span>
              <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 500 }}>
                €{grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {placedOrder ? (
            <div className="mt-6">
              <div className="rounded-[20px] p-4 mb-4" style={{ backgroundColor: "rgba(45,106,79,0.08)" }}>
                <div className="flex items-center gap-2 text-[#2D6A4F] mb-1" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}>
                  <CheckCircle2 size={15} />
                  Order placed
                </div>
                <p className="text-[#2D241E]/70 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  #{placedOrder.id} · {toDisplayDate(placedOrder.orderDate)}
                </p>
              </div>
              <div className="space-y-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                <p className="text-[#2D241E]/70">Status: <span className="text-[#2D241E]">{placedOrder.status}</span></p>
                <p className="text-[#2D241E]/70">Payment: <span className="text-[#2D241E]">{placedOrder.paymentMethodName}</span></p>
                <p className="text-[#2D241E]/70">Items in order: <span className="text-[#2D241E]">{placedOrder.items.length}</span></p>
              </div>
              <Link
                to="/account"
                className="mt-6 inline-flex items-center gap-2 text-[#4A0E0E] hover:opacity-80 transition-opacity text-sm"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                View in account
                <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <button
              onClick={placeOrder}
              disabled={placingOrder || cartItems.length === 0}
              className="mt-6 w-full py-4 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 disabled:opacity-60"
              style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.14em" }}
            >
              {placingOrder ? "Placing order..." : "Place order"}
            </button>
          )}
        </motion.aside>
      </div>
    </main>
  );
}
