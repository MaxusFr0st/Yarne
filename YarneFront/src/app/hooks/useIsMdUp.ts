import { useEffect, useState } from "react";

const QUERY = "(min-width: 768px)";

/**
 * Whether the page is at Tailwind's md width or wider. For markup that both layouts render and CSS
 * hides one of (the product page): only the shown one should carry the page's main heading.
 */
export function useIsMdUp(): boolean {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(QUERY).matches);
  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return matches;
}
