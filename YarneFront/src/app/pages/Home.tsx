import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Link } from "react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HERO_IMAGES, EDITORIAL_IMG, LOOKBOOK_IMG } from "../data/products";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { BestSellersCarousel } from "../components/BestSellersCarousel";
import { ImageWithFallback as Img } from "../components/figma/ImageWithFallback";
import {
  DEFAULT_FEATURED_TITLE,
  DEFAULT_MORE_FROM_COLLECTION_TITLE,
  getHomeSectionsSelection,
} from "../utils/homeSectionsSelection";

const easing = [0.25, 0.1, 0.25, 1] as const;

// Animated text reveal
function RevealText({ children, delay = 0, className = "", style = {} }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease: easing }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const editorialRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const { scrollYProgress: editorialScroll } = useScroll({
    target: editorialRef,
    offset: ["start end", "end start"],
  });

  // Parallax transforms
  const heroY = useTransform(heroScroll, [0, 1], ["0%", "30%"]);
  const heroScale = useTransform(heroScroll, [0, 1], [1, 1.1]);
  const editorialY1 = useTransform(editorialScroll, [0, 1], ["0%", "-12%"]);

  const { products } = useProducts();
  const [homeSectionsSelection, setHomeSectionsSelection] = useState(getHomeSectionsSelection);

  useEffect(() => {
    const syncSelection = () => setHomeSectionsSelection(getHomeSectionsSelection());
    syncSelection();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", syncSelection);
    return () => window.removeEventListener("storage", syncSelection);
  }, []);

  const featured = useMemo(() => {
    const selected = homeSectionsSelection.featuredProductCodes
      .map((code) => products.find((product) => product.id === code))
      .filter((product): product is (typeof products)[number] => Boolean(product));
    return selected.length > 0 ? selected : products.slice(0, 4);
  }, [homeSectionsSelection.featuredProductCodes, products]);

  const moreFromCollectionProducts = useMemo(() => {
    const selected = homeSectionsSelection.moreFromCollectionProductCodes
      .map((code) => products.find((product) => product.id === code))
      .filter((product): product is (typeof products)[number] => Boolean(product));
    return selected.length > 0 ? selected : products.slice(3);
  }, [homeSectionsSelection.moreFromCollectionProductCodes, products]);

  return (
    <main className="relative" style={{ backgroundColor: "#F5F2ED", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ═══════════════════════════════
          HERO SECTION
      ═══════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative h-screen min-h-[640px] flex items-end overflow-hidden"
      >
        {/* Parallax background */}
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={{ y: heroY, scale: heroScale }}
        >
          <Img
            src={HERO_IMAGES[0]}
            alt="Yarné Hero"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.1) 60%, transparent 100%)" }}
          />
        </motion.div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 md:px-10 pb-16 md:pb-24 w-full">
          <div className="max-w-3xl">
            <motion.p
              className="text-white/70 tracking-widest uppercase text-xs mb-6"
              style={{ letterSpacing: "0.25em", fontFamily: "'DM Sans', sans-serif" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: easing }}
            >
              New Collection — Spring 2026
            </motion.p>
            <motion.h1
              className="text-white"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
                fontWeight: 400,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: easing }}
            >
              Woven in<br />
              <em style={{ fontStyle: "italic", fontWeight: 300 }}>quiet luxury</em>
            </motion.h1>
            <motion.p
              className="text-white/65 mt-6 max-w-md text-base"
              style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6, ease: easing }}
            >
              Timeless knitwear crafted from the world's finest fibres. Each piece is made to outlast every season.
            </motion.p>
            <motion.div
              className="flex flex-wrap gap-4 mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.75, ease: easing }}
            >
              <Link
                to="/collection"
                className="flex items-center gap-3 px-8 py-4 rounded-full text-[#2D241E] bg-[#F5F2ED] hover:bg-white transition-all duration-300 group"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", letterSpacing: "0.15em" }}
              >
                <span className="uppercase tracking-widest">Explore Collection</span>
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                to="/collection?filter=new"
                className="flex items-center gap-3 px-8 py-4 rounded-full text-white border border-white/30 hover:border-white/60 transition-all duration-300"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem", letterSpacing: "0.15em" }}
              >
                <span className="uppercase tracking-widest">New Arrivals</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Scroll cue */}
        <motion.div
          className="absolute bottom-8 right-10 hidden md:flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <span
            className="text-white/50 text-xs tracking-widest uppercase"
            style={{ writingMode: "vertical-rl", letterSpacing: "0.2em", fontFamily: "'DM Sans', sans-serif" }}
          >
            Scroll
          </span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          >
            <ChevronDown size={18} className="text-white/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════
          BRAND STRIP
      ═══════════════════════════════ */}
      <section className="py-16 border-y border-[#2D241E]/8">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-10 md:gap-20">
            {[
              { label: "Yarn Origins", value: "Scotland, Italy & Peru" },
              { label: "Crafted Since", value: "2011" },
              { label: "Materials", value: "100% Natural Fibres" },
              { label: "Carbon Neutral", value: "Since 2023" },
            ].map((item, i) => (
              <RevealText key={item.label} delay={i * 0.08} className="text-center">
                <p
                  className="text-[#2D241E]/40 text-xs tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
                >
                  {item.label}
                </p>
                <p
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 500 }}
                >
                  {item.value}
                </p>
              </RevealText>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
          BEST SELLERS CAROUSEL
      ═══════════════════════════════ */}
      <BestSellersCarousel />

      {/* ═══════════════════════════════
          FEATURED PRODUCTS
      ═══════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-8 md:px-10">
          <div className="flex items-end justify-between mb-12 md:mb-16">
            <RevealText>
              <p
                className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-3"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
              >
                Curated Pieces
              </p>
              <h2
                className="text-[#2D241E]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 400, lineHeight: 1.2 }}
              >
                {homeSectionsSelection.featuredTitle || DEFAULT_FEATURED_TITLE}
              </h2>
            </RevealText>
            <RevealText delay={0.1}>
              <Link
                to="/collection"
                className="hidden md:flex items-center gap-2 text-[#2D241E]/60 hover:text-[#4A0E0E] transition-colors duration-300 group"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
              >
                <span className="uppercase tracking-widest">View all</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </RevealText>
          </div>

          {/* Uniform 4-column grid – Desktop */}
          <div className="hidden md:grid grid-cols-4 gap-6">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          {/* Mobile: 1 column for better card display */}
          <div className="md:hidden grid grid-cols-1 gap-y-8 max-w-sm mx-auto">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          {/* Shop All CTA */}
          <RevealText delay={0.2} className="flex justify-center mt-14">
            <Link
              to="/collection"
              className="group flex items-center gap-3 px-10 py-5 rounded-full transition-all duration-400 hover:gap-4"
              style={{
                backgroundColor: "#2D241E",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.78rem",
                letterSpacing: "0.15em",
                color: "#F5F2ED",
              }}
            >
              <span className="uppercase tracking-widest">Shop All {products.length} Pieces</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          </RevealText>

          <div className="md:hidden flex justify-center mt-4">
            <Link
              to="/collection"
              className="px-8 py-4 rounded-full border border-[#2D241E]/25 text-[#2D241E] text-sm hover:bg-[#2D241E] hover:text-[#F5F2ED] transition-all duration-300"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
            >
              <span className="uppercase tracking-widest">View All</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
          EDITORIAL SECTION
      ═══════════════════════════════ */}
      <section ref={editorialRef} className="relative py-20 md:py-28 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-center">
            {/* Image with parallax */}
            <RevealText className="relative">
              <div className="relative rounded-[40px] overflow-hidden" style={{ aspectRatio: "4/5" }}>
                <motion.div className="absolute inset-0 will-change-transform" style={{ y: editorialY1 }}>
                  <Img
                    src={EDITORIAL_IMG}
                    alt="Our Craft"
                    className="w-full h-[115%] object-cover"
                  />
                </motion.div>
              </div>
              {/* Floating stat */}
              <motion.div
                className="absolute -right-4 md:-right-10 bottom-16 rounded-[24px] p-6 shadow-2xl"
                style={{ backgroundColor: "#F5F2ED", minWidth: "160px" }}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4, ease: easing }}
              >
                <p
                  className="text-[#4A0E0E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2.5rem", fontWeight: 400, lineHeight: 1 }}
                >
                  15+
                </p>
                <p
                  className="text-[#2D241E]/50 text-xs mt-1"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Years of craft
                </p>
              </motion.div>
            </RevealText>

            {/* Text */}
            <div className="flex flex-col justify-center gap-8">
              <RevealText delay={0.1}>
                <p
                  className="text-[#2D241E]/40 tracking-widest uppercase text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
                >
                  Our Philosophy
                </p>
              </RevealText>
              <RevealText delay={0.15}>
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, lineHeight: 1.2 }}
                >
                  Every stitch tells<br />a longer story
                </h2>
              </RevealText>
              <RevealText delay={0.2}>
                <p
                  className="text-[#2D241E]/60"
                  style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8, fontSize: "0.95rem" }}
                >
                  We source our yarns from family mills in the Scottish Highlands, the Peruvian altiplano, and the foothills of the Italian Alps. Each fibre is selected for its provenance, its handle, and its longevity.
                </p>
              </RevealText>
              <RevealText delay={0.25}>
                <p
                  className="text-[#2D241E]/60"
                  style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8, fontSize: "0.95rem" }}
                >
                  A Yarné piece is not designed for one season. It is designed to be worn, reworn, and passed on — a small act of resistance against disposable fashion.
                </p>
              </RevealText>
              <RevealText delay={0.3}>
                <Link
                  to="/about"
                  className="self-start flex items-center gap-3 group"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.15em", color: "#2D241E" }}
                >
                  <span className="uppercase tracking-widest border-b border-[#2D241E]/40 pb-0.5 group-hover:border-[#4A0E0E] group-hover:text-[#4A0E0E] transition-all duration-300">
                    Our Story
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300 group-hover:text-[#4A0E0E]" />
                </Link>
              </RevealText>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════
          FULL-WIDTH BANNER
      ═══════════════════════════════ */}
      <section className="relative py-0 overflow-hidden" style={{ height: "60vh", minHeight: "400px" }}>
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <Img
            src={LOOKBOOK_IMG}
            alt="Lookbook"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(120deg, rgba(10,17,40,0.75) 0%, rgba(10,17,40,0.2) 100%)" }}
          />
        </motion.div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <RevealText>
            <p
              className="text-white/60 tracking-widest uppercase text-xs mb-5"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.25em" }}
            >
              Lookbook — Winter 2026
            </p>
          </RevealText>
          <RevealText delay={0.1}>
            <h2
              className="text-white mb-8"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(2rem, 5vw, 4rem)", fontWeight: 300, lineHeight: 1.15 }}
            >
              The art of dressing<br />for yourself
            </h2>
          </RevealText>
          <RevealText delay={0.2}>
            <Link
              to="/collection"
              className="px-10 py-4 rounded-full border border-white/40 text-white hover:bg-white hover:text-[#2D241E] transition-all duration-400"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest">View Lookbook</span>
            </Link>
          </RevealText>
        </div>
      </section>

      {/* ═══════════════════════════════
          REST OF COLLECTION PREVIEW
      ═══════════════════════════════ */}
      <section className="py-20 md:py-28">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <RevealText className="text-center mb-16">
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              Complete the look
            </p>
            <h2
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 400 }}
            >
              {homeSectionsSelection.moreFromCollectionTitle || DEFAULT_MORE_FROM_COLLECTION_TITLE}
            </h2>
          </RevealText>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 md:gap-8 max-w-sm md:max-w-none mx-auto md:mx-0">
            {moreFromCollectionProducts.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} size="collection" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}