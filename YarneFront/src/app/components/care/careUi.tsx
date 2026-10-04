import { useEffect, useState, type CSSProperties } from "react";
import { Archive, Brush, Droplet, ShoppingBag, Sun, Wind } from "lucide-react";
import type { CareIcon } from "../../utils/careContent";

export const SERIF: CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
export const SANS: CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" };

/** Uppercase UI label / button text. */
export const LABEL = "uppercase font-medium tracking-[0.12em]";
export const EYEBROW = "uppercase font-medium tracking-[0.18em]";

export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]";

/** Phones get the bottom sheet and the compact material rows; 768px and up the desktop layout. */
export function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setNarrow(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

const LUCIDE = { bag: ShoppingBag, brush: Brush, drop: Droplet, wind: Wind, box: Archive, sun: Sun } as const;

export function CareTopicIcon({ icon, size = 26 }: { icon: CareIcon; size?: number }) {
  if (icon === "pilling") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="8" cy="12" r="2" />
        <circle cx="16" cy="10" r="2" />
        <circle cx="13" cy="16" r="1.5" />
      </svg>
    );
  }
  const Icon = LUCIDE[icon];
  return <Icon size={size} strokeWidth={1.5} aria-hidden />;
}

/** Same address as the footer's Contact link. */
export const CARE_CONTACT_HREF = "mailto:hello@yarne.acc";
