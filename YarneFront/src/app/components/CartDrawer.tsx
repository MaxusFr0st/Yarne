import { motion, AnimatePresence } from "motion/react";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOverlay, useCart } from "../context/AppContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useLangNavigate } from "../i18n/useLangNavigate";
import { PriceTag } from "./PriceTag";
import { useLocale } from "../i18n/useLocale";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

export function CartDrawer() {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLangNavigate();
  const touchMobile = useTouchMobileLayout();
  const { cartOpen, closeCart } = useOverlay();
  const { cartItems, removeFromCart, updateQuantity, cartTotal, cartEurTotal } = useCart();
  useBodyScrollLock(cartOpen);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Blurred backdrop. Sized from the top rather than `inset-0`: a fixed element's
              `bottom: 0` resolves against the large viewport, which on iPhone still stops short of
              the screen bottom Safari's translucent bar renders through. svh + the bar strip
              (--browser-bar-b) reaches it, so the glass shows the dimmed backdrop, not the page. */}
          <motion.div
            className="fixed inset-x-0 top-0 z-50"
            style={{
              height: "calc(100svh + var(--browser-bar-b))",
              backgroundColor: touchMobile ? "rgba(45,36,30,0.45)" : "rgba(45,36,30,0.3)",
              backdropFilter: touchMobile ? "none" : "blur(8px)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
          />

          {/* Drawer: same sizing as the backdrop; the strip is bottom padding so the checkout
              actions sit above the bar instead of under its glass. */}
          <motion.div
            className="fixed top-0 right-0 z-50 w-full max-w-[480px] flex flex-col"
            style={{
              height: "calc(100svh + var(--browser-bar-b))",
              paddingBottom: "var(--browser-bar-b)",
              backgroundColor: "#F5F2ED",
              boxShadow: "-24px 0 80px rgba(45,36,30,0.12)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 md:px-8 md:py-7 border-b border-[#2D241E]/10">
              <div>
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.2rem, 5vw, 1.5rem)", fontWeight: 500 }}
                >
                  {t("cart.title")}
                </h2>
                <p
                  className="text-[#2D241E]/50 text-xs tracking-widest uppercase mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.15em" }}
                >
                  {t("cart.itemCount", { count: cartItems.length })}
                </p>
              </div>
              <button
                onClick={closeCart}
                aria-label={t("cart.closeDrawer")}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors duration-200 text-[#2D241E]/70 hover:text-[#2D241E]"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 md:px-8 md:py-6 md:space-y-6">
              <AnimatePresence>
                {cartItems.length === 0 ? (
                  <motion.div
                    key="empty"
                    className="flex flex-col items-center justify-center h-full py-24 text-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ShoppingBag size={48} strokeWidth={1} className="text-[#2D241E]/20 mb-6" />
                    <p
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}
                    >
                      {t("cart.emptyTitle")}
                    </p>
                    <p
                      className="text-[#2D241E]/50 mt-2 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {t("cart.emptySubtitle")}
                    </p>
                    <button
                      onClick={closeCart}
                      className="mt-8 px-8 py-3 rounded-full border border-[#2D241E]/30 text-[#2D241E] text-sm tracking-widest uppercase hover:bg-[#2D241E] hover:text-[#F5F2ED] transition-all duration-300"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                    >
                      {t("cart.continueShopping")}
                    </button>
                  </motion.div>
                ) : (
                  cartItems.map((item) => (
                    <motion.div
                      key={item.cartId}
                      className="flex gap-3 md:gap-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      {/* Image */}
                      <div className="w-16 h-20 md:w-24 md:h-32 rounded-xl md:rounded-2xl overflow-hidden flex-shrink-0 bg-[#EDE9E2]">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-0.5 md:py-1 min-w-0">
                        <div>
                          <p
                            className="text-[#2D241E] truncate"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(0.92rem, 3.6vw, 1.05rem)", fontWeight: 500, lineHeight: 1.3 }}
                          >
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-1 md:mt-1.5">
                            <span
                              className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-[#2D241E]/20 shrink-0"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            {item.furnitureColorHex ? (
                              <span
                                className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-[#2D241E]/20 shrink-0"
                                style={{ backgroundColor: item.furnitureColorHex }}
                              />
                            ) : null}
                            <span
                              className="text-[#2D241E]/60 text-xs truncate"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {item.color}
                              {item.furnitureColor ? ` · ${item.furnitureColor}` : ""}
                              {" · "}
                              {t("cart.size")} {item.size}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 md:mt-0">
                          {/* Qty Controls */}
                          <div className="flex items-center gap-2 md:gap-3">
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              className="w-6 h-6 md:w-7 md:h-7 rounded-full border border-[#2D241E]/20 flex items-center justify-center hover:border-[#2D241E]/60 transition-colors"
                            >
                              <Minus size={11} />
                            </button>
                            <span
                              className="text-[#2D241E] w-4 text-center text-sm"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className="w-6 h-6 md:w-7 md:h-7 rounded-full border border-[#2D241E]/20 flex items-center justify-center hover:border-[#2D241E]/60 transition-colors"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div className="flex items-center gap-2 md:gap-3">
                            <PriceTag
                              amount={item.price * item.quantity}
                              eurAmount={item.eurPrice != null ? item.eurPrice * item.quantity : null}
                              locale={locale}
                              variant="line"
                            />
                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              aria-label={t("cart.removeItem")}
                              className="text-[#2D241E]/30 hover:text-[#4A0E0E] transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="px-5 py-4 md:px-8 md:py-7 border-t border-[#2D241E]/10 space-y-3 md:space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[#2D241E]/60 text-sm tracking-widest uppercase"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                  >
                    {t("cart.subtotal")}
                  </span>
                  <PriceTag amount={cartTotal} eurAmount={cartEurTotal} locale={locale} variant="emphasis" withUnit />
                </div>
                <p
                  className="text-[#2D241E]/40 text-xs text-center"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t("cart.shippingTaxesCheckout")}
                </p>
                <button
                  onClick={() => {
                    closeCart();
                    navigate("/checkout");
                  }}
                  className="w-full py-3.5 md:py-4 rounded-full flex items-center justify-center gap-3 text-white transition-all duration-300 hover:opacity-90"
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", letterSpacing: "0.15em" }}
                >
                  <span className="uppercase tracking-widest">{t("cart.proceedToCheckout")}</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={closeCart}
                  className="w-full py-2.5 md:py-3 rounded-full border border-[#2D241E]/20 text-[#2D241E] text-sm uppercase tracking-widest hover:border-[#2D241E]/50 transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                >
                  {t("cart.continueShopping")}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
