import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "motion/react";
import { ArrowLeft, Heart, ChevronDown, ShoppingBag, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { useProduct, useProducts } from "../hooks/useProducts";
import { useCart, useWishlist } from "../context/AppContext";
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
import { resolveDisplayStock } from "../utils/variantStock";
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
  const { wishlist, toggleWishlist } = useWishlist();
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
          .filter((p): p is Product => Boolean(p) && p.id !== id);
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
  const [activeLaceColorId, setActiveLaceColorId] = useState<number | null>(null);
  const [addedToBag, setAddedToBag] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [sizeError, setSizeError] = useState(false);
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

  useEffect(() => {
    if (!product) return;
    setActiveColor(getDefaultColorIndex(product));
    setActiveFurniture(getDefaultFurnitureColorIndex(product));
    setActiveImage(0);
  }, [product?.id]);

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
        className="min-h-[100svh] flex flex-col items-center justify-center"
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

  const showContent = Boolean(product);

  const isWishlisted = product ? wishlist.includes(product.id) : false;
  const selectedColor = product?.colors[activeColor];
  const selectedColorLabel = selectedColor
    ? localizedCatalogName(selectedColor.name, selectedColor.nameUk, locale)
    : "";
  const furnitureList = product?.furnitureColors ?? [];
  const selectedFurniture = furnitureList[activeFurniture];
  const selectedFurnitureLabel = selectedFurniture
    ? localizedCatalogName(selectedFurniture.name, selectedFurniture.nameUk, locale)
    : "";
  const displayStock = product && selectedColor
    ? resolveDisplayStock(selectedColor, activeSize, activeLace, product.stock)
    : 0;
  const images = product && selectedColor
    ? resolveDisplayImages(product, selectedColor, activeSize, activeLace)
    : [];
  const safeImageIndex = images.length ? Math.min(activeImage, images.length - 1) : 0;

  // Lace color options: only present once the bag's recipe has been reconfigured with colors
  // (see admin recipe editor). Default resolution — match the bag's own selected color, else
  // fall back to the first configured option — happens client-side; the server only validates.
  const laceColorOptions = product?.laceColorOptions ?? [];
  const selectedLaceOption = laceColorOptions.find((o) => o.colorId === activeLaceColorId) ?? null;

  useEffect(() => {
    if (!activeLace || laceColorOptions.length === 0) return;
    const bagColorId = selectedColor?.colorId;
    const stillValid = laceColorOptions.some((o) => o.colorId === activeLaceColorId);
    if (stillValid) return;
    const matched = bagColorId != null
      ? laceColorOptions.find((o) => o.colorId === bagColorId)
      : undefined;
    setActiveLaceColorId((matched ?? laceColorOptions[0]).colorId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLace, selectedColor?.colorId, laceColorOptions.map((o) => o.colorId).join(",")]);

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

  const handleLaceColorChange = (colorId: number) => {
    setActiveLaceColorId(colorId);
  };

  const laceSurchargeForCart = laceColorOptions.length > 0
    ? selectedLaceOption?.surcharge ?? 0
    : product?.laceSurcharge ?? 0;

  const handleAddToBag = () => {
    if (!product || !selectedColor) return;
    if (!activeSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    if (displayStock <= 0) return;
    addToCart({
      productId: product.id,
      name: product.name,
      subtitle: product.subtitle,
      price: product.price + (product.lace === true && activeLace ? laceSurchargeForCart : 0),
      color: selectedColor.name,
      colorHex: selectedColor.hex,
      furnitureColor: selectedFurniture?.name,
      furnitureColorHex: selectedFurniture?.hex,
      size: activeSize,
      withLace: product.lace ? activeLace : null,
      laceColorId: product.lace && activeLace ? (selectedLaceOption?.colorId ?? null) : null,
      quantity: 1,
      maxQuantity: displayStock,
      image: images[0]?.src ?? selectedColor.image.src,
    });
    setAddedToBag(true);
    setTimeout(() => setAddedToBag(false), 2500);
  };

  const outOfStock = displayStock <= 0;

  // With-lace price is computed fresh: base price + the server-provided lace surcharge (the
  // selected color's component price when color options are configured, else the legacy
  // single surcharge for un-migrated products). Never hardcoded.
  const displayPrice = product
    ? product.price + (product.lace === true && activeLace ? laceSurchargeForCart : 0)
    : 0;

  return (
    <main className="overflow-x-hidden min-h-[100svh]" style={{ backgroundColor: "#F5F2ED" }}>
      {!showContent ? (
        <div className="min-h-[50svh]" aria-busy="true" />
      ) : (
        <>
      <MobileProductDetailView
        product={product!}
        images={images}
        locale={locale}
        displayPrice={displayPrice}
        activeColor={activeColor}
        activeFurniture={activeFurniture}
        activeSize={activeSize}
        displaySizes={displaySizes}
        isWishlisted={isWishlisted}
        addedToBag={addedToBag}
        sizeError={sizeError}
        outOfStock={outOfStock}
        displayStock={displayStock}
        laceEnabled={product!.lace === true}
        activeLace={activeLace}
        onLaceChange={handleLaceChange}
        laceColorOptions={laceColorOptions}
        activeLaceColorId={activeLaceColorId}
        onLaceColorChange={handleLaceColorChange}
        onBack={() => navigate(-1)}
        onToggleWishlist={() => toggleWishlist(product.id)}
        onColorChange={handleColorChange}
        onFurnitureChange={handleFurnitureChange}
        onSizeChange={(size) => { setActiveSize(size); setSizeError(false); }}
        onAddToBag={handleAddToBag}
        guaranteeContent={guaranteeContent}
      />

      {related.length > 0 && <MobileRelatedProducts products={related} />}

      {/* ── Desktop layout ── */}
      <div className="hidden md:block max-w-[1400px] mx-auto px-5 md:px-10 pt-24 pb-24">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#2D241E]/50 hover:text-[#2D241E] transition-colors duration-300 mb-5 group"
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="uppercase tracking-widest">{t("product.back")}</span>
        </button>

        <div className="grid md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] gap-6 md:gap-8 lg:gap-12 items-start mt-0">
          {/* Left: Image Gallery */}
          <div
            className="w-full max-w-[335px] sm:max-w-[380px] mx-auto md:max-w-none md:mx-0 lg:max-w-[620px] lg:justify-self-center"
          >
            {/* Main Image */}
            <div className="relative rounded-[34px] sm:rounded-[40px] overflow-hidden bg-[#EDE9E2] h-[min(64svh,430px)] min-h-[320px] sm:min-h-[340px] md:h-[min(62svh,640px)] md:min-h-[440px] lg:h-[min(68svh,720px)] lg:min-h-[500px]">
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
                    className="px-3 py-1 rounded-full text-xs text-white"
                    style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em", fontSize: "0.65rem" }}
                  >
                    {t("product.badgeNew")}
                  </span>
                )}
                {product.isBestseller && (
                  <span
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ backgroundColor: "rgba(245,242,237,0.9)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em", fontSize: "0.65rem" }}
                  >
                    {t("product.badgeBestseller")}
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
                    src={img.src}
                    focal={{ x: img.focalX, y: img.focalY }}
                    alt={`${selectedColorLabel} - ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>

          </div>

          {/* Right: Product Info */}
          <div
            className="flex flex-col gap-5 md:sticky md:top-[calc(var(--main-header-h)+24px)]"
          >
            {/* Category */}
            <p
              className="text-[#2D241E]/45 tracking-widest uppercase text-[0.7rem]"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
            >
              {product.category}
            </p>

            {/* Name & Price */}
            <div className="-mt-1">
              <h1
                className="text-[#2D241E] text-pretty"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 400, lineHeight: 1.15 }}
              >
                {product.name}
              </h1>
              <p
                className="text-[#2D241E]/60 mt-1.5"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.875rem" }}
              >
                {product.subtitle}
              </p>
              <PriceTag amount={displayPrice} locale={locale} variant="display" className="mt-3" />
            </div>

            {/* Color Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  {t("product.colour")}
                </p>
                <p
                  className="text-[#2D241E]/60 text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
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
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((color, i) => {
                  const colorLabel = localizedCatalogName(color.name, color.nameUk, locale);
                  return (
                  <motion.button
                    key={color.name}
                    type="button"
                    onClick={() => handleColorChange(i)}
                    title={colorLabel}
                    aria-label={colorLabel}
                    aria-pressed={i === activeColor}
                    className="cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
                    animate={{ scale: i === activeColor ? 1.06 : 1 }}
                    transition={{ duration: 0.2, ease: easing }}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      backgroundColor: color.hex,
                      border: i === activeColor ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                      boxShadow: i === activeColor ? "0 0 0 3px #F5F2ED, 0 0 0 5px #2D241E" : "none",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                    }}
                  />
                  );
                })}
              </div>
            </div>

            {/* Furniture / Hardware Selection */}
            {furnitureList.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p
                    className="text-[#2D241E] text-xs tracking-widest uppercase"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                  >
                    {t("product.furniture")}
                  </p>
                  <p
                    className="text-[#2D241E]/60 text-xs"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
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
                <div className="flex flex-wrap gap-2.5">
                  {furnitureList.map((fc, i) => {
                    const furnitureLabel = localizedCatalogName(fc.name, fc.nameUk, locale);
                    return (
                      <motion.button
                        key={fc.name}
                        type="button"
                        onClick={() => handleFurnitureChange(i)}
                        title={furnitureLabel}
                        aria-label={furnitureLabel}
                        aria-pressed={i === activeFurniture}
                        className="cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
                        animate={{ scale: i === activeFurniture ? 1.06 : 1 }}
                        transition={{ duration: 0.2, ease: easing }}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: "50%",
                          backgroundColor: fc.hex,
                          border: i === activeFurniture ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                          boxShadow: i === activeFurniture ? "0 0 0 3px #F5F2ED, 0 0 0 5px #2D241E" : "none",
                          transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lace Selection */}
            {product.lace === true && (
              <div>
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase mb-3"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
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

                {activeLace && laceColorOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {laceColorOptions.map((opt) => {
                      const laceColorLabel = localizedCatalogName(opt.colorName, opt.colorNameUk, locale);
                      const isActive = opt.colorId === activeLaceColorId;
                      return (
                        <motion.button
                          key={opt.colorId}
                          type="button"
                          onClick={() => handleLaceColorChange(opt.colorId)}
                          title={laceColorLabel}
                          aria-label={laceColorLabel}
                          aria-pressed={isActive}
                          className="cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
                          animate={{ scale: isActive ? 1.06 : 1 }}
                          transition={{ duration: 0.2, ease: easing }}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            backgroundColor: opt.colorHex,
                            border: isActive ? "2px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                            boxShadow: isActive ? "0 0 0 3px #F5F2ED, 0 0 0 5px #2D241E" : "none",
                            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  {t("product.size")}
                </p>
                <button
                  type="button"
                  className="text-[#2D241E]/50 text-xs hover:text-[#4A0E0E] transition-colors duration-200 underline underline-offset-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 rounded-sm"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
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
                      fontSize: "0.75rem",
                      letterSpacing: "0.06em",
                      minHeight: "40px",
                      minWidth: single ? undefined : "48px",
                      padding: single ? "8px 18px" : "8px 14px",
                      // Single size: quiet status chip — solid ink reserved for Add to bag
                      backgroundColor: single
                        ? "rgba(45,36,30,0.06)"
                        : isActive
                          ? "#2D241E"
                          : "transparent",
                      color: single || !isActive ? "#2D241E" : "#F5F2ED",
                      border: single
                        ? "1px solid rgba(45,36,30,0.14)"
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
              {typeof displayStock === "number" && (
                <p
                  className="text-[#2D241E]/50 text-[0.7rem] mt-2 tabular-nums"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {t("product.inStock", { count: displayStock })}
                </p>
              )}
            </div>

            {/* Add to Bag — primary action; matches wishlist height */}
            <div className="flex items-center gap-2.5 pt-0.5">
              <motion.button
                type="button"
                onClick={handleAddToBag}
                disabled={outOfStock}
                className="flex-1 h-12 rounded-full flex items-center justify-center gap-2.5 text-white touch-manipulation transition-[background-color,opacity] duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
                style={{
                  backgroundColor: outOfStock ? "#9A9088" : addedToBag ? "#2D5928" : "#2D241E",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
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
                    <span className="uppercase tracking-widest">
                      {outOfStock ? t("product.outOfStock") : t("product.addToBag")}
                    </span>
                  </>
                )}
              </motion.button>

              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className="shrink-0 w-12 h-12 rounded-full border flex items-center justify-center touch-manipulation cursor-pointer transition-[background-color,border-color] duration-200 hover:border-[#2D241E]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]"
                aria-label={isWishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
                aria-pressed={isWishlisted}
                style={{
                  borderColor: isWishlisted ? "#4A0E0E" : "rgba(45,36,30,0.18)",
                  backgroundColor: isWishlisted ? "#4A0E0E" : "transparent",
                }}
              >
                <Heart
                  size={16}
                  strokeWidth={1.5}
                  aria-hidden="true"
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
            {showSupplementaryDetails ? (
            <div className="border-t border-[#2D241E]/10">
              <button
                onClick={() => setDetailsOpen(!detailsOpen)}
                className="w-full flex items-center justify-between py-5 text-left group"
              >
                <span
                  className="text-[#2D241E] text-xs tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  {t("product.detailsTitle")}
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
