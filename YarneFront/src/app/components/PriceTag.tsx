import type { CSSProperties } from "react";
import type { Locale } from "../i18n/config";
import { getHryvniaUnit, splitPriceCompact } from "../i18n/format";
import { useLocale } from "../i18n/useLocale";

export type PriceTagVariant = "card" | "display" | "line" | "emphasis";
export type PriceTagTone = "dark" | "light";

type PriceTagProps = {
  amount: number;
  locale?: Locale;
  variant?: PriceTagVariant;
  /** On photo overlays use `light` (white type). Default `dark` for cream/white UI. */
  tone?: PriceTagTone;
  /** Ukrainian declension (гривня/гривні/гривень) — cart totals, checkout. */
  withUnit?: boolean;
  className?: string;
};

const SERIF = "'Cormorant Garamond', serif";
const SANS = "'DM Sans', sans-serif";

const VARIANT_STYLES: Record<
  PriceTagVariant,
  {
    fontSize: string;
    amountWeight: number;
    amountOpacity: number;
    symbolScale: number;
    symbolWeight: number;
    symbolOpacity: number;
    gap: string;
    unitSize?: string;
  }
> = {
  card: {
    fontSize: "clamp(0.94rem, 3.5vw, 1.05rem)",
    amountWeight: 500,
    amountOpacity: 0.9,
    symbolScale: 0.92,
    symbolWeight: 700,
    symbolOpacity: 0.88,
    gap: "0.18em",
  },
  display: {
    fontSize: "clamp(1.38rem, 4.2vw, 1.72rem)",
    amountWeight: 500,
    amountOpacity: 0.94,
    symbolScale: 0.9,
    symbolWeight: 700,
    symbolOpacity: 0.9,
    gap: "0.22em",
  },
  line: {
    fontSize: "1.02rem",
    amountWeight: 500,
    amountOpacity: 0.92,
    symbolScale: 0.9,
    symbolWeight: 700,
    symbolOpacity: 0.86,
    gap: "0.18em",
  },
  emphasis: {
    fontSize: "clamp(1.12rem, 3vw, 1.48rem)",
    amountWeight: 500,
    amountOpacity: 0.96,
    symbolScale: 0.88,
    symbolWeight: 700,
    symbolOpacity: 0.9,
    gap: "0.2em",
    unitSize: "0.72rem",
  },
};

function ink(opacity: number, tone: PriceTagTone): string {
  return tone === "light"
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(45, 36, 30, ${opacity})`;
}

export function PriceTag({
  amount,
  locale: localeProp,
  variant = "card",
  tone = "dark",
  withUnit = false,
  className = "",
}: PriceTagProps) {
  const contextLocale = useLocale();
  const locale = localeProp ?? contextLocale;
  const { symbol, value } = splitPriceCompact(amount, locale);
  const unit = withUnit && locale === "uk" ? getHryvniaUnit(amount) : null;
  const v = VARIANT_STYLES[variant];

  const rootStyle: CSSProperties = {
    fontFamily: SERIF,
    fontSize: v.fontSize,
    fontFeatureSettings: '"tnum", "lnum"',
    lineHeight: 1.1,
    letterSpacing: "0.015em",
  };

  const symbolStyle: CSSProperties = {
    fontSize: `${v.symbolScale}em`,
    fontWeight: v.symbolWeight,
    color: ink(v.symbolOpacity, tone),
    marginRight: v.gap,
    transform: "translateY(-0.04em)",
  };

  const amountStyle: CSSProperties = {
    fontWeight: v.amountWeight,
    color: ink(v.amountOpacity, tone),
  };

  const unitStyle: CSSProperties = {
    fontFamily: SANS,
    fontSize: v.unitSize ?? "0.68rem",
    fontWeight: 400,
    color: tone === "light" ? "rgba(255, 255, 255, 0.55)" : "rgba(45, 36, 30, 0.42)",
    letterSpacing: "0.04em",
    marginLeft: "0.35em",
  };

  return (
    <span
      className={`inline-flex items-baseline whitespace-nowrap tabular-nums ${className}`.trim()}
      style={rootStyle}
      aria-label={`${symbol} ${value}${unit ? ` ${unit}` : ""}`}
    >
      <span style={symbolStyle} aria-hidden>
        {symbol}
      </span>
      <span style={amountStyle}>{value}</span>
      {unit ? (
        <span style={unitStyle} aria-hidden>
          {unit}
        </span>
      ) : null}
    </span>
  );
}
