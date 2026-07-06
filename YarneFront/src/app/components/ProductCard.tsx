import React, { memo, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { Heart, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useWishlist } from "../context/AppContext";
import { useCart } from "../context/AppContext";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "./PriceTag";
import { useMotionEntrance } from "../hooks/useMotionEntrance";
import { getDefaultColorIndex } from "../utils/productColorIndex";

interface ProductCardProps {
  product: Product;
  index?: number;
  size?: "small" | "medium" | "large" | "carousel" | "collection";
  inCarousel?: boolean;
  subtleEntrance?: boolean;
  viewportRoot?: React.RefObject<HTMLElement | null>;
}

function ProductCardInner({ product, index = 0, size = "medium", inCarousel = false, subtleEntrance = false, viewportRoot }: ProductCardProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [activeColor, setActiveColor] = useState(() => getDefaultColorIndex(product));
  const { addToCart } = useCart();
  const { wishlist, toggleWishlist } = useWishlist();
  const { disabled: motionDisabled, opacityOnly } = useMotionEntrance();

  const isWishlisted = wishlist.includes(product.id);
  const isCarouselCard = inCarousel || size === "carousel";

  const aspectClass = isCarouselCard
    ? "w-full min-h-0 aspect-[3/4]"
    : size === "collection"
      ? "w-full min-h-0 aspect-[3/4] md:aspect-[4/5]"
      : "aspect-[3/4] w-full min-h-0";

  const imageRadiusClass = isCarouselCard
    ? "rounded-[22px] sm:rounded-[28px]"
    : "rounded-[24px] md:rounded-[32px]";

  const handleQuickAdd = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const maxQuantity = Math.max(0, product.stock ?? 0);
    if (maxQuantity <= 0) return;
    addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      color: product.colors[activeColor].name,
      colorHex: product.colors[activeColor].hex,
      size: "S",
      quantity: 1,
      maxQuantity,
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
    ? { root: viewportRoot, margin: "0px 80px", amount: 0.2, once: true }
    : { once: true, margin: "-60px" };
  const entranceInitial = motionDisabled
    ? false
    : opacityOnly || subtleEntrance || useCarouselViewport || inCarousel
      ? { opacity: 0 }
      : { opacity: 0, y: 40 };
  const entranceAnimate = motionDisabled
    ? undefined
    : opacityOnly || subtleEntrance || useCarouselViewport || inCarousel
      ? { opacity: 1 }
      : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={entranceInitial}
      whileInView={entranceAnimate}
      viewport={motionDisabled ? undefined : (useCarouselViewport || !inCarousel ? viewport : undefined)}
      transition={{ duration: 0.5, delay: inCarousel ? 0 : index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group/card ${isCarouselCard ? "overflow-visible" : ""}`}
    >
      <LangLink to={`/product/${product.id}`} className={`block ${isCarouselCard ? "overflow-visible" : ""}`}>
        <div
          className={`relative ${aspectClass} overflow-hidden ${imageRadiusClass} bg-[#EDE9E2] cursor-pointer`}
        >
          <div className={`absolute inset-0 overflow-hidden ${imageRadiusClass}`}>
            {product.colors.map((color, i) => (
              <ImageWithFallback
                key={color.name}
                src={color.image}
                alt={`${product.name} in ${color.name}`}
                className={`product-card-image absolute inset-0 h-full w-full object-cover ${
                  isCarouselCard ? "object-[center_28%] md:object-[center_32%]" : "object-[center_30%]"
                } ${i === activeColor ? "opacity-100" : "opacity-0"}`}
              />
            ))}
          </div>

          <div
            className={`absolute inset-0 ${imageRadiusClass} opacity-0 transition-opacity duration-[450ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover/card:opacity-100 pointer-events-none`}
            style={{
              background: "linear-gradient(to top, rgba(45,36,30,0.48) 0%, transparent 58%)",
            }}
          />

          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
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
                {t("product.badgeNew")}
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
                {t("product.badgeBestseller")}
              </span>
            )}
          </div>

          <button
            onClick={handleWishlist}
            className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer"
            style={{
              backgroundColor: isWishlisted ? "#4A0E0E" : "rgba(245,242,237,0.85)",
              backdropFilter: "blur(8px)",
            }}
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? t("product.removeFromWishlist", { defaultValue: "Remove from wishlist" }) : t("product.addToWishlist", { defaultValue: "Add to wishlist" })}
          >
            <Heart
              size={15}
              strokeWidth={1.5}
              fill={isWishlisted ? "white" : "none"}
              stroke={isWishlisted ? "white" : "#2D241E"}
            />
          </button>

          <button
            onClick={handleQuickAdd}
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap px-6 py-2.5 rounded-full text-white flex items-center gap-2 cursor-pointer transition-[opacity,transform] duration-[380ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] opacity-0 translate-y-2 scale-[0.97] group-hover/card:opacity-100 group-hover/card:translate-y-0 group-hover/card:scale-100 motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:scale-100`}
            style={{
              backgroundColor: "#2D241E",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              boxShadow: "0 8px 24px rgba(45,36,30,0.3)",
            }}
          >
            <ShoppingBag size={13} strokeWidth={1.5} />
            <span className="uppercase tracking-widest">{t("product.quickAdd")}</span>
          </button>
        </div>

        <div className={`${isCarouselCard ? "mt-3 overflow-visible pb-1" : "mt-4"} px-0.5`}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={`text-[#2D241E] group-hover/card:text-[#4A0E0E] transition-colors duration-300${isCarouselCard ? " min-[600px]:max-[1023px]:text-base" : ""}`}
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: isCarouselCard ? "clamp(0.92rem, 3.6vw, 1.05rem)" : "1.05rem",
                  fontWeight: 500,
                  lineHeight: 1.3,
                }}
              >
                {product.name}
              </p>
              <p
                className="text-[#2D241E]/50 text-xs mt-0.5 line-clamp-1"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: isCarouselCard ? "0.68rem" : undefined }}
              >
                {product.subtitle}
              </p>
            </div>
            <PriceTag amount={product.price} locale={locale} variant="card" className="flex-shrink-0" />
          </div>

          <div
            className={`flex items-center gap-2 ${isCarouselCard ? "mt-2 py-1.5 pl-1 -ml-1" : "mt-3"}`}
          >
            {product.colors.map((color, i) => (
              <button
                key={color.name}
                title={color.name}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveColor(i);
                }}
                className={`relative shrink-0 transition-[width,height,box-shadow,border-color] duration-300 ease-out cursor-pointer ${isCarouselCard ? "" : "hover:scale-110"}`}
                style={{
                  width: i === activeColor ? 18 : 14,
                  height: i === activeColor ? 18 : 14,
                  borderRadius: "50%",
                  backgroundColor: color.hex,
                  border: i === activeColor ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                  boxShadow: i === activeColor ? "0 0 0 2px #F5F2ED, 0 0 0 4px #2D241E" : "none",
                }}
                aria-label={color.name}
                aria-current={i === activeColor ? "true" : undefined}
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
      </LangLink>
    </motion.div>
  );
}

export const ProductCard = memo(ProductCardInner);
