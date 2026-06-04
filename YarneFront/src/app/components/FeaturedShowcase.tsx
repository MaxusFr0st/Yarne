import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { useProducts } from "../hooks/useProducts";
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
};

function ProductTile({ slot, product, fallbackTitle, variant }: ProductTileProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const title = product?.name ?? fallbackTitle;
  const price = product?.price;
  const imageSrc =
    resolveMediaUrl(slot.imageUrl) ||
    resolveMediaUrl(product?.colors?.[0]?.image) ||
    PLACEHOLDER_IMG;
  const href = product ? `/product/${product.id}` : "/collection";

  const isLarge = variant === "large";
  const imageFitClass = "object-cover";
  const eyebrow = slot.eyebrow.trim();
  const ctaLabel = slot.ctaLabel.trim();

  return (
    <LangLink
      to={href}
      className="group relative block w-full h-full overflow-hidden rounded-[28px] md:rounded-[32px] bg-[#EDE9E2]"
      aria-label={t("showcase.openProduct", { title })}
    >
      <Img
        src={imageSrc}
        alt={title}
        className={`absolute inset-0 w-full h-full ${imageFitClass} transition-transform duration-700 group-hover:scale-[1.04]`}
      />

      {isLarge ? (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(45,36,30,0.65) 0%, rgba(45,36,30,0.15) 45%, transparent 75%)",
          }}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(45,36,30,0.45) 0%, rgba(45,36,30,0.05) 50%, transparent 100%)",
          }}
        />
      )}

      <div
        className={`relative z-10 h-full flex flex-col justify-end ${
          isLarge ? "p-6 md:p-7" : "p-5 md:p-6"
        }`}
      >
        {eyebrow.length > 0 && (
          <p
            className="text-white/80 uppercase mb-2"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.22em",
              fontSize: "0.62rem",
            }}
          >
            {eyebrow}
          </p>
        )}

        <h3
          className="text-white"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: isLarge ? "clamp(1.6rem, 2.4vw, 2.2rem)" : "1.3rem",
            lineHeight: 1.1,
          }}
        >
          {title}
        </h3>

        {!isLarge && typeof price === "number" && (
          <p
            className="text-white/85 mt-1.5"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.04em",
            }}
          >
            {product?.isNew
              ? t("product.fromPrice", { price: formatPrice(price, locale) })
              : formatPrice(price, locale)}
          </p>
        )}

        {isLarge && ctaLabel.length > 0 && (
          <span
            className="mt-4 inline-flex items-center gap-2 text-white"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
            }}
          >
            <span className="uppercase tracking-widest">{ctaLabel}</span>
            <ArrowRight
              size={14}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </span>
        )}
      </div>
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
      className="group relative block w-full h-full overflow-hidden rounded-[28px] md:rounded-[32px]"
      style={{ backgroundColor: "#2D241E" }}
    >
      <div className="relative z-10 h-full flex flex-col justify-between p-6 md:p-7">
        <div>
          {eyebrow.length > 0 && (
            <p
              className="text-white/55 uppercase"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.22em",
                fontSize: "0.62rem",
              }}
            >
              {eyebrow}
            </p>
          )}
          {heading.length > 0 && (
            <h3
              className="text-white mt-3"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontStyle: "italic",
                fontWeight: 500,
                fontSize: "clamp(1.25rem, 2vw, 1.7rem)",
                lineHeight: 1.2,
              }}
            >
              {heading}
            </h3>
          )}
        </div>

        {ctaLabel.length > 0 && (
          <span
            className="inline-flex items-center gap-1.5 text-white/85 group-hover:text-white transition-colors duration-300 mt-6"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.8rem",
              letterSpacing: "0.04em",
            }}
          >
            <span>{ctaLabel}</span>
            <ArrowUpRight
              size={15}
              className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
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

  // Until per-locale CMS strings ship (Phase 5), the admin's value applies to
  // both languages. If the admin hasn't set anything, fall back to the
  // locale-aware default.
  const eyebrow =
    selection.eyebrow.trim() ||
    t("showcase.defaultEyebrow", { defaultValue: DEFAULT_SHOWCASE_EYEBROW });
  const title =
    selection.title.trim() ||
    t("showcase.defaultTitle", { defaultValue: DEFAULT_SHOWCASE_TITLE });

  return (
    <section
      className="relative py-10 md:py-12"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Sticky section header — pins below the main fixed header while
            the inner grid scrolls past, then releases when the section ends. */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: easing }}
          className="sticky z-30 mb-5 md:mb-6 -mx-6 md:-mx-10 px-6 md:px-10 py-3 md:py-4"
          style={{
            top: "var(--main-header-h)",
            backgroundColor: "rgba(245,242,237,0.85)",
            backdropFilter: "blur(10px)",
          }}
        >
          <p
            className="text-[#2D241E]/40 uppercase mb-1.5"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.22em",
              fontSize: "0.65rem",
            }}
          >
            {eyebrow}
          </p>
          <h2
            className="text-[#2D241E]"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(1.5rem, 3.2vw, 2.4rem)",
              fontWeight: 400,
              lineHeight: 1.15,
            }}
          >
            {title}
          </h2>
        </motion.div>

        {/* Responsive grid:
            mobile  : 1 col, 4 stacked tiles
            tablet  : 2 cols x 2 rows
            desktop : 3 cols x 2 rows, slot 1 spans both rows, slot 4 spans
                      cols 2 + 3 with a bounded height for viewport safety
        */}
        <div
          className="grid gap-4 md:gap-4 lg:gap-5
                     grid-cols-1
                     md:grid-cols-2
                     lg:grid-cols-[5fr_4fr_4fr] lg:grid-rows-2
                     lg:h-[clamp(560px,calc(100vh-var(--main-header-h)-72px),760px)]"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: easing }}
            className="aspect-[4/4.8] md:aspect-[4/4.6] lg:row-span-2 lg:aspect-auto lg:h-full"
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
            className="aspect-[4/4.5] md:aspect-[4/4.4] lg:aspect-auto lg:h-full"
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
            className="aspect-[4/4.5] md:aspect-[4/4.4] lg:aspect-auto lg:h-full"
          >
            <TextTile slot={selection.slot3} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.16, ease: easing }}
            className="aspect-[4/4.5] md:aspect-[4/4.4] lg:col-span-2 lg:aspect-auto lg:h-full"
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
