import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { Skeleton } from "../components/ui/skeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { fetchCollections, type CollectionDto } from "../api/collections";
import { searchProducts } from "../utils/productSearch";

/** Where `overflow-x: clip` is not understood the page falls back to `hidden`, which cannot keep the bar sticky. */
const CLIP_X = typeof CSS !== "undefined" && CSS.supports("overflow-x", "clip") ? "clip" : "hidden";

const SKELETON_COUNT = 6;
const ALL_PRODUCTS_TAB = "all";

// Phones: two columns. From md: two columns with wider gaps, from lg three.
const GRID_CLASS =
  "grid grid-cols-2 gap-x-2.5 gap-y-7 w-full md:gap-x-5 md:gap-y-5 lg:gap-x-7 lg:gap-y-7 lg:grid-cols-3";

function CollectionCardSkeleton() {
  return (
    <div aria-hidden>
      {/* Every box here is the height of its counterpart in a collection ProductCard (photo, name
          line, subtitle from md up, swatch row), so the real cards replace these without moving
          anything below. They used to be 10px taller, and the whole grid jumped up on load. */}
      <Skeleton className="aspect-[3/4] md:aspect-[4/5] w-full rounded-[24px] md:rounded-[32px] bg-[#E5E0D8]" />
      <div className="mt-4 px-0.5">
        <div className="h-[1.365rem] flex items-center">
          <Skeleton className="h-4 w-3/4 rounded bg-[#E5E0D8]" />
        </div>
        <div className="hidden md:flex h-4 mt-0.5 items-center">
          <Skeleton className="h-3 w-1/2 rounded bg-[#E5E0D8]" />
        </div>
        <div className="flex items-center gap-2 mt-3 h-[18px]">
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
  usePageTitle(t("seo.collectionTitle"));
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get("filter");
  const collectionParam = searchParams.get("collection");
  // The header's search sends shoppers here as ?q=<words>.
  const searchTerm = (searchParams.get("q") ?? "").trim();
  const collectionId = collectionParam ? Number.parseInt(collectionParam, 10) : undefined;
  const validCollectionId = collectionId && !Number.isNaN(collectionId) ? collectionId : undefined;
  const [collections, setCollections] = useState<CollectionDto[]>([]);

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

  /** Drops the search words and keeps every other parameter. */
  const clearSearch = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("q");
    setSearchParams(next, { replace: true });
  };

  /** Back to the whole collection: no search, no tab, no "new" filter. */
  const showWholeCollection = () => setSearchParams(new URLSearchParams(), { replace: true });

  // Products keep the order the list came in; a search puts the best match first.
  const listed = filterParam === "new" ? products.filter((p) => p.isNew) : products;
  const filtered = searchTerm ? searchProducts(listed, searchTerm).map((hit) => hit.product) : listed;

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "var(--app-svh)", overflowX: CLIP_X }}>
      <section className="pt-24 pb-4 md:pt-32 md:pb-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div>
            <p
              className="text-[#2D241E]/[0.68] tracking-widest uppercase text-xs mb-4"
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
              className="relative text-[#2D241E]/[0.68] mt-4 max-w-lg min-h-[1.5rem]"
              style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
              aria-live="polite"
            >
              {/* While loading, the sentence is laid out invisibly under the placeholder so it
                  takes its real room: two lines on a phone, where a one-line placeholder made
                  everything below drop 25px when the count arrived. */}
              <span className={loading ? "invisible" : undefined} aria-hidden={loading || undefined}>
                {t("collection.header.pieceCount", { count: loading ? 10 : filtered.length })}
              </span>
              {loading && (
                <span className="absolute left-0 top-[0.35em] w-48 h-4 rounded bg-[#E5E0D8] animate-pulse" aria-hidden />
              )}
            </p>
            {searchTerm && (
              <p
                className="mt-3 text-[#2D241E] break-words"
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}
              >
                {t("searchPanel.collectionResultsFor", { term: searchTerm })}
                {" · "}
                <button
                  type="button"
                  onClick={clearSearch}
                  className="text-[#2D241E]/[0.68] hover:text-[#4A0E0E] transition-colors duration-200 underline underline-offset-[3px] cursor-pointer"
                  style={{ fontSize: "0.82rem" }}
                >
                  {t("searchPanel.collectionClear")}
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* `overflow-x: hidden` on <main> used to make it a scroll container, which switched off
          position: sticky for this bar; the clip above does not. Phones keep it in the flow. */}
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
          </div>
        </div>
      </div>

      <div
        className="max-w-[1400px] mx-auto px-4 md:px-10 pt-5 pb-24 md:pt-8 md:pb-24"
        aria-busy={loading}
      >
        {loading ? (
          <div className={GRID_CLASS}>
            {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
              <CollectionCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 && searchTerm ? (
          <motion.div
            className="text-center py-24 md:py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.45rem" }}
            >
              {t("searchPanel.collectionEmptyTitle")}
            </p>
            <p
              className="text-[#2D241E]/[0.68] mt-1.5 mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}
            >
              {t("searchPanel.noResultsHint")}
            </p>
            <button
              type="button"
              onClick={showWholeCollection}
              className="inline-block rounded-full bg-[#2D241E] text-[#F5F2ED] uppercase cursor-pointer px-[18px] py-[11px] hover:opacity-90 transition-opacity duration-200"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.74rem", letterSpacing: "0.12em" }}
            >
              {t("searchPanel.collectionShowAll")}
            </button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            className="text-center py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <p
              className="text-[#2D241E]/[0.68]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem" }}
            >
              {t("collection.empty")}
            </p>
          </motion.div>
        ) : (
          <div className={GRID_CLASS}>
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} size="collection" subtleEntrance />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
