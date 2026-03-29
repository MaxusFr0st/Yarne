import React, { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "motion/react";
import { useProducts } from "../hooks/useProducts";
import { ProductCard } from "./ProductCard";
import { getCarouselSelection } from "../utils/carouselSelection";

const easing = [0.25, 0.1, 0.25, 1] as const;

export function BestSellersCarousel() {
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
  const fallbackProducts = products
    .filter((p) => p.isBestseller || p.isNew)
    .slice(0, 8);
  const carouselProducts = selectedProducts.length > 0
    ? selectedProducts
    : (fallbackProducts.length > 0 ? fallbackProducts : products.slice(0, 8));

  useEffect(() => {
    const syncSelection = () => {
      const { productCodes } = getCarouselSelection();
      setSelectedProductCodes(productCodes);
    };
    syncSelection();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", syncSelection);
    return () => window.removeEventListener("storage", syncSelection);
  }, []);

  return (
    <section className="py-20 md:py-28 overflow-hidden" style={{ backgroundColor: "#EDE9E2" }}>
      <div className="max-w-[1400px] mx-auto px-6 md:px-10">
        {/* Header */}
        <div className="flex items-end justify-between mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: easing }}
          >
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase mb-3"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.2em",
                fontSize: "0.7rem",
              }}
            >
              Most Loved
            </p>
            <h2
              className="text-[#2D241E]"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              Best Sellers
            </h2>
          </motion.div>

        </div>

        {/* Carousel – wider container with edge fade (lighter on mobile) */}
        <style>{`
          .carousel-fade { mask-image: linear-gradient(to right, rgba(0,0,0,0.35) 0%, black 16px, black calc(100% - 16px), rgba(0,0,0,0.35) 100%); -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.35) 0%, black 16px, black calc(100% - 16px), rgba(0,0,0,0.35) 100%); }
          @media (min-width: 768px) { .carousel-fade { mask-image: linear-gradient(to right, rgba(0,0,0,0.25) 0%, black 48px, black calc(100% - 48px), rgba(0,0,0,0.25) 100%); -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0.25) 0%, black 48px, black calc(100% - 48px), rgba(0,0,0,0.25) 100%); } }
        `}</style>
        <div className="carousel-fade relative -mx-6 md:-mx-8">
          <motion.div
            ref={(el) => {
              (emblaRef as (el: HTMLDivElement | null) => void)(el);
              (viewportRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
            }}
            className="relative overflow-hidden pt-2.5 pb-2.5 px-6 md:px-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, delay: 0.1, ease: easing }}
          >
          <div className="flex pr-6 md:pr-0">
            {carouselProducts.map((product, i) => (
              <div
                key={`${product.id}-${i}`}
                className="shrink-0 min-w-0 mr-5 basis-[66.67%] md:basis-[23%] md:min-w-[200px]"
              >
                <ProductCard product={product} index={i} size="carousel" inCarousel viewportRoot={viewportRef} />
              </div>
            ))}
          </div>
        </motion.div>
        </div>

        {/* Dot Indicators */}
        {scrollSnaps.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: index === selectedIndex ? 24 : 8,
                  height: 8,
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
