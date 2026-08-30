import { useTranslation } from "react-i18next";
import type { OrderItemDto } from "../api/orders";
import type { CartItem } from "../context/AppContext";
import type { Locale } from "../i18n/config";
import { PriceTag } from "./PriceTag";
import { localizedCatalogName } from "../utils/localizedName";

export type OrderLineDetailsData = {
  productCode: string;
  subtitle?: string | null;
  color?: string | null;
  furnitureColor?: string | null;
  size?: string | null;
  /** Ukrainian catalogue names; absent for API-sourced lines, which fall back to the above. */
  colorUk?: string | null;
  furnitureColorUk?: string | null;
  sizeUk?: string | null;
  withLace?: boolean | null;
  quantity: number;
  unitPrice: number;
  /** EUR snapshot at purchase time (or live EUR price pre-order). Null/undefined falls back to UAH. */
  eurUnitPrice?: number | null;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <span className="text-[#2D241E]/50 shrink-0">{label}</span>
      <span className="text-[#2D241E] text-right">{value}</span>
    </div>
  );
}

export function cartItemToLineDetails(item: CartItem): OrderLineDetailsData {
  return {
    productCode: item.productId,
    subtitle: item.subtitle,
    color: item.color,
    furnitureColor: item.furnitureColor,
    size: item.size,
    colorUk: item.colorUk,
    furnitureColorUk: item.furnitureColorUk,
    sizeUk: item.sizeUk,
    withLace: item.withLace,
    quantity: item.quantity,
    unitPrice: item.price,
    eurUnitPrice: item.eurPrice,
  };
}

export function accountOrderItemToLineDetails(item: {
  productCode: string;
  subtitle?: string | null;
  colorName?: string | null;
  furnitureColorName?: string | null;
  sizeName?: string | null;
  withLace?: boolean | null;
  quantity: number;
  unitPrice: number;
  eurUnitPrice?: number | null;
}): OrderLineDetailsData {
  return {
    productCode: item.productCode,
    subtitle: item.subtitle,
    color: item.colorName,
    furnitureColor: item.furnitureColorName,
    size: item.sizeName,
    withLace: item.withLace,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    eurUnitPrice: item.eurUnitPrice,
  };
}

export function orderItemDtoToLineDetails(item: OrderItemDto): OrderLineDetailsData {
  return accountOrderItemToLineDetails({
    productCode: item.productCode,
    subtitle: item.productSubtitle,
    colorName: item.colorName,
    furnitureColorName: item.furnitureColorName,
    sizeName: item.sizeName,
    withLace: item.withLace,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    eurUnitPrice: item.eurUnitPrice,
  });
}

type OrderLineDetailsProps = {
  line: OrderLineDetailsData;
  locale: Locale;
  className?: string;
  /** `compact` folds code/colour/size/lace/qty/price into one line — used on checkout's order card. */
  variant?: "stacked" | "compact";
};

export function OrderLineDetails({ line, locale, className = "", variant = "stacked" }: OrderLineDetailsProps) {
  const { t } = useTranslation();

  const laceLabel =
    line.withLace === true
      ? t("product.lace.withLace")
      : line.withLace === false
        ? t("product.lace.withoutLace")
        : null;

  // Catalogue names are stored in English; show the Ukrainian one when we have it.
  const color = line.color?.trim() ? localizedCatalogName(line.color, line.colorUk, locale) : "";
  const furniture = line.furnitureColor?.trim()
    ? localizedCatalogName(line.furnitureColor, line.furnitureColorUk, locale)
    : "";
  const size = line.size?.trim() ? localizedCatalogName(line.size, line.sizeUk, locale) : "";

  if (variant === "compact") {
    // Product code dropped — it means nothing to a shopper and it was crowding out the
    // details that do: colour, hardware, size and whether a strap is included.
    const descriptors = [color, furniture, size].filter(Boolean).join(" · ");

    return (
      <div className={`flex items-start justify-between gap-3 ${className}`}>
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
          <span
            className="text-[#2D241E]/55 text-xs truncate max-w-full"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {descriptors}
          </span>
          {/* Strap status is its own chip rather than another "·" segment: on a phone the
              descriptor run truncates, and it was exactly this — the one detail that changes
              what physically arrives — that got cut off the end. A chip cannot be truncated away. */}
          {laceLabel && (
            <span
              className="shrink-0 rounded-full whitespace-nowrap"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.62rem",
                letterSpacing: "0.02em",
                padding: "2px 7px",
                backgroundColor: line.withLace ? "rgba(45,36,30,0.08)" : "transparent",
                border: `1px solid ${line.withLace ? "transparent" : "rgba(45,36,30,0.18)"}`,
                color: "rgba(45,36,30,0.65)",
              }}
            >
              {laceLabel}
            </span>
          )}
          <span className="shrink-0 text-[#2D241E]/45 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            ×{line.quantity}
          </span>
        </div>
        <PriceTag amount={line.unitPrice} eurAmount={line.eurUnitPrice} locale={locale} variant="line" className="shrink-0" />
      </div>
    );
  }

  const lineTotal = line.unitPrice * line.quantity;
  const eurLineTotal = line.eurUnitPrice != null ? line.eurUnitPrice * line.quantity : null;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <DetailRow label={t("checkout.productCode")} value={line.productCode} />
      <DetailRow label={t("checkout.model")} value={line.subtitle?.trim() || "—"} />
      <DetailRow label={t("checkout.color")} value={color || "—"} />
      {Boolean(furniture) && <DetailRow label={t("product.furniture")} value={furniture} />}
      <DetailRow label={t("checkout.size")} value={size || "—"} />
      <DetailRow label={t("checkout.lace")} value={laceLabel ?? t("checkout.laceNotApplicable")} />
      <DetailRow label={t("checkout.quantity")} value={String(line.quantity)} />
      <div className="flex items-start justify-between gap-4 text-xs pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/50 shrink-0">{t("checkout.unitPrice")}</span>
        <PriceTag amount={line.unitPrice} eurAmount={line.eurUnitPrice} locale={locale} variant="line" />
      </div>
      <div className="flex items-start justify-between gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/70 shrink-0">{t("checkout.lineTotal")}</span>
        <PriceTag amount={lineTotal} eurAmount={eurLineTotal} locale={locale} variant="line" />
      </div>
    </div>
  );
}
