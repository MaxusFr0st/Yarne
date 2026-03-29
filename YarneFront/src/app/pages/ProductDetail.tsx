import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Heart, Share2, ChevronDown, ShoppingBag, Check } from "lucide-react";
import { useProduct, useProducts } from "../hooks/useProducts";
import { useApp } from "../context/AppContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ProductCard } from "../components/ProductCard";
import React from "react";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, wishlist, toggleWishlist } = useApp();
  const { product, loading } = useProduct(id);
  const { products } = useProducts();
  const related = products.filter((p) => p.id !== id).slice(0, 3);

  const [activeColor, setActiveColor] = useState(0);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [addedToBag, setAddedToBag] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);

  const colorScopedSizes = product
    ? Object.keys(product.colors[activeColor]?.sizeImages ?? {})
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

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5F2ED" }}>
        <div className="w-8 h-8 border-2 border-[#2D241E]/30 border-t-[#2D241E] rounded-full animate-spin" />
      </main>
    );
  }

  if (!product) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: "#F5F2ED" }}
      >
        <p
          className="text-[#2D241E]/50"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
        >
          Product not found.
        </p>
        <Link
          to="/collection"
          className="mt-6 text-[#2D241E] underline text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Back to collection
        </Link>
      </main>
    );
  }

  const isWishlisted = wishlist.includes(product.id);

  const selectedColor = product.colors[activeColor];
  const sizeScopedImages = activeSize ? selectedColor?.sizeImages?.[activeSize] ?? [] : [];
  const selectedSizeStock = activeSize ? selectedColor?.sizeStocks?.[activeSize] : undefined;
  const displayStock = typeof selectedSizeStock === "number" ? selectedSizeStock : product.stock;
  const images = (sizeScopedImages.length
    ? sizeScopedImages
    : selectedColor?.images?.length
      ? selectedColor.images
      : selectedColor?.image
        ? [selectedColor.image]
        : []) as string[];
  const safeImageIndex = images.length ? Math.min(activeImage, images.length - 1) : 0;

  const handleColorChange = (i: number) => {
    setActiveColor(i);
    setActiveImage(0);
  };

  const handleAddToBag = () => {
    if (!activeSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      size: activeSize,
      quantity: 1,
      image: images[0] ?? selectedColor.image,
    });
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }}>
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-20 md:pt-36 pb-24">
        {/* Back */}
        <motion.button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2D241E]/50 hover:text-[#2D241E] transition-colors duration-300 mb-3 md:mb-10 group"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: easing }}
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="uppercase tracking-widest">Back</span>
        </motion.button>

        {/* Main layout */}
        <div className="grid md:grid-cols-2 lg:grid-cols-[1fr_440px] gap-6 md:gap-16 items-start mt-0">
          {/* Left: Image Gallery */}
          <motion.div
            className="w-full max-w-[335px] sm:max-w-[360px] mx-auto md:max-w-none md:mx-0 lg:w-[620px] xl:w-[660px] lg:justify-self-center"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: easing }}
          >
            {/* Main Image */}
            <div className="relative rounded-[34px] sm:rounded-[40px] overflow-hidden bg-[#EDE9E2] h-[46vh] min-h-[370px] max-h-[340px] sm:h-[50vh] sm:min-h-[320px] sm:max-h-[410px] md:h-[62vh] md:min-h-[460px] md:max-h-[700px] lg:h-[68vh] lg:min-h-[520px] lg:max-h-[760px] xl:h-[72vh] xl:max-h-[820px]">
              <AnimatePresence mode="wait">
                {images.length > 0 && (
                <motion.div
                  key={activeColor * 100 + safeImageIndex}
                  className="absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: easing }}
                >
                  <ImageWithFallback
                    src={images[safeImageIndex]}
                    alt={`${product.name} – ${product.colors[activeColor].name}`}
                    className="w-full h-full object-cover"
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
                  className="flex-1 rounded-[16px] sm:rounded-[18px] overflow-hidden bg-[#EDE9E2] transition-all duration-300 h-[64px] sm:h-[84px] md:h-[110px] lg:h-[124px] xl:h-[132px]"
                  style={{
                    opacity: safeImageIndex === i ? 1 : 0.5,
                    border: safeImageIndex === i ? "2px solid #2D241E" : "2px solid transparent",
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

            {/* Mobile quick variant controls - keep near gallery for instant visual feedback */}
            <div className="md:hidden mt-2 rounded-[14px] p-2 border border-[#2D241E]/10 bg-white/45">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[#2D241E] text-[9px] tracking-widest uppercase"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                    >
                      Colour
                    </p>
                    <p
                      className="text-[#2D241E]/60 text-[10px]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {product.colors[activeColor].name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {product.colors.map((color, i) => (
                      <button
                        key={`mobile-color-${color.name}`}
                        onClick={() => handleColorChange(i)}
                        title={color.name}
                        className="transition-transform duration-200 hover:scale-110"
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: color.hex,
                          border: i === activeColor ? "1.5px solid #2D241E" : "1px solid rgba(45,36,30,0.2)",
                          boxShadow: i === activeColor ? "0 0 0 1px #F5F2ED, 0 0 0 2.5px #2D241E" : "none",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p
                      className="text-[#2D241E] text-[9px] tracking-widest uppercase"
                      style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                    >
                      Size
                    </p>
                    <button
                      className="text-[#2D241E]/50 text-[10px] hover:text-[#4A0E0E] transition-colors underline"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Size guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {displaySizes.map((size) => (
                      <button
                        key={`mobile-size-${size}`}
                        onClick={() => { setActiveSize(size); setSizeError(false); }}
                        className="min-w-[34px] px-2 py-1 rounded-full text-[10px] transition-all duration-200"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.05em",
                          backgroundColor: activeSize === size ? "#2D241E" : "transparent",
                          color: activeSize === size ? "#F5F2ED" : "#2D241E",
                          border: activeSize === size
                            ? "1px solid #2D241E"
                            : sizeError
                              ? "1px solid rgba(74,14,14,0.5)"
                              : "1px solid rgba(45,36,30,0.2)",
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {sizeError && (
                  <motion.p
                  className="text-[#4A0E0E] text-[10px] mt-2"
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
                <p className="text-[#2D241E]/55 text-[10px] mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  In stock: {displayStock}
                </p>
              )}
            </div>
          </motion.div>

          {/* Right: Product Info */}
          <motion.div
            className="flex flex-col gap-7 md:sticky md:top-32"
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
            <div className="hidden md:block">
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
            <div className="hidden md:block">
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
                  {product.colors[activeColor].name}
                </p>
              </div>
              <div className="flex gap-3">
                {product.colors.map((color, i) => (
                  <button
                    key={color.name}
                    onClick={() => handleColorChange(i)}
                    title={color.name}
                    className="transition-transform duration-200 hover:scale-110"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      backgroundColor: color.hex,
                      border: i === activeColor ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                      boxShadow: i === activeColor ? "0 0 0 3px #F5F2ED, 0 0 0 5px #2D241E" : "none",
                      transition: "all 0.2s ease",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="hidden md:block">
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
                  <button
                    key={size}
                    onClick={() => { setActiveSize(size); setSizeError(false); }}
                    className="min-w-[52px] py-2.5 rounded-full text-xs transition-all duration-200"
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
                    }}
                  >
                    {size}
                  </button>
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
                className="flex-1 py-4 rounded-full flex items-center justify-center gap-3 text-white transition-all duration-300"
                style={{
                  backgroundColor: addedToBag ? "#2D5928" : "#2D241E",
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
                    <span className="uppercase tracking-widest">Add to Bag</span>
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

              <button
                className="w-14 h-14 rounded-full border border-[#2D241E]/20 flex items-center justify-center hover:border-[#2D241E]/50 transition-colors"
              >
                <Share2 size={15} strokeWidth={1.5} className="text-[#2D241E]/60" />
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

        {/* Related Products */}
        {related.length > 0 && (
          <section className="mt-32">
            <div className="flex items-center justify-between mb-12">
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
              <Link
                to="/collection"
                className="hidden md:flex items-center gap-2 text-[#2D241E]/50 hover:text-[#4A0E0E] text-xs transition-colors uppercase tracking-widest"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-8">
              {related.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} size="small" />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
