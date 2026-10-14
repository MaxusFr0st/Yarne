import type { CSSProperties } from "react";
import type { Product } from "../types/product";
import { LangLink } from "../i18n/LangLink";
import { categorySlug } from "../utils/collectionSlug";
import { productCategory } from "../utils/productText";

type CategoryLinkProps = {
  product: Product;
  locale: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * The category label above a product's name, as a link to that category's page
 * (/collection/<slug>). A small arrow follows the word and slides a little on hover.
 */
export function CategoryLink({ product, locale, className, style }: CategoryLinkProps) {
  const label = productCategory(product, locale);
  const slug = categorySlug(product.categoryEn, product.category);
  if (!label) return null;
  if (!slug) return <p className={className} style={style}>{label}</p>;
  return (
    <p className={className} style={style}>
      <LangLink
        to={`/collection/${slug}`}
        className="group inline-flex items-center hover:text-[#2D241E] transition-colors duration-200"
      >
        {label}
        <span
          aria-hidden="true"
          className="ml-[0.45em] inline-block tracking-normal transition-transform duration-300 ease-out group-hover:translate-x-[3px] motion-reduce:transition-none"
        >
          →
        </span>
      </LangLink>
    </p>
  );
}
