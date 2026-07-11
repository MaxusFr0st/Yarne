import { useEffect, useState } from "react";
import { useLocale } from "../i18n/useLocale";
import {
  getDefaultHomePageCopy,
  getHomePageCopyForLocale,
  loadHomePageCopy,
  type HomePageCopy,
  type HomePageCopyLocale,
} from "../utils/homePageCopy";

export function useHomePageCopy(): HomePageCopyLocale {
  const locale = useLocale();
  const [copy, setCopy] = useState<HomePageCopy>(getDefaultHomePageCopy);

  useEffect(() => {
    let cancelled = false;
    void loadHomePageCopy().then((loaded) => {
      if (!cancelled) setCopy(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return getHomePageCopyForLocale(copy, locale);
}
