import { useEffect, useState } from "react";
import { useLocale } from "../i18n/useLocale";
import {
  getInitialStaticPagesCopy,
  getStaticPageContentForLocale,
  loadStaticPagesCopy,
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
