import { useEffect, useState } from "react";
import {
  getInitialHomePageCopy,
  loadHomePageCopy,
  type HomePageCopy,
} from "../utils/homePageCopy";

/** Both languages, for a section that keeps what the visitor saw (useSeenLock) yet must still switch language. */
export function useHomePageCopyAll(): HomePageCopy {
  const [copy, setCopy] = useState<HomePageCopy>(getInitialHomePageCopy);

  useEffect(() => {
    let cancelled = false;
    void loadHomePageCopy().then((loaded) => {
      if (!cancelled) setCopy(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return copy;
}
