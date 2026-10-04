import { useEffect, useRef, useState } from "react";
import { peekStorefrontSetting } from "../api/storefrontSettings";
import type { Product } from "../types/product";
import { CARE_CONTENT_KEY, getInitialCareContent, loadCareContent, type CareContent } from "../utils/careContent";
import { CARE_SEED } from "../utils/careSeed";
import { useFirstVisitReady } from "./useFirstVisitReady";
import { useProducts } from "./useProducts";

/** Same cap as useFirstVisitReady: slow product data never keeps a care page blank longer. */
const PRODUCTS_MAX_WAIT_MS = 3000;

/**
 * The care guide's content, and nothing changing in front of the visitor.
 *
 * A returning visitor's page opens with the last server answer this browser saved, and keeps it
 * for as long as the page is open: a newer answer is saved (the loaders do that) and shows the
 * next time a care page opens. On a first visit there is nothing saved, so the page stays hidden
 * (`ready` false) until the answer arrives, instead of painting the built-in guide and swapping it.
 *
 * `slug`: the material the page is for. If the saved copy does not have it (added since), the
 * current answer is used once it is in. `current` turns true when the server has answered this
 * time: only then is a material that is still missing really gone.
 */
export function useCareContent(slug?: string): { content: CareContent; ready: boolean; current: boolean } {
  const [content, setContent] = useState<CareContent>(() => getInitialCareContent() ?? CARE_SEED);
  const [latest, setLatest] = useState<CareContent | null>(null);
  const shownRef = useRef(false);

  // Declared before the gate below so that, when both wait on the same answer, the content is
  // in place before the page is revealed.
  useEffect(() => {
    let cancelled = false;
    void loadCareContent().then((loaded) => {
      if (cancelled) return;
      const next = loaded ?? CARE_SEED;
      if (!shownRef.current) setContent(next);
      setLatest(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = useFirstVisitReady(() => peekStorefrontSetting(CARE_CONTENT_KEY) !== undefined, loadCareContent);
  shownRef.current = ready;

  const missing = slug !== undefined && !content.materials.some((material) => material.slug === slug);
  return { content: missing && latest ? latest : content, ready, current: latest !== null };
}

/**
 * The products the care pages name their pieces from. `known` is false while there is nothing
 * to name them with yet (a first visit, before the product list arrives): the page waits for it
 * rather than show the guide and then push it down when the pieces appear.
 */
export function useCareProducts(): { products: Product[]; known: boolean } {
  const { products, loading } = useProducts();
  const [waited, setWaited] = useState(false);
  const known = products.length > 0 || !loading || waited;

  useEffect(() => {
    if (known) return;
    const timer = window.setTimeout(() => setWaited(true), PRODUCTS_MAX_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [known]);

  return { products, known };
}
