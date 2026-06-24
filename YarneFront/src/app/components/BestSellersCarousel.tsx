import React, { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { loadCarouselSelection } from "../utils/carouselSelection";
import { useMotionEntrance } from "../hooks/useMotionEntrance";
import { Skeleton } from "./ui/skeleton";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function BestSellersCarousel() {
  const { t } = useTranslation();
  const { disabled: motionDisabled, opacityOnly } = useMotionEntrance();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    containScroll: "trimSnaps",
    duration: 25,
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
  const showSkeleton = carouselProducts.length === 0;
  const slides = showSkeleton ? Array.from({ length: 4 }, (_, i) => ({ id: `sk-${i}` })) : carouselProducts;

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
          initial={motionDisabled ? false : opacityOnly ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={motionDisabled ? undefined : opacityOnly ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={motionDisabled ? undefined : { once: true, margin: "-80px" }}
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

        {/* Carousel – Embla slide-gap pattern (padding-left per slide, not margin-right) */}
        <style>{`
          .bestsellers-carousel {
            --slide-spacing: 1rem;
            --slide-size: 78%;
          }
          @media (min-width: 640px) {
            .bestsellers-carousel {
              --slide-spacing: 1.25rem;
              --slide-size: 48%;
            }
          }
          @media (min-width: 768px) {
            .bestsellers-carousel {
              --slide-spacing: 1.5rem;
              --slide-size: calc((100% - (var(--slide-spacing) * 2)) / 3);
            }
          }
          @media (min-width: 1024px) {
            .bestsellers-carousel {
              --slide-size: calc((100% - (var(--slide-spacing) * 3)) / 4);
            }
          }
        `}</style>
        <div className="relative -mx-4 sm:-mx-12 md:-mx-8 pt-8 md:pt-10 pb-2 min-h-[320px] sm:min-h-[360px] md:min-h-[460px]">
          <motion.div
            ref={(el) => {
              (emblaRef as (el: HTMLDivElement | null) => void)(el);
              (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="bestsellers-carousel relative overflow-x-hidden overflow-y-visible pt-4 pb-6 sm:pt-6 sm:pb-8 md:pt-8 md:pb-10 px-3 sm:px-12 md:px-8"
            initial={motionDisabled ? false : opacityOnly ? { opacity: 0 } : { opacity: 0, y: 20 }}
            whileInView={motionDisabled ? undefined : opacityOnly ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={motionDisabled ? undefined : { once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: easing }}
          >
            <div
              className="flex items-start pt-2 [touch-action:pan-y_pinch-zoom]"
              style={{ marginLeft: "calc(var(--slide-spacing) * -1)", willChange: "transform" }}
            >
              {slides.map((item, i) => (
                <div
                  key={showSkeleton ? item.id : `${item.id}-${i}`}
                  className="shrink-0 min-w-0 self-start"
                  style={{
                    paddingLeft: "var(--slide-spacing)",
                    flex: "0 0 var(--slide-size)",
                  }}
                >
                  {showSkeleton ? (
                    <Skeleton className="aspect-[3/4] w-full rounded-[22px] sm:rounded-[28px] bg-[#E5E0D8]" />
                  ) : (
                    <ProductCard product={item as (typeof carouselProducts)[number]} index={i} size="carousel" inCarousel viewportRoot={viewportRef} />
                  )}
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
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: index === selectedIndex ? 28 : 10,
                  height: 10,
                  backgroundColor:
                    index === selectedIndex
                      ? "#4A0E0E"
                      : "rgba(45,36,30,0.2)",
                }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={index === selectedIndex}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
