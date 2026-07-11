import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useHomePageCopy } from "../hooks/useHomePageCopy";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "../components/ProductCard";
import { BestSellersCarousel } from "../components/BestSellersCarousel";
import { FeaturedShowcase } from "../components/FeaturedShowcase";
import { ImageWithFallback as Img } from "../components/figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import {
  DEFAULT_MORE_FROM_COLLECTION_TITLE,
  getDefaultHomeSectionsSelection,
  loadHomeSectionsSelection,
} from "../utils/homeSectionsSelection";
import {
  getDefaultHomePageMediaSelection,
  getInitialHomePageMediaSelection,
  loadHomePageMediaSelection,
} from "../utils/homePageMediaSelection";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { ScrollReveal, SectionEyebrow, SectionRule, SectionTitle } from "../components/ScrollReveal";
import { resolveMediaUrl } from "../utils/storefrontMedia";

const ease = [0.22, 1, 0.36, 1] as const;

export function Home() {
  const copy = useHomePageCopy();
  const heroRef = useRef<HTMLDivElement>(null);
  const editorialRef = useRef<HTMLDivElement>(null);
  const touch = useTouchMobileLayout();
  const reducedMotion = useReducedMotion();
  const animateHero = !touch && !reducedMotion;

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const { scrollYProgress: editorialScroll } = useScroll({
    target: editorialRef,
    offset: ["start end", "end start"],
  });

  const heroY = useTransform(heroScroll, [0, 1], ["0%", "22%"]);
  const editorialY = useTransform(editorialScroll, [0, 1], ["0%", "-10%"]);

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
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const heroImageSrc = homePageMedia.heroImageUrl.trim();
  const editorialImageSrc = homePageMedia.editorialImageUrl.trim();
  const lookbookImageSrc = homePageMedia.lookbookImageUrl.trim();

  useEffect(() => {
    const resolvedHero = resolveMediaUrl(heroImageSrc);
    if (!resolvedHero) return;
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "high";
    img.src = resolvedHero;
  }, [heroImageSrc]);

  const featured = useMemo(() => {
    const selected = homeSectionsSelection.featuredProductCodes
      .map((code) => products.find((product) => product.id === code))
      .filter((product): product is (typeof products)[number] => Boolean(product));
    return selected.length > 0 ? selected : products.slice(0, 4);
  }, [homeSectionsSelection.featuredProductCodes, products]);

  const moreFromCollectionProducts = useMemo(() => {
    const selected = homeSectionsSelection.moreFromCollectionProductCodes
      .map((code) => products.find((product) => product.id === code))
      .filter((product): product is (typeof products)[number] => Boolean(product));
    return selected.length > 0 ? selected : products.slice(3);
  }, [homeSectionsSelection.moreFromCollectionProductCodes, products]);


  return (
    <main className="relative overflow-x-hidden bg-[#F5F2ED]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* ─── HERO ─── */}
      <section
        ref={heroRef}
        className="relative flex items-end overflow-hidden min-h-[600px]"
        style={{ height: "calc(var(--app-vh, 1svh) * 100)" }}
      >
        {animateHero ? (
          <motion.div className="absolute inset-0 overflow-hidden" style={{ y: heroY }}>
            {heroImageSrc ? (
              <Img src={heroImageSrc} alt="Yarné Hero" className="absolute inset-0 h-[108%] w-full object-cover object-center" priority />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #4a3f38 0%, #8a8078 50%, #d4cfc8 100%)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.12) 100%)" }} />
          </motion.div>
        ) : (
          <div className="absolute inset-0 overflow-hidden">
            {heroImageSrc ? (
              <Img src={heroImageSrc} alt="Yarné Hero" className="absolute inset-0 h-full w-full object-cover object-center" priority />
            ) : (
              <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #4a3f38 0%, #8a8078 50%, #d4cfc8 100%)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.12) 100%)" }} />
          </div>
        )}

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10 pb-14 md:pb-20">
          <div className="max-w-xl md:max-w-2xl">
            <p
              className="text-white/65 tracking-[0.28em] uppercase text-[0.65rem] mb-5 md:mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {copy.hero.eyebrow}
            </p>
            <h1
              className="text-white"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.6rem, 8vw, 5.25rem)",
                fontWeight: 400,
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                textWrap: "balance",
              } as React.CSSProperties}
            >
              {copy.hero.titleLine1}
              <br />
              <em className="font-light italic">{copy.hero.titleAccent}</em>
            </h1>
            <p
              className="text-white/70 mt-5 md:mt-6 max-w-md text-[0.95rem] leading-relaxed min-h-[4.25rem]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {copy.hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-10 w-full max-w-lg">
              <LangLink
                to="/collection"
                className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#F5F2ED] text-[#2D241E] hover:bg-white transition-colors duration-200 group cursor-pointer"
                style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
              >
                <span className="uppercase tracking-widest">{copy.hero.ctaPrimary}</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </LangLink>
              <LangLink
                to="/collection?filter=new"
                className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full text-white border border-white/35 hover:border-white/70 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
              >
                <span className="uppercase tracking-widest">{copy.hero.ctaSecondary}</span>
              </LangLink>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 md:right-12 hidden md:flex flex-col items-center gap-2 text-white/45">
          <span
            className="text-[0.62rem] tracking-[0.25em] uppercase"
            style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif" }}
          >
            {copy.hero.scroll}
          </span>
          <ChevronDown size={16} className="animate-[bounce-soft_2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
      </section>

      <SectionRule />

      <FeaturedShowcase />

      <SectionRule />

      <BestSellersCarousel />

      {/* ─── FEATURED GRID ─── */}
      <section className="relative py-12 md:py-16 bg-gradient-to-b from-[#EDE9E2]/70 via-[#EDE9E2]/45 to-[#F5F2ED]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <ScrollReveal className="md:sticky z-30 mb-10 md:mb-12 -mx-6 md:-mx-10 px-6 md:px-10 py-4 flex items-end justify-between gap-4 border-b border-[#2D241E]/6 md:border-0" style={{ top: "var(--main-header-h)", backgroundColor: "rgba(237,233,226,0.9)", backdropFilter: "blur(8px)" }}>
            <div>
              <SectionEyebrow>{copy.featured.eyebrow}</SectionEyebrow>
              <SectionTitle>
                {copy.featured.title}
              </SectionTitle>
            </div>
            <LangLink
              to="/collection"
              className="hidden md:flex items-center gap-2 text-[#2D241E]/55 hover:text-[#4A0E0E] transition-colors duration-200 group shrink-0 cursor-pointer"
              style={{ fontSize: "0.75rem", letterSpacing: "0.14em" }}
            >
              <span className="uppercase tracking-widest">{copy.featured.viewAll}</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </LangLink>
          </ScrollReveal>

          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-y-9 gap-x-5 md:gap-x-6 xl:gap-7">
            {featured.map((product, i) => (
              <ScrollReveal key={product.id} delay={i * 0.05} y={18}>
                <ProductCard product={product} index={i} subtleEntrance />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal delay={0.15} className="flex justify-center mt-12 md:mt-14">
            <LangLink
              to="/collection"
              className="group flex items-center gap-3 px-9 py-4 rounded-full bg-[#2D241E] text-[#F5F2ED] hover:bg-[#4A0E0E] transition-colors duration-200 cursor-pointer"
              style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest">
                {copy.featured.shopAllPieces.replace("{{count}}", String(products.length))}
              </span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </LangLink>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── EDITORIAL ─── */}
      <section ref={editorialRef} className="relative py-16 md:py-24 overflow-hidden bg-[#F5F2ED]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            <ScrollReveal className="relative">
              <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden aspect-[4/5] bg-[#EDE9E2]">
                {animateHero ? (
                  <motion.div className="absolute inset-0" style={{ y: editorialY }}>
                    {editorialImageSrc ? (
                      <Img
                        src={editorialImageSrc}
                        alt={copy.editorial.eyebrow}
                        className="h-full w-full object-cover object-center"
                      />
                    ) : null}
                  </motion.div>
                ) : (
                  editorialImageSrc ? (
                    <Img
                      src={editorialImageSrc}
                      alt={copy.editorial.eyebrow}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : null
                )}
              </div>
            </ScrollReveal>

            <div className="flex flex-col gap-6 md:gap-7">
              <ScrollReveal delay={0.05}>
                <SectionEyebrow>{copy.editorial.eyebrow}</SectionEyebrow>
                <SectionTitle className="mt-1">
                  {copy.editorial.titleLine1}
                  <br />
                  {copy.editorial.titleLine2}
                </SectionTitle>
              </ScrollReveal>
              <ScrollReveal delay={0.1}>
                <p className="text-[#2D241E]/62 text-[0.92rem] leading-[1.85]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {copy.editorial.paragraph1}
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.14}>
                <p className="text-[#2D241E]/62 text-[0.92rem] leading-[1.85]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {copy.editorial.paragraph2}
                </p>
              </ScrollReveal>
              <ScrollReveal delay={0.18}>
                <LangLink
                  to="/pages/our-history"
                  className="inline-flex items-center gap-2.5 group text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-200 cursor-pointer"
                  style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}
                >
                  <span className="uppercase tracking-widest border-b border-[#2D241E]/35 pb-0.5 group-hover:border-[#4A0E0E]">
                    {copy.editorial.ourStory}
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
                </LangLink>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── LOOKBOOK BANNER ─── */}
      <section className="relative overflow-hidden h-[min(70svh,640px)] min-h-[380px]">
        <div className="absolute inset-0">
          {lookbookImageSrc ? (
            <Img src={lookbookImageSrc} alt="Lookbook" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[#2D241E]/25" />
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(120deg, rgba(45,36,30,0.82) 0%, rgba(45,36,30,0.25) 100%)" }}
          />
        </div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <ScrollReveal>
            <p
              className="text-white/55 tracking-[0.28em] uppercase text-[0.65rem] mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {copy.lookbook.eyebrow}
            </p>
            <h2
              className="text-white font-light leading-[1.12] mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2rem, 5.5vw, 3.75rem)",
              }}
            >
              {copy.lookbook.titleLine1}
              <br />
              {copy.lookbook.titleLine2}
            </h2>
            <LangLink
              to="/collection"
              className="inline-flex px-9 py-3.5 rounded-full border border-white/40 text-white hover:bg-white hover:text-[#2D241E] transition-colors duration-200 cursor-pointer"
              style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}
            >
              <span className="uppercase tracking-widest">{copy.lookbook.cta}</span>
            </LangLink>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── MORE FROM COLLECTION ─── */}
      <section className="relative py-12 md:py-16 bg-[#F5F2ED]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <ScrollReveal className="text-center mb-10 md:mb-14 md:sticky z-30 -mx-6 md:-mx-10 px-6 md:px-10 py-4" style={{ top: "var(--main-header-h)", backgroundColor: "rgba(245,242,237,0.88)", backdropFilter: "blur(10px)" }}>
            <SectionEyebrow className="mb-2">{copy.moreFromCollection.eyebrow}</SectionEyebrow>
            <SectionTitle>
              {homeSectionsSelection.moreFromCollectionTitle || DEFAULT_MORE_FROM_COLLECTION_TITLE}
            </SectionTitle>
          </ScrollReveal>

          <div className="grid grid-cols-1 min-[540px]:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-6 lg:gap-8">
            {moreFromCollectionProducts.map((product, i) => (
              <ScrollReveal key={product.id} delay={(i % 3) * 0.06} y={16}>
                <ProductCard product={product} index={i} size="collection" subtleEntrance />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
