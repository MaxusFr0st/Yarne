import { useEffect, useRef, useState } from "react";
import { peekStorefrontSetting } from "../api/storefrontSettings";
import { CONTACT_CONTENT_KEY, CONTACT_SEED, getInitialContactContent, loadContactContent, type ContactContent } from "../utils/contactContent";
import {
  GUARANTEE_CONTENT_KEY,
  GUARANTEE_SEED,
  getInitialGuaranteeContent,
  loadGuaranteeContent,
  type GuaranteeContent,
} from "../utils/guaranteeContent";
import { DELIVERY_CONTENT_KEY, DELIVERY_SEED, getInitialDeliveryContent, loadDeliveryContent, type DeliveryContent } from "../utils/deliveryContent";
import { useFirstVisitReady } from "./useFirstVisitReady";

/**
 * Like useCareContent: a returning visitor's page opens with the last server answer and keeps
 * it while the page is open; on a first visit the page stays hidden (`ready` false) until the
 * answer arrives, instead of painting the built-in text and swapping it.
 */
function useStoredContent<T>(key: string, initial: () => T | null, load: () => Promise<T | null>, seed: T): { content: T; ready: boolean } {
  const [content, setContent] = useState<T>(() => initial() ?? seed);
  const shownRef = useRef(false);

  // Declared before the gate below so the content is in place before the page is revealed.
  useEffect(() => {
    let cancelled = false;
    void load().then((loaded) => {
      if (!cancelled && !shownRef.current) setContent(loaded ?? seed);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = useFirstVisitReady(() => peekStorefrontSetting(key) !== undefined, load);
  shownRef.current = ready;

  return { content, ready };
}

export function useGuaranteeContent(): { content: GuaranteeContent; ready: boolean } {
  return useStoredContent(GUARANTEE_CONTENT_KEY, getInitialGuaranteeContent, loadGuaranteeContent, GUARANTEE_SEED);
}

export function useContactContent(): { content: ContactContent; ready: boolean } {
  return useStoredContent(CONTACT_CONTENT_KEY, getInitialContactContent, loadContactContent, CONTACT_SEED);
}

export function useDeliveryContent(): { content: DeliveryContent; ready: boolean } {
  return useStoredContent(DELIVERY_CONTENT_KEY, getInitialDeliveryContent, loadDeliveryContent, DELIVERY_SEED);
}
