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

  const colorPreviews = useMemo(
    () =>
      draftProduct.colors
        .map((color) => ({
          colorName: color.name,
          colorHex: color.hex,
          hasImage: Boolean(color.image?.trim()),
          product: { ...draftProduct, defaultColor: color.name } as Product,
        }))
        .filter((entry) => entry.hasImage),
    [draftProduct],
  );

  const defaultColorPreview = useMemo(() => {
    const defaultName = draftProduct.defaultColor;
    const match = colorPreviews.find((entry) => entry.colorName === defaultName);
    return match ?? colorPreviews[0] ?? null;
  }, [colorPreviews, draftProduct.defaultColor]);

  return (
    <div className="space-y-8">
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

      {colorPreviews.length > 0 && (
        <div className="space-y-4">
          <div>
            <p
              className="text-[#2D241E]/40 uppercase tracking-widest text-xs mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
            >
              All color variants
            </p>
            <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Each card shows the primary photo for that color on the storefront.
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            {colorPreviews.map(({ colorName, colorHex, product }) => (
              <div key={colorName} className="flex flex-col items-center gap-2" style={{ width: 200 }}>
                <div
                  className="w-full rounded-[24px] p-3"
                  style={{
                    backgroundColor: "rgba(45,36,30,0.04)",
                    border: "1px solid rgba(45,36,30,0.08)",
                  }}
                >
                  <div className="pointer-events-none select-none">
                    <ProductCard
                      product={product}
                      size="collection"
                      previewBreakpoint="mobile"
                      subtleEntrance
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      backgroundColor: colorHex,
                      border: "1.5px solid rgba(45,36,30,0.2)",
                      display: "inline-block",
                    }}
                  />
                  <span className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {colorName}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {defaultColorPreview && (
        <div className="space-y-4">
          <div>
            <p
              className="text-[#2D241E]/40 uppercase tracking-widest text-xs mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
            >
              Default color — responsive sizes
            </p>
            <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {defaultColorPreview.colorName} at mobile, tablet, and desktop breakpoints.
            </p>
          </div>
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
                      product={defaultColorPreview.product}
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
      )}
    </div>
  );
}
