import React, { useMemo } from "react";
import { ProductCard } from "../ProductCard";
import type { Product } from "../../types/product";
import { buildDraftProduct, type DraftProductFormInput } from "../../utils/buildDraftProduct";

type CatalogColor = { id: number; name: string; hexCode: string };
type CatalogSize = { id: number; name: string };

type Props = {
  form: DraftProductFormInput;
  colors: CatalogColor[];
  sizes: CatalogSize[];
  categoryName: string;
};

const DEVICE_FRAMES = [
  { id: "mobile", label: "Mobile", width: 300, size: "collection" as const, previewBreakpoint: "mobile" as const },
  { id: "tablet", label: "Tablet", width: 380, size: "medium" as const, previewBreakpoint: "tablet" as const },
  { id: "desktop", label: "Desktop grid", width: 320, size: "collection" as const, previewBreakpoint: "desktop" as const },
];

export function ProductCardPreviewPanel({ form, colors, sizes, categoryName }: Props) {
  const draftProduct: Product = useMemo(
    () => buildDraftProduct(form, colors, sizes, categoryName),
    [form, colors, sizes, categoryName],
  );

  const hasImage = draftProduct.colors.some((c) => Boolean(c.image?.trim()));

  return (
    <div className="space-y-5">
      <div>
        <p
          className="text-[#2D241E]/40 uppercase tracking-widest text-xs mb-1"
          style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
        >
          Storefront preview
        </p>
        <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Live preview of how this product appears on collection cards. Updates as you edit name, price, colors, and photos.
        </p>
      </div>

      {!hasImage && (
        <p
          className="text-sm text-[#9B6B2E] rounded-[14px] px-4 py-3"
          style={{ backgroundColor: "rgba(155,107,46,0.08)", fontFamily: "'DM Sans', sans-serif" }}
        >
          Add at least one product photo to see the card image.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {DEVICE_FRAMES.map((device) => (
          <div key={device.id} className="flex flex-col items-center">
            <p
              className="text-xs uppercase tracking-widest text-[#2D241E]/45 mb-3"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
            >
              {device.label}
            </p>
            <div
              className="w-full rounded-[24px] p-4"
              style={{
                maxWidth: device.width,
                backgroundColor: "rgba(45,36,30,0.04)",
                border: "1px solid rgba(45,36,30,0.08)",
              }}
            >
              <div className="pointer-events-none select-none">
                <ProductCard
                  product={draftProduct}
                  size={device.size}
                  previewBreakpoint={device.previewBreakpoint}
                  subtleEntrance
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
