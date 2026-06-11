import React, { useEffect, useMemo, useState, type MouseEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useProducts } from "../hooks/useProducts";
import { useApp } from "../context/AppContext";
import { ImageWithFallback as Img } from "./figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { formatPrice } from "../i18n/format";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import {
  DEFAULT_SHOWCASE_EYEBROW,
  DEFAULT_SHOWCASE_TITLE,
  getDefaultFeaturedShowcaseSelection,
  loadFeaturedShowcaseSelection,
  type FeaturedShowcaseSelection,
  type ShowcaseProductSlot,
  type ShowcaseTextSlot,
} from "../utils/featuredShowcaseSelection";

const easing = [0.25, 0.1, 0.25, 1] as const;

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%23EDE9E2' width='400' height='400'/%3E%3Cpath d='M120 220l50-60 50 60 30-40 40 60H110z' fill='%232D241E' fill-opacity='0.18'/%3E%3Ccircle cx='150' cy='150' r='18' fill='%232D241E' fill-opacity='0.18'/%3E%3C/svg%3E";

type ProductTileProps = {
  slot: ShowcaseProductSlot;
  product: Product | null;
  fallbackTitle: string;
  variant: "large" | "medium" | "wide";
  showWishlist?: boolean;
};

function ProductTile({ slot, product, fallbackTitle, variant, showWishlist = false }: ProductTileProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { wishlist, toggleWishlist } = useApp();
  const title = product?.name ?? fallbackTitle;
  const price = product?.price;
  const imageSrc =
    resolveMediaUrl(slot.imageUrl) ||
    resolveMediaUrl(product?.colors?.[0]?.image) ||
    PLACEHOLDER_IMG;
  const href = product ? `/product/${product.id}` : "/collection";

  const isLarge = variant === "large";
  /** Tighter crop on phones; strongest on iPhone SE / narrow viewports */
  const mobileImageFrameClass = isLarge
    ? "max-md:scale-[1.16] max-md:object-[center_32%] max-[390px]:scale-[1.28] max-[390px]:object-[center_26%] max-[374px]:scale-[1.36] max-[374px]:object-[center_22%]"
    : variant === "wide"
      ? "max-md:scale-[1.12] max-md:object-[center_34%] max-[390px]:scale-[1.24] max-[390px]:object-[center_28%] max-[374px]:scale-[1.32] max-[374px]:object-[center_24%]"
      : "max-md:scale-[1.18] max-md:object-[center_30%] max-[390px]:scale-[1.30] max-[390px]:object-[center_24%] max-[374px]:scale-[1.38] max-[374px]:object-[center_20%]";
  const isWishlisted = product ? wishlist.includes(product.id) : false;
  const eyebrow = slot.eyebrow.trim();
  const ctaLabel = slot.ctaLabel.trim();

  const handleWishlist = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (product) toggleWishlist(product.id);
  };

  return (
    <LangLink
      to={href}
      className="group relative block w-full h-full overflow-hidden rounded-[clamp(18px,4.5vw,28px)] md:rounded-[32px] bg-[#EDE9E2]"
      aria-label={t("showcase.openProduct", { title })}
    >
      <Img
        src={imageSrc}
        alt={title}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${mobileImageFrameClass} md:group-hover:scale-[1.04]`}
      />

      <div
        className="absolute inset-0"
        style={{
          background: isLarge
            ? "linear-gradient(to top, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.2) 42%, transparent 72%)"
            : "linear-gradient(to top, rgba(45,36,30,0.55) 0%, rgba(45,36,30,0.08) 45%, transparent 100%)",
        }}
      />

      <div
        className={`relative z-10 h-full flex flex-col ${
          isLarge
            ? "justify-end p-[clamp(10px,2.6vw,18px)] md:p-7"
            : "justify-end p-[clamp(8px,2.2vw,14px)] md:p-6"
        }`}
      >
        {!isLarge && eyebrow.length > 0 && (
          <p
            className="text-white/80 uppercase mb-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.2em",
              fontSize: "clamp(0.48rem, 2vw, 0.58rem)",
            }}
          >
            {eyebrow}
          </p>
        )}

        <div className={isLarge ? "mt-auto" : ""}>
          <h3
            className="text-white"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontStyle: isLarge ? "normal" : "italic",
              fontWeight: isLarge ? 400 : 500,
              fontSize: isLarge
                ? "clamp(1.15rem, 5vw, 2.2rem)"
                : "clamp(0.82rem, 3.4vw, 1.3rem)",
              lineHeight: 1.08,
            }}
          >
            {isLarge ? (
              <>
                <span className="block">{title.split(" ")[0] ?? title}</span>
                {title.includes(" ") && (
                  <span className="block italic font-normal opacity-95">
                    {title.split(" ").slice(1).join(" ")}
                  </span>
                )}
              </>
            ) : (
              title
            )}
          </h3>

          {!isLarge && typeof price === "number" && (
            <p
              className="text-white/90 mt-0.5"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(0.78rem, 3vw, 0.95rem)",
                fontWeight: 400,
              }}
            >
              {formatPrice(price, locale)}
            </p>
          )}
        </div>

        {isLarge && ctaLabel.length > 0 && (
          <span
            className="md:hidden mt-[clamp(6px,1.6vw,10px)] self-start inline-flex items-center justify-center rounded-full uppercase tracking-widest text-[#2D241E]"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(0.54rem, 2.2vw, 0.68rem)",
              letterSpacing: "0.14em",
              backgroundColor: "rgba(245,242,237,0.94)",
              padding: "clamp(6px, 1.6vw, 9px) clamp(12px, 3.2vw, 18px)",
            }}
          >
            {ctaLabel}
          </span>
        )}

        {isLarge && ctaLabel.length > 0 && (
          <span className="hidden md:inline-flex mt-4 items-center gap-2 text-white" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}>
            <span className="uppercase tracking-widest">{ctaLabel}</span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        )}
      </div>

      {showWishlist && product && (
        <button
          onClick={handleWishlist}
          className="absolute z-20 bottom-[clamp(10px,2.5vw,16px)] right-[clamp(10px,2.5vw,16px)] flex items-center justify-center rounded-full md:hidden"
          style={{
            width: "clamp(28px, 7vw, 34px)",
            height: "clamp(28px, 7vw, 34px)",
            backgroundColor: isWishlisted ? "#4A0E0E" : "rgba(245,242,237,0.9)",
          }}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            size={13}
            strokeWidth={1.5}
            fill={isWishlisted ? "white" : "none"}
            stroke={isWishlisted ? "white" : "#2D241E"}
          />
        </button>
      )}
    </LangLink>
  );
}

type TextTileProps = {
  slot: ShowcaseTextSlot;
};

function TextTile({ slot }: TextTileProps) {
  const eyebrow = slot.eyebrow.trim();
  const heading = slot.heading.trim();
  const ctaLabel = slot.ctaLabel.trim();
  const ctaHref = slot.ctaHref.trim() || "/about";

  return (
    <LangLink
      to={ctaHref}
      className="group relative block w-full h-full overflow-hidden rounded-[clamp(18px,4.5vw,28px)] md:rounded-[32px]"
      style={{ backgroundColor: "#2D241E" }}
    >
      <div className="relative z-10 h-full flex flex-col justify-between p-[clamp(10px,2.5vw,18px)] md:p-7">
        <div className="min-h-0">
          {eyebrow.length > 0 && (
            <p
              className="text-white/55 uppercase"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.18em",
                fontSize: "clamp(0.48rem, 2vw, 0.62rem)",
              }}
            >
              {eyebrow}
            </p>
          )}
          {heading.length > 0 && (
            <h3
              className="text-white mt-1 md:mt-3 line-clamp-3 md:line-clamp-none"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "clamp(0.82rem, 3.2vw, 1.7rem)",
                lineHeight: 1.2,
              }}
            >
              {heading}
            </h3>
          )}
        </div>

        {ctaLabel.length > 0 && (
          <span
            className="inline-flex items-center gap-1 text-white/85 group-hover:text-white transition-colors duration-300 mt-2 md:mt-6"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "clamp(0.62rem, 2.4vw, 0.8rem)",
              letterSpacing: "0.04em",
            }}
          >
            <span className="line-clamp-1">{ctaLabel}</span>
            <ArrowUpRight
              size={13}
              className="shrink-0 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        )}
      </div>
    </LangLink>
  );
}

export function FeaturedShowcase() {
  const { t } = useTranslation();
  const { products } = useProducts();
  const [selection, setSelection] = useState<FeaturedShowcaseSelection>(
    getDefaultFeaturedShowcaseSelection
  );

  useEffect(() => {
    let cancelled = false;
    void loadFeaturedShowcaseSelection().then((next) => {
      if (!cancelled) setSelection(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const productByCode = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const slot1Product = selection.slot1.productCode
    ? productByCode.get(selection.slot1.productCode) ?? null
    : null;
  const slot2Product = selection.slot2.productCode
    ? productByCode.get(selection.slot2.productCode) ?? null
    : null;
  const slot4Product = selection.slot4.productCode
    ? productByCode.get(selection.slot4.productCode) ?? null
    : null;

  const eyebrow =
    selection.eyebrow.trim() ||
    t("showcase.defaultEyebrow", { defaultValue: DEFAULT_SHOWCASE_EYEBROW });
  const title =
    selection.title.trim() ||
    t("showcase.defaultTitle", { defaultValue: DEFAULT_SHOWCASE_TITLE });

  const sectionHeader = (
    <>
      <p
        className="text-[#2D241E]/40 uppercase mb-[clamp(4px,1vw,6px)]"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.2em",
          fontSize: "clamp(0.52rem, 2.2vw, 0.65rem)",
        }}
      >
        {eyebrow}
      </p>
      <h2
        className="text-[#2D241E]"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.05rem, 4.2vw, 2.4rem)",
          fontWeight: 400,
          lineHeight: 1.1,
        }}
      >
        {title}
      </h2>
    </>
  );

  return (
    <section
      className="relative py-[clamp(10px,2.5vw,40px)] md:py-12 max-md:overflow-hidden max-md:box-border max-md:h-[calc(100dvh-var(--main-header-h))] max-md:py-[clamp(6px,1.6vw,10px)]"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <div className="max-w-[1400px] mx-auto px-[clamp(12px,3.5vw,40px)] max-md:h-full max-md:flex max-md:flex-col max-md:min-h-0">
        {/* Mobile: compact inline header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5, ease: easing }}
          className="md:hidden shrink-0 mb-[clamp(4px,1vw,8px)]"
        >
          {sectionHeader}
        </motion.div>

        {/* Desktop: sticky section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easing }}
          className="hidden md:block sticky z-30 mb-5 md:mb-6 -mx-6 md:-mx-10 px-6 md:px-10 py-3 md:py-4"
          style={{
            top: "var(--main-header-h)",
            backgroundColor: "rgba(245,242,237,0.85)",
            backdropFilter: "blur(10px)",
          }}
        >
          {sectionHeader}
        </motion.div>

        {/* Mobile: hero + bento — one viewport, proportional rows (≈4/4.9 hero + bento) */}
        <div
          className="md:hidden flex-1 min-h-0 grid gap-[clamp(5px,1.4vw,8px)]"
          style={{ gridTemplateRows: "minmax(0, 1.05fr) minmax(0, 1fr)" }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.6, ease: easing }}
            className="min-h-0 h-full"
          >
            <ProductTile
              slot={selection.slot1}
              product={slot1Product}
              fallbackTitle="Handcrafted for you"
              variant="large"
            />
          </motion.div>

          <div
            className="min-h-0 h-full grid grid-cols-2 grid-rows-2 gap-[clamp(5px,1.4vw,8px)]"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.6, delay: 0.06, ease: easing }}
              className="row-span-2 min-h-0 h-full"
            >
              <ProductTile
                slot={selection.slot2}
                product={slot2Product}
                fallbackTitle="Femmora"
                variant="medium"
                showWishlist
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.6, delay: 0.1, ease: easing }}
              className="min-h-0 h-full"
            >
              <TextTile slot={selection.slot3} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.6, delay: 0.14, ease: easing }}
              className="min-h-0 h-full"
            >
              <ProductTile
                slot={selection.slot4}
                product={slot4Product}
                fallbackTitle="Boxy Clutch"
                variant="medium"
              />
            </motion.div>
          </div>
        </div>

        {/* Tablet + desktop grid */}
        <div
          className="hidden md:grid gap-4 md:gap-4 lg:gap-5
                     md:grid-cols-2
                     lg:grid-cols-[5fr_4fr_4fr] lg:grid-rows-2
                     lg:h-[clamp(560px,calc(100vh-var(--main-header-h)-72px),760px)]"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: easing }}
            className="aspect-[4/4.6] lg:row-span-2 lg:aspect-auto lg:h-full"
          >
            <ProductTile
              slot={selection.slot1}
              product={slot1Product}
              fallbackTitle="Grand Bag"
              variant="large"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.08, ease: easing }}
            className="aspect-[4/4.4] lg:aspect-auto lg:h-full"
          >
            <ProductTile
              slot={selection.slot2}
              product={slot2Product}
              fallbackTitle="Femmora Mini"
              variant="medium"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.12, ease: easing }}
            className="aspect-[4/4.4] lg:aspect-auto lg:h-full"
          >
            <TextTile slot={selection.slot3} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.16, ease: easing }}
            className="aspect-[4/4.4] lg:col-span-2 lg:aspect-auto lg:h-full"
          >
            <ProductTile
              slot={selection.slot4}
              product={slot4Product}
              fallbackTitle="Dva Shopper"
              variant="wide"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
