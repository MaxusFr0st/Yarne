import { useEffect, useRef, type RefObject } from "react";
import type { Product } from "../types/product";
import { Priority, queuePhotos } from "../utils/photoQueue";
import { oneTapPhotos } from "../utils/productPhotos";

/**
 * "One tap away": while `ref` (a card, a showcase tile, the Why section's bags) is on screen, the
 * products it opens get their product page and colours downloaded (Priority.oneTap); when it is
 * one scroll away (a screen below, or a slide to the side) they are queued behind that
 * (Priority.oneScroll). Products the visitor never comes near cost only their card photo.
 */
export function usePrepareProducts(ref: RefObject<Element | null>, products: (Product | null | undefined)[]): void {
  const list = products.filter((p): p is Product => Boolean(p));
  const latest = useRef(list);
  latest.current = list;
  const key = list.map((p) => p.id).join(",");

  useEffect(() => {
    const el = ref.current;
    if (!el || !key) return;
    const watch = (priority: number, rootMargin: string) => {
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            queuePhotos(latest.current.flatMap(oneTapPhotos), priority);
          }
        },
        { rootMargin },
      );
      observer.observe(el);
      return observer;
    };
    const observers = [watch(Priority.oneTap, "0px"), watch(Priority.oneScroll, "0px 100% 100% 0px")];
    return () => observers.forEach((observer) => observer.disconnect());
  }, [ref, key]);
}
