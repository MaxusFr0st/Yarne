import React, { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { loadCarouselSelection } from "../utils/carouselSelection";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function BestSellersCarousel() {
  const { t } = useTranslation();
  const skipEntrance = useTouchMobileLayout();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    containScroll: "trimSnaps",
    duration: 400,
    dragFree: false,
    breakpoints: {
      "(min-width: 768px)": { align: "start" },
    },
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    });
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  const { products } = useProducts();
  const selectedProducts = selectedProductCodes
    .map((code) => products.find((p) => p.id === code))
    .filter((p): p is (typeof products)[number] => Boolean(p));
  const fallbackProducts =
    products.filter((p) => p.isBestseller).slice(0, 8).length > 0
      ? products.filter((p) => p.isBestseller).slice(0, 8)
      : products.slice(0, 8);
  const carouselProducts = selectedProducts.length > 0 ? selectedProducts : fallbackProducts;

  useEffect(() => {
    let cancelled = false;
    void loadCarouselSelection().then(({ productCodes }) => {
      if (!cancelled) setSelectedProductCodes(productCodes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="relative py-10 md:py-14 overflow-x-hidden" style={{ backgroundColor: "#EDE9E2" }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Sticky section header — pins below the main header while the
            carousel scrolls past, then releases when the section ends. */}
        <motion.div
          initial={skipEntrance ? false : { opacity: 0, y: 20 }}
          whileInView={skipEntrance ? undefined : { opacity: 1, y: 0 }}
          viewport={skipEntrance ? undefined : { once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: easing }}
          className="md:sticky z-30 mb-8 md:mb-12 -mx-6 md:-mx-10 px-6 md:px-10 py-3 md:py-4"
          style={{
            top: "var(--main-header-h)",
            backgroundColor: "rgba(237,233,226,0.85)",
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
            {t("home.bestSellers.eyebrow")}
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
            {t("home.bestSellers.title")}
          </h2>
        </motion.div>

        {/* Carousel – wider container with edge fade (lighter on mobile) */}
        <style>{`
          .carousel-fade { mask-image: linear-gradient(to right, rgba(0,0,0,0.35) 0%, black 16px, black calc(100% - 16px), rgba(0,0,0,0.35) 100%); -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.35) 0%, black 16px, black calc(100% - 16px), rgba(0,0,0,0.35) 100%); }
          @media (min-width: 768px) { .carousel-fade { mask-image: linear-gradient(to right, rgba(0,0,0,0.25) 0%, black 48px, black calc(100% - 48px), rgba(0,0,0,0.25) 100%); -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.25) 0%, black 48px, black calc(100% - 48px), rgba(0,0,0,0.25) 100%); } }
          @media (max-width: 639px) {
            .bestsellers-slide { flex: 0 0 62%; max-width: 14.5rem; }
          }
          @media (max-width: 374px) {
            .bestsellers-slide { flex: 0 0 66%; max-width: 13.5rem; }
          }
        `}</style>
        {/* Extra top space on parent — card aspect ratio lives on ProductCard, not here */}
        <div className="carousel-fade relative -mx-4 sm:-mx-12 md:-mx-8 pt-8 md:pt-10 pb-2 min-h-0 sm:min-h-[380px] md:min-h-[480px]">
          <motion.div
            ref={(el) => {
              (emblaRef as (el: HTMLDivElement | null) => void)(el);
              (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="relative overflow-x-hidden overflow-y-visible pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-3 sm:px-12 md:px-8"
            initial={skipEntrance ? false : { opacity: 0, y: 20 }}
            whileInView={skipEntrance ? undefined : { opacity: 1, y: 0 }}
            viewport={skipEntrance ? undefined : { once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: easing }}
          >
            <div className="flex items-start pr-5 md:pr-0 pt-2">
              {carouselProducts.map((product, i) => (
                <div
                  key={`${product.id}-${i}`}
                  className="bestsellers-slide shrink-0 min-w-0 mr-3 sm:mr-5 sm:basis-[44%] md:basis-[calc((100%-3rem)/3.2)] lg:basis-[calc((100%-4rem)/4)] self-start"
                >
                  <ProductCard product={product} index={i} size="carousel" inCarousel viewportRoot={viewportRef} />
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Dot Indicators */}
        {scrollSnaps.length > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8 sm:mt-12 md:mt-10">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: index === selectedIndex ? 28 : 10,
                  height: 10,
                  backgroundColor:
                    index === selectedIndex
                      ? "#4A0E0E"
                      : "rgba(45,36,30,0.2)",
                }}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
