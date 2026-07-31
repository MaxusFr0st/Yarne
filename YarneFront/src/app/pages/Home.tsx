import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useHomePageCopy } from "../hooks/useHomePageCopy";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { BestSellersCarousel } from "../components/BestSellersCarousel";
import { FeaturedShowcase } from "../components/FeaturedShowcase";
import { LangLink } from "../i18n/LangLink";
import {
  getDefaultHomeSectionsSelection,
  loadHomeSectionsSelection,
} from "../utils/homeSectionsSelection";
import {
  getInitialHomePageMediaSelection,
  loadHomePageMediaSelection,
} from "../utils/homePageMediaSelection";
import { ScrollReveal, SectionEyebrow, SectionTitle } from "../components/ScrollReveal";
import { resolveMediaUrl } from "../utils/storefrontMedia";
import { HomeLayerStack } from "../components/home/HomeLayerStack";
import { YARNE, YARNE_FONT_UI } from "../brand/yarneBrand";

export function Home() {
  const copy = useHomePageCopy();
  const { products } = useProducts();
  const [homeSectionsSelection, setHomeSectionsSelection] = useState(getDefaultHomeSectionsSelection);
  const [homePageMedia, setHomePageMedia] = useState(getInitialHomePageMediaSelection);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadHomeSectionsSelection(), loadHomePageMediaSelection()]).then(
      ([sections, media]) => {
        if (cancelled) return;
        setHomeSectionsSelection(sections);
        setHomePageMedia(media);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const heroImageSrc = resolveMediaUrl(homePageMedia.heroImageUrl.trim()) || homePageMedia.heroImageUrl.trim();
  const editorialImageSrc =
    resolveMediaUrl(homePageMedia.editorialImageUrl.trim()) || homePageMedia.editorialImageUrl.trim();
  const lookbookImageSrc =
    resolveMediaUrl(homePageMedia.lookbookImageUrl.trim()) || homePageMedia.lookbookImageUrl.trim();

  useEffect(() => {
    if (!heroImageSrc) return;
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = heroImageSrc;
  }, [heroImageSrc]);

  const featured = useMemo(() => {
    const selected = homeSectionsSelection.featuredProductCodes
      .map((code) => products.find((product) => product.id === code))
      .filter((product): product is (typeof products)[number] => Boolean(product));
    return selected.length > 0 ? selected : products.slice(0, 4);
  }, [homeSectionsSelection.featuredProductCodes, products]);

  return (
    <main className="relative bg-[var(--yarne-cream)]" style={{ fontFamily: YARNE_FONT_UI }}>
      <HomeLayerStack
        heroImageUrl={heroImageSrc}
        editorialImageUrl={editorialImageSrc}
        lookbookImageUrl={lookbookImageSrc}
      />

      <FeaturedShowcase />

      <BestSellersCarousel />

      <section
        className="relative py-12 md:py-16"
        style={{ background: `linear-gradient(180deg, ${YARNE.sand}B3 0%, ${YARNE.cream} 100%)` }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <ScrollReveal className="mb-10 md:mb-12 flex items-end justify-between gap-4">
            <div>
              <SectionEyebrow>{copy.featured.eyebrow}</SectionEyebrow>
              <SectionTitle>{copy.featured.title}</SectionTitle>
            </div>
            <LangLink
              to="/collection"
              className="hidden md:flex items-center gap-2 text-[0.75rem] uppercase tracking-[0.14em] transition-colors duration-200 hover:opacity-80 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30"
              style={{ color: YARNE.mocha }}
            >
              {copy.featured.viewAll}
              <ArrowRight size={14} aria-hidden />
            </LangLink>
          </ScrollReveal>

          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-9 gap-x-5 md:gap-x-6 xl:gap-7">
            {featured.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 0.05} y={18}>
                <ProductCard product={product} index={i} subtleEntrance />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.12} className="flex justify-center mt-12 md:mt-14">
            <LangLink
              to="/collection"
              className="group flex items-center gap-3 px-9 py-4 rounded-full text-[0.75rem] uppercase tracking-[0.15em] transition-opacity duration-200 hover:opacity-90 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35"
              style={{ backgroundColor: YARNE.cta, color: YARNE.cream, fontFamily: YARNE_FONT_UI }}
            >
              {copy.featured.shopAllPieces.replace("{{count}}", String(products.length))}
              <ArrowRight size={14} aria-hidden />
            </LangLink>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
