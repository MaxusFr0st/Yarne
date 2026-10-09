import React, { useMemo } from "react";
import { Search, X } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { LangLink } from "../i18n/LangLink";
import { useLangNavigate } from "../i18n/useLangNavigate";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "./PriceTag";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getDefaultColorIndex } from "../utils/productColorIndex";
import { localizedCatalogName } from "../utils/localizedName";
import { resolveDisplayPrice, resolveDisplayEurPrice } from "../utils/variantStock";
import { productCategory, productName } from "../utils/productText";
import { hasSearchTerm, searchProducts, type SearchHit } from "../utils/productSearch";
import type { Product } from "../types/product";

const MAX_RESULTS = 4;

const pillStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "0.74rem",
  letterSpacing: "0.12em",
} as const;

/**
 * The full-screen search: the field, and under it the best few matches from the product list the
 * storefront has already loaded (no request per keystroke). Enter, or "Show all", opens the collection.
 */
export function SearchOverlay({
  term,
  onTermChange,
  onClose,
  onSubmit,
}: {
  term: string;
  onTermChange: (value: string) => void;
  /** Close the overlay (and forget the term when the shopper is leaving for a page). */
  onClose: (opts?: { clear?: boolean }) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const navigate = useLangNavigate();
  const { products, loading } = useProducts();

  const query = term.trim();
  const hits = useMemo(() => (hasSearchTerm(query) ? searchProducts(products, query) : []), [products, query]);
  const shown = hits.slice(0, MAX_RESULTS);

  const showAll = () => {
    onClose({ clear: true });
    navigate(`/collection?q=${encodeURIComponent(query)}`);
  };

  const whyText = (hit: SearchHit<Product>): string | null => {
    if (!hit.why) return null;
    if (hit.why.field === "colour") {
      const color = hit.product.colors[hit.why.colorIndex];
      if (!color) return null;
      return t("searchPanel.colour", { value: localizedCatalogName(color.name, color.nameUk, locale).toLocaleLowerCase(locale) });
    }
    return t("searchPanel.material", { value: hit.why.word });
  };

  const linkStyle = { fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem" } as const;

  return (
    <motion.div
      className="fixed inset-0 z-50"
      style={{ backgroundColor: "rgba(245,242,237,0.96)", backdropFilter: "blur(24px)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* The list can be taller than a short screen: the overlay scrolls inside itself, the page behind is locked. */}
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="min-h-full flex flex-col items-center p-8">
          <motion.div
            className="w-full max-w-2xl"
            // Sits where the centred field used to; the list needs the room under it, and the field must not move as results appear.
            style={{ marginTop: "max(0px, calc(var(--app-svh) / 2 - 11rem))" }}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p
              className="text-[#2D241E]/[0.68] text-center mb-8 tracking-widest uppercase text-xs"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              {t("header.searchTitle")}
            </p>
            <form role="search" className="relative" onSubmit={onSubmit}>
              <input
                type="text"
                name="q"
                value={term}
                onChange={(event) => onTermChange(event.target.value)}
                aria-label={t("header.searchLabel")}
                placeholder={t("header.searchPlaceholder")}
                autoComplete="off"
                autoFocus
                className="w-full bg-transparent border-0 border-b-2 border-[#2D241E]/20 focus:border-[#4A0E0E] focus:outline-none pb-4 text-[#2D241E] placeholder-[#2D241E]/30 text-xl transition-colors duration-300"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              />
              <Search className="absolute right-0 bottom-4 text-[#2D241E]/40" size={22} />
            </form>

            {/* Always in the page, so a screen reader hears the count change as the shopper types. */}
            <p className="sr-only" aria-live="polite">
              {hasSearchTerm(query) && !loading ? t("searchPanel.found", { count: hits.length }) : ""}
            </p>

            <div className="mt-2">
              {!hasSearchTerm(query) ? (
                <div className="flex justify-center pt-3.5">
                  <LangLink
                    to="/collection"
                    onClick={() => onClose({ clear: true })}
                    className="text-[#2D241E]/[0.68] hover:text-[#4A0E0E] underline underline-offset-[3px] transition-colors duration-200"
                    style={linkStyle}
                  >
                    {t("searchPanel.browseAll")}
                  </LangLink>
                </div>
              ) : loading ? null : shown.length === 0 ? (
                <div className="text-center pt-7">
                  <p className="text-[#2D241E] break-words" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.45rem" }}>
                    {t("searchPanel.noResultsTitle", { term: query })}
                  </p>
                  <p
                    className="text-[#2D241E]/[0.68] mt-1.5 mb-4"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}
                  >
                    {t("searchPanel.noResultsHint")}
                  </p>
                  <LangLink
                    to="/collection"
                    onClick={() => onClose({ clear: true })}
                    className="inline-block rounded-full bg-[#2D241E] text-[#F5F2ED] uppercase px-[18px] py-[11px] hover:opacity-90 transition-opacity duration-200"
                    style={pillStyle}
                  >
                    {t("searchPanel.goToCollection")}
                  </LangLink>
                </div>
              ) : (
                <>
                  <ul aria-label={t("searchPanel.resultsLabel")}>
                    {shown.map((hit) => {
                      const product = hit.product;
                      const variant = product.colors[getDefaultColorIndex(product)];
                      // A colour match opens the product in that colour, as a swatch on a card does.
                      const colourMatch = hit.why?.field === "colour" ? product.colors[hit.why.colorIndex] : undefined;
                      const to = colourMatch
                        ? `/product/${product.id}?color=${encodeURIComponent(colourMatch.name)}`
                        : `/product/${product.id}`;
                      const why = whyText(hit);
                      return (
                        <li key={product.id}>
                          <LangLink
                            to={to}
                            onClick={() => onClose({ clear: true })}
                            className="group flex items-center gap-3.5 py-2.5 w-full"
                            style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
                          >
                            <span className="relative shrink-0 w-[46px] h-[58px] rounded-xl overflow-hidden bg-[#EDE9E2]">
                              {variant && (
                                <ImageWithFallback
                                  src={variant.image.src}
                                  focal={{ x: variant.image.focalX, y: variant.image.focalY }}
                                  alt=""
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span
                                className="block text-[#2D241E] group-hover:text-[#4A0E0E] transition-colors duration-200 truncate"
                                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 500, lineHeight: 1.15 }}
                              >
                                {productName(product, locale)}
                              </span>
                              <span
                                className="block text-[#2D241E]/[0.68] truncate"
                                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}
                              >
                                {productCategory(product, locale)}
                                {why ? ` · ${why}` : ""}
                              </span>
                            </span>
                            <PriceTag
                              amount={resolveDisplayPrice(variant, false, product.price)}
                              eurAmount={resolveDisplayEurPrice(variant, false, product.eurPrice)}
                              locale={locale}
                              variant="card"
                              className="shrink-0"
                            />
                          </LangLink>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5">
                    <p
                      className="text-[#2D241E]/[0.68]"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}
                    >
                      {t("searchPanel.found", { count: hits.length })}
                    </p>
                    <button
                      type="button"
                      onClick={showAll}
                      className="rounded-full bg-[#2D241E] text-[#F5F2ED] uppercase px-[18px] py-[11px] cursor-pointer hover:opacity-90 transition-opacity duration-200"
                      style={pillStyle}
                    >
                      {t("searchPanel.showAll", { count: hits.length })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <button
        onClick={() => onClose()}
        className="absolute top-8 right-8 text-[#2D241E]/60 hover:text-[#2D241E] transition-colors"
        aria-label={t("header.closeSearch")}
      >
        <X size={24} />
      </button>
    </motion.div>
  );
}
