import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { ArrowLeft, ChevronDown, ShoppingBag, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { useProduct, useProducts } from "../hooks/useProducts";
import { useCart } from "../context/AppContext";
import { getDefaultColorIndex, getDefaultFurnitureColorIndex } from "../utils/productColorIndex";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { CrossfadeImage } from "../components/figma/CrossfadeImage";
import { ProductCard } from "../components/ProductCard";
import { LangLink } from "../i18n/LangLink";
import { MobileProductDetailView } from "../components/MobileProductDetailView";
import { getSupplementaryProductDetails, hasSupplementaryProductDetails } from "../utils/productDetails";
import { MobileRelatedProducts } from "../components/MobileRelatedProducts";
import { ProductGuaranteeBlock } from "../components/ProductGuaranteeBlock";
import { resolveDisplayImages } from "../utils/variantImages";
import { resolveDisplayPrice, resolveDisplayEurPrice } from "../utils/variantStock";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import { scrollToPageTop } from "../utils/scrollToTop";
import { clearScrollForRoute } from "../utils/scrollRestoration";
import { localizedCatalogName } from "../utils/localizedName";
import {
  getEmptyProductGuaranteeContent,
  loadProductGuaranteeContent,
  type ProductGuaranteeContent,
} from "../utils/productGuaranteeContent";
import type { Product, ProductImage } from "../types/product";

const easing = [0.25, 0.1, 0.25, 1] as const;
export function ProductDetail() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart } = useCart();
  const { product, loading } = useProduct(id);
  const { products } = useProducts();
  const related = useMemo(() => {
    const fromApi = product?.suggestedProducts ?? [];
    if (fromApi.length > 0) return fromApi;

    const codes = product?.suggestedProductCodes ?? [];
    if (product?.hasConfiguredSuggestions) {
      if (codes.length > 0) {
        const resolved = codes
          .map((code) => products.find((p) => p.id === code))
          .filter((p): p is Product => p !== undefined && p.id !== id);
        return resolved;
      }
      return [];
    }

    return products.filter((p) => p.id !== id).slice(0, 3);
  }, [product, products, id]);

  const [activeColor, setActiveColor] = useState(0);
  const [activeFurniture, setActiveFurniture] = useState(0);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeLace, setActiveLace] = useState(false);
  const [addedToBag, setAddedToBag] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
  // Tracks the sticky info column's real height so the image can animate to match it. A callback
  // ref (not useEffect+useRef) because the column only mounts once the product has loaded —
  // an effect with an empty dep array would run before that node exists and never reattach,
  // which is exactly what left the image frozen at its fallback height.
  const [infoColHeight, setInfoColHeight] = useState<number | null>(null);
  const infoColObserverRef = useRef<ResizeObserver | null>(null);
  const infoColRef = useCallback((el: HTMLDivElement | null) => {
    infoColObserverRef.current?.disconnect();
    infoColObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setInfoColHeight(entry.contentRect.height);
    });
    observer.observe(el);
    infoColObserverRef.current = observer;
  }, []);
  // Same measure-don't-guess approach for the furniture panel itself: its natural content height
  // is measured once (and on any resize), then the panel animates to that known number instead of
  // framer-motion's height:"auto", which re-measures on every toggle and was the actual source of
  // the lag (the image chasing that re-measured value downstream just made it visible).
  const [furnitureContentHeight, setFurnitureContentHeight] = useState(0);
  const furnitureObserverRef = useRef<ResizeObserver | null>(null);
  const furnitureContentRef = useCallback((el: HTMLDivElement | null) => {
    furnitureObserverRef.current?.disconnect();
    furnitureObserverRef.current = null;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setFurnitureContentHeight(entry.contentRect.height);
    });
    observer.observe(el);
    furnitureObserverRef.current = observer;
  }, []);
  const supplementaryDetails = useMemo(
    () => (product ? getSupplementaryProductDetails(product) : []),
    [product]
  );
  const showSupplementaryDetails = product ? hasSupplementaryProductDetails(product) : false;
  const [guaranteeContent, setGuaranteeContent] = useState<ProductGuaranteeContent>(
    getEmptyProductGuaranteeContent
  );

  useLayoutEffect(() => {
    scrollToPageTop();
    clearScrollForRoute(location.pathname, location.search);
  }, [id, location.pathname, location.search]);

  useEffect(() => {
    if (loading || !product) return;
    scrollToPageTop();
    const raf = requestAnimationFrame(() => scrollToPageTop());
    const timer = window.setTimeout(() => scrollToPageTop(), 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [id, loading, product?.id, location.pathname, location.search]);

  useEffect(() => {
    void loadProductGuaranteeContent().then(setGuaranteeContent);
  }, []);

  const colorScopedSizes = product
    ? Array.from(
        new Set([
          ...Object.keys(product.colors[activeColor]?.sizeImages ?? {}),
          ...Object.keys(product.colors[activeColor]?.laceVariants ?? {}),
        ])
      )
    : [];
  const displaySizes =
    colorScopedSizes.length > 0
      ? colorScopedSizes
      : (product?.sizes ?? []).map((s) => s.name);

  // A shopper who picked a color on the card arrives expecting that color, not the product's
  // default — cards link here with ?color=<name>. Read per render rather than stored in state so
  // browser back/forward between two colors of the same product lands on the right one.
  const requestedColor = new URLSearchParams(location.search).get("color");
  // Layout, not plain effect: a plain effect runs after the browser has painted, so the page
  // showed one frame of the product's default colour before correcting to the chosen one — a
  // visible flash of the wrong bag, and with the crossfade in place it was a wrong-photo fade
  // rather than a blink. Running before paint means the first frame is already correct.
  useLayoutEffect(() => {
    if (!product) return;
    setActiveColor(getDefaultColorIndex(product, requestedColor));
    setActiveFurniture(getDefaultFurnitureColorIndex(product));
    setActiveImage(0);
  }, [product?.id, requestedColor]);

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
    const colorIndices = new Set<number>([activeColor]);
    if (activeColor > 0) colorIndices.add(activeColor - 1);
    if (activeColor < product.colors.length - 1) colorIndices.add(activeColor + 1);

    const seen = new Set<string>();
    for (const colorIndex of colorIndices) {
      const color = product.colors[colorIndex];
      if (!color) continue;
      const imgs = resolveDisplayImages(product, color, activeSize, activeLace);
      for (const entry of imgs) {
        const resolved = resolveMediaUrl(entry.src);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        const img = new Image();
        img.src = resolved;
      }
    }
  }, [product, activeColor, activeSize, activeLace]);

  if (!loading && !product) {
    return (
      <main
        className="min-h-[100vh] flex flex-col items-center justify-center"
        style={{ backgroundColor: "#F5F2ED" }}
      >
        <p
          className="text-[#2D241E]/50"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
        >
          {t("product.notFound")}
        </p>
        <LangLink
          to="/collection"
          className="mt-6 text-[#2D241E] underline text-sm"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {t("checkout.backToCollection")}
        </LangLink>
      </main>
    );
  }

  const selectedColor = product?.colors[activeColor];
  const selectedColorLabel = selectedColor
    ? localizedCatalogName(selectedColor.name, selectedColor.nameUk, locale)
    : "";
  const furnitureList = product?.furnitureColors ?? [];
  // Hardware colour is a strap detail — only relevant once the strap itself is selected.
  const showFurniture = furnitureList.length > 0 && (product?.lace !== true || activeLace);
  const selectedFurniture = furnitureList[activeFurniture];
  const selectedFurnitureLabel = selectedFurniture
    ? localizedCatalogName(selectedFurniture.name, selectedFurniture.nameUk, locale)
    : "";
  const images = product && selectedColor
    ? resolveDisplayImages(product, selectedColor, activeSize, activeLace)
    : [];
  const safeImageIndex = images.length ? Math.min(activeImage, images.length - 1) : 0;

  const handleColorChange = (i: number) => {
    setActiveColor(i);
    setActiveImage(0);
  };

  const handleFurnitureChange = (i: number) => {
    setActiveFurniture(i);
  };

  const handleLaceChange = (next: boolean) => {
    setActiveLace(next);
    setActiveImage(0);
  };

  const handleAddToBag = () => {
    if (!product || !selectedColor) return;
    if (!activeSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    addToCart({
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      price: resolveDisplayPrice(selectedColor, activeLace, product.price),
      eurPrice: resolveDisplayEurPrice(selectedColor, activeLace, product.eurPrice) ?? undefined,
      color: selectedColor.name,
      colorId: selectedColor.colorId,
      colorHex: selectedColor.hex,
      colorUk: selectedColor.nameUk,
      furnitureColor: showFurniture ? selectedFurniture?.name : undefined,
      furnitureColorHex: showFurniture ? selectedFurniture?.hex : undefined,
      furnitureColorUk: showFurniture ? selectedFurniture?.nameUk : undefined,
      size: activeSize,
      sizeUk: product.sizes.find((s) => s.name === activeSize)?.nameUk,
      withLace: product.lace ? activeLace : null,
      quantity: 1,
      image: images[0]?.src ?? selectedColor.image.src,
    });
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  const displayPrice = product ? resolveDisplayPrice(selectedColor, activeLace, product.price) : 0;
  const displayEurPrice = product ? resolveDisplayEurPrice(selectedColor, activeLace, product.eurPrice) : null;

  return (
    // No overflow-x here at all: the viewport already clips sideways (see html in theme.css),
    // and any value other than `visible` on this element would make it a scroll container and
    // leave the mobile gallery's `position: sticky` inert.
    <main className="min-h-[100vh]" style={{ backgroundColor: "#F3EFE8" }}>
      {/* Compared against null rather than through a Boolean() flag, so everything below is
          narrowed to a loaded product. The flag version rendered exactly the same thing but told
          the type checker nothing, which is why the branch was littered with `product!`. */}
      {product === null ? (
        <div className="min-h-[50vh]" aria-busy="true" />
      ) : (
        <>
      <MobileProductDetailView
        product={product!}
        images={images}
        locale={locale}
        displayPrice={displayPrice}
        displayEurPrice={displayEurPrice}
        activeColor={activeColor}
        activeFurniture={activeFurniture}
        activeSize={activeSize}
        displaySizes={displaySizes}
        addedToBag={addedToBag}
        sizeError={sizeError}
        laceEnabled={product!.lace === true}
        activeLace={activeLace}
        onLaceChange={handleLaceChange}
        onBack={() => navigate(-1)}
        onColorChange={handleColorChange}
        onFurnitureChange={handleFurnitureChange}
        onSizeChange={(size) => { setActiveSize(size); setSizeError(false); }}
        onAddToBag={handleAddToBag}
        guaranteeContent={guaranteeContent}
      />

      {related.length > 0 && <MobileRelatedProducts products={related} />}

      {/* ── Desktop layout ── */}
      <div className="hidden md:block max-w-[1360px] mx-auto px-6 md:px-12 pt-[calc(var(--main-header-h)+16px)] pb-[120px]">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2D241E]/45 hover:text-[#2D241E] transition-colors duration-300 mb-5 group"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.76rem", letterSpacing: "0.1em" }}
        >
          <ArrowLeft size={15} strokeWidth={1.5} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span>{t("product.back")}</span>
        </button>

        <div className="grid md:grid-cols-2 lg:grid-cols-[88px_1fr_420px] gap-6 items-stretch mt-0">
          {/* Col 1: thumbnail rail (lg+) — fixed-size thumbs, doesn't stretch */}
          <div className="hidden lg:flex flex-col gap-2.5 self-start">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImage(i)}
                className="rounded-2xl overflow-hidden aspect-square cursor-pointer transition-opacity duration-300"
                style={{ boxShadow: safeImageIndex === i ? "0 0 0 2px #2D241E" : "none", opacity: safeImageIndex === i ? 1 : 0.55 }}
              >
                <ImageWithFallback
                  src={img.src}
                  focal={{ x: img.focalX, y: img.focalY }}
                  alt={`${selectedColorLabel} - ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          {/* Col 2: main image — height tracks the info column so it resizes with the furniture
              panel. Uses a spring, not a fixed-duration tween: the target (infoColHeight) updates
              on every ResizeObserver tick while the panel animates, and a duration-based tween
              restarts its full 0.35s clock on every one of those retargets — so it kept chasing
              a moving goalpost and finished ~350ms after the real content had already settled,
              which is exactly the "lags on close" symptom. A spring converges toward a moving
              target continuously instead of resetting, so it tracks in real time either direction.
              max-height keeps it from ever exceeding the viewport, with margin below. */}
          <div className="w-full flex flex-col self-start">
            <motion.div
              className="relative rounded-[28px] overflow-hidden bg-[#EDE9E2] max-h-[calc(100dvh-200px)]"
              initial={false}
              animate={{ height: Math.max(740, infoColHeight ?? 740) }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32 }}
              style={{ boxShadow: "0 20px 44px -20px rgba(45,36,30,0.18)" }}
            >
              {images.length > 0 && (
                <CrossfadeImage
                  src={images[safeImageIndex].src}
                  focal={{ x: images[safeImageIndex].focalX, y: images[safeImageIndex].focalY }}
                  alt={`${product!.name} – ${selectedColorLabel}`}
                  priority
                />
              )}

              {/* Badges */}
              <div className="absolute top-5 left-5 flex gap-2">
                {product.isNew && (
                  <span
                    className="px-3.5 py-1.5 rounded-2xl"
                    style={{ backgroundColor: "#fff", color: "#2D241E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em", fontSize: "0.62rem" }}
                  >
                    {t("product.badgeNew")}
                  </span>
                )}
                {product.isBestseller && (
                  <span
                    className="px-3.5 py-1.5 rounded-2xl"
                    style={{ backgroundColor: "rgba(255,255,255,0.85)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", fontSize: "0.62rem" }}
                  >
                    {t("product.badgeBestseller")}
                  </span>
                )}
              </div>
            </motion.div>

            {/* Thumbnail strip — fallback for md (below lg rail) */}
            <div className="flex gap-2.5 mt-3 lg:hidden">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className="flex-1 rounded-[18px] overflow-hidden bg-[#EDE9E2] transition-all duration-300 ease-out cursor-pointer h-[110px]"
                  style={{
                    opacity: safeImageIndex === i ? 1 : 0.45,
                    border: safeImageIndex === i ? "2px solid #2D241E" : "2px solid transparent",
                    transform: safeImageIndex === i ? "scale(1)" : "scale(0.98)",
                  }}
                >
                  <ImageWithFallback
                    src={img.src}
                    focal={{ x: img.focalX, y: img.focalY }}
                    alt={`${selectedColorLabel} - ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Col 3: Product Info */}
          <div
            ref={infoColRef}
            className="flex flex-col gap-3 md:sticky md:top-[calc(var(--main-header-h)+24px)]"
          >
            <div>
              <p
                className="text-[#2D241E]/40 uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", letterSpacing: "0.18em" }}
              >
                {product.category}
              </p>
              <h1
                className="text-[#2D241E] text-pretty mt-2.5"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.9rem, 3.4vw, 2.7rem)", fontWeight: 500, lineHeight: 1.05 }}
              >
                {product.name}
              </h1>
              <p
                className="text-[#2D241E]/50 mt-2"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
              >
                {product.subtitle}
              </p>
              <p
                className="text-[#2D241E]/60 mt-4"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem", lineHeight: 1.75, whiteSpace: "pre-line" }}
              >
                {product.description}
              </p>
            </div>

            {/* Buy box — price, colour, size, add to cart grouped in one card */}
            <div
              className="rounded-[24px] p-5 flex flex-col gap-[14px]"
              style={{ backgroundColor: "#fff", boxShadow: "0 16px 36px -18px rgba(45,36,30,0.14)" }}
            >
              <PriceTag amount={displayPrice} eurAmount={displayEurPrice} locale={locale} variant="display" />

              {/* Colour */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p
                    className="text-[#2D241E]/45 uppercase"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em" }}
                  >
                    {t("product.colour")}
                  </p>
                  <p className="text-[#2D241E]/55 text-xs" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={selectedColorLabel}
                        initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, ease: easing }}
                      >
                        {selectedColorLabel}
                      </motion.span>
                    </AnimatePresence>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5 pl-1.5">
                  {product.colors.map((color, i) => {
                    const colorLabel = localizedCatalogName(color.name, color.nameUk, locale);
                    const isActive = i === activeColor;
                    return (
                      <motion.button
                        key={color.name}
                        type="button"
                        onClick={() => handleColorChange(i)}
                        title={colorLabel}
                        aria-label={colorLabel}
                        aria-pressed={isActive}
                        className="cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                        animate={{ scale: isActive ? 1.06 : 1 }}
                        transition={{ duration: 0.2, ease: easing }}
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          backgroundColor: color.hex,
                          border: isActive ? "none" : "1.5px solid rgba(45,36,30,0.2)",
                          boxShadow: isActive ? "0 0 0 2px #fff, 0 0 0 3.5px #2D241E" : "none",
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Lace */}
              {product.lace === true && (
                <div>
                  <p
                    className="text-[#2D241E]/45 uppercase mb-2.5"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em" }}
                  >
                    {t("product.lace.label")}
                  </p>
                  <LayoutGroup id="desktop-lace">
                    <div
                      className="relative inline-flex p-1 rounded-full"
                      style={{ backgroundColor: "rgba(45,36,30,0.06)", border: "1px solid rgba(45,36,30,0.12)" }}
                    >
                      {[
                        { value: false, label: t("product.lace.withoutLace") },
                        { value: true, label: t("product.lace.withLace") },
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
                              transition={{ duration: reduceMotion ? 0 : 0.2, ease: easing }}
                            />
                          )}
                          <span className="relative">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </LayoutGroup>
                </div>
              )}

              {/* Furniture / hardware — only relevant once a strap is chosen. Stays mounted
                  (whenever the product has furniture options at all) so its natural height can
                  be measured directly via ResizeObserver, instead of asking framer-motion to
                  animate to height:"auto" — which has to re-measure content on every mount/toggle,
                  and compounded with the col2 image also chasing that ambiguous, re-measured
                  value downstream, produced the animation lag. Both ends now animate to a stable,
                  pre-known number. */}
              {furnitureList.length > 0 && (
                <motion.div
                  animate={{ height: showFurniture ? furnitureContentHeight : 0, opacity: showFurniture ? 1 : 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35, ease: easing }}
                  className="overflow-hidden"
                >
                  <div ref={furnitureContentRef} aria-hidden={!showFurniture} style={{ pointerEvents: showFurniture ? undefined : "none" }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <p
                      className="text-[#2D241E]/45 uppercase"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em" }}
                    >
                      {t("product.furniture")}
                    </p>
                    <p className="text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={selectedFurnitureLabel}
                          initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: easing }}
                        >
                          {selectedFurnitureLabel}
                        </motion.span>
                      </AnimatePresence>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5 py-2 pl-1.5">
                    {furnitureList.map((fc, i) => {
                      const furnitureLabel = localizedCatalogName(fc.name, fc.nameUk, locale);
                      const isActive = i === activeFurniture;
                      return (
                        <motion.button
                          key={fc.name}
                          type="button"
                          disabled={!showFurniture}
                          onClick={() => handleFurnitureChange(i)}
                          title={furnitureLabel}
                          aria-label={furnitureLabel}
                          aria-pressed={isActive}
                          className="cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                          animate={{ scale: isActive ? 1.06 : 1 }}
                          transition={{ duration: 0.2, ease: easing }}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            backgroundColor: fc.hex,
                            border: isActive ? "none" : "1.5px solid rgba(45,36,30,0.2)",
                            boxShadow: isActive ? "0 0 0 2px #fff, 0 0 0 3.5px #2D241E" : "none",
                            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                  </div>
                </motion.div>
              )}

              {/* Size */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p
                    className="text-[#2D241E]/45 uppercase"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.66rem", letterSpacing: "0.12em" }}
                  >
                    {t("product.size")}
                  </p>
                  <button
                    type="button"
                    className="text-[#2D241E]/45 hover:text-[#4A0E0E] transition-colors duration-200 underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 rounded-sm"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem" }}
                  >
                    {t("product.sizeGuide")}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {displaySizes.map((size) => {
                    const sizeMeta = product?.sizes.find((s) => s.name === size);
                    const sizeLabel = localizedCatalogName(size, sizeMeta?.nameUk, locale);
                    const single = displaySizes.length === 1;
                    const isActive = activeSize === size;
                    return (
                      <motion.button
                        key={size}
                        type="button"
                        onClick={() => { setActiveSize(size); setSizeError(false); }}
                        aria-pressed={isActive}
                        className="rounded-full cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
                        animate={reduceMotion ? undefined : { scale: isActive && !single ? 1.02 : 1 }}
                        transition={{ duration: 0.2, ease: easing }}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: "0.78rem",
                          letterSpacing: "0.06em",
                          minHeight: "40px",
                          minWidth: single ? undefined : "48px",
                          padding: single ? "10px 24px" : "8px 14px",
                          // Single size: quiet status chip — solid ink reserved for Add to bag
                          backgroundColor: single
                            ? "rgba(45,36,30,0.06)"
                            : isActive
                              ? "#2D241E"
                              : "transparent",
                          color: single || !isActive ? "#2D241E" : "#F5F2ED",
                          border: single
                            ? "1px solid rgba(45,36,30,0.15)"
                            : isActive
                              ? "1.5px solid #2D241E"
                              : sizeError
                                ? "1.5px solid rgba(74,14,14,0.5)"
                                : "1.5px solid rgba(45,36,30,0.2)",
                          transition: "background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease",
                        }}
                      >
                        {sizeLabel}
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {sizeError && (
                    <motion.p
                      className="text-[#4A0E0E] text-xs mt-2"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="status"
                      aria-live="polite"
                    >
                      {t("product.selectSize")}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5">
                <motion.button
                  type="button"
                  onClick={handleAddToBag}
                  className="flex-1 h-[54px] rounded-[27px] flex items-center justify-center gap-2.5 text-white touch-manipulation transition-[background-color,opacity] duration-200 hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  style={{
                    backgroundColor: addedToBag ? "#2D5928" : "#2D241E",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.74rem",
                    letterSpacing: "0.14em",
                  }}
                  whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                >
                  {addedToBag ? (
                    <>
                      <Check size={15} aria-hidden="true" />
                      <span className="uppercase tracking-widest">{t("product.addedToBag")}</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={15} strokeWidth={1.5} aria-hidden="true" />
                      <span className="uppercase tracking-widest">{t("product.addToBag")}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Details Accordion */}
            {showSupplementaryDetails ? (
              <div>
                <button
                  onClick={() => setDetailsOpen(!detailsOpen)}
                  className="w-full flex items-center justify-between pb-3 text-left group"
                  style={{ borderBottom: "1px solid rgba(45,36,30,0.1)" }}
                >
                  <span className="text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem" }}>
                    {t("product.detailsTitle")}
                  </span>
                  <motion.div animate={{ rotate: detailsOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                    <ChevronDown size={14} className="text-[#2D241E]/35" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {detailsOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: easing }}
                      className="overflow-hidden pt-3 space-y-2"
                    >
                      {product.producerName ? (
                        <li
                          key="producer"
                          className="flex items-start gap-3 text-[#2D241E]/60 text-sm"
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-[#4A0E0E] flex-shrink-0" />
                          {t("product.madeBy", { name: product.producerName })}
                        </li>
                      ) : null}
                      {supplementaryDetails.map((detail) => (
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
            ) : null}

            <ProductGuaranteeBlock content={guaranteeContent} locale={locale} />
          </div>
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
                {t("product.relatedEyebrow")}
              </p>
              <h2
                className="text-[#2D241E]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400 }}
              >
                {t("product.relatedTitle")}
              </h2>
            </div>
            <LangLink
              to="/collection"
              className="hidden md:flex items-center gap-2 text-[#2D241E]/50 hover:text-[#4A0E0E] text-xs transition-colors uppercase tracking-widest"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
            >
              {t("common.viewAll")}
            </LangLink>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} size="small" />
            ))}
          </div>
        </section>
      )}
        </>
      )}
    </main>
  );
}
