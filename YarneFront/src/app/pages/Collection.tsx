import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { useLocale } from "../i18n/useLocale";
import { PriceTag } from "../components/PriceTag";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/ui/skeleton";
import { fetchCollections, type CollectionDto } from "../api/collections";

const SKELETON_COUNT = 6;
const ALL_PRODUCTS_TAB = "all";

const easing = [0.25, 0.1, 0.25, 1] as const;
const SORT_OPTION_KEYS = ["featured", "priceLowToHigh", "priceHighToLow", "newest"] as const;
type SortOptionKey = (typeof SORT_OPTION_KEYS)[number];

function CollectionCardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[3/4] w-full rounded-[24px] md:rounded-[32px] bg-[#E5E0D8]" />
      <div className="mt-4 space-y-2 px-1">
        <Skeleton className="h-4 w-3/4 rounded bg-[#E5E0D8]" />
        <Skeleton className="h-3 w-1/2 rounded bg-[#E5E0D8]" />
        <div className="flex gap-2 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-3.5 rounded-full bg-[#E5E0D8]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Collection() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const collectionParam = searchParams.get("collection");
  const collectionId = collectionParam ? Number.parseInt(collectionParam, 10) : undefined;
  const validCollectionId = collectionId && !Number.isNaN(collectionId) ? collectionId : undefined;
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [activeSort, setActiveSort] = useState<SortOptionKey>("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeAvailability, setActiveAvailability] = useState<"allItems" | "newOnly" | "bestsellers">("allItems");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500]);

  const activeTab = validCollectionId ? String(validCollectionId) : ALL_PRODUCTS_TAB;

  useEffect(() => {
    let cancelled = false;
    void fetchCollections()
      .then((data) => {
        if (!cancelled) setCollections(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const productQuery = useMemo(() => {
    if (validCollectionId) return { collectionId: validCollectionId };
    if (filterParam === "new") return { isNew: true };
    return undefined;
  }, [validCollectionId, filterParam]);

  const { products, loading } = useProducts(productQuery);
  const activeCollection = useMemo(
    () => collections.find((collection) => collection.id === validCollectionId) ?? null,
    [collections, validCollectionId],
  );

  const tabs = useMemo(
    () => [
      { id: ALL_PRODUCTS_TAB, label: t("collection.tabs.allPieces") },
      ...collections.map((collection) => ({ id: String(collection.id), label: collection.name })),
    ],
    [collections, t],
  );

  const selectTab = (tabId: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete("filter");
    if (tabId === ALL_PRODUCTS_TAB) {
      next.delete("collection");
    } else {
      next.set("collection", tabId);
    }
    setSearchParams(next, { replace: true });
  };

  let filtered = products;
  if (filterParam === "new") filtered = filtered.filter((p) => p.isNew);
  if (activeAvailability === "newOnly") filtered = filtered.filter((p) => p.isNew);
  if (activeAvailability === "bestsellers") filtered = filtered.filter((p) => p.isBestseller);
  filtered = filtered.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);

  if (activeSort === "priceLowToHigh") {
    filtered = [...filtered].sort((a, b) => a.price - b.price);
  } else if (activeSort === "priceHighToLow") {
    filtered = [...filtered].sort((a, b) => b.price - a.price);
  } else if (activeSort === "newest") {
    filtered = [...filtered].sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      return bTime - aTime;
    });
  }

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100svh", overflowX: "hidden" }}>
      <section className="pt-28 pb-8 md:pt-32 md:pb-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div>
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em" }}
            >
              {activeCollection
                ? t("collection.header.collectionEyebrow")
                : filterParam === "new"
                  ? t("collection.header.newArrivalsEyebrow")
                  : t("collection.header.collectionEyebrow")}
            </p>
            <h1
              className="text-[#2D241E]"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              {activeCollection ? (
                <>{activeCollection.name}</>
              ) : filterParam === "new" ? (
                <>{t("collection.header.newArrivalsTitleLead")} <em style={{ fontStyle: "italic", fontWeight: 300 }}>{t("collection.header.newArrivalsTitleAccent")}</em></>
              ) : (
                <>{t("collection.header.collectionTitleLead")} <em style={{ fontStyle: "italic", fontWeight: 300 }}>{t("collection.header.collectionTitleAccent")}</em></>
              )}
            </h1>
            <p
              className="text-[#2D241E]/50 mt-4 max-w-lg min-h-[1.5rem]"
              style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
              aria-live="polite"
            >
              {loading ? (
                <span className="inline-block w-48 h-4 rounded bg-[#E5E0D8] animate-pulse align-middle" aria-hidden />
              ) : (
                t("collection.header.pieceCount", { count: filtered.length })
              )}
            </p>
          </div>
        </div>
      </section>

      <div className="md:sticky top-[var(--main-header-h)] z-30 border-y border-[#2D241E]/10" style={{ backgroundColor: "rgba(245,242,237,0.95)", backdropFilter: "blur(16px)" }}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex items-center justify-between py-2.5 gap-3 overflow-x-auto scrollbar-hide min-h-[44px]">
            <div className="flex items-center gap-2 flex-shrink-0 min-h-[36px]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => selectTab(tab.id)}
                  className="px-5 py-2 rounded-full text-xs transition-all duration-300 whitespace-nowrap"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.1em",
                    backgroundColor: activeTab === tab.id ? "#2D241E" : "transparent",
                    color: activeTab === tab.id ? "#F5F2ED" : "#2D241E",
                    border: activeTab === tab.id ? "1.5px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              <select
                value={activeSort}
                onChange={(e) => setActiveSort(e.target.value as SortOptionKey)}
                className="bg-transparent border border-[#2D241E]/20 rounded-full px-4 py-2 text-xs text-[#2D241E] focus:outline-none focus:border-[#2D241E]/50 cursor-pointer"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.06em" }}
              >
                {SORT_OPTION_KEYS.map((s) => (
                  <option key={s} value={s}>{t(`collection.sort.${s}`)}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#2D241E]/20 hover:border-[#2D241E]/50 transition-colors text-[#2D241E]"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em" }}
              >
                <SlidersHorizontal size={13} />
                <span className="uppercase tracking-widest hidden sm:inline">{t("collection.filter.button")}</span>
              </button>
            </div>
          </div>

          {filterOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: easing }}
              className="border-t border-[#2D241E]/10 py-6"
            >
              <div className="flex flex-wrap gap-8 items-start">
                <div>
                  <p
                    className="text-[#2D241E]/50 text-xs tracking-widest uppercase mb-3"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.16em" }}
                  >
                    {t("collection.filter.priceRange")}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-[#2D241E] text-sm">
                      <PriceTag amount={priceRange[0]} locale={locale} variant="card" />
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={500}
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                      className="w-32 accent-[#4A0E0E]"
                    />
                    <span className="text-[#2D241E] text-sm">
                      <PriceTag amount={priceRange[1]} locale={locale} variant="card" />
                    </span>
                  </div>
                </div>

                <div>
                  <p
                    className="text-[#2D241E]/50 text-xs tracking-widest uppercase mb-3"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.16em" }}
                  >
                    {t("collection.filter.availability")}
                  </p>
                  <div className="flex gap-2">
                    {(["allItems", "newOnly", "bestsellers"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setActiveAvailability(opt)}
                        className="px-4 py-1.5 rounded-full text-xs border transition-colors"
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          borderColor: activeAvailability === opt ? "#2D241E" : "rgba(45,36,30,0.2)",
                          backgroundColor: activeAvailability === opt ? "#2D241E" : "transparent",
                          color: activeAvailability === opt ? "#F5F2ED" : "#2D241E",
                        }}
                      >
                        {t(`collection.availability.${opt}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFilterOpen(false)}
                  className="ml-auto flex items-center gap-2 text-[#2D241E]/50 hover:text-[#2D241E] transition-colors text-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <X size={13} />
                  {t("collection.filter.close")}
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div
        className="max-w-[1400px] mx-auto px-6 md:px-10 py-10 md:py-12 pb-24"
        aria-busy={loading}
      >
        {loading ? (
          <>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <CollectionCardSkeleton key={i} />
              ))}
            </div>
            <div className="md:hidden grid grid-cols-1 gap-y-8 w-full">
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <CollectionCardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <motion.div
            className="text-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p
              className="text-[#2D241E]/40"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
            >
              {t("collection.empty")}
            </p>
          </motion.div>
        ) : (
          <>
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} size="collection" subtleEntrance />
              ))}
            </div>
            <div className="md:hidden grid grid-cols-1 gap-y-8 w-full">
              {filtered.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} size="collection" subtleEntrance />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
