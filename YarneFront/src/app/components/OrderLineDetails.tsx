import { useTranslation } from "react-i18next";
import type { OrderItemDto } from "../api/orders";
import type { CartItem } from "../context/AppContext";
import type { Locale } from "../i18n/config";
import { PriceTag } from "./PriceTag";

export type OrderLineDetailsData = {
  productCode: string;
  subtitle?: string | null;
  color?: string | null;
  furnitureColor?: string | null;
  size?: string | null;
  withLace?: boolean | null;
  quantity: number;
  unitPrice: number;
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
    withLace: item.withLace,
    quantity: item.quantity,
    unitPrice: item.price,
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
  });
}

type OrderLineDetailsProps = {
  line: OrderLineDetailsData;
  locale: Locale;
  className?: string;
};

export function OrderLineDetails({ line, locale, className = "" }: OrderLineDetailsProps) {
  const { t } = useTranslation();

  const laceLabel =
    line.withLace === true
      ? t("product.lace.withLace")
      : line.withLace === false
        ? t("product.lace.withoutLace")
        : t("checkout.laceNotApplicable");

  const lineTotal = line.unitPrice * line.quantity;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <DetailRow label={t("checkout.productCode")} value={line.productCode} />
      <DetailRow label={t("checkout.model")} value={line.subtitle?.trim() || "—"} />
      <DetailRow label={t("checkout.color")} value={line.color?.trim() || "—"} />
      {Boolean(line.furnitureColor?.trim()) && (
        <DetailRow label={t("product.furniture")} value={line.furnitureColor!.trim()} />
      )}
      <DetailRow label={t("checkout.size")} value={line.size?.trim() || "—"} />
      <DetailRow label={t("checkout.lace")} value={laceLabel} />
      <DetailRow label={t("checkout.quantity")} value={String(line.quantity)} />
      <div className="flex items-start justify-between gap-4 text-xs pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/50 shrink-0">{t("checkout.unitPrice")}</span>
        <PriceTag amount={line.unitPrice} locale={locale} variant="line" />
      </div>
      <div className="flex items-start justify-between gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/70 shrink-0">{t("checkout.lineTotal")}</span>
        <PriceTag amount={lineTotal} locale={locale} variant="line" />
      </div>
    </div>
  );
}
