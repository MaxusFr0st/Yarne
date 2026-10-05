import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
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

export const FOCUS_RING_ON_INK = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2ED]/70";

/** The full-pill buttons of the care pages; add a height, a padding, justify-center or -between, and one of the tones below. */
export const PILL =
  "inline-flex items-center gap-3 rounded-full uppercase font-medium tracking-[0.15em] text-[11.5px] md:text-xs whitespace-nowrap cursor-pointer transition-opacity duration-300 hover:opacity-85";
export const PILL_INK = `bg-[#2D241E] text-[#F5F2ED] ${FOCUS_RING}`;
export const PILL_OUTLINE = `border border-[#2D241E]/25 text-[#2D241E] ${FOCUS_RING}`;
export const PILL_CREAM = `bg-[#F5F2ED] text-[#2D241E] ${FOCUS_RING_ON_INK}`;
export const PILL_OUTLINE_ON_INK = `border border-[#F5F2ED]/45 text-[#F5F2ED] ${FOCUS_RING_ON_INK}`;

type LineIconProps = { size?: number; className?: string };

function LineIcon({ size = 20, className, children }: LineIconProps & { children: ReactNode }) {
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
      className={`shrink-0 ${className ?? ""}`}
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Needle and thread: care at home, repairs. */
export function CareNeedleIcon(props: LineIconProps) {
  return (
    <LineIcon {...props}>
      <path d="M4 20l9-9M13 11l3-3 4 4-3 3zM14 6l4 4" />
    </LineIcon>
  );
}

/** Knitted rows: re-knitting. */
export function CareKnitIcon(props: LineIconProps) {
  return (
    <LineIcon {...props}>
      <path d="M6 4h12M6 20h12M8 4v16M16 4v16M8 9h8M8 14h8" />
    </LineIcon>
  );
}

export const CARE_GUARANTEE_PATH = "/pages/care/guarantee";
export const CARE_REQUEST_PATH = "/pages/care/request";
