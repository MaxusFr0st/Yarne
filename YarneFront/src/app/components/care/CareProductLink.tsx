import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import {
  careGuidePath,
  findCareMaterialForProduct,
  getInitialCareContent,
  loadCareContent,
  type CareContent,
} from "../../utils/careContent";

/**
 * "How to care for this piece": on a product page, opens the care guide of the product's
 * material with the product already chosen. Renders nothing for a product no material lists.
 */
export function CareProductLink({ productId, className = "" }: { productId: string; className?: string }) {
  const { t } = useTranslation();
  const [content, setContent] = useState<CareContent | null>(getInitialCareContent);

  useEffect(() => {
    let cancelled = false;
    void loadCareContent().then((loaded) => {
      if (!cancelled) setContent(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const material = findCareMaterialForProduct(content, productId);
  if (!material) return null;

  return (
    <LangLink
      to={careGuidePath(material, productId)}
      className={`inline-flex items-center gap-2 min-h-11 text-[#2D241E]/72 hover:text-[#4A0E0E] transition-colors text-[0.72rem] uppercase tracking-[0.12em] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 rounded-sm ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {t("care.productLink")}
      <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
    </LangLink>
  );
}
