import { useEffect, useState } from "react";
import { useLocale } from "../i18n/useLocale";
import { peekStorefrontSetting } from "../api/storefrontSettings";
import { useFirstVisitReady } from "./useFirstVisitReady";
import {
  getInitialStaticPagesCopy,
  getStaticPageContentForLocale,
  loadStaticPagesCopy,
  STATIC_PAGE_COPY_KEY,
  type StaticPageLocaleContent,
  type StaticPagesCopy,
} from "../utils/staticPageCopy";

export function useStaticPageCopy(pageKey: keyof StaticPagesCopy): StaticPageLocaleContent {
  const locale = useLocale();
  const [copy, setCopy] = useState<StaticPagesCopy>(getInitialStaticPagesCopy);

  useEffect(() => {
    let cancelled = false;
    void loadStaticPagesCopy().then((loaded) => {
      if (!cancelled) setCopy(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return getStaticPageContentForLocale(copy, pageKey, locale);
}

/** False on a first visit until the page text has arrived; see useFirstVisitReady. */
export function useStaticPageReady(): boolean {
  return useFirstVisitReady(() => peekStorefrontSetting(STATIC_PAGE_COPY_KEY) !== undefined, loadStaticPagesCopy);
}
