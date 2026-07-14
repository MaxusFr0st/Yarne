import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEmblaCarouselWithGestures } from "../hooks/useEmblaCarouselWithGestures";
import { motion, useReducedMotion } from "motion/react";
import { useHomePageCopy } from "../hooks/useHomePageCopy";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { loadCarouselSelection } from "../utils/carouselSelection";
import { useMotionEntrance } from "../hooks/useMotionEntrance";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { Skeleton } from "./ui/skeleton";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function BestSellersCarousel() {
  const copy = useHomePageCopy();
  const { disabled: motionDisabled } = useMotionEntrance();
  const touchMobile = useTouchMobileLayout();
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarouselWithGestures({
    loop: true,
    align: "center",
    containScroll: "trimSnaps",
    duration: touchMobile || reduceMotion ? 0 : 25,
    dragFree: false,
    breakpoints: {
      "(min-width: 600px)": { align: "start" },
    },
  }, [], { wheelAxis: "x" });

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
    <section className="relative py-6 sm:py-8 md:py-14 overflow-x-hidden" style={{ backgroundColor: "#EDE9E2" }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Sticky section header — pins below the main header while the
            carousel scrolls past, then releases when the section ends. */}
        <motion.div
          initial={motionDisabled ? false : { opacity: 0, y: touchMobile ? 14 : 20 }}
          whileInView={motionDisabled ? undefined : { opacity: 1, y: 0 }}
          viewport={motionDisabled ? undefined : { once: true, margin: touchMobile ? "-24px" : "-80px" }}
          transition={{ duration: touchMobile ? 0.75 : 0.7, ease: easing }}
          className="md:sticky z-30 mb-3 sm:mb-4 md:mb-10 -mx-6 md:-mx-10 px-6 md:px-10 py-2 md:py-4"
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
            {copy.bestSellers.eyebrow}
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
            {copy.bestSellers.title}
          </h2>
        </motion.div>

        {/* Carousel – Embla slide-gap pattern (padding-left per slide, not margin-right) */}
        <style>{`
          .bestsellers-carousel {
            --slide-spacing: 0.875rem;
            --slide-size: 78%;
          }
          @media (min-width: 480px) {
            .bestsellers-carousel {
              --slide-spacing: 1rem;
              --slide-size: 68%;
            }
          }
          /* Tablet portrait / Nest Hub: ~2.4 cards visible, width drives 3:4 ratio */
          @media (min-width: 600px) and (max-width: 767px) {
            .bestsellers-carousel {
              --slide-spacing: 1.25rem;
              --slide-size: 42%;
            }
          }
          @media (min-width: 768px) and (max-width: 1023px) {
            .bestsellers-carousel {
              --slide-spacing: 1.5rem;
              --slide-size: 32%;
            }
          }
          /* Short landscape (Nest Hub 1024×600): slightly narrower slides */
          @media (min-width: 1024px) and (max-height: 750px) {
            .bestsellers-carousel {
              --slide-spacing: 1.25rem;
              --slide-size: 28%;
            }
          }
          @media (min-width: 1024px) and (min-height: 751px) {
            .bestsellers-carousel {
              --slide-spacing: 1.75rem;
              --slide-size: calc((100% - (var(--slide-spacing) * 2)) / 3);
            }
          }
          @media (min-width: 1280px) {
            .bestsellers-carousel {
              --slide-spacing: 2rem;
              --slide-size: calc((100% - (var(--slide-spacing) * 3)) / 4);
            }
          }
        `}</style>
        <div className="relative -mx-3 min-[600px]:-mx-4 md:-mx-6 lg:-mx-8 pt-1 sm:pt-2 md:pt-6 pb-1 min-h-[min(72vw,320px)] min-[600px]:min-h-[min(48vw,360px)] lg:min-h-[420px]">
          <motion.div
            ref={(el) => {
              (emblaRef as (el: HTMLDivElement | null) => void)(el);
              (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="bestsellers-carousel relative overflow-x-hidden overflow-y-visible pt-2 pb-3 sm:pt-3 sm:pb-4 md:pt-5 md:pb-6 lg:pt-8 lg:pb-10 px-3 min-[600px]:px-5 md:px-6 lg:px-8"
            initial={motionDisabled ? false : { opacity: 0, y: touchMobile ? 14 : 20 }}
            whileInView={motionDisabled ? undefined : { opacity: 1, y: 0 }}
            viewport={motionDisabled ? undefined : { once: true, margin: touchMobile ? "-24px" : "-60px" }}
            transition={{ duration: touchMobile ? 0.75 : 0.7, delay: touchMobile ? 0 : 0.1, ease: easing }}
          >
            <div
              className="flex items-start pt-2 [touch-action:pan-y_pinch-zoom]"
              style={{ marginLeft: "calc(var(--slide-spacing) * -1)", willChange: "transform" }}
            >
              {slides.map((item, i) => (
                <div
                  key={showSkeleton ? item.id : `${item.id}-${i}`}
                  className="shrink-0 min-w-0 self-start carousel-slide"
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
          <div className="flex items-center justify-center gap-2.5 mt-4 sm:mt-5 md:mt-10">
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
