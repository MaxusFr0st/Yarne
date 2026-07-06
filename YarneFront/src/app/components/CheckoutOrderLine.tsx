import { useTranslation } from "react-i18next";
import type { CartItem } from "../context/AppContext";
import type { Locale } from "../i18n/config";
import { PriceTag } from "./PriceTag";

type CheckoutOrderLineProps = {
  item: CartItem;
  locale: Locale;
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <span className="text-[#2D241E]/50 shrink-0">{label}</span>
      <span className="text-[#2D241E] text-right">{value}</span>
    </div>
  );
}

export function CheckoutOrderLine({ item, locale }: CheckoutOrderLineProps) {
  const { t } = useTranslation();

  const laceLabel =
    item.withLace == null
      ? null
      : item.withLace
        ? t("product.lace.withLace")
        : t("product.lace.withoutLace");

  return (
    <div className="mt-3 space-y-1.5 pt-3 border-t border-[#2D241E]/8">
      <DetailRow label={t("checkout.productCode")} value={item.productId} />
      {item.subtitle ? <DetailRow label={t("checkout.model")} value={item.subtitle} /> : null}
      <DetailRow label={t("checkout.color")} value={item.color} />
      <DetailRow label={t("checkout.size")} value={item.size} />
      {laceLabel ? <DetailRow label={t("checkout.lace")} value={laceLabel} /> : null}
      <DetailRow label={t("checkout.quantity")} value={String(item.quantity)} />
      <div className="flex items-start justify-between gap-4 text-xs pt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/50 shrink-0">{t("checkout.unitPrice")}</span>
        <PriceTag amount={item.price} locale={locale} variant="line" />
      </div>
      <div className="flex items-start justify-between gap-4 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <span className="text-[#2D241E]/70 shrink-0">{t("checkout.lineTotal")}</span>
        <PriceTag amount={item.price * item.quantity} locale={locale} variant="line" />
      </div>
    </div>
  );
}
