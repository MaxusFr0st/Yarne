import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { useEmblaCarouselWithGestures } from "../hooks/useEmblaCarouselWithGestures";
import { useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Product } from "../types/product";
import { ProductCard } from "./ProductCard";
import { useTouchMobileLayout } from "../hooks/useTouchMobileLayout";

type MobileRelatedProductsProps = {
  products: Product[];
};

export function MobileRelatedProducts({ products }: MobileRelatedProductsProps) {
  const { t } = useTranslation();
  const touchMobile = useTouchMobileLayout();
  const reduceMotion = useReducedMotion();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [emblaRef, emblaApi] = useEmblaCarouselWithGestures({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    duration: touchMobile || reduceMotion ? 0 : 22,
  }, [], { wheelAxis: "y" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (products.length === 0) return null;

  return (
    <section className="md:hidden px-[clamp(14px,3.6vw,22px)] pt-[clamp(20px,5vw,28px)] pb-[clamp(16px,4vw,24px)]">
      <p
        className="text-[#2D241E]/45 uppercase mb-1"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.18em",
          fontSize: "clamp(0.58rem, 2.3vw, 0.68rem)",
        }}
      >
        {t("product.relatedEyebrow", { defaultValue: "You may also like" })}
      </p>
      <h2
        className="text-[#2D241E] mb-[clamp(12px,3vw,16px)]"
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(1.25rem, 5vw, 1.6rem)",
          fontWeight: 400,
          lineHeight: 1.1,
        }}
      >
        {t("product.relatedTitle", { defaultValue: "Complete the wardrobe" })}
      </h2>

      <div
        ref={(el) => {
          (emblaRef as (node: HTMLDivElement | null) => void)(el);
          viewportRef.current = el;
        }}
        className="related-carousel relative overflow-x-hidden overflow-y-visible -mx-[clamp(14px,3.6vw,22px)] px-[clamp(14px,3.6vw,22px)] pb-2"
        style={{ "--slide-spacing": "clamp(14px, 3.6vw, 18px)", "--slide-size": "clamp(72%, 76vw, 80%)" } as CSSProperties}
      >
        <div
          className="flex items-start [touch-action:pan-y_pinch-zoom]"
          style={{ marginLeft: "calc(var(--slide-spacing) * -1)", ...(touchMobile || reduceMotion ? {} : { willChange: "transform" }) }}
        >
          {products.map((product, i) => (
            <div
              key={product.id}
              className="shrink-0 min-w-0 overflow-visible"
              style={{
                paddingLeft: "var(--slide-spacing)",
                flex: "0 0 var(--slide-size)",
              }}
            >
              <ProductCard product={product} index={i} size="carousel" inCarousel viewportRoot={viewportRef} />
            </div>
          ))}
        </div>
      </div>

      {products.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-[clamp(10px,2.5vw,14px)]">
          {products.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => emblaApi?.scrollTo(i)}
              className="rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: selectedIndex === i ? "clamp(18px, 4.5vw, 22px)" : "clamp(6px, 1.5vw, 7px)",
                height: "clamp(6px, 1.5vw, 7px)",
                backgroundColor: selectedIndex === i ? "#2D241E" : "rgba(45,36,30,0.2)",
              }}
              aria-label={`${t("product.relatedSlide", { defaultValue: "Related product" })} ${i + 1}`}
              aria-current={selectedIndex === i}
            />
          ))}
        </div>
      )}
    </section>
  );
}
