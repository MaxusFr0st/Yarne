import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { ArrowLeft, Heart, ShoppingBag, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import type { Locale } from "../i18n/config";
import { PriceTag } from "./PriceTag";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CrossfadeImage } from "./figma/CrossfadeImage";
import { ProductGuaranteeBlock } from "./ProductGuaranteeBlock";
import type { ProductGuaranteeContent } from "../utils/productGuaranteeContent";
import { getSupplementaryProductDetails, hasSupplementaryProductDetails } from "../utils/productDetails";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";

type MobileProductDetailViewProps = {
  product: Product;
  images: string[];
  locale: Locale;
  activeColor: number;
  activeSize: string | null;
  displaySizes: string[];
  isWishlisted: boolean;
  addedToBag: boolean;
  sizeError: boolean;
  outOfStock: boolean;
  displayStock: number;
  laceEnabled: boolean;
  activeLace: boolean;
  onLaceChange: (next: boolean) => void;
  onBack: () => void;
  onToggleWishlist: () => void;
  onColorChange: (index: number) => void;
  onSizeChange: (size: string) => void;
  onAddToBag: () => void;
  guaranteeContent: ProductGuaranteeContent;
};

export function MobileProductDetailView({
  product,
  images,
  locale,
  activeColor,
  activeSize,
  displaySizes,
  isWishlisted,
  addedToBag,
  sizeError,
  outOfStock,
  displayStock,
  laceEnabled,
  activeLace,
  onLaceChange,
  onBack,
  onToggleWishlist,
  onColorChange,
  onSizeChange,
  onAddToBag,
  guaranteeContent,
}: MobileProductDetailViewProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const touchMobile = useTouchMobileLayout();
  const motionEnabled = !touchMobile && !reduceMotion;
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const imageKey = images.join("|");
  const canLoop = images.length > 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: canLoop,
    align: "center",
    containScroll: false,
    duration: touchMobile || reduceMotion ? 0 : 22,
    skipSnaps: false,
  });

  const onGallerySelect = useCallback(() => {
    if (!emblaApi) return;
    setGalleryIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onGallerySelect();
    emblaApi.on("select", onGallerySelect);
    emblaApi.on("reInit", onGallerySelect);
    return () => {
      emblaApi.off("select", onGallerySelect);
      emblaApi.off("reInit", onGallerySelect);
    };
  }, [emblaApi, onGallerySelect]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.reInit({ loop: canLoop });
    emblaApi.scrollTo(0, false);
    setGalleryIndex(0);
  }, [emblaApi, imageKey, activeColor, activeSize, activeLace, canLoop]);

  const safeGalleryIndex = images.length ? ((galleryIndex % images.length) + images.length) % images.length : 0;
  const gallerySlides = images.length > 0 ? images : [""];
  const transitionEase = [0.25, 0.1, 0.25, 1] as const;
  const extraDetails = useMemo(
    () => getSupplementaryProductDetails(product),
    [product.details]
  );
  const showDetailsAccordion = hasSupplementaryProductDetails(product);

  return (
    <div className="md:hidden relative pt-[var(--main-header-h)]">
      {/* Gallery — tall hero; page scrolls naturally below */}
      <div
        className="relative w-full bg-[#EDE9E2] overflow-hidden"
        style={{ height: "calc(var(--app-vh, 1svh) * 58)", maxHeight: "420px" }}
      >
        <div ref={emblaRef} className="h-full overflow-hidden">
          <div className="flex h-full [touch-action:pan-y_pinch-zoom]" style={{ willChange: "transform" }}>
            {gallerySlides.map((src, i) => (
              <div
                key={i}
                className="relative min-w-0 shrink-0 grow-0 basis-full h-full"
                style={{ contain: "layout style paint" }}
              >
                {src ? (
                  <CrossfadeImage
                    src={src}
                    alt={`${product.name} – ${product.colors[activeColor]?.name ?? ""} – ${i + 1}`}
                    className="object-[center_25%]"
                    objectPosition="center 25%"
                    priority={i === 0}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[#EDE9E2]" />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="absolute z-20 top-[clamp(10px,2.5vw,16px)] left-[clamp(10px,2.5vw,16px)] flex items-center justify-center rounded-full bg-white/92 shadow-sm cursor-pointer"
          style={{ width: "clamp(36px, 9vw, 42px)", height: "clamp(36px, 9vw, 42px)" }}
          aria-label={t("product.back")}
        >
          <ArrowLeft size={18} strokeWidth={1.5} className="text-[#2D241E]" />
        </button>

        <button
          type="button"
          onClick={onToggleWishlist}
          className="absolute z-20 top-[clamp(10px,2.5vw,16px)] right-[clamp(10px,2.5vw,16px)] flex items-center justify-center rounded-full bg-white/92 shadow-sm cursor-pointer"
          style={{ width: "clamp(36px, 9vw, 42px)", height: "clamp(36px, 9vw, 42px)" }}
          aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
        >
          <Heart
            size={17}
            strokeWidth={1.5}
            fill={isWishlisted ? "#4A0E0E" : "none"}
            stroke={isWishlisted ? "#4A0E0E" : "#2D241E"}
          />
        </button>

        {images.length > 1 && (
          <div className="absolute z-20 bottom-[clamp(10px,3.25vw,15px)] left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                className="rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: safeGalleryIndex === i ? "clamp(18px, 4.5vw, 22px)" : "clamp(6px, 1.5vw, 7px)",
                  height: "clamp(6px, 1.5vw, 7px)",
                  backgroundColor: safeGalleryIndex === i ? "#F5F2ED" : "rgba(245,242,237,0.55)",
                }}
                aria-label={t("product.galleryImage", { index: i + 1 })}
                aria-current={safeGalleryIndex === i}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info sheet */}
      <div
        className="relative z-10 -mt-[clamp(12px,3vw,16px)] rounded-t-[clamp(20px,5vw,28px)] px-[clamp(14px,3.6vw,22px)] pt-[clamp(14px,3.5vw,18px)] pb-[clamp(14px,3.5vw,20px)]"
        style={{
          backgroundColor: "#FAF8F5",
          boxShadow: "0 -8px 32px rgba(45,36,30,0.1)",
        }}
      >
        <div className="flex flex-col gap-[clamp(6px,1.4svh,9px)]">
          <p
            className="text-[#2D241E]/45 uppercase shrink-0"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.18em",
              fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
            }}
          >
            {product.category}
          </p>

          <div className="flex items-start justify-between gap-2 shrink-0">
            <h1
              className="text-[#2D241E] min-w-0"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.4rem, 5.8vw, 1.85rem)",
                fontWeight: 500,
                lineHeight: 1.05,
              }}
            >
              {product.name}
            </h1>
            <PriceTag amount={product.price} locale={locale} variant="display" />
          </div>

          <MobileAccordionSection
            title={t("product.description")}
            open={descriptionOpen}
            onToggle={() => setDescriptionOpen((open) => !open)}
            motionEnabled={motionEnabled}
          >
            <div className="flex flex-col gap-[clamp(6px,1.4vw,8px)] pb-0.5">
              {product.subtitle ? (
                <p
                  className="text-[#2D241E]/60"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "clamp(0.7rem, 2.7vw, 0.8rem)",
                    lineHeight: 1.45,
                  }}
                >
                  {product.subtitle}
                </p>
              ) : null}
              {product.description ? (
                <p
                  className="text-[#2D241E]/65"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "clamp(0.72rem, 2.9vw, 0.84rem)",
                    lineHeight: 1.5,
                  }}
                >
                  {product.description}
                </p>
              ) : null}
            </div>
          </MobileAccordionSection>

          {showDetailsAccordion ? (
            <MobileAccordionSection
              title={t("product.detailsTitle")}
              open={detailsOpen}
              onToggle={() => setDetailsOpen((open) => !open)}
              motionEnabled={motionEnabled}
            >
              <ul className="space-y-[clamp(6px,1.4vw,8px)] pb-0.5">
                {product.producerName ? (
                  <li
                    className="flex items-start gap-[clamp(8px,2vw,10px)] text-[#2D241E]/60"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "clamp(0.72rem, 2.9vw, 0.84rem)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span className="mt-[0.45em] w-1 h-1 rounded-full bg-[#4A0E0E] shrink-0" />
                    {t("product.madeBy", { name: product.producerName })}
                  </li>
                ) : null}
                {extraDetails.map((detail) => (
                  <li
                    key={detail}
                    className="flex items-start gap-[clamp(8px,2vw,10px)] text-[#2D241E]/60"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "clamp(0.72rem, 2.9vw, 0.84rem)",
                      lineHeight: 1.5,
                    }}
                  >
                    <span className="mt-[0.45em] w-1 h-1 rounded-full bg-[#4A0E0E] shrink-0" />
                    {detail}
                  </li>
                ))}
              </ul>
            </MobileAccordionSection>
          ) : null}

          <div className="shrink-0">
            <div className="flex items-center justify-between mb-[clamp(4px,1vw,6px)]">
              <p
                className="text-[#2D241E] uppercase"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.14em",
                  fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
                }}
              >
                {t("product.colour")}
              </p>
              <p
                className="text-[#2D241E]/55"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "clamp(0.7rem, 2.7vw, 0.8rem)",
                }}
              >
                <AnimatePresence mode="wait">
                  <motion.span
                    key={product.colors[activeColor]?.name}
                    initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: transitionEase }}
                  >
                    {product.colors[activeColor]?.name}
                  </motion.span>
                </AnimatePresence>
              </p>
            </div>
            <div className="flex flex-wrap gap-[clamp(8px,2vw,10px)] pl-[6px] pr-[4px] py-[4px]">
              {product.colors.map((color, i) => {
                const isActive = i === activeColor;
                const colorStyle = {
                  width: "clamp(28px, 7vw, 34px)",
                  height: "clamp(28px, 7vw, 34px)",
                  backgroundColor: color.hex,
                  border: isActive ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.18)",
                  boxShadow: isActive ? "0 0 0 2px #FAF8F5, 0 0 0 4px #2D241E" : "none",
                } as const;

                if (!motionEnabled) {
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => onColorChange(i)}
                      title={color.name}
                      className="relative shrink-0 rounded-full cursor-pointer"
                      style={colorStyle}
                    />
                  );
                }

                return (
                  <motion.button
                    key={color.name}
                    type="button"
                    onClick={() => onColorChange(i)}
                    title={color.name}
                    className="relative shrink-0 rounded-full cursor-pointer"
                    animate={{ scale: isActive ? 1.08 : 1 }}
                    transition={{ duration: 0.22, ease: transitionEase }}
                    style={colorStyle}
                  />
                );
              })}
            </div>
          </div>

          {laceEnabled && (
            <div className="shrink-0">
              <p
                className="text-[#2D241E] uppercase mb-[clamp(4px,1vw,6px)]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.14em",
                  fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
                }}
              >
                {t("product.lace.label")}
              </p>
              <LayoutGroup id="mobile-lace">
                <div
                  className="relative inline-flex p-[clamp(2px,0.6vw,3px)] rounded-full"
                  style={{ backgroundColor: "rgba(45,36,30,0.06)", border: "1px solid rgba(45,36,30,0.12)" }}
                >
                  {[
                    { value: false, label: t("product.lace.withoutLace") },
                    { value: true, label: t("product.lace.withLace") },
                  ].map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => onLaceChange(opt.value)}
                      className="relative z-10 rounded-full cursor-pointer"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.04em",
                        fontSize: "clamp(0.66rem, 2.5vw, 0.76rem)",
                        padding: "clamp(6px, 1.6vw, 8px) clamp(12px, 3vw, 16px)",
                        color: activeLace === opt.value ? "#F5F2ED" : "#2D241E",
                        backgroundColor: !motionEnabled && activeLace === opt.value ? "#2D241E" : "transparent",
                        transition: "color 0.22s ease",
                      }}
                    >
                      {motionEnabled && activeLace === opt.value && (
                        <motion.span
                          layoutId="mobile-lace-pill"
                          className="absolute inset-0 rounded-full bg-[#2D241E]"
                          style={{ zIndex: -1 }}
                          transition={{ duration: 0.28, ease: transitionEase }}
                        />
                      )}
                      <span className="relative">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>
            </div>
          )}

          {displaySizes.length > 0 && (
            <div className="shrink-0">
              <div className="flex items-center justify-between mb-[clamp(4px,1vw,6px)]">
                <p
                  className="text-[#2D241E] uppercase"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.14em",
                    fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
                  }}
                >
                  {t("product.size")}
                </p>
                {activeSize && (
                  <p
                    className={displayStock <= 0 ? "text-[#4A0E0E]/75" : "text-[#2D241E]/50"}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "clamp(0.62rem, 2.3vw, 0.72rem)",
                    }}
                  >
                    {displayStock <= 0
                      ? t("product.outOfStock")
                      : t("product.inStockShort", { count: displayStock })}
                  </p>
                )}
              </div>
              <div
                className="grid gap-[clamp(5px,1.2vw,7px)] px-[2px] py-[2px]"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(displaySizes.length, 5)}, minmax(0, 1fr))`,
                }}
              >
                {displaySizes.map((size) => {
                  const isActive = activeSize === size;
                  const sizeStyle = {
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "clamp(0.66rem, 2.5vw, 0.76rem)",
                    letterSpacing: "0.04em",
                    padding: "clamp(6px, 1.6vw, 8px) clamp(4px, 1vw, 6px)",
                    backgroundColor: isActive ? "#2D241E" : "transparent",
                    color: isActive ? "#F5F2ED" : "#2D241E",
                    border: isActive
                      ? "1.5px solid #2D241E"
                      : sizeError
                        ? "1.5px solid rgba(74,14,14,0.5)"
                        : "1.5px solid rgba(45,36,30,0.2)",
                    transition: "background-color 0.22s ease, color 0.22s ease, border-color 0.22s ease",
                  } as const;

                  if (!motionEnabled) {
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => onSizeChange(size)}
                        className="relative w-full rounded-full cursor-pointer"
                        style={sizeStyle}
                      >
                        {size}
                      </button>
                    );
                  }

                  return (
                    <motion.button
                      key={size}
                      type="button"
                      onClick={() => onSizeChange(size)}
                      className="relative w-full rounded-full cursor-pointer"
                      animate={{ scale: isActive ? 1.02 : 1 }}
                      transition={{ duration: 0.2, ease: transitionEase }}
                      style={sizeStyle}
                    >
                      {size}
                    </motion.button>
                  );
                })}
              </div>
              <AnimatePresence>
                {sizeError && (
                  <motion.p
                    className="text-[#4A0E0E] mt-1"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(0.62rem, 2.3vw, 0.72rem)" }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {t("product.selectSize")}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}

          <motion.button
            type="button"
            onClick={onAddToBag}
            disabled={outOfStock}
            className="shrink-0 mt-[clamp(6px,1.4svh,10px)] w-full flex items-center justify-center gap-2 rounded-full text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          style={{
            backgroundColor: outOfStock ? "#9A9088" : addedToBag ? "#2D5928" : "#2D241E",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "clamp(0.66rem, 2.6vw, 0.78rem)",
            letterSpacing: "0.12em",
            padding: "clamp(11px, 2.6svh, 14px) clamp(16px, 4vw, 20px)",
          }}
          whileTap={motionEnabled ? { scale: 0.98 } : undefined}
        >
          {addedToBag ? (
            <>
              <Check size={14} />
              <span className="uppercase tracking-widest">{t("product.addedToBag")}</span>
            </>
          ) : (
            <>
              <ShoppingBag size={14} strokeWidth={1.5} />
              <span className="uppercase tracking-widest">
                {outOfStock ? t("product.outOfStock") : t("product.addToBag")}
              </span>
            </>
          )}
          </motion.button>

          <ProductGuaranteeBlock
            content={guaranteeContent}
            locale={locale}
            className="mt-[clamp(10px,2svh,14px)]"
          />
        </div>
      </div>
    </div>
  );
}

const accordionHeaderStyle = {
  fontFamily: "'DM Sans', sans-serif",
  letterSpacing: "0.14em",
  fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
} as const;

type MobileAccordionSectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  motionEnabled: boolean;
  children: ReactNode;
};

function MobileAccordionSection({
  title,
  open,
  onToggle,
  motionEnabled,
  children,
}: MobileAccordionSectionProps) {
  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-2 cursor-pointer text-left"
        aria-expanded={open}
      >
        <span className="text-[#2D241E] uppercase" style={accordionHeaderStyle}>
          {title}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: motionEnabled ? 0.25 : 0 }}
        >
          <ChevronDown size={15} className="text-[#2D241E]/50" strokeWidth={1.5} />
        </motion.span>
      </button>
      <div
        className="grid overflow-hidden transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transitionDuration: motionEnabled ? "300ms" : "0ms",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}
