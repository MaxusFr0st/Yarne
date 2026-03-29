import React, { useState, type MouseEvent } from "react";
import { Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Heart, ShoppingBag } from "lucide-react";
import type { Product } from "../data/products";
import { useApp } from "../context/AppContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface ProductCardProps {
  product: Product;
  index?: number;
  size?: "small" | "medium" | "large" | "carousel" | "collection";
  /** Skip viewport-based entrance animation (use in carousels) */
  inCarousel?: boolean;
  /** Ref to carousel viewport - enables slide-in animation as cards scroll into view */
  viewportRoot?: React.RefObject<HTMLElement | null>;
}

export function ProductCard({ product, index = 0, size = "medium", inCarousel = false, viewportRoot }: ProductCardProps) {
  const [activeColor, setActiveColor] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { addToCart, wishlist, toggleWishlist } = useApp();

  const isWishlisted = wishlist.includes(product.id);

  /**
   * Carousel card HEIGHT is determined here by aspect-[3/5]:
   * height = width × (5/3). The width comes from the carousel slide
   * (BestSellersCarousel: basis-[82%] mobile, basis-[23%] desktop).
   * To change carousel card size: adjust aspect ratio or add min-h here.
   */
  const aspectClass =
    size === "carousel"
      ? "aspect-[3/5] min-h-0"
      : size === "collection"
        ? "aspect-[5/7] min-h-[220px] md:min-h-[300px]"
      : size === "small"
        ? "aspect-[3/5] min-h-[180px] md:min-h-[240px]"
        : size === "large"
          ? "aspect-[3/5] min-h-[260px] md:min-h-[380px]"
          : "aspect-[3/5] min-h-[220px] md:min-h-[320px]";

  const handleQuickAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      color: product.colors[activeColor].name,
      colorHex: product.colors[activeColor].hex,
      size: "S",
      quantity: 1,
      image: product.colors[activeColor].image,
    });
  };

  const handleWishlist = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const useCarouselViewport = inCarousel && viewportRoot;
  const viewport = useCarouselViewport
    ? { root: viewportRoot, margin: "0px 80px", amount: 0.2, once: false }
    : { once: true, margin: "-60px" };
  return (
    <motion.div
      initial={useCarouselViewport ? { opacity: 0, y: 28 } : inCarousel ? { opacity: 1 } : { opacity: 0, y: 40 }}
      whileInView={useCarouselViewport ? { opacity: 1, y: 0 } : inCarousel ? undefined : { opacity: 1, y: 0 }}
      viewport={useCarouselViewport || !inCarousel ? viewport : undefined}
      transition={{ duration: 0.5, delay: inCarousel ? 0 : index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      className="group"
    >
      <Link to={`/product/${product.id}`} className="block">
        {/* Image Container */}
        <div
          className={`relative ${aspectClass} overflow-hidden rounded-[32px] bg-[#EDE9E2] cursor-pointer`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* All color images stacked - crossfade */}
          {product.colors.map((color, i) => (
            <ImageWithFallback
              key={color.name}
              src={color.image}
              alt={`${product.name} in ${color.name}`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                opacity: i === activeColor ? 1 : 0,
                transition: "opacity 0.6s cubic-bezier(0.25, 0.1, 0.25, 1)",
                transform: isHovered ? "scale(1.05)" : "scale(1)",
              }}
            />
          ))}

          {/* Gradient overlay on hover */}
          <div
            className="absolute inset-0 rounded-[32px] transition-opacity duration-500"
            style={{
              background:
                "linear-gradient(to top, rgba(45,36,30,0.5) 0%, transparent 60%)",
              opacity: isHovered ? 1 : 0,
            }}
          />

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {product.isNew && (
              <span
                className="px-3 py-1 rounded-full text-xs text-white"
                style={{
                  backgroundColor: "#4A0E0E",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.12em",
                  fontSize: "0.65rem",
                }}
              >
                NEW
              </span>
            )}
            {product.isBestseller && (
              <span
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  backgroundColor: "rgba(245,242,237,0.9)",
                  color: "#2D241E",
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.1em",
                  fontSize: "0.65rem",
                }}
              >
                BESTSELLER
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              backgroundColor: isWishlisted ? "#4A0E0E" : "rgba(245,242,237,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Heart
              size={15}
              strokeWidth={1.5}
              fill={isWishlisted ? "white" : "none"}
              stroke={isWishlisted ? "white" : "#2D241E"}
            />
          </button>

          {/* Quick Add pill */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                onClick={handleQuickAdd}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-6 py-2.5 rounded-full text-white flex items-center gap-2"
                style={{
                  backgroundColor: "#2D241E",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  letterSpacing: "0.12em",
                  boxShadow: "0 8px 24px rgba(45,36,30,0.3)",
                }}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.9 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <ShoppingBag size={13} strokeWidth={1.5} />
                <span className="uppercase tracking-widest">Quick Add</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Product Info */}
        <div className="mt-4 px-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className="text-[#2D241E] group-hover:text-[#4A0E0E] transition-colors duration-300"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 500, lineHeight: 1.3 }}
              >
                {product.name}
              </p>
              <p
                className="text-[#2D241E]/50 text-xs mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {product.subtitle}
              </p>
            </div>
            <p
              className="text-[#2D241E] flex-shrink-0"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem", fontWeight: 400 }}
            >
              €{product.price}
            </p>
          </div>

          {/* Color Swatches */}
          <div className="flex items-center gap-2 mt-3">
            {product.colors.map((color, i) => (
              <button
                key={color.name}
                title={color.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveColor(i);
                }}
                className="relative transition-transform duration-200 hover:scale-110"
                style={{
                  width: i === activeColor ? 18 : 14,
                  height: i === activeColor ? 18 : 14,
                  borderRadius: "50%",
                  backgroundColor: color.hex,
                  border: i === activeColor ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                  boxShadow: i === activeColor ? "0 0 0 2px #F5F2ED, 0 0 0 4px #2D241E" : "none",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
            <span
              className="text-[#2D241E]/40 text-xs ml-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {product.colors[activeColor].name}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}