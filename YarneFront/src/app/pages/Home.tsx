import React, { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useHomePageCopy } from "../hooks/useHomePageCopy";
import { BestSellersCarousel } from "../components/BestSellersCarousel";
import { FeaturedShowcase } from "../components/FeaturedShowcase";
import { ImageWithFallback as Img } from "../components/figma/ImageWithFallback";
import { LangLink } from "../i18n/LangLink";
import { HOME_PAGE_MEDIA_KEY } from "../utils/homePageMediaSelection";
import { peekStorefrontSetting } from "../api/storefrontSettings";
import { getHomePageCopyForLocale, HOME_PAGE_COPY_KEY } from "../utils/homePageCopy";
import { WHY_SECTION_KEY, loadWhySectionContent } from "../utils/whySectionContent";
import { FEATURED_SHOWCASE_SELECTION_KEY, loadFeaturedShowcaseSelection } from "../utils/featuredShowcaseSelection";
import { CAROUSEL_PRODUCT_CODES_KEY, loadCarouselSelection } from "../utils/carouselSelection";
import { hasPersistedProducts, loadProductsList, productsQueryKey } from "../utils/productsCache";
import { fetchProducts } from "../api/products";
import { firstVisitRevealStyle, useFirstVisitReady } from "../hooks/useFirstVisitReady";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { useHomeHero } from "../hooks/useHomeHero";
import { useLocale } from "../i18n/useLocale";
import { ScrollReveal, SECTION_REVEAL, SectionEyebrow, SectionTitle } from "../components/ScrollReveal";
import { WhyYarneSection } from "../components/WhyYarneSection";

const ease = [0.22, 1, 0.36, 1] as const;

const HOME_SETTING_KEYS = [
  HOME_PAGE_COPY_KEY,
  HOME_PAGE_MEDIA_KEY,
  WHY_SECTION_KEY,
  FEATURED_SHOWCASE_SELECTION_KEY,
  CAROUSEL_PRODUCT_CODES_KEY,
];
/**
 * Every section below the hero starts from the last server answer this browser saw, so a
 * returning visitor gets the real text and photos on the first paint. A first visit waits for
 * the settings and the product list, then fades in (see useFirstVisitReady). The hero has its
 * own, stricter rule: useHomeHero.
 */
function useSectionsReady(): boolean {
  return useFirstVisitReady(
    () => hasPersistedProducts() && HOME_SETTING_KEYS.every((key) => peekStorefrontSetting(key) !== undefined),
    () =>
      Promise.allSettled([
        loadWhySectionContent(),
        loadFeaturedShowcaseSelection(),
        loadCarouselSelection(),
        // Product names and photos in the carousel and the bento come from here.
        loadProductsList(productsQueryKey(), () => fetchProducts()),
      ])
  );
}

export function Home() {
  const copy = useHomePageCopy();
  const editorialRef = useRef<HTMLDivElement>(null);
  const touch = useTouchMobileLayout();
  const reducedMotion = useReducedMotion();
  const animateEditorial = !touch && !reducedMotion;

  const { scrollYProgress: editorialScroll } = useScroll({
    target: editorialRef,
    offset: ["start end", "end start"],
  });

  const editorialY = useTransform(editorialScroll, [0, 1], ["0%", "-10%"]);

  const locale = useLocale();
  const { hero, ready: heroReady } = useHomeHero();
  const heroCopy = getHomePageCopyForLocale(hero.copy, locale).hero;
  const homePageMedia = hero.media;

  const heroImageSrc = homePageMedia.heroImageUrl.trim();
  const editorialImageSrc = homePageMedia.editorialImageUrl.trim();
  const sectionsReady = useSectionsReady();
  const contentReady = heroReady && sectionsReady;

  return (
    <main
      // overflow-x-clip, not -hidden: hidden quietly turns overflow-y into `auto`, which makes
      // <main> a scroll container and stops the Why section's `position: sticky` frame pinning.
      className="relative overflow-x-clip bg-[#F5F2ED]"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        ...firstVisitRevealStyle(contentReady, Boolean(reducedMotion)),
      }}
      aria-busy={!contentReady}
    >
      {/* ─── HERO ───
          Pinned to the top of the page while everything after it scrolls up and covers it. */}
      <section
        className="hero-frame sticky z-0 flex items-end overflow-hidden"
        // Sized by .hero-frame (theme.css): from the screen's width on phones, so no browser bar
        // can resize it or re-crop the photo. The apron below the content fills the space under
        // Safari's glass and the room in-app bars hand back with the hero's own photo.
        // `top` goes negative when the content box is taller than the screen, so the pinned hero
        // sits bottom-aligned (its buttons stay reachable) instead of clipped below the fold.
        style={{
          height: "calc(var(--hero-h) + var(--hero-apron))",
          paddingBottom: "var(--hero-apron)",
          top: "min(0px, calc(var(--app-svh) - var(--hero-h)))",
        }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {heroImageSrc ? (
            <Img
              src={heroImageSrc}
              fadeIn
              alt="Yarné Hero"
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: `${(homePageMedia.heroFocalX * 100).toFixed(1)}% ${(homePageMedia.heroFocalY * 100).toFixed(1)}%` }}
              priority
            />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #4a3f38 0%, #8a8078 50%, #d4cfc8 100%)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(105deg, rgba(45,36,30,0.72) 0%, rgba(45,36,30,0.38) 55%, rgba(45,36,30,0.12) 100%)" }} />
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-10 pb-14 md:pb-20">
          <div className="max-w-xl md:max-w-2xl">
            <p
              className="text-white/65 tracking-[0.28em] uppercase text-[0.65rem] mb-5 md:mb-6"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {heroCopy.eyebrow}
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
              {heroCopy.titleLine1}
              <br />
              <em className="font-light italic">{heroCopy.titleAccent}</em>
            </h1>
            <p
              className="text-white/70 mt-5 md:mt-6 max-w-md text-[0.95rem] leading-relaxed min-h-[4.25rem]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {heroCopy.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 md:mt-10 w-full max-w-lg">
              <LangLink
                to="/collection"
                className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#F5F2ED] text-[#2D241E] hover:bg-white transition-colors duration-200 group cursor-pointer"
                style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
              >
                <span className="uppercase tracking-widest">{heroCopy.ctaPrimary}</span>
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform duration-200" />
              </LangLink>
              <LangLink
                to="/collection?filter=new"
                className="flex items-center justify-center gap-2.5 w-full sm:w-auto px-7 py-3.5 rounded-full text-white border border-white/35 hover:border-white/70 hover:bg-white/10 transition-colors duration-200 cursor-pointer"
                style={{ fontSize: "0.75rem", letterSpacing: "0.16em" }}
              >
                <span className="uppercase tracking-widest">{heroCopy.ctaSecondary}</span>
              </LangLink>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 right-8 md:right-12 hidden md:flex flex-col items-center gap-2 text-white/45">
          <span
            className="text-[0.62rem] tracking-[0.25em] uppercase"
            style={{ writingMode: "vertical-rl", fontFamily: "'DM Sans', sans-serif" }}
          >
            {heroCopy.scroll}
          </span>
          <ChevronDown size={16} className="animate-[bounce-soft_2s_ease-in-out_infinite] motion-reduce:animate-none" />
        </div>
      </section>

      {/* Slides over the pinned hero, so it brings its own opaque backdrop. */}
      <div className="relative z-10 bg-[#F5F2ED]">
        <WhyYarneSection />

        <ScrollReveal {...SECTION_REVEAL}>
          <BestSellersCarousel />
        </ScrollReveal>

        <ScrollReveal {...SECTION_REVEAL}>
          <FeaturedShowcase />
        </ScrollReveal>

        {/* ─── EDITORIAL ─── */}
        <ScrollReveal {...SECTION_REVEAL}>
        <section ref={editorialRef} className="relative py-16 md:py-24 overflow-hidden bg-[#F5F2ED]">
          <div className="max-w-[1400px] mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
              <ScrollReveal className="relative">
                <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden aspect-[4/5] bg-[#EDE9E2]">
                  {animateEditorial ? (
                    <motion.div className="absolute inset-0" style={{ y: editorialY }}>
                      {editorialImageSrc ? (
                        <Img
                          src={editorialImageSrc}
                          fadeIn
                          alt={copy.editorial.eyebrow}
                          className="h-[112%] w-full object-cover"
                          style={{ objectPosition: `${(homePageMedia.editorialFocalX * 100).toFixed(1)}% ${(homePageMedia.editorialFocalY * 100).toFixed(1)}%` }}
                        />
                      ) : null}
                    </motion.div>
                  ) : (
                    editorialImageSrc ? (
                      <Img
                        src={editorialImageSrc}
                        fadeIn
                        alt={copy.editorial.eyebrow}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: `${(homePageMedia.editorialFocalX * 100).toFixed(1)}% ${(homePageMedia.editorialFocalY * 100).toFixed(1)}%` }}
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
        </ScrollReveal>
      </div>
    </main>
  );
}
