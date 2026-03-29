import { useState } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";

const DEFAULT_CATEGORIES = ["All", "Sweaters", "Cardigans", "Vests", "Jackets"];
const SORT_OPTIONS = ["Featured", "Price: Low to High", "Price: High to Low", "Newest"];

const easing = [0.25, 0.1, 0.25, 1] as const;

export function Collection() {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeSort, setActiveSort] = useState("Featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);

  const { products } = useProducts(filterParam === "new" ? { isNew: true } : undefined);
  const categories = [
    "All",
    ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
  ];
  const CATEGORIES = categories.length > 1 ? categories : DEFAULT_CATEGORIES;
  let filtered = products;
  if (filterParam === "new") filtered = filtered.filter((p) => p.isNew);
  if (activeCategory !== "All") filtered = filtered.filter((p) => p.category === activeCategory);

  // Sort
  if (activeSort === "Price: Low to High") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (activeSort === "Price: High to Low") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  }

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      {/* Header Banner */}
      <section className="pt-40 pb-16 md:pt-48 md:pb-20">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: easing }}
          >
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              {filterParam === "new" ? "New Arrivals" : "The Collection"}
            </p>
            <h1
              className="text-[#2D241E]"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              {filterParam === "new" ? (
                <>New <em style={{ fontStyle: "italic", fontWeight: 300 }}>Arrivals</em></>
              ) : (
                <>The <em style={{ fontStyle: "italic", fontWeight: 300 }}>Knit Gallery</em></>
              )}
            </h1>
            <p
              className="text-[#2D241E]/50 mt-4 max-w-lg"
              style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
            >
              {filtered.length} {filtered.length === 1 ? "piece" : "pieces"} — crafted from the world's finest natural fibres
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filter Bar */}
      <div className="sticky top-[calc(60px+max(env(safe-area-inset-top),12px))] md:top-24 z-30 border-y border-[#2D241E]/10" style={{ backgroundColor: "rgba(245,242,237,0.95)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between py-4 gap-4 overflow-x-auto scrollbar-hide">
            {/* Categories */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-5 py-2 rounded-full text-xs transition-all duration-300 whitespace-nowrap"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.1em",
                    backgroundColor: activeCategory === cat ? "#2D241E" : "transparent",
                    color: activeCategory === cat ? "#F5F2ED" : "#2D241E",
                    border: activeCategory === cat ? "1.5px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Sort */}
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value)}
                className="bg-transparent border border-[#2D241E]/20 rounded-full px-4 py-2 text-xs text-[#2D241E] focus:outline-none focus:border-[#2D241E]/50 cursor-pointer"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em" }}
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Filter toggle */}
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#2D241E]/20 hover:border-[#2D241E]/50 transition-colors text-[#2D241E]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em" }}
              >
                <SlidersHorizontal size={13} />
                <span className="uppercase tracking-widest hidden sm:inline">Filter</span>
              </button>
            </div>
          </div>

          {/* Expanded Filter Panel */}
          {filterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: easing }}
              className="border-t border-[#2D241E]/10 py-6"
            >
              <div className="flex flex-wrap gap-8 items-start">
                {/* Price Range */}
                <div>
                  <p
                    className="text-[#2D241E]/50 text-xs tracking-widest uppercase mb-3"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.16em" }}
                  >
                    Price Range
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[#2D241E] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      €{priceRange[0]}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-32 accent-[#4A0E0E]"
                    />
                    <span className="text-[#2D241E] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      €{priceRange[1]}
                    </span>
                  </div>
                </div>

                {/* New Only */}
                <div>
                  <p
                    className="text-[#2D241E]/50 text-xs tracking-widest uppercase mb-3"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.16em" }}
                  >
                    Availability
                  </p>
                  <div className="flex gap-2">
                    {["All Items", "New Only", "Bestsellers"].map((opt) => (
                      <button
                        key={opt}
                        className="px-4 py-1.5 rounded-full text-xs border border-[#2D241E]/20 text-[#2D241E] hover:border-[#2D241E]/50 transition-colors"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setFilterOpen(false)}
                  className="ml-auto flex items-center gap-2 text-[#2D241E]/50 hover:text-[#2D241E] transition-colors text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <X size={13} />
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-[1400px] mx-auto px-8 md:px-10 py-16 md:py-20">
        {filtered.length === 0 ? (
          <motion.div
            className="text-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p
              className="text-[#2D241E]/40"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
            >
              No pieces found in this selection.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Desktop: uniform 3-column grid */}
            <div className="hidden md:grid grid-cols-3 gap-6 md:gap-8">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} size="collection" />
              ))}
            </div>

            {/* Mobile: 1-column layout for better card display */}
            <div className="md:hidden grid grid-cols-1 gap-y-8 max-w-sm mx-auto">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} size="collection" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom CTA */}
      <section className="pb-24 text-center">
        <div className="max-w-[1400px] mx-auto px-6">
          <motion.div
            className="inline-block rounded-[40px] p-12 md:p-16"
            style={{ backgroundColor: "#EDE9E2" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: easing }}
          >
            <p
              className="text-[#2D241E]/50 tracking-widest uppercase text-xs mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              Can't decide?
            </p>
            <p
              className="text-[#2D241E] mb-6"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 400 }}
            >
              Book a personal styling session
            </p>
            <p
              className="text-[#2D241E]/50 max-w-sm mx-auto mb-8 text-sm"
              style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}
            >
              Our stylists can help you find the perfect piece for your wardrobe, lifestyle and body shape.
            </p>
            <button
              className="px-10 py-4 rounded-full text-white transition-all duration-300 hover:opacity-90"
              style={{
                backgroundColor: "#4A0E0E",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.75rem",
                letterSpacing: "0.15em",
              }}
            >
              <span className="uppercase tracking-widest">Book a Consultation</span>
            </button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}