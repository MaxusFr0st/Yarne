import { motion, AnimatePresence } from "motion/react";
import { X, Minus, Plus, ShoppingBag, ArrowRight } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";

export function CartDrawer() {
  const { cartItems, cartOpen, closeCart, removeFromCart, updateQuantity, cartTotal } = useApp();

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          {/* Blurred backdrop */}
          <motion.div
            className="fixed inset-0 z-50"
            style={{ backgroundColor: "rgba(45,36,30,0.3)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[480px] flex flex-col"
            style={{ backgroundColor: "#F5F2ED", boxShadow: "-24px 0 80px rgba(45,36,30,0.12)" }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-7 border-b border-[#2D241E]/10">
              <div>
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", fontWeight: 500 }}
                >
                  Your Bag
                </h2>
                <p
                  className="text-[#2D241E]/50 text-xs tracking-widest uppercase mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.15em" }}
                >
                  {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                </p>
              </div>
              <button
                onClick={closeCart}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors duration-200 text-[#2D241E]/70 hover:text-[#2D241E]"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
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
                      Your bag is empty
                    </p>
                    <p
                      className="text-[#2D241E]/50 mt-2 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Add something beautiful to begin.
                    </p>
                    <button
                      onClick={closeCart}
                      className="mt-8 px-8 py-3 rounded-full border border-[#2D241E]/30 text-[#2D241E] text-sm tracking-widest uppercase hover:bg-[#2D241E] hover:text-[#F5F2ED] transition-all duration-300"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                    >
                      Continue Shopping
                    </button>
                  </motion.div>
                ) : (
                  cartItems.map((item) => (
                    <motion.div
                      key={item.cartId}
                      className="flex gap-5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      {/* Image */}
                      <div className="w-24 h-32 rounded-2xl overflow-hidden flex-shrink-0 bg-[#EDE9E2]">
                        <ImageWithFallback
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <p
                            className="text-[#2D241E]"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.3 }}
                          >
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="w-3 h-3 rounded-full border border-[#2D241E]/20"
                              style={{ backgroundColor: item.colorHex }}
                            />
                            <span
                              className="text-[#2D241E]/60 text-xs"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {item.color} · Size {item.size}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {/* Qty Controls */}
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              className="w-7 h-7 rounded-full border border-[#2D241E]/20 flex items-center justify-center hover:border-[#2D241E]/60 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              className="text-[#2D241E] w-4 text-center text-sm"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              className="w-7 h-7 rounded-full border border-[#2D241E]/20 flex items-center justify-center hover:border-[#2D241E]/60 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span
                              className="text-[#2D241E]"
                              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem", fontWeight: 500 }}
                            >
                              €{(item.price * item.quantity).toLocaleString()}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.cartId)}
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
              <div className="px-8 py-7 border-t border-[#2D241E]/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-[#2D241E]/60 text-sm tracking-widest uppercase"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                  >
                    Subtotal
                  </span>
                  <span
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 500 }}
                  >
                    €{cartTotal.toLocaleString()}
                  </span>
                </div>
                <p
                  className="text-[#2D241E]/40 text-xs text-center"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Shipping & taxes calculated at checkout
                </p>
                <button
                  className="w-full py-4 rounded-full flex items-center justify-center gap-3 text-white transition-all duration-300 hover:opacity-90"
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", letterSpacing: "0.15em" }}
                >
                  <span className="uppercase tracking-widest">Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={closeCart}
                  className="w-full py-3 rounded-full border border-[#2D241E]/20 text-[#2D241E] text-sm uppercase tracking-widest hover:border-[#2D241E]/50 transition-colors duration-300"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
