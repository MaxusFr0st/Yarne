import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Nothing changes in front of the visitor: `value` passes through while the element has not
 * been on screen yet, so a section below the fold can still take the server's newer answer
 * after starting from the copy saved on an earlier visit. From the moment it is seen showing
 * real content (`ready`), what the visitor saw is kept for the rest of the visit, and a later
 * answer (already saved by the loaders) shows next visit.
 */
export function useSeenLock<T>(value: T, ready: boolean, ref: RefObject<Element | null>): T {
  const [locked, setLocked] = useState<{ value: T } | null>(null);
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    if (locked || !ready) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setLocked({ value: latest.current });
      },
      // Seen once it rises above the screen's lower fifth, not at its first pixel: on phones the
      // hero is sized from the width, so the next section's empty top edge peeks in below it from
      // the start, and counting that would lock in the saved copy before the newer one can land.
      { rootMargin: "0px 0px -20% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [locked, ready, ref]);

  return locked ? locked.value : value;
}
