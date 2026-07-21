import React, { useEffect, useMemo, useState } from "react";
import { ProductCard } from "../ProductCard";
import { buildDraftProduct, type DraftProductFormInput } from "../../utils/buildDraftProduct";
import {
  buildVariantPhotoGroups,
  findColorIndexById,
  type VariantPhotoEntry,
} from "../../utils/buildVariantPhotoGroups";
import { getDefaultColorIndex } from "../../utils/productColorIndex";
import { resolveMediaUrl } from "../../utils/storefrontMedia";

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
] as const;

type DeviceId = (typeof DEVICE_FRAMES)[number]["id"];

type PhotoSelection = {
  colorId: number;
  variantKey: string;
  photoIndex: number;
  url: string;
};

function selectionKey(entry: Pick<VariantPhotoEntry, "colorId" | "variantKey" | "photoIndex">) {
  return `${entry.colorId}:${entry.variantKey}:${entry.photoIndex}`;
}

export function ProductCardPreviewPanel({ form, colors, sizes, categoryName }: Props) {
  const draftProduct = useMemo(
    () => buildDraftProduct(form, colors, sizes, categoryName),
    [form, colors, sizes, categoryName],
  );

  const variantGroups = useMemo(
    () => buildVariantPhotoGroups(form, colors, sizes),
    [form, colors, sizes],
  );

  const allPhotos = useMemo(() => variantGroups.flatMap((g) => g.photos), [variantGroups]);

  const [activeDevice, setActiveDevice] = useState<DeviceId>("mobile");
  const [activeColorIndex, setActiveColorIndex] = useState(() => getDefaultColorIndex(draftProduct));
  const [photoSelection, setPhotoSelection] = useState<PhotoSelection | null>(null);

  useEffect(() => {
    setActiveColorIndex(getDefaultColorIndex(draftProduct));
  }, [draftProduct.defaultColor, draftProduct.colors.length]);

  useEffect(() => {
    if (allPhotos.length === 0) {
      setPhotoSelection(null);
      return;
    }

    setPhotoSelection((prev) => {
      if (prev && allPhotos.some((p) => selectionKey(p) === selectionKey(prev) && p.url === prev.url)) {
        return prev;
      }
      const colorId = draftProduct.colors[activeColorIndex]
        ? form.colorIds[activeColorIndex] ?? variantGroups[activeColorIndex]?.colorId
        : variantGroups[0]?.colorId;
      const group = variantGroups.find((g) => g.colorId === colorId) ?? variantGroups[0];
      const first = group?.photos[0];
      if (!first) return null;
      return {
        colorId: first.colorId,
        variantKey: first.variantKey,
        photoIndex: first.photoIndex,
        url: first.url,
      };
    });
  }, [allPhotos, variantGroups, draftProduct.colors, activeColorIndex, form.colorIds]);

  const previewImageOverride = useMemo(() => {
    if (!photoSelection) return undefined;
    return resolveMediaUrl(photoSelection.url) || photoSelection.url;
  }, [photoSelection]);

  const activeDeviceFrame = DEVICE_FRAMES.find((d) => d.id === activeDevice) ?? DEVICE_FRAMES[0];

  const handleColorChange = (index: number) => {
    setActiveColorIndex(index);
    const colorId = form.colorIds[index] ?? variantGroups[index]?.colorId;
    const group = variantGroups.find((g) => g.colorId === colorId);
    const first = group?.photos[0];
    if (first) {
      setPhotoSelection({
        colorId: first.colorId,
        variantKey: first.variantKey,
        photoIndex: first.photoIndex,
        url: first.url,
      });
    }
  };

  const handlePhotoSelect = (entry: VariantPhotoEntry) => {
    const colorIdx = findColorIndexById(
      variantGroups,
      draftProduct.colors.map((c) => c.name),
      entry.colorId,
    );
    setActiveColorIndex(colorIdx);
    setPhotoSelection({
      colorId: entry.colorId,
      variantKey: entry.variantKey,
      photoIndex: entry.photoIndex,
      url: entry.url,
    });
  };

  const hasPhotos = allPhotos.length > 0;

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
          Click color swatches on the card or pick any variant photo below. Scroll through colors and browse every
          size and strap photo.
        </p>
      </div>

      {!hasPhotos && (
        <p
          className="text-sm text-[#9B6B2E] rounded-[14px] px-4 py-3"
          style={{ backgroundColor: "rgba(155,107,46,0.08)", fontFamily: "'DM Sans', sans-serif" }}
        >
          Add at least one product photo to see the card preview.
        </p>
      )}

      {hasPhotos && (
        <>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {DEVICE_FRAMES.map((device) => (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => setActiveDevice(device.id)}
                  className="px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.1em",
                    backgroundColor: activeDevice === device.id ? "#2D241E" : "rgba(45,36,30,0.06)",
                    color: activeDevice === device.id ? "#F5F2ED" : "rgba(45,36,30,0.55)",
                    border: `1px solid ${activeDevice === device.id ? "#2D241E" : "rgba(45,36,30,0.12)"}`,
                  }}
                >
                  {device.label}
                </button>
              ))}
            </div>

            <div
              className="mx-auto rounded-[24px] p-4"
              style={{
                maxWidth: activeDeviceFrame.width,
                backgroundColor: "rgba(45,36,30,0.04)",
                border: "1px solid rgba(45,36,30,0.08)",
              }}
            >
              <ProductCard
                product={draftProduct}
                size={activeDeviceFrame.size}
                previewBreakpoint={activeDeviceFrame.previewBreakpoint}
                previewMode
                activeColorIndex={activeColorIndex}
                onActiveColorChange={handleColorChange}
                previewImageOverride={previewImageOverride}
                subtleEntrance
              />
            </div>

            {photoSelection && (
              <p className="text-xs text-[#2D241E]/50 text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Showing: {variantGroups.find((g) => g.colorId === photoSelection.colorId)?.colorName}
                {photoSelection.variantKey !== "fallback" && (
                  <>
                    {" "}
                    ·{" "}
                    {allPhotos.find(
                      (p) =>
                        p.colorId === photoSelection.colorId
                        && p.variantKey === photoSelection.variantKey
                        && p.photoIndex === photoSelection.photoIndex,
                    )?.sizeName}
                    {form.lace && (
                      <>
                        {" "}
                        ·{" "}
                        {allPhotos.find(
                          (p) =>
                            p.colorId === photoSelection.colorId
                            && p.variantKey === photoSelection.variantKey
                            && p.photoIndex === photoSelection.photoIndex,
                        )?.laceLabel}
                      </>
                    )}
                    {" "}
                    · photo {photoSelection.photoIndex + 1}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="space-y-5">
            <div>
              <p
                className="text-[#2D241E]/40 uppercase tracking-widest text-xs mb-1"
                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
              >
                All variant photos
              </p>
              <p className="text-sm text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Every color, size, and strap combination you uploaded. Click a thumbnail to preview it on the card.
              </p>
            </div>

            {variantGroups.map((group) => (
              <div
                key={group.colorId}
                className="rounded-[20px] p-4"
                style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: group.colorHex,
                      border: "1.5px solid rgba(45,36,30,0.2)",
                      display: "inline-block",
                    }}
                  />
                  <p
                    className="text-sm text-[#2D241E]"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
                  >
                    {group.colorName}
                  </p>
                  <span className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {group.photos.length} photo{group.photos.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="space-y-3">
                  {Array.from(
                    group.photos.reduce((map, photo) => {
                      const label =
                        photo.variantKey === "fallback"
                          ? "Photos"
                          : `${photo.sizeName}${form.lace ? ` · ${photo.laceLabel}` : ""}`;
                      const list = map.get(label) ?? [];
                      list.push(photo);
                      map.set(label, list);
                      return map;
                    }, new Map<string, VariantPhotoEntry[]>()),
                  ).map(([label, photos]) => (
                    <div key={`${group.colorId}-${label}`}>
                      {label !== "Photos" && (
                        <p
                          className="text-[10px] uppercase tracking-widest text-[#2D241E]/40 mb-2"
                          style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                        >
                          {label}
                        </p>
                      )}
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((photo) => {
                          const selected =
                            photoSelection
                            && selectionKey(photo) === selectionKey(photoSelection)
                            && photo.url === photoSelection.url;
                          return (
                            <button
                              key={selectionKey(photo)}
                              type="button"
                              onClick={() => handlePhotoSelect(photo)}
                              className="relative shrink-0 overflow-hidden rounded-[12px] transition-all"
                              style={{
                                width: 72,
                                height: 96,
                                border: selected
                                  ? "2px solid #2D241E"
                                  : "1px solid rgba(45,36,30,0.12)",
                                boxShadow: selected ? "0 0 0 2px #F5F2ED" : "none",
                              }}
                              title={`${photo.sizeName}${form.lace ? ` · ${photo.laceLabel}` : ""} · photo ${photo.photoIndex + 1}`}
                            >
                              <img
                                src={photo.resolvedUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
