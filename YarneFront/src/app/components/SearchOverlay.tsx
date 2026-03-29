import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { useStore } from "../store/StoreContext";
import { products } from "../data/products";

export function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.length > 1
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase()) ||
          p.material.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuery("");
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [setSearchOpen]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          key="search-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(245,242,237,0.97)", backdropFilter: "blur(20px)" }}
        >
          <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full px-6 py-20">
            {/* Close */}
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-[#2D241E]/8 transition-colors text-[#2D241E]"
            >
              <X size={22} strokeWidth={1.5} />
            </button>

            <motion.p
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-[#2D241E]/40 mb-4"
              style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", letterSpacing: "0.15em" }}
            >
              SEARCH
            </motion.p>

            {/* Search input */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="flex items-center gap-4 pb-4"
              style={{ borderBottom: "1.5px solid rgba(45,36,30,0.2)" }}
            >
              <Search size={22} strokeWidth={1} className="text-[#2D241E]/40 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pieces, materials, colours…"
                className="flex-1 bg-transparent outline-none text-[#2D241E] placeholder-[#2D241E]/30"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "28px",
                  fontWeight: 300,
                }}
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="text-[#2D241E]/30 hover:text-[#2D241E] transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </motion.div>

            {/* Results */}
            <div className="mt-8 flex-1 overflow-y-auto">
              {query.length <= 1 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p
                    className="text-[#2D241E]/40 mb-5"
                    style={{ fontFamily: "'Inter', sans-serif", fontSize: "11px", letterSpacing: "0.12em" }}
                  >
                    POPULAR SEARCHES
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["Cashmere", "Cardigans", "Sweaters", "Accessories", "New Arrivals", "Sale"].map(
                      (tag) => (
                        <button
                          key={tag}
                          onClick={() => setQuery(tag)}
                          className="px-4 py-2 rounded-full border border-[#2D241E]/15 text-[#2D241E] hover:bg-[#2D241E] hover:text-[#F5F2ED] transition-all duration-300"
                          style={{ fontFamily: "'Inter', sans-serif", fontSize: "13px" }}
                        >
                          {tag}
                        </button>
                      )
                    )}
                  </div>
                </motion.div>
              ) : results.length === 0 ? (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[#2D241E]/50"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}
                >
                  No results for "{query}"
                </motion.p>
              ) : (
                <div className="space-y-4">
                  {results.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                    >
                      <Link
                        to={`/product/${product.id}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[#2D241E]/5 transition-colors group"
                      >
                        <div className="w-14 h-14 rounded-[14px] overflow-hidden bg-[#EDE8E0] shrink-0">
                          <img
                            src={product.variants[0].image}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="flex-1">
                          <p
                            className="text-[#2D241E]"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                          >
                            {product.name}
                          </p>
                          <p
                            className="text-[#2D241E]/45"
                            style={{ fontFamily: "'Inter', sans-serif", fontSize: "12px" }}
                          >
                            {product.category} · £{product.price}
                          </p>
                        </div>
                        <ArrowRight
                          size={16}
                          strokeWidth={1.5}
                          className="text-[#2D241E]/30 group-hover:text-[#4A0E0E] transition-colors"
                        />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
