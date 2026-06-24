import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { ArrowLeft, Heart, ChevronDown, ShoppingBag, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../i18n/useLocale";
import { formatPrice } from "../i18n/format";
import { useProduct, useProducts } from "../hooks/useProducts";
import { useApp } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ProductCard } from "../components/ProductCard";
import { LangLink } from "../i18n/LangLink";
import { MobileProductDetailView } from "../components/MobileProductDetailView";
import { MobileRelatedProducts } from "../components/MobileRelatedProducts";
import { resolveDisplayImages } from "../utils/variantImages";
import { resolveDisplayStock } from "../utils/variantStock";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import React from "react";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function ProductDetail() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const { product, loading } = useProduct(id);
  const { products } = useProducts();
  const related = products.filter((p) => p.id !== id).slice(0, 3);

  const [activeColor, setActiveColor] = useState(0);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeLace, setActiveLace] = useState(false);
  const [addedToBag, setAddedToBag] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  const colorScopedSizes = product
    ? Array.from(
        new Set([
          ...Object.keys(product.colors[activeColor]?.sizeImages ?? {}),
          ...Object.keys(product.colors[activeColor]?.laceVariants ?? {}),
        ])
      )
    : [];
  const displaySizes = colorScopedSizes.length > 0 ? colorScopedSizes : (product?.sizes ?? []);

  useEffect(() => {
    if (!product) return;
    if (displaySizes.length === 0) {
      setActiveSize(null);
      return;
    }
    if (!activeSize || !displaySizes.includes(activeSize)) {
      setActiveSize(displaySizes[0]);
    }
  }, [product, activeColor, activeSize, displaySizes]);

  useEffect(() => {
    if (!product) return;
    const seen = new Set<string>();
    for (const color of product.colors) {
      const urls = resolveDisplayImages(product, color, activeSize, activeLace);
      for (const src of urls) {
        const resolved = resolveMediaUrl(src);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        const img = new Image();
        img.src = resolved;
      }
    }
  }, [product, activeSize, activeLace]);

  if (loading) {
    return (
      <main className="min-h-[100svh] flex items-center justify-center" style={{ backgroundColor: "#F5F2ED" }}>
        <div className="w-8 h-8 border-2 border-[#2D241E]/30 border-t-[#2D241E] rounded-full animate-spin" />
      </main>
    );
  }

  if (!product) {
    return (
      <main
        className="min-h-[100svh] flex flex-col items-center justify-center"
        style={{ backgroundColor: "#F5F2ED" }}
      >
        <p
          className="text-[#2D241E]/50"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
        >
          Product not found.
        </p>
        <LangLink
          to="/collection"
          className="mt-6 text-[#2D241E] underline text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Back to collection
        </LangLink>
      </main>
    );
  }

  const isWishlisted = wishlist.includes(product.id);

  const selectedColor = product.colors[activeColor];
  const displayStock = resolveDisplayStock(selectedColor, activeSize, activeLace, product.stock);
  const images = resolveDisplayImages(product, selectedColor, activeSize, activeLace);
  const safeImageIndex = images.length ? Math.min(activeImage, images.length - 1) : 0;

  const handleColorChange = (i: number) => {
    setActiveColor(i);
    setActiveImage(0);
  };

  const handleLaceChange = (next: boolean) => {
    setActiveLace(next);
    setActiveImage(0);
  };

  const handleAddToBag = () => {
    if (!activeSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    if (displayStock <= 0) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      size: activeSize,
      quantity: 1,
      maxQuantity: displayStock,
      image: images[0] ?? selectedColor.image,
    });
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  const outOfStock = displayStock <= 0;

  return (
    <main className="overflow-x-hidden" style={{ backgroundColor: "#F5F2ED" }}>
      <MobileProductDetailView
        product={product}
        images={images}
        locale={locale}
        activeColor={activeColor}
        activeSize={activeSize}
        displaySizes={displaySizes}
        isWishlisted={isWishlisted}
        addedToBag={addedToBag}
        sizeError={sizeError}
        outOfStock={outOfStock}
        displayStock={displayStock}
        laceEnabled={product.lace === true}
        activeLace={activeLace}
        onLaceChange={handleLaceChange}
        onBack={() => navigate(-1)}
        onToggleWishlist={() => toggleWishlist(product.id)}
        onColorChange={handleColorChange}
        onSizeChange={(size) => { setActiveSize(size); setSizeError(false); }}
        onAddToBag={handleAddToBag}
      />

      {related.length > 0 && <MobileRelatedProducts products={related} />}

      {/* ── Desktop layout ── */}
      <div className="hidden md:block max-w-[1400px] mx-auto px-5 md:px-10 pt-24 pb-24">
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2D241E]/50 hover:text-[#2D241E] transition-colors duration-300 mb-5 group"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: easing }}
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="uppercase tracking-widest">Back</span>
        </motion.button>

        <div className="grid md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 md:gap-8 lg:gap-12 items-start mt-0">
          {/* Left: Image Gallery */}
          <motion.div
            className="w-full max-w-[335px] sm:max-w-[380px] mx-auto md:max-w-none md:mx-0 lg:max-w-[620px] lg:justify-self-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: easing }}
          >
            {/* Main Image */}
            <div className="relative rounded-[34px] sm:rounded-[40px] overflow-hidden bg-[#EDE9E2] h-[min(64svh,430px)] min-h-[320px] sm:min-h-[340px] md:h-[min(62svh,640px)] md:min-h-[440px] lg:h-[min(68svh,720px)] lg:min-h-[500px]">
              <AnimatePresence mode="wait">
                {images.length > 0 && (
                  <motion.div
                    key={`${activeColor}-${activeSize ?? ""}-${activeLace}-${safeImageIndex}`}
                    className="absolute inset-0"
                    initial={reduceMotion ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={reduceMotion ? undefined : { opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.28, ease: easing }}
                  >
                    <ImageWithFallback
                      src={images[safeImageIndex]}
                      alt={`${product.name} – ${product.colors[activeColor].name}`}
                      className="w-full h-full object-cover object-[center_25%]"
                      priority
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badges */}
              <div className="absolute top-5 left-5 flex gap-2">
                {product.isNew && (
                  <span
                    className="px-3 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em", fontSize: "0.65rem" }}
                  >
                    NEW
                  </span>
                )}
                {product.isBestseller && (
                  <span
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: "rgba(245,242,237,0.9)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", fontSize: "0.65rem" }}
                  >
                    BESTSELLER
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail strip (images for selected color) */}
            <div className="flex gap-2.5 sm:gap-3 mt-2.5 sm:mt-4">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className="flex-1 rounded-[16px] sm:rounded-[18px] overflow-hidden bg-[#EDE9E2] transition-all duration-300 ease-out cursor-pointer h-[64px] sm:h-[84px] md:h-[110px] lg:h-[124px] xl:h-[132px]"
                  style={{
                    opacity: safeImageIndex === i ? 1 : 0.45,
                    border: safeImageIndex === i ? "2px solid #2D241E" : "2px solid transparent",
                    transform: safeImageIndex === i ? "scale(1)" : "scale(0.98)",
                  }}
                >
                  <ImageWithFallback
                    src={img}
                    alt={`${product.colors[activeColor]?.name} - ${i + 1}`}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center center" }}
                  />
                </button>
              ))}
            </div>

          </motion.div>

          {/* Right: Product Info */}
          <motion.div
            className="flex flex-col gap-6 md:sticky md:top-[calc(var(--main-header-h)+24px)]"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: easing }}
          >
            {/* Category */}
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              {product.category}
            </p>

            {/* Name & Price */}
            <div>
              <h1
                className="text-[#2D241E]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 400, lineHeight: 1.15 }}
              >
                {product.name}
              </h1>
              <p
                className="text-[#2D241E]/60 mt-1"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
              >
                {product.subtitle}
              </p>
              <p
                className="text-[#2D241E] mt-3"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}
              >
                €{product.price}
              </p>
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  Colour
                </p>
                <p
                  className="text-[#2D241E]/60 text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={product.colors[activeColor].name}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.2, ease: easing }}
                    >
                      {product.colors[activeColor].name}
                    </motion.span>
                  </AnimatePresence>
                </p>
              </div>
              <div className="flex gap-3">
                {product.colors.map((color, i) => (
                  <motion.button
                    key={color.name}
                    onClick={() => handleColorChange(i)}
                    title={color.name}
                    className="cursor-pointer"
                    animate={{ scale: i === activeColor ? 1.08 : 1 }}
                    transition={{ duration: 0.22, ease: easing }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: color.hex,
                      border: i === activeColor ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                      boxShadow: i === activeColor ? "0 0 0 3px #F5F2ED, 0 0 0 5px #2D241E" : "none",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Lace Selection */}
            {product.lace === true && (
              <div>
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase mb-3"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  {t("product.lace.label", { defaultValue: "Lace" })}
                </p>
                <LayoutGroup id="desktop-lace">
                  <div
                    className="relative inline-flex p-1 rounded-full"
                    style={{ backgroundColor: "rgba(45,36,30,0.06)", border: "1px solid rgba(45,36,30,0.12)" }}
                  >
                    {[
                      { value: false, label: t("product.lace.withoutLace", { defaultValue: "Without lace" }) },
                      { value: true, label: t("product.lace.withLace", { defaultValue: "With lace" }) },
                    ].map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => handleLaceChange(opt.value)}
                        className="relative z-10 px-4 py-2 rounded-full text-xs cursor-pointer"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.08em",
                          color: activeLace === opt.value ? "#F5F2ED" : "#2D241E",
                          transition: "color 0.22s ease",
                        }}
                      >
                        {activeLace === opt.value && (
                          <motion.span
                            layoutId="desktop-lace-pill"
                            className="absolute inset-0 rounded-full bg-[#2D241E]"
                            style={{ zIndex: -1 }}
                            transition={{ duration: reduceMotion ? 0 : 0.28, ease: easing }}
                          />
                        )}
                        <span className="relative">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </LayoutGroup>
              </div>
            )}

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  Size
                </p>
                <button
                  className="text-[#2D241E]/50 text-xs hover:text-[#4A0E0E] transition-colors underline"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {displaySizes.map((size) => (
                  <motion.button
                    key={size}
                    onClick={() => { setActiveSize(size); setSizeError(false); }}
                    className="min-w-[52px] py-2.5 rounded-full text-xs cursor-pointer"
                    animate={{ scale: activeSize === size ? 1.03 : 1 }}
                    transition={{ duration: 0.2, ease: easing }}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "0.08em",
                      backgroundColor: activeSize === size ? "#2D241E" : "transparent",
                      color: activeSize === size ? "#F5F2ED" : "#2D241E",
                      border: activeSize === size
                        ? "1.5px solid #2D241E"
                        : sizeError
                        ? "1.5px solid rgba(74,14,14,0.5)"
                        : "1.5px solid rgba(45,36,30,0.2)",
                      transition: "background-color 0.22s ease, color 0.22s ease, border-color 0.22s ease",
                    }}
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence>
                {sizeError && (
                  <motion.p
                    className="text-[#4A0E0E] text-xs mt-2"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    Please select a size to continue.
                  </motion.p>
                )}
              </AnimatePresence>
              {typeof displayStock === "number" && (
                <p
                  className="text-[#2D241E]/55 text-xs mt-2"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  In stock: {displayStock}
                </p>
              )}
            </div>

            {/* Add to Bag */}
            <div className="flex gap-3">
              <motion.button
                onClick={handleAddToBag}
                disabled={outOfStock}
                className="flex-1 py-4 rounded-full flex items-center justify-center gap-3 text-white transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: outOfStock ? "#9A9088" : addedToBag ? "#2D5928" : "#2D241E",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.14em",
                }}
                whileTap={{ scale: 0.98 }}
              >
                {addedToBag ? (
                  <>
                    <Check size={15} />
                    <span className="uppercase tracking-widest">Added to Bag</span>
                  </>
                ) : (
                  <>
                    <ShoppingBag size={15} strokeWidth={1.5} />
                    <span className="uppercase tracking-widest">
                      {outOfStock ? "Out of stock" : "Add to Bag"}
                    </span>
                  </>
                )}
              </motion.button>

              <button
                onClick={() => toggleWishlist(product.id)}
                className="w-14 h-14 rounded-full border flex items-center justify-center transition-all duration-300"
                style={{
                  borderColor: isWishlisted ? "#4A0E0E" : "rgba(45,36,30,0.2)",
                  backgroundColor: isWishlisted ? "#4A0E0E" : "transparent",
                }}
              >
                <Heart
                  size={17}
                  strokeWidth={1.5}
                  fill={isWishlisted ? "white" : "none"}
                  stroke={isWishlisted ? "white" : "#2D241E"}
                />
              </button>
            </div>

            {/* Description */}
            <div className="border-t border-[#2D241E]/10 pt-7">
              <p
                className="text-[#2D241E]/70 leading-relaxed"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", lineHeight: 1.8 }}
              >
                {product.description}
              </p>
            </div>

            {/* Details Accordion */}
            <div className="border-t border-[#2D241E]/10">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between py-5 text-left group"
              >
                <span
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  Product Details
                </span>
                <motion.div animate={{ rotate: detailsOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <ChevronDown size={16} className="text-[#2D241E]/50" />
                </motion.div>
              </button>
              <AnimatePresence>
                {detailsOpen && (
                  <motion.ul
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: easing }}
                    className="overflow-hidden pb-5 space-y-2"
                  >
                    {product.details.map((detail) => (
                      <li
                        key={detail}
                        className="flex items-start gap-3 text-[#2D241E]/60 text-sm"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-[#4A0E0E] flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>

            {/* Shipping info */}
            <div
              className="rounded-[20px] p-5"
              style={{ backgroundColor: "#EDE9E2" }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p
                    className="text-[#2D241E] text-xs tracking-widest uppercase mb-1"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                  >
                    Complimentary Shipping
                  </p>
                  <p
                    className="text-[#2D241E]/50 text-xs"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Free delivery on all orders over €200. Returns accepted within 30 days.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="hidden md:block px-5 md:px-10 max-w-[1400px] mx-auto mt-24 pb-24 overflow-x-hidden">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div>
              <p
                className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-2"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
              >
                You may also like
              </p>
              <h2
                className="text-[#2D241E]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400 }}
              >
                Complete the wardrobe
              </h2>
            </div>
            <LangLink
              to="/collection"
              className="hidden md:flex items-center gap-2 text-[#2D241E]/50 hover:text-[#4A0E0E] text-xs transition-colors uppercase tracking-widest"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
            >
              View all
            </LangLink>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} size="small" />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
