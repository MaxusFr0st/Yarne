import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEmblaCarouselWithGestures } from "../hooks/useEmblaCarouselWithGestures";
import { motion, useReducedMotion } from "motion/react";
import { useHomePageCopy } from "../hooks/useHomePageCopy";
import { useProducts } from "../hooks/useProducts";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { loadCarouselSelection } from "../utils/carouselSelection";
import { useMotionEntrance } from "../hooks/useMotionEntrance";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";
import { Skeleton } from "./ui/skeleton";

const easing = [0.25, 0.1, 0.25, 1] as const;

/** Cards shown while the product list is still loading. */
const SKELETON_SLIDES = ["sk-0", "sk-1", "sk-2", "sk-3"];

/** Fallback cap when nothing is curated — the curated list itself is shown in full. */
const FALLBACK_LIMIT = 8;

/**
 * Embla slide-gap pattern: spacing is padding-left per slide against a negative margin-left on
 * the track, never margin-right, so the row starts flush and every gap stays even.
 *
 * --edge-pad reproduces where the max-w-[1400px] column holding the heading would have started
 * (that column's own side padding, plus the extra margin once the viewport is wider than 1400px),
 * because the track deliberately sits outside that column so a peeking card crops at the true
 * screen edge rather than short of it. Slide 1 still lines up under the heading.
 *
 * The mask fades both edges into the section background. Slide counts rarely divide evenly into
 * the 1–4 cards a screen fits, so some scroll positions leave a thin sliver of a card showing;
 * fading reads that as "more to see" instead of an accidental-looking cut.
 */
const CAROUSEL_CSS = `
  .bestsellers-carousel {
    --slide-spacing: 0.875rem;
    --slide-size: 78%;
    --edge-pad: max(1.5rem, calc((100vw - 1400px) / 2 + 1.5rem));
    --edge-fade: 20px;
    mask-image: linear-gradient(to right, transparent, black var(--edge-fade), black calc(100% - var(--edge-fade)), transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black var(--edge-fade), black calc(100% - var(--edge-fade)), transparent);
  }
  @media (min-width: 480px) {
    .bestsellers-carousel {
      --slide-spacing: 1rem;
      --slide-size: 68%;
    }
  }
  @media (min-width: 600px) {
    .bestsellers-carousel {
      --edge-fade: 32px;
    }
  }
  /* Tablet portrait / Nest Hub: ~2.4 cards visible, width drives 3:4 ratio */
  @media (min-width: 600px) and (max-width: 767px) {
    .bestsellers-carousel {
      --slide-spacing: 1.25rem;
      --slide-size: 42%;
    }
  }
  @media (min-width: 768px) {
    .bestsellers-carousel {
      --edge-pad: max(2.5rem, calc((100vw - 1400px) / 2 + 2.5rem));
      --edge-fade: 48px;
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
`;

const SLIDE_CLASS = "shrink-0 min-w-0 self-start carousel-slide";
const SLIDE_STYLE: React.CSSProperties = {
  paddingLeft: "var(--slide-spacing)",
  flex: "0 0 var(--slide-size)",
};

export function BestSellersCarousel() {
  const copy = useHomePageCopy();
  const { disabled: motionDisabled } = useMotionEntrance();
  const touchMobile = useTouchMobileLayout();
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);
  const [selectedProductCodes, setSelectedProductCodes] = useState<string[]>([]);

  // `loop` is a request: the hook keeps it only while this viewport's --edge-pad is small enough
  // to hide a wrapped slide, and quietly runs bounded (with working trimSnaps) when it is not.
  const [emblaRef, emblaApi] = useEmblaCarouselWithGestures(
    {
      loop: true,
      align: "center",
      containScroll: "trimSnaps",
      duration: touchMobile || reduceMotion ? 0 : 25,
      dragFree: false,
      breakpoints: {
        "(min-width: 600px)": { align: "start" },
      },
    },
    [],
    { wheelAxis: "x" },
  );

  const setViewport = useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      emblaRef(node);
    },
    [emblaRef],
  );

  const { products } = useProducts();

  useEffect(() => {
    let cancelled = false;
    void loadCarouselSelection().then(({ productCodes }) => {
      if (!cancelled) setSelectedProductCodes(productCodes);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Admin's pick wins and is shown in full; without one, bestsellers stand in, then the catalog.
  const carouselProducts = useMemo(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    const curated = selectedProductCodes
      .map((code) => byId.get(code))
      .filter((product): product is Product => Boolean(product));
    if (curated.length > 0) return curated;

    const bestsellers = products.filter((product) => product.isBestseller);
    return (bestsellers.length > 0 ? bestsellers : products).slice(0, FALLBACK_LIMIT);
  }, [products, selectedProductCodes]);

  const showSkeleton = carouselProducts.length === 0;

  // One handler for both events, and both are removed — the reInit listener used to be an inline
  // closure that cleanup never unsubscribed, so every re-init stacked another one.
  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };
    sync();
    emblaApi.on("select", sync);
    emblaApi.on("reInit", sync);
    return () => {
      emblaApi.off("select", sync);
      emblaApi.off("reInit", sync);
    };
  }, [emblaApi]);

  /**
   * Full `100svh` plus the browser-chrome strip (--browser-bar-b), same as the hero and bento
   * sections — see FeaturedShowcase's bentoSectionHeight for the identical pattern, which keeps
   * this section's height steady while mobile browser chrome shows/hides instead of resizing on
   * every scroll tick. Padding clears the fixed header on top and the chrome strip on bottom.
   * Header/carousel/dots keep their own tight spacing and are centered as one group (`justify-
   * center` on the column) rather than each stretching to fill the screen — that would split
   * the leftover height into two gaps (above the heading, below the dots) instead of one.
   */
  return (
    <section
      className="relative overflow-hidden box-border"
      style={{
        backgroundColor: "#EDE9E2",
        height: "calc(100svh + var(--browser-bar-b))",
        paddingTop: "calc(var(--main-header-h) + clamp(8px, 2vw, 20px))",
        paddingBottom: "calc(var(--browser-bar-b) + clamp(8px, 2vw, 20px))",
      }}
    >
      <style>{CAROUSEL_CSS}</style>

      <div className="h-full flex flex-col justify-center min-h-0">
        <motion.div
          initial={motionDisabled ? false : { opacity: 0, y: touchMobile ? 14 : 20 }}
          whileInView={motionDisabled ? undefined : { opacity: 1, y: 0 }}
          viewport={motionDisabled ? undefined : { once: true, margin: touchMobile ? "-24px" : "-80px" }}
          transition={{ duration: touchMobile ? 0.75 : 0.7, ease: easing }}
          className="shrink-0 max-w-[1400px] mx-auto w-full px-6 md:px-10 mb-2 sm:mb-3 md:mb-4"
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

        {/* Full-width on purpose — see CAROUSEL_CSS for why it sits outside the heading's column. */}
        <div className="shrink-0 relative pt-1 sm:pt-2 md:pt-6 pb-1 min-h-[min(72vw,320px)] min-[600px]:min-h-[min(48vw,360px)] lg:min-h-[420px]">
          <motion.div
            ref={setViewport}
            className="bestsellers-carousel relative overflow-x-hidden overflow-y-visible pt-2 pb-3 sm:pt-3 sm:pb-4 md:pt-4 md:pb-4 lg:pt-5 lg:pb-6"
            style={{ paddingLeft: "var(--edge-pad)", paddingRight: "var(--edge-pad)" }}
            initial={motionDisabled ? false : { opacity: 0, y: touchMobile ? 14 : 20 }}
            whileInView={motionDisabled ? undefined : { opacity: 1, y: 0 }}
            viewport={motionDisabled ? undefined : { once: true, margin: touchMobile ? "-24px" : "-60px" }}
            transition={{ duration: touchMobile ? 0.75 : 0.7, delay: touchMobile ? 0 : 0.1, ease: easing }}
          >
            <div
              className="flex items-start pt-2 [touch-action:pan-y_pinch-zoom]"
              style={{ marginLeft: "calc(var(--slide-spacing) * -1)", willChange: "transform" }}
            >
              {showSkeleton
                ? SKELETON_SLIDES.map((key) => (
                    <div key={key} className={SLIDE_CLASS} style={SLIDE_STYLE}>
                      <Skeleton className="aspect-[3/4] w-full rounded-[22px] sm:rounded-[28px] bg-[#E5E0D8]" />
                    </div>
                  ))
                : carouselProducts.map((product, index) => (
                    <div key={product.id} className={SLIDE_CLASS} style={SLIDE_STYLE}>
                      <ProductCard
                        product={product}
                        index={index}
                        size="carousel"
                        inCarousel
                        viewportRoot={viewportRef}
                      />
                    </div>
                  ))}
            </div>
          </motion.div>
        </div>

        {scrollSnaps.length > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-2.5 mt-3 sm:mt-4 md:mt-5">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => emblaApi?.scrollTo(index)}
                className="transition-all duration-300 rounded-full cursor-pointer"
                style={{
                  width: index === selectedIndex ? 28 : 10,
                  height: 10,
                  backgroundColor: index === selectedIndex ? "#4A0E0E" : "rgba(45,36,30,0.2)",
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
