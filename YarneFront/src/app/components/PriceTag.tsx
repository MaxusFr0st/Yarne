import type { CSSProperties } from "react";
import type { Locale } from "../i18n/config";
import { getHryvniaUnit, splitPriceCompact } from "../i18n/format";
import { useLocale } from "../i18n/useLocale";

export type PriceTagVariant = "card" | "display" | "line" | "emphasis";

type PriceTagProps = {
  amount: number;
  locale?: Locale;
  variant?: PriceTagVariant;
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
    symbolOpacity: number;
    gap: string;
    unitSize?: string;
  }
> = {
  card: {
    fontSize: "clamp(0.94rem, 3.5vw, 1.05rem)",
    amountWeight: 500,
    amountOpacity: 0.84,
    symbolScale: 0.76,
    symbolOpacity: 0.42,
    gap: "0.22em",
  },
  display: {
    fontSize: "clamp(1.38rem, 4.2vw, 1.72rem)",
    amountWeight: 500,
    amountOpacity: 0.92,
    symbolScale: 0.72,
    symbolOpacity: 0.38,
    gap: "0.26em",
  },
  line: {
    fontSize: "1.02rem",
    amountWeight: 500,
    amountOpacity: 0.88,
    symbolScale: 0.74,
    symbolOpacity: 0.4,
    gap: "0.2em",
  },
  emphasis: {
    fontSize: "clamp(1.12rem, 3vw, 1.48rem)",
    amountWeight: 500,
    amountOpacity: 0.94,
    symbolScale: 0.7,
    symbolOpacity: 0.36,
    gap: "0.24em",
    unitSize: "0.72rem",
  },
};

export function PriceTag({
  amount,
  locale: localeProp,
  variant = "card",
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
    fontWeight: 400,
    color: `rgba(45, 36, 30, ${v.symbolOpacity})`,
    marginRight: v.gap,
    transform: "translateY(-0.05em)",
  };

  const amountStyle: CSSProperties = {
    fontWeight: v.amountWeight,
    color: `rgba(45, 36, 30, ${v.amountOpacity})`,
  };

  const unitStyle: CSSProperties = {
    fontFamily: SANS,
    fontSize: v.unitSize ?? "0.68rem",
    fontWeight: 400,
    color: "rgba(45, 36, 30, 0.38)",
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
