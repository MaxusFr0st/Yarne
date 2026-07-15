import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminData } from "../hooks/useAdminData";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { CropCancelledError, useCropDialog } from "../hooks/useCropDialog";
import { useApp } from "../context/AppContext";
import { uploadImage } from "../api/images";
import { uploadCroppedWithOriginal, uploadRawMediaFile, toUploadableCroppedFile } from "../utils/uploadCropPair";
import { purgeUploadIfOrphaned } from "../utils/purgeUpload";
import { AdminColorPicker, sanitizeColorHex } from "../components/admin/AdminColorPicker";
import {
  AdminModalShell,
  AdminModalCancelButton,
  AdminModalPrimaryButton,
  adminBilingualLabel,
} from "../components/admin/AdminModalShell";
import { ImageCropDialog } from "../components/admin/ImageCropDialog";
import { ProductCardPreviewPanel } from "../components/admin/ProductCardPreviewPanel";
import { fileToDataUrl, extractUploadPath, resolveImageSrcForCrop, revokeCropImageSrc } from "../utils/cropImage";
import {
  buildCropMetaEntry,
  getCropMetaForDisplayUrl,
  loadImageCropMeta,
  persistImageCropMeta,
  removeImageCropMeta,
  resolveCropSourceUrl,
  setImageCropMeta,
  transferImageCropMeta,
  type CropResultSettings,
  type ImageCropMeta,
} from "../utils/imageCropMeta";
import { normalizeStoredMediaUrl, resolveMediaUrl } from "../utils/storefrontMedia";
import { getProductPreviewUrl } from "../utils/productPreview";
import type { Product } from "../types/product";
import {
  loadCarouselSelectionForAdmin,
  persistCarouselSelection,
} from "../utils/carouselSelection";
import {
  getDefaultHomeSectionsSelection,
  loadHomeSectionsSelectionForAdmin,
  persistHomeSectionsSelection,
  type HomeSectionsSelection,
} from "../utils/homeSectionsSelection";
import {
  getDefaultFeaturedShowcaseSelection,
  loadFeaturedShowcaseSelectionForAdmin,
  persistFeaturedShowcaseSelection,
  normalizeShowcaseCtaHref,
  type FeaturedShowcaseSelection,
  type ShowcaseProductSlot,
  type ShowcaseTextLocaleCopy,
  type ShowcaseTextSlot,
} from "../utils/featuredShowcaseSelection";
import type { Locale } from "../i18n/config";
import {
  getDefaultHomePageMediaSelection,
  loadHomePageMediaSelectionForAdmin,
  persistHomePageMediaSelection,
  type HomePageMediaSelection,
} from "../utils/homePageMediaSelection";
import {
  getEmptyProductGuaranteeContent,
  loadProductGuaranteeContentForAdmin,
  type ProductGuaranteeContent,
} from "../utils/productGuaranteeContent";
import { ProductGuaranteeEditor } from "../components/admin/ProductGuaranteeEditor";
import { ApiRequestError } from "../api/errors";
import {
  LayoutDashboard,
  Package,
  Users,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ShieldCheck,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Check,
  Tag,
  Globe,
  ImagePlus,
  Palette,
  Info,
  ScrollText,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Phone,
  Crop,
} from "lucide-react";
import { fetchActivityLogs, type AdminActivityLogDto } from "../api/admin";
import { fetchProduct } from "../api/products";
import { AdminAccountingTab } from "../components/admin/AdminAccountingTab";
import { AdminHomeCopyEditor } from "../components/admin/AdminHomeCopyEditor";
import { AdminOurHistoryEditor } from "../components/admin/AdminOurHistoryEditor";
import { AdminCollectionsTab } from "../components/admin/AdminCollectionsTab";
import { formatPriceCompact } from "../i18n/format";
import { PriceTag } from "../components/PriceTag";
import { OrderLineDetails, orderItemDtoToLineDetails } from "../components/OrderLineDetails";

const easing = [0.25, 0.1, 0.25, 1] as const;
const CONTENTS_CROP_META_ID = "admin-contents";

const ADMIN_ADD_BTN =
  "flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED]";
const ADMIN_ROW =
  "grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.03] transition-colors";
const ADMIN_ICON_BTN =
  "w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30";
const ADMIN_ICON_EDIT = `${ADMIN_ICON_BTN} hover:bg-[#2D241E]/8`;
const ADMIN_ICON_DELETE = `${ADMIN_ICON_BTN} hover:bg-[#4A0E0E]/8`;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type AdminProduct = Product & { idNum: number; sku: string; stock: number };
type AdminUser = ReturnType<typeof useAdminData>["users"][number];

/* ─────────────────────────────────────────────
   SMALL HELPERS
───────────────────────────────────────────── */
/** Snapshot selected files before clearing the input — FileList is live and can empty on reset. */
function takeInputFiles(event: React.ChangeEvent<HTMLInputElement>): File[] {
  const files = Array.from(event.target.files ?? []);
  event.target.value = "";
  return files;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: "#2D241E",
        color: "#F5F2ED",
        fontFamily: "'DM Sans', sans-serif",
        fontSize: size * 0.33,
        fontWeight: 500,
      }}
    >
      {initials}
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
      style={{
        backgroundColor: active ? "rgba(45,106,79,0.08)" : "rgba(107,107,107,0.08)",
        color: active ? "#2D6A4F" : "#6B6B6B",
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.06em",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: active ? "#2D6A4F" : "#9B9B9B" }}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function RolePill({ role }: { role: "customer" | "admin" }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
      style={{
        backgroundColor: role === "admin" ? "rgba(74,14,14,0.08)" : "rgba(10,17,40,0.06)",
        color: role === "admin" ? "#4A0E0E" : "#0A1128",
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.06em",
      }}
    >
      {role === "admin" && <ShieldCheck size={11} />}
      <span className="capitalize">{role}</span>
    </span>
  );
}

/** Compact thumbnail + URL row for admin image fields (44px preview per UX guidelines). */
function AdminImageUrlRow({
  url,
  onChange,
  onRemove,
  onSetDefault,
  onCrop,
  isDefault = false,
  canSetDefault = false,
  readOnly = false,
  disabled = false,
  placeholder,
}: {
  url: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  onSetDefault?: () => void;
  onCrop?: () => void;
  isDefault?: boolean;
  canSetDefault?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const previewSrc = url.trim() ? resolveMediaUrl(url) : "";
  return (
    <div className="flex gap-2.5 items-center min-w-0">
      <div
        className="relative w-11 h-11 rounded-[10px] overflow-hidden shrink-0 flex items-center justify-center"
        style={{
          backgroundColor: "#EDE9E2",
          border: isDefault ? "2px solid #4A0E0E" : "1px solid rgba(45,36,30,0.1)",
        }}
      >
        {previewSrc ? (
          <img src={previewSrc} alt="" className="w-full h-full object-cover" />
        ) : (
          <ImagePlus size={14} style={{ color: "rgba(45,36,30,0.25)" }} />
        )}
        {isDefault && (
          <span
            className="absolute bottom-0 inset-x-0 text-center text-[0.5rem] uppercase tracking-wider text-white py-0.5"
            style={{ backgroundColor: "rgba(74,14,14,0.88)", fontFamily: "'DM Sans', sans-serif" }}
          >
            Main
          </span>
        )}
      </div>
      <input
        type="text"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        disabled={disabled}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent border rounded-[14px] px-3 py-2.5 text-[#2D241E] focus:outline-none text-sm placeholder:text-[#2D241E]/20 disabled:opacity-60"
        style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.15)" }}
      />
      {canSetDefault && onSetDefault && (
        <button
          type="button"
          disabled={disabled || readOnly}
          onClick={onSetDefault}
          title="Set as default photo"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 text-[#2D241E] disabled:opacity-40 shrink-0 transition-colors"
        >
          <Star size={14} />
        </button>
      )}
      {onCrop && url.trim() && (
        <button
          type="button"
          disabled={disabled || readOnly}
          onClick={onCrop}
          title="Crop for product card"
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 text-[#2D241E] disabled:opacity-40 shrink-0 transition-colors"
        >
          <Crop size={14} />
        </button>
      )}
      <button
        type="button"
        disabled={disabled || readOnly}
        onClick={onRemove}
        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/10 text-[#4A0E0E] disabled:opacity-40 shrink-0 transition-colors"
        aria-label="Remove photo"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

const ORDER_STATUSES = ["Pending", "Accepted", "InProduction", "Made", "Shipped", "Received", "Canceled"] as const;
type OrderStatus = (typeof ORDER_STATUSES)[number];

function toOrderStatus(value: string): OrderStatus {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  const aliases: Record<string, OrderStatus> = {
    pending: "Pending",
    accepted: "Accepted",
    confirmed: "Accepted",
    processing: "Accepted",
    inproduction: "InProduction",
    made: "Made",
    shipped: "Shipped",
    received: "Received",
    delivered: "Received",
    canceled: "Canceled",
    cancelled: "Canceled",
  };
  return aliases[normalized] ?? "Pending";
}

function OrderStatusPill({ status }: { status: string }) {
  const normalized = status.trim().toLowerCase().replace(/\s+/g, "");
  const styleByStatus: Record<string, { color: string; bg: string }> = {
    pending: { color: "#6B6B6B", bg: "rgba(107,107,107,0.08)" },
    accepted: { color: "#9B6B2E", bg: "rgba(155,107,46,0.1)" },
    inproduction: { color: "#7C5C2E", bg: "rgba(124,92,46,0.12)" },
    made: { color: "#4A5D4A", bg: "rgba(74,93,74,0.1)" },
    shipped: { color: "#0A1128", bg: "rgba(10,17,40,0.08)" },
    received: { color: "#2D6A4F", bg: "rgba(45,106,79,0.1)" },
    canceled: { color: "#4A0E0E", bg: "rgba(74,14,14,0.1)" },
    cancelled: { color: "#4A0E0E", bg: "rgba(74,14,14,0.1)" },
    processing: { color: "#9B6B2E", bg: "rgba(155,107,46,0.1)" },
    delivered: { color: "#2D6A4F", bg: "rgba(45,106,79,0.1)" },
  };
  const style = styleByStatus[normalized] ?? styleByStatus.pending;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
      style={{
        backgroundColor: style.bg,
        color: style.color,
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: "0.06em",
      }}
    >
      {status}
    </span>
  );
}

/* ─────────────────────────────────────────────
   PRODUCT MODAL
───────────────────────────────────────────── */
interface ProductFormData {
  name: string;
  subtitle: string;
  price: string;
  categoryId: number;
  isNew: boolean;
  isBestseller: boolean;
  lace: boolean;
  description: string;
  stock: string;
  sku: string;
  imageUrls: string[];
  defaultSizeId: number | null;
  defaultColorId: number | null;
  colorIds: number[];
  furnitureColorIds: number[];
  defaultFurnitureColorId: number | null;
  /** Per-color available sizes: colorId -> sizeIds */
  colorSizeIds: Record<number, number[]>;
  /** Per color+size+lace image sets: `${colorId}:${sizeId}:${lace}` -> image URLs */
  colorSizeVariants: Record<string, string[]>;
  /** Optional per color+size+lace stock: `${colorId}:${sizeId}:${lace}` -> quantity */
  variantStocks: Record<string, string>;
  suggestedProductCodes: string[];
  suggestionsHydrated: boolean;
  suggestionsTouched: boolean;
}

type ProductModalTab = "details" | "suggested" | "preview";

const MAX_SUGGESTED_PRODUCTS = 10;

function ProductModal({
  product,
  allProducts,
  categories,
  colors,
  furnitureColors,
  sizes,
  saveError,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  allProducts: AdminProduct[];
  categories: { id: number; name: string }[];
  colors: { id: number; name: string; nameUk?: string | null; hexCode: string }[];
  furnitureColors: { id: number; name: string; nameUk?: string | null; hexCode: string }[];
  sizes: { id: number; name: string; nameUk?: string | null }[];
  saveError?: string | null;
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
}) {
  useBodyScrollLock(true);

  const variantKey = (colorId: number, sizeId: number, lace: boolean) => `${colorId}:${sizeId}:${lace}`;
  const draftCropMetaIdRef = useRef(
    `draft-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
  );
  const cropMetaStorageId = product?.idNum ?? draftCropMetaIdRef.current;
  const [cropMetaByDisplayUrl, setCropMetaByDisplayUrl] = useState<Record<string, ImageCropMeta>>(() =>
    loadImageCropMeta(cropMetaStorageId),
  );
  const updateCropMeta = useCallback(
    (updater: (prev: Record<string, ImageCropMeta>) => Record<string, ImageCropMeta>) => {
      setCropMetaByDisplayUrl((prev) => {
        const next = updater(prev);
        persistImageCropMeta(cropMetaStorageId, next);
        return next;
      });
    },
    [cropMetaStorageId],
  );
  useEffect(() => {
    setCropMetaByDisplayUrl(loadImageCropMeta(cropMetaStorageId));
  }, [cropMetaStorageId]);

  const cropInFlightRef = useRef(false);
  const [cropDialog, setCropDialog] = useState<{
    imageSrc: string;
    title?: string;
    initialCroppedAreaPixels?: ImageCropMeta["croppedAreaPixels"];
    initialZoom?: number;
    initialCrop?: { x: number; y: number };
    onComplete: (blob: Blob, settings: CropResultSettings) => void | Promise<void>;
    onCancel?: () => void;
    revokeSrc?: string;
  } | null>(null);

  const closeCropDialog = useCallback(() => {
    setCropDialog((prev) => {
      if (prev?.revokeSrc) revokeCropImageSrc(prev.revokeSrc);
      return null;
    });
    cropInFlightRef.current = false;
  }, []);

  const promptCropForUpload = useCallback(
    (
      file: File,
      title?: string,
    ): Promise<{ croppedFile: File; settings: CropResultSettings; originalFile: File }> =>
      new Promise((resolve, reject) => {
        if (cropInFlightRef.current) {
          reject(new Error("Crop dialog already open"));
          return;
        }
        cropInFlightRef.current = true;
        void fileToDataUrl(file)
          .then((imageSrc) => {
            setCropDialog({
              imageSrc,
              title: title ?? "Crop for product card",
              onComplete: async (blob, settings) => {
                resolve({
                  croppedFile: toUploadableCroppedFile(blob, file.name.replace(/\.[^.]+$/, "") || "image"),
                  settings,
                  originalFile: file,
                });
              },
              onCancel: () => reject(new CropCancelledError()),
            });
          })
          .catch((err) => {
            cropInFlightRef.current = false;
            reject(err);
          });
      }),
    [],
  );

  const promptCropForUrl = useCallback(
    (
      displayUrl: string,
      title?: string,
    ): Promise<{ blob: Blob; settings: CropResultSettings }> =>
      new Promise((resolve, reject) => {
        if (cropInFlightRef.current) {
          reject(new Error("Crop dialog already open"));
          return;
        }
        cropInFlightRef.current = true;
        const sourceUrl = resolveCropSourceUrl(displayUrl, cropMetaByDisplayUrl);
        const savedMeta = getCropMetaForDisplayUrl(displayUrl, cropMetaByDisplayUrl);
        const rawSrc = sourceUrl.trim().startsWith("data:")
          ? sourceUrl.trim()
          : extractUploadPath(sourceUrl.trim()) ?? resolveMediaUrl(sourceUrl.trim());
        if (!rawSrc) {
          cropInFlightRef.current = false;
          reject(new Error("No image to crop"));
          return;
        }
        void resolveImageSrcForCrop(rawSrc)
          .then((imageSrc) => {
            const revokeSrc = imageSrc.startsWith("blob:") ? imageSrc : undefined;
            setCropDialog({
              imageSrc,
              revokeSrc,
              title: title ?? "Re-crop for product card",
              initialCroppedAreaPixels: savedMeta?.croppedAreaPixels,
              initialZoom: savedMeta?.zoom,
              initialCrop: savedMeta?.crop,
              onComplete: async (blob, settings) => resolve({ blob, settings }),
              onCancel: () => reject(new CropCancelledError()),
            });
          })
          .catch((err) => {
            cropInFlightRef.current = false;
            reject(err);
          });
      }),
    [cropMetaByDisplayUrl],
  );

  const [form, setForm] = useState<ProductFormData>(() => {
    const base = product
      ? {
          name: product.name,
          subtitle: product.subtitle,
          price: product.price.toString(),
          categoryId: categories.find((c) => c.name === product.category)?.id ?? categories[0]?.id ?? 0,
          isNew: product.isNew ?? false,
          isBestseller: product.isBestseller ?? false,
          lace: product.lace ?? false,
          description: product.description,
          stock: String(product.stock ?? 0),
          sku: product.sku ?? product.id,
          imageUrls: product.colors?.map((c) => (c.images?.length ? c.images[0].src : c.image.src)) ?? [],
          defaultSizeId: product.defaultSize
            ? sizes.find((s) => s.name === product.defaultSize)?.id ?? null
            : null,
          defaultColorId: product.defaultColor
            ? colors.find((c) => c.name === product.defaultColor)?.id ?? null
            : null,
          defaultFurnitureColorId: product.defaultFurnitureColor
            ? furnitureColors.find((c) => c.name === product.defaultFurnitureColor)?.id ?? null
            : null,
        }
      : {
          name: "",
          subtitle: "",
          price: "",
          categoryId: categories[0]?.id ?? 0,
          isNew: false,
          isBestseller: false,
          lace: false,
          description: "",
          stock: "",
          sku: "",
          imageUrls: [""],
          defaultSizeId: null,
          defaultColorId: null,
          defaultFurnitureColorId: null,
        };
    const preferredSizeId = sizes.find((s) => s.name === "M")?.id ?? sizes[0]?.id ?? null;
    const productLace = product?.lace ?? false;
    const colorIds = product?.colors
      ? product.colors
          .map((c) => colors.find((col) => col.name === c.name)?.id)
          .filter((id): id is number => id != null) ?? []
      : [];
    const furnitureColorIds = product?.furnitureColors
      ? product.furnitureColors
          .map((c) => furnitureColors.find((fc) => fc.name === c.name)?.id)
          .filter((id): id is number => id != null)
      : [];
    const colorSizeIds: Record<number, number[]> = {};
    const colorSizeVariants: Record<string, string[]> = {};
    const variantStocks: Record<string, string> = {};
    product?.colors?.forEach((c) => {
      const colorId = colors.find((col) => col.name === c.name)?.id;
      if (colorId == null) return;
      const laceVariants = c.laceVariants ?? {};
      const sizeImages = c.sizeImages ?? {};
      const sizeStocks = c.sizeStocks ?? {};
      const collectedSizeIds: number[] = [];
      const sizeNames = Array.from(
        new Set([
          ...Object.keys(laceVariants),
          ...Object.keys(sizeImages),
          ...Object.keys(sizeStocks),
        ])
      );

      if (sizeNames.length > 0) {
        sizeNames.forEach((sizeName) => {
          const sizeId = sizes.find((s) => s.name === sizeName)?.id;
          if (sizeId == null) return;
          collectedSizeIds.push(sizeId);
          const lv = laceVariants[sizeName];
          const withoutLaceImages = lv?.withoutLaceImages?.length
            ? lv.withoutLaceImages.map(i => i.src)
            : (sizeImages[sizeName] ?? []).map(i => i.src);
          if (withoutLaceImages.length > 0) {
            colorSizeVariants[variantKey(colorId, sizeId, false)] = withoutLaceImages;
          }
          const withoutLaceStock = lv
            ? lv.withoutLaceStock
            : sizeStocks[sizeName];
          if (withoutLaceStock != null) {
            variantStocks[variantKey(colorId, sizeId, false)] = String(withoutLaceStock);
          }
          if (productLace && lv) {
            colorSizeVariants[variantKey(colorId, sizeId, true)] = (lv.withLaceImages ?? []).map(i => i.src);
            variantStocks[variantKey(colorId, sizeId, true)] = String(lv.withLaceStock ?? 0);
          }
        });
      } else {
        const fallbackSizeId = base.defaultSizeId ?? preferredSizeId;
        if (fallbackSizeId != null) {
          collectedSizeIds.push(fallbackSizeId);
          colorSizeVariants[variantKey(colorId, fallbackSizeId, false)] = c.images?.length ? c.images.map(i => i.src) : [c.image.src];
        }
      }
      if (collectedSizeIds.length > 0) {
        colorSizeIds[colorId] = Array.from(new Set(collectedSizeIds));
      }
    });
    return {
      ...base,
      colorIds,
      furnitureColorIds,
      colorSizeIds,
      colorSizeVariants,
      variantStocks,
      defaultColorId: base.defaultColorId ?? colorIds[0] ?? null,
      defaultFurnitureColorId: base.defaultFurnitureColorId ?? furnitureColorIds[0] ?? null,
      suggestedProductCodes: [],
      suggestionsHydrated: !product,
      suggestionsTouched: false,
    };
  });

  const [activeTab, setActiveTab] = useState<ProductModalTab>("details");
  const suggestedProductSet = useMemo(
    () => new Set(form.suggestedProductCodes),
    [form.suggestedProductCodes]
  );
  const suggestedProducts = useMemo(
    () =>
      form.suggestedProductCodes
        .map((code) => allProducts.find((p) => p.id === code))
        .filter((p): p is AdminProduct => Boolean(p)),
    [form.suggestedProductCodes, allProducts]
  );
  const pickerProducts = useMemo(
    () => allProducts.filter((p) => p.id !== (product?.id ?? form.sku.trim())),
    [allProducts, product?.id, form.sku]
  );
  const unresolvedSuggestedCodes = useMemo(
    () => form.suggestedProductCodes.filter((code) => !allProducts.some((p) => p.id === code)),
    [form.suggestedProductCodes, allProducts]
  );

  useEffect(() => {
    if (!product) {
      setForm((prev) => ({ ...prev, suggestionsHydrated: true }));
      return;
    }
    let cancelled = false;
    setForm((prev) => ({ ...prev, suggestionsHydrated: false }));
    void fetchProduct(product.id)
      .then((detail) => {
        if (cancelled) return;
        setForm((prev) => ({
          ...prev,
          suggestedProductCodes: detail.suggestedProductCodes ?? [],
          suggestionsHydrated: true,
        }));
      })
      .catch(() => {
        if (!cancelled) {
          setForm((prev) => ({ ...prev, suggestionsHydrated: true }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const addSuggestedProduct = (productCode: string) => {
    if (suggestedProductSet.has(productCode)) return;
    if (form.suggestedProductCodes.length >= MAX_SUGGESTED_PRODUCTS) return;
    setForm((prev) => ({
      ...prev,
      suggestionsTouched: true,
      suggestedProductCodes: [...prev.suggestedProductCodes, productCode],
    }));
  };

  const removeSuggestedProduct = (productCode: string) => {
    setForm((prev) => ({
      ...prev,
      suggestionsTouched: true,
      suggestedProductCodes: prev.suggestedProductCodes.filter((code) => code !== productCode),
    }));
  };

  const handleChange = (key: keyof ProductFormData, value: string | number | boolean | string[]) => {
    // Note: <input min={0}> doesn't prevent typing "-" in many browsers,
    // so we clamp client-side to avoid saving negative numeric fields.
    if ((key === "price" || key === "stock") && typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed === "") {
        setForm((prev) => ({ ...prev, [key]: "" }));
        return;
      }
      const n = Number(trimmed);
      if (Number.isFinite(n) && n < 0) {
        setForm((prev) => ({ ...prev, [key]: "0" }));
        return;
      }
    }
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const [uploading, setUploading] = useState(false);
  const [uploadingVariantKey, setUploadingVariantKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    price?: string;
    stock?: string;
    sku?: string;
    description?: string;
    colors?: string;
    sizes?: string;
    defaultSizeId?: string;
    photos?: string;
    suggestions?: string;
  }>({});

  const addImageUrl = () => setForm((p) => ({ ...p, imageUrls: [...p.imageUrls, ""] }));
  const removeImageUrl = (i: number) => {
    setForm((p) => {
      const removed = p.imageUrls[i];
      if (removed?.trim()) {
        updateCropMeta((prev) => removeImageCropMeta(prev, removed));
        purgeUploadIfOrphaned(removed);
      }
      return { ...p, imageUrls: p.imageUrls.filter((_, idx) => idx !== i) };
    });
  };
  const setImageUrl = (i: number, url: string) => setForm((p) => {
    const next = [...p.imageUrls];
    next[i] = url;
    return { ...p, imageUrls: next };
  });

  const appendVariantPhoto = (colorId: number, sizeId: number, lace: boolean, displayUrl: string) => {
    setForm((p) => {
      const next = { ...p.colorSizeVariants };
      const rowKey = variantKey(colorId, sizeId, lace);
      const arr = [...(next[rowKey] ?? []).filter((u) => u.trim() && !u.startsWith("Upload failed:")), displayUrl];
      next[rowKey] = arr;
      return { ...p, colorSizeVariants: next };
    });
  };

  const handleVariantQuickUpload = async (
    colorId: number,
    sizeId: number,
    lace: boolean,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = takeInputFiles(e);
    if (!files.length) return;

    const rowKey = variantKey(colorId, sizeId, lace);
    setUploadError(null);
    try {
      setUploadingVariantKey(rowKey);
      for (let i = 0; i < files.length; i++) {
        const displayUrl = await uploadRawMediaFile(files[i]);
        appendVariantPhoto(colorId, sizeId, lace, displayUrl);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingVariantKey(null);
    }
  };

  const handleVariantCropUpload = async (
    colorId: number,
    sizeId: number,
    lace: boolean,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = takeInputFiles(e);
    if (!files.length) return;

    const rowKey = variantKey(colorId, sizeId, lace);
    setUploadError(null);
    try {
      setUploadingVariantKey(rowKey);
      for (let i = 0; i < files.length; i++) {
        try {
          const { croppedFile, settings, originalFile } = await promptCropForUpload(
            files[i],
            files.length > 1 ? `Crop image ${i + 1} of ${files.length}` : "Crop for product card",
          );
          const { displayUrl, sourceUrl } = await uploadCroppedWithOriginal(croppedFile, originalFile);
          updateCropMeta((prev) =>
            setImageCropMeta(prev, displayUrl, buildCropMetaEntry(sourceUrl, settings)),
          );
          appendVariantPhoto(colorId, sizeId, lace, displayUrl);
        } catch (err) {
          if (err instanceof CropCancelledError) continue;
          throw err;
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadingVariantKey(null);
      closeCropDialog();
    }
  };

  const handleQuickFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = takeInputFiles(e);
    if (!files.length) return;
    setUploadError(null);
    try {
      setUploading(true);
      for (let i = 0; i < files.length; i++) {
        const displayUrl = await uploadRawMediaFile(files[i]);
        setForm((p) => ({
          ...p,
          imageUrls: [...p.imageUrls.filter((u) => u.trim() && !u.startsWith("Upload failed:")), displayUrl],
        }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = takeInputFiles(e);
    if (!files.length) return;
    setUploadError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        try {
          setUploading(true);
          const { croppedFile, settings, originalFile } = await promptCropForUpload(
            files[i],
            files.length > 1 ? `Crop image ${i + 1} of ${files.length}` : "Crop for product card",
          );
          const { displayUrl, sourceUrl } = await uploadCroppedWithOriginal(croppedFile, originalFile);
          updateCropMeta((prev) =>
            setImageCropMeta(prev, displayUrl, buildCropMetaEntry(sourceUrl, settings)),
          );
          setForm((p) => ({
            ...p,
            imageUrls: [...p.imageUrls.filter((u) => u.trim() && !u.startsWith("Upload failed:")), displayUrl],
          }));
        } catch (err) {
          if (err instanceof CropCancelledError) continue;
          throw err;
        } finally {
          setUploading(false);
        }
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      closeCropDialog();
    }
  };

  const handleRecropImageUrl = async (url: string, onReplace: (newUrl: string) => void) => {
    if (cropInFlightRef.current || cropDialog) {
      setUploadError("Finish or cancel the open crop dialog first.");
      return;
    }
    setUploadError(null);
    try {
      const { blob, settings } = await promptCropForUrl(url);
      setUploading(true);
      const file = toUploadableCroppedFile(blob, "cropped");
      const newUrl = await uploadImage(file);
      updateCropMeta((prev) => transferImageCropMeta(prev, url, newUrl, settings));
      onReplace(newUrl);
    } catch (err) {
      if (err instanceof CropCancelledError) return;
      console.error("Re-crop failed:", err);
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
      closeCropDialog();
    }
  };

  const isEditing = !!product;
  const imagesLockedByColors = form.colorIds.length > 0;
  const cropBusy = Boolean(cropDialog);
  const selectedSizeIds = Array.from(
    new Set(
      form.colorIds.flatMap((colorId) => form.colorSizeIds[colorId] ?? [])
    )
  );
  const laceOptions: boolean[] = form.lace ? [false, true] : [false];

  useEffect(() => {
    const preferredSizeId = sizes.find((s) => s.name === "M")?.id ?? sizes[0]?.id ?? null;
    if (!form.defaultSizeId) {
      setForm((p) => ({ ...p, defaultSizeId: preferredSizeId ?? null }));
      return;
    }
    if (selectedSizeIds.length > 0 && !selectedSizeIds.includes(form.defaultSizeId)) {
      setForm((p) => ({ ...p, defaultSizeId: selectedSizeIds[0] ?? preferredSizeId ?? null }));
    }
  }, [selectedSizeIds, form.defaultSizeId, sizes]);

  useEffect(() => {
    if (form.colorIds.length === 0) {
      if (form.defaultColorId != null) {
        setForm((p) => ({ ...p, defaultColorId: null }));
      }
      return;
    }
    if (form.defaultColorId != null && form.colorIds.includes(form.defaultColorId)) return;
    setForm((p) => ({ ...p, defaultColorId: p.colorIds[0] ?? null }));
  }, [form.colorIds, form.defaultColorId]);

  useEffect(() => {
    if (form.furnitureColorIds.length === 0) {
      if (form.defaultFurnitureColorId != null) {
        setForm((p) => ({ ...p, defaultFurnitureColorId: null }));
      }
      return;
    }
    if (form.defaultFurnitureColorId != null && form.furnitureColorIds.includes(form.defaultFurnitureColorId)) return;
    setForm((p) => ({ ...p, defaultFurnitureColorId: p.furnitureColorIds[0] ?? null }));
  }, [form.furnitureColorIds, form.defaultFurnitureColorId]);

  const validateAndSubmit = () => {
    const errors: typeof formErrors = {};
    const parsedPrice = Number(form.price);
    const parsedStock = form.stock.trim() ? Number(form.stock) : NaN;
    const parsedVariantStocks = Object.values(form.variantStocks)
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value >= 0);
    const totalVariantStock = parsedVariantStocks.reduce((sum, value) => sum + value, 0);
    const colorsWithoutSizes = form.colorIds.filter((colorId) => (form.colorSizeIds[colorId] ?? []).length === 0);
    const selectedVariantKeys = form.colorIds.flatMap((colorId) =>
      (form.colorSizeIds[colorId] ?? []).flatMap((sizeId) =>
        laceOptions.map((lace) => variantKey(colorId, sizeId, lace))
      )
    );
    const variantsWithTooFewPhotos = selectedVariantKeys.filter((key) => {
      const validPhotos = (form.colorSizeVariants[key] ?? []).filter(
        (url) => url.trim() && !url.startsWith("Upload failed:")
      );
      return validPhotos.length < 3;
    });

    if (!form.name.trim()) errors.name = "This field must not be empty.";
    if (!form.description.trim()) errors.description = "This field must not be empty.";
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) errors.price = "Enter a valid price greater than 0.";
    if (form.stock.trim() && (!Number.isFinite(parsedStock) || parsedStock < 0)) {
      errors.stock = "Enter a valid stock (0 or more).";
    }
    if (!form.stock.trim() && totalVariantStock <= 0) {
      errors.stock = "Set total stock or provide variant stock quantities.";
    }
    if (form.colorIds.length === 0) errors.colors = "Select at least one color.";
    if (colorsWithoutSizes.length > 0) errors.sizes = "Each selected color must have at least one size.";
    if (selectedSizeIds.length === 0) errors.sizes = "Select at least one size for selected colors.";
    if (!form.defaultSizeId || !selectedSizeIds.includes(form.defaultSizeId)) {
      errors.defaultSizeId = "Choose a default size from selected color-size sets.";
    }
    if (variantsWithTooFewPhotos.length > 0) {
      errors.photos = "Each selected color-size record must contain at least 3 photos.";
    }
    if (unresolvedSuggestedCodes.length > 0) {
      errors.suggestions = `Remove unknown product codes: ${unresolvedSuggestedCodes.join(", ")}`;
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSave(form);
  };

  const previewCategoryName = categories.find((c) => c.id === form.categoryId)?.name ?? "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}
      onWheel={(e) => e.stopPropagation()}
    >
      <motion.div
        className="w-full max-w-2xl lg:max-w-5xl rounded-[32px] overflow-hidden max-h-[90vh] flex flex-col"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        {/* Modal Header */}
        <div
          className="flex shrink-0 items-center justify-between p-8 pb-6"
          style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
        >
          <div>
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
            >
              {isEditing ? "Edit Product" : "New Product"}
            </p>
            <h3
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}
            >
              {isEditing ? product!.name : "Add to Collection"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5 transition-colors"
          >
            <X size={18} style={{ color: "#2D241E" }} />
          </button>
        </div>

        <div className="shrink-0 px-8 pt-4 flex gap-2">
          {([
            { key: "details" as ProductModalTab, label: "Product details" },
            { key: "preview" as ProductModalTab, label: "Card preview" },
            { key: "suggested" as ProductModalTab, label: "Suggested products" },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === "suggested") {
                  setForm((prev) => ({ ...prev, suggestionsTouched: true }));
                }
              }}
              className="px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-colors duration-200"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.12em",
                backgroundColor: activeTab === tab.key ? "#2D241E" : "rgba(45,36,30,0.06)",
                color: activeTab === tab.key ? "#F5F2ED" : "rgba(45,36,30,0.55)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {saveError ? (
          <div className="mx-8 mt-4 rounded-[14px] px-4 py-3 text-sm" style={{ backgroundColor: "rgba(74,14,14,0.08)", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}>
            {saveError}
          </div>
        ) : null}

        {/* Form — scrollable body keeps footer actions visible */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
        <div className="p-8 space-y-6">
          {activeTab === "preview" ? (
            <ProductCardPreviewPanel
              form={form}
              colors={colors}
              sizes={sizes}
              categoryName={previewCategoryName}
            />
          ) : activeTab === "details" ? (
          <>
          {/* Name & Subtitle */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Product Name", key: "name" as const, placeholder: "e.g. Arles Cocoon Sweater" },
              { label: "Subtitle / Material", key: "subtitle" as const, placeholder: "e.g. Merino Wool Blend" },
            ].map((field) => (
              <div key={field.key}>
                <label
                  className="block text-xs mb-2 tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
                >
                  {field.label}
                </label>
                <input
                  type="text"
                  value={form[field.key] as string}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none transition-colors duration-200 placeholder:text-[#2D241E]/20"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.9rem",
                    borderColor: "rgba(45,36,30,0.15)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4A0E0E")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(45,36,30,0.15)")}
                />
              </div>
            ))}
          </div>
          {formErrors.name && (
            <p className="text-xs text-[#B42318] -mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.name}</p>
          )}

          {/* Price, Category, Stock, SKU */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Price (₴)", key: "price" as const, type: "number", placeholder: "0" },
              { label: "Stock", key: "stock" as const, type: "number", placeholder: "0" },
            ].map((field) => (
              <div key={field.key}>
                <label
                  className="block text-xs mb-2 tracking-widest uppercase"
                  style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
                >
                  {field.label}
                </label>
                <input
                  type={field.type}
                  min={field.key === "stock" || field.key === "price" ? 0 : undefined}
                  value={form[field.key] as string}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none transition-colors duration-200 placeholder:text-[#2D241E]/20"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.9rem",
                    borderColor: "rgba(45,36,30,0.15)",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4A0E0E")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(45,36,30,0.15)")}
                />
              </div>
            ))}
            <div>
              <label
                className="block text-xs mb-2 tracking-widest uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
              >
                Category
              </label>
              <select
                value={form.categoryId}
                onChange={(e) => handleChange("categoryId", parseInt(e.target.value))}
                className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none cursor-pointer"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.9rem",
                  borderColor: "rgba(45,36,30,0.15)",
                }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-xs mb-2 tracking-widest uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
              >
                Product code
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="Leave empty to auto-generate (YRN-######)"
                className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none transition-colors duration-200 placeholder:text-[#2D241E]/20"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.9rem",
                  borderColor: "rgba(45,36,30,0.15)",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4A0E0E")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(45,36,30,0.15)")}
              />
            </div>
          </div>
          {(formErrors.price || formErrors.stock || formErrors.sku) && (
            <div className="-mt-2 space-y-1">
              {formErrors.price && <p className="text-xs text-[#B42318]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.price}</p>}
              {formErrors.stock && <p className="text-xs text-[#B42318]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.stock}</p>}
              {formErrors.sku && <p className="text-xs text-[#B42318]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.sku}</p>}
            </div>
          )}

          {/* Images */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className="block text-xs tracking-widest uppercase"
                style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
              >
                Images
              </label>
              {imagesLockedByColors && (
                <p className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Product-level images are auto-derived from each color's first image.
                </p>
              )}
              <div className="flex flex-wrap gap-2 items-center">
                {uploadError && (
                  <p className="text-sm text-[#4A0E0E] w-full" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {uploadError}
                  </p>
                )}
                {!imagesLockedByColors && (
                  <>
                    <label
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs border transition-all hover:bg-[#2D241E]/5 ${uploading || cropBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                      style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                    >
                      <ImagePlus size={14} />
                      {uploading ? (cropBusy ? "Crop image…" : "Uploading…") : "Add & crop"}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={uploading || cropBusy}
                        onChange={handleFileSelect}
                      />
                    </label>
                    <label
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs border transition-all hover:bg-[#2D241E]/5 ${uploading || cropBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                      style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                    >
                      Quick upload
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        disabled={uploading || cropBusy}
                        onChange={handleQuickFileSelect}
                      />
                    </label>
                  </>
                )}
                {imagesLockedByColors && (
                  <button
                    type="button"
                    onClick={() => setUploadError("Add photos in the Constructor section below (per color & size).")}
                    className="text-xs text-[#4A0E0E] underline"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Where do I upload?
                  </button>
                )}
                {!imagesLockedByColors && (
                  <button type="button" onClick={addImageUrl} className="text-xs text-[#4A0E0E] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif" }}>+ Add URL</button>
                )}
              </div>
            </div>
          <div className="space-y-2">
              {form.imageUrls.map((url, i) => (
                <AdminImageUrlRow
                  key={i}
                  url={url}
                  onChange={(value) => setImageUrl(i, value)}
                  onRemove={() => removeImageUrl(i)}
                  onCrop={
                    !imagesLockedByColors && url.trim()
                      ? () => void handleRecropImageUrl(url, (newUrl) => setImageUrl(i, newUrl))
                      : undefined
                  }
                  readOnly={imagesLockedByColors}
                  disabled={imagesLockedByColors || uploading || cropBusy}
                  placeholder={`Image ${i + 1} URL or upload from device`}
                />
              ))}
            </div>
          </div>

          {/* Sizes + Colors (color+size images) */}
          {colors.length === 0 || sizes.length === 0 ? (
            <p className="text-sm text-[#2D241E]/50 py-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Add colors and sizes first to assign images per color+size.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                  Default size
                </label>
                {selectedSizeIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={form.defaultSizeId ?? ""}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setForm((p) => ({ ...p, defaultSizeId: Number.isNaN(id) ? null : id }));
                        setFormErrors((prev) => ({ ...prev, defaultSizeId: undefined }));
                      }}
                      className="bg-transparent border rounded-[12px] px-3 py-2 text-sm"
                      style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)" }}
                    >
                      {selectedSizeIds.map((sizeId) => {
                        const size = sizes.find((s) => s.id === sizeId);
                        return <option key={sizeId} value={sizeId}>{size?.name ?? sizeId}</option>;
                      })}
                    </select>
                    <span className="text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Used as fallback when selected size has no specific photos.
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Select colors and assign sizes to enable default size.
                  </p>
                )}
                {formErrors.defaultSizeId && (
                  <p className="text-xs text-[#B42318] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.defaultSizeId}</p>
                )}
              </div>

              <div>
                <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                  Colors
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => {
                    const isSelected = form.colorIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setForm((p) => {
                            const nextIds = isSelected ? p.colorIds.filter((id) => id !== c.id) : [...p.colorIds, c.id];
                            const nextColorSizeIds = { ...p.colorSizeIds };
                            const nextVariants = { ...p.colorSizeVariants };
                            const nextStocks = { ...p.variantStocks };
                            const preferredSizeId = sizes.find((s) => s.name === "M")?.id ?? sizes[0]?.id ?? null;
                            if (isSelected) {
                              delete nextColorSizeIds[c.id];
                              Object.keys(nextVariants).forEach((key) => {
                                if (key.startsWith(`${c.id}:`)) delete nextVariants[key];
                              });
                              Object.keys(nextStocks).forEach((key) => {
                                if (key.startsWith(`${c.id}:`)) delete nextStocks[key];
                              });
                            } else if (preferredSizeId != null) {
                              nextColorSizeIds[c.id] = [preferredSizeId];
                            }
                            return { ...p, colorIds: nextIds, colorSizeIds: nextColorSizeIds, colorSizeVariants: nextVariants, variantStocks: nextStocks };
                          });
                          setFormErrors((prev) => ({ ...prev, colors: undefined, sizes: undefined }));
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-full border transition-all"
                        style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", borderColor: isSelected ? "#2D241E" : "rgba(45,36,30,0.2)", backgroundColor: isSelected ? "rgba(45,36,30,0.06)" : "transparent", color: "#2D241E" }}
                      >
                        <span className="w-4 h-4 rounded-full border border-[#2D241E]/30" style={{ backgroundColor: c.hexCode || "#2D241E" }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
                {formErrors.colors && (
                  <p className="text-xs text-[#B42318] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.colors}</p>
                )}
              </div>

              {form.colorIds.length > 0 && (
                <div>
                  <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                    Card display color
                  </label>
                  <p className="text-xs text-[#2D241E]/45 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Shown first on product cards and in the shop grid.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {form.colorIds.map((colorId) => {
                      const color = colors.find((c) => c.id === colorId);
                      const isDefault = form.defaultColorId === colorId;
                      return (
                        <button
                          key={`default-color-${colorId}`}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, defaultColorId: colorId }))}
                          className="flex items-center gap-2 px-3 py-2 rounded-full border transition-all cursor-pointer"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.85rem",
                            borderColor: isDefault ? "#4A0E0E" : "rgba(45,36,30,0.2)",
                            backgroundColor: isDefault ? "rgba(74,14,14,0.08)" : "transparent",
                            color: "#2D241E",
                          }}
                        >
                          <span className="w-4 h-4 rounded-full border border-[#2D241E]/30" style={{ backgroundColor: color?.hexCode ?? "#2D241E" }} />
                          {color?.name ?? colorId}
                          {isDefault && <Star size={12} className="text-[#4A0E0E]" fill="currentColor" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                  Furniture / Фурнітура
                </label>
                <p className="text-xs text-[#2D241E]/45 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Optional hardware colors for this product.
                </p>
                <div className="flex flex-wrap gap-2">
                  {furnitureColors.length === 0 ? (
                    <p className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>No furniture colors in catalog yet.</p>
                  ) : (
                    furnitureColors.map((fc) => {
                      const isSelected = form.furnitureColorIds.includes(fc.id);
                      return (
                        <button
                          key={fc.id}
                          type="button"
                          onClick={() => {
                            setForm((p) => {
                              const nextIds = isSelected
                                ? p.furnitureColorIds.filter((id) => id !== fc.id)
                                : [...p.furnitureColorIds, fc.id];
                              const nextDefault =
                                p.defaultFurnitureColorId != null && nextIds.includes(p.defaultFurnitureColorId)
                                  ? p.defaultFurnitureColorId
                                  : nextIds[0] ?? null;
                              return { ...p, furnitureColorIds: nextIds, defaultFurnitureColorId: nextDefault };
                            });
                          }}
                          className="flex items-center gap-2 px-3 py-2 rounded-full border transition-all cursor-pointer"
                          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", borderColor: isSelected ? "#2D241E" : "rgba(45,36,30,0.2)", backgroundColor: isSelected ? "rgba(45,36,30,0.06)" : "transparent", color: "#2D241E" }}
                        >
                          <span className="w-4 h-4 rounded-full border border-[#2D241E]/30" style={{ backgroundColor: fc.hexCode || "#2D241E" }} />
                          {fc.nameUk ? `${fc.name} · ${fc.nameUk}` : fc.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {form.furnitureColorIds.length > 0 && (
                <div>
                  <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                    Default furniture color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {form.furnitureColorIds.map((fcId) => {
                      const fc = furnitureColors.find((c) => c.id === fcId);
                      const isDefault = form.defaultFurnitureColorId === fcId;
                      return (
                        <button
                          key={`default-furniture-${fcId}`}
                          type="button"
                          onClick={() => setForm((p) => ({ ...p, defaultFurnitureColorId: fcId }))}
                          className="flex items-center gap-2 px-3 py-2 rounded-full border transition-all cursor-pointer"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: "0.85rem",
                            borderColor: isDefault ? "#4A0E0E" : "rgba(45,36,30,0.2)",
                            backgroundColor: isDefault ? "rgba(74,14,14,0.08)" : "transparent",
                            color: "#2D241E",
                          }}
                        >
                          <span className="w-4 h-4 rounded-full border border-[#2D241E]/30" style={{ backgroundColor: fc?.hexCode ?? "#2D241E" }} />
                          {fc?.name ?? fcId}
                          {isDefault && <Star size={12} className="text-[#4A0E0E]" fill="currentColor" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {form.colorIds.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs mb-1 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                    Sizes per color
                  </label>
                  {form.colorIds.map((colorId) => {
                    const color = colors.find((c) => c.id === colorId);
                    const assignedSizes = form.colorSizeIds[colorId] ?? [];
                    return (
                      <div key={`sizes-${colorId}`} className="rounded-[12px] p-3" style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(45,36,30,0.02)" }}>
                        <p className="text-sm mb-2 text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {color?.name ?? "Color"} sizes
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((s) => {
                            const selected = assignedSizes.includes(s.id);
                            return (
                              <button
                                key={`${colorId}-${s.id}`}
                                type="button"
                                onClick={() => {
                                  setForm((p) => {
                                    const nextColorSizeIds = { ...p.colorSizeIds };
                                    const curr = nextColorSizeIds[colorId] ?? [];
                                    const next = selected ? curr.filter((id) => id !== s.id) : [...curr, s.id];
                                    nextColorSizeIds[colorId] = next;
                                    const nextVariants = { ...p.colorSizeVariants };
                                    const nextStocks = { ...p.variantStocks };
                                    if (selected) {
                                      const prefix = `${colorId}:${s.id}:`;
                                      Object.keys(nextVariants).forEach((key) => {
                                        if (key.startsWith(prefix)) delete nextVariants[key];
                                      });
                                      Object.keys(nextStocks).forEach((key) => {
                                        if (key.startsWith(prefix)) delete nextStocks[key];
                                      });
                                    }
                                    return { ...p, colorSizeIds: nextColorSizeIds, colorSizeVariants: nextVariants, variantStocks: nextStocks };
                                  });
                                  setFormErrors((prev) => ({ ...prev, sizes: undefined, defaultSizeId: undefined }));
                                }}
                                className="px-3 py-1.5 rounded-full border text-xs"
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: selected ? "#2D241E" : "rgba(45,36,30,0.2)", backgroundColor: selected ? "rgba(45,36,30,0.06)" : "transparent" }}
                              >
                                {adminBilingualLabel(s.name, s.nameUk)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {formErrors.sizes && (
                    <p className="text-xs text-[#B42318]" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.sizes}</p>
                  )}
                </div>
              )}

              {form.colorIds.length > 0 && selectedSizeIds.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-xs tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>
                      Constructor (Color + Size + Photos + Stock)
                    </label>
                    <p className="text-xs text-[#2D241E]/55 mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {form.lace
                        ? "Every color-size pair has a Without lace and With lace record. Minimum 3 photos per record."
                        : "Every selected color-size pair is shown below. Minimum 3 photos per pair."}
                      {" "}Photos are saved as <code>/uploads/…</code> on the API server and linked per color-size in the database.
                    </p>
                  </div>
                  {uploadError && (
                    <p className="text-sm text-[#4A0E0E] mb-3 p-3 rounded-[12px] bg-[#4A0E0E]/8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {uploadError}
                    </p>
                  )}
                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                    {form.colorIds.flatMap((colorId) =>
                      (form.colorSizeIds[colorId] ?? []).flatMap((sizeId) =>
                        laceOptions.map((lace) => {
                        const color = colors.find((c) => c.id === colorId);
                        const size = sizes.find((s) => s.id === sizeId);
                        const key = variantKey(colorId, sizeId, lace);
                        const urls = form.colorSizeVariants[key] ?? [];
                        const rowUploading = uploadingVariantKey === key;
                        return (
                        <div key={key} className="rounded-[16px] p-3 sm:p-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: color?.hexCode ?? "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} />
                              <span className="text-sm font-medium text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {color?.name ?? "Color"} · {size?.name ?? "Size"}
                              </span>
                              {form.lace && (
                                <span
                                  className="px-2 py-0.5 rounded-full text-[0.65rem] uppercase tracking-wider"
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    letterSpacing: "0.08em",
                                    backgroundColor: lace ? "#4A0E0E" : "rgba(45,36,30,0.1)",
                                    color: lace ? "#F5F2ED" : "#2D241E",
                                  }}
                                >
                                  {lace ? "With lace" : "Without lace"}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Stock"
                                value={form.variantStocks[key] ?? ""}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  const trimmed = raw.trim();
                                  let value = raw;
                                  if (trimmed !== "") {
                                    const n = Number(trimmed);
                                    if (Number.isFinite(n) && n < 0) value = "0";
                                  }
                                  setForm((p) => ({ ...p, variantStocks: { ...p.variantStocks, [key]: value } }));
                                }}
                                className="w-20 bg-white/60 border rounded-[10px] px-2.5 py-1.5 text-xs text-[#2D241E] focus:outline-none"
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.15)" }}
                              />
                              <label
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs border transition-all hover:bg-[#2D241E]/5 ${rowUploading || cropBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                              >
                                <ImagePlus size={12} />
                                {rowUploading ? (cropBusy ? "Crop…" : "Uploading…") : "Add & crop"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  disabled={rowUploading || cropBusy}
                                  onChange={(e) => void handleVariantCropUpload(colorId, sizeId, lace, e)}
                                />
                              </label>
                              <label
                                className={`px-3 py-1.5 rounded-[10px] text-xs border transition-all hover:bg-[#2D241E]/5 ${rowUploading || cropBusy ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                              >
                                {rowUploading ? "Uploading…" : "Quick"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="sr-only"
                                  disabled={rowUploading || cropBusy}
                                  onChange={(e) => void handleVariantQuickUpload(colorId, sizeId, lace, e)}
                                />
                              </label>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {urls.length === 0 && (
                              <p className="text-xs text-[#2D241E]/45 py-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                No photos for this color-size yet.
                              </p>
                            )}
                            {urls.map((url, i) => (
                              <AdminImageUrlRow
                                key={i}
                                url={url}
                                isDefault={i === 0}
                                canSetDefault={i > 0 && Boolean(url.trim())}
                                onSetDefault={() => {
                                  setForm((p) => {
                                    const next = { ...p.colorSizeVariants };
                                    const arr = [...(next[key] ?? [])];
                                    const [picked] = arr.splice(i, 1);
                                    arr.unshift(picked);
                                    next[key] = arr;
                                    return { ...p, colorSizeVariants: next };
                                  });
                                }}
                                onCrop={
                                  url.trim()
                                    ? () =>
                                        void handleRecropImageUrl(url, (newUrl) => {
                                          setForm((p) => {
                                            const next = { ...p.colorSizeVariants };
                                            const arr = [...(next[key] ?? [])];
                                            arr[i] = newUrl;
                                            next[key] = arr;
                                            return { ...p, colorSizeVariants: next };
                                          });
                                        })
                                    : undefined
                                }
                                onChange={(value) => {
                                  setForm((p) => {
                                    const next = { ...p.colorSizeVariants };
                                    const arr = [...(next[key] ?? [])];
                                    arr[i] = value;
                                    next[key] = arr;
                                    return { ...p, colorSizeVariants: next };
                                  });
                                }}
                                onRemove={() => {
                                  if (url.trim()) {
                                    updateCropMeta((prev) => removeImageCropMeta(prev, url));
                                    purgeUploadIfOrphaned(url);
                                  }
                                  setForm((p) => {
                                    const next = { ...p.colorSizeVariants };
                                    const arr = (next[key] ?? []).filter((_, idx) => idx !== i);
                                    if (arr.length === 0) {
                                      delete next[key];
                                    } else {
                                      next[key] = arr;
                                    }
                                    return { ...p, colorSizeVariants: next };
                                  });
                                }}
                                disabled={rowUploading || uploading || cropBusy}
                                placeholder={`Image ${i + 1} URL or upload from device`}
                              />
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                setForm((p) => {
                                  const next = { ...p.colorSizeVariants };
                                  const arr = [...(next[key] ?? []), ""];
                                  next[key] = arr;
                                  return { ...p, colorSizeVariants: next };
                                });
                              }}
                              className="text-xs text-[#4A0E0E] hover:underline inline-block pt-1"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              + Add photo URL
                            </button>
                          </div>
                        </div>
                        );
                        })
                      )
                    )}
                  </div>
                  {formErrors.photos && (
                    <p className="text-xs text-[#B42318] mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.photos}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label
              className="block text-xs mb-2 tracking-widest uppercase"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
            >
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange("description", e.target.value)}
              rows={3}
              placeholder="Product description..."
              className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none resize-none transition-colors duration-200 placeholder:text-[#2D241E]/20"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.9rem",
                borderColor: "rgba(45,36,30,0.15)",
                lineHeight: 1.7,
              }}
              onFocus={(e) => (e.target.style.borderColor = "#4A0E0E")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(45,36,30,0.15)")}
            />
            {formErrors.description && (
              <p className="text-xs text-[#B42318] mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>{formErrors.description}</p>
            )}
          </div>

          {/* Flags */}
          <div className="flex gap-6">
            {[
              { label: "Mark as New", key: "isNew" as const },
              { label: "Mark as Bestseller", key: "isBestseller" as const },
              { label: "Has lace option", key: "lace" as const },
            ].map((flag) => (
              <label key={flag.key} className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-11 h-6 rounded-full flex items-center px-0.5 transition-colors duration-300"
                  style={{ backgroundColor: form[flag.key] ? "#2D241E" : "rgba(45,36,30,0.15)" }}
                  onClick={() => handleChange(flag.key, !form[flag.key])}
                >
                  <motion.div
                    className="w-5 h-5 rounded-full"
                    style={{ backgroundColor: "#F5F2ED" }}
                    animate={{ x: form[flag.key] ? 20 : 0 }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                <span
                  className="text-sm text-[#2D241E]/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {flag.label}
                </span>
              </label>
            ))}
          </div>
          </>
          ) : (
            <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
              <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                <div>
                  <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                    Suggested Products
                  </p>
                  <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Selected: {suggestedProducts.length} / {MAX_SUGGESTED_PRODUCTS}
                  </p>
                </div>
              </div>

              <div className="px-6 py-5">
                {formErrors.suggestions ? (
                  <p className="mb-5 text-xs text-[#B42318]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {formErrors.suggestions}
                  </p>
                ) : null}
                {unresolvedSuggestedCodes.length > 0 ? (
                  <div
                    className="mb-5 rounded-[14px] px-4 py-3 text-sm"
                    style={{ backgroundColor: "rgba(74,14,14,0.08)", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Unknown or deleted product codes: {unresolvedSuggestedCodes.join(", ")}. Remove them before saving.
                  </div>
                ) : null}
                {suggestedProducts.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                      Selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedProducts.map((item) => (
                        <span
                          key={`suggested-chip-${item.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                          style={{
                            backgroundColor: "rgba(45,36,30,0.06)",
                            color: "#2D241E",
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-[18px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                  <div
                    className="grid px-5 py-3 text-xs tracking-widest uppercase"
                    style={{
                      gridTemplateColumns: "2fr 1fr 110px",
                      fontFamily: "'DM Sans', sans-serif",
                      letterSpacing: "0.1em",
                      color: "rgba(45,36,30,0.45)",
                      backgroundColor: "rgba(45,36,30,0.02)",
                      borderBottom: "1px solid rgba(45,36,30,0.06)",
                    }}
                  >
                    <span>Product</span>
                    <span>Category</span>
                    <span className="text-right">Suggest</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                    {pickerProducts.length === 0 ? (
                      <p className="py-10 text-center text-[#2D241E]/35 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        No other products available.
                      </p>
                    ) : (
                      pickerProducts.map((item) => {
                        const isSelected = suggestedProductSet.has(item.id);
                        const atLimit = !isSelected && form.suggestedProductCodes.length >= MAX_SUGGESTED_PRODUCTS;
                        return (
                          <div
                            key={`suggested-list-${item.id}`}
                            className="grid items-center px-5 py-3.5"
                            style={{ gridTemplateColumns: "2fr 1fr 110px" }}
                          >
                            <div className="min-w-0">
                              <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
                                {item.name}
                              </p>
                              <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {item.sku}
                              </p>
                            </div>
                            <p className="text-[#2D241E]/60 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {item.category}
                            </p>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                disabled={atLimit}
                                onClick={() => (isSelected ? removeSuggestedProduct(item.id) : addSuggestedProduct(item.id))}
                                className="px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  letterSpacing: "0.1em",
                                  backgroundColor: isSelected ? "rgba(74,14,14,0.1)" : "#2D241E",
                                  color: isSelected ? "#4A0E0E" : "#F5F2ED",
                                }}
                              >
                                {isSelected ? "Delete" : "Add"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* Modal Footer */}
        <div
          className="flex shrink-0 items-center justify-end gap-3 px-8 py-6"
          style={{ borderTop: "1px solid rgba(45,36,30,0.08)", backgroundColor: "#F5F2ED" }}
        >
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5"
            style={{
              borderColor: "rgba(45,36,30,0.2)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
              color: "rgba(45,36,30,0.6)",
            }}
          >
            <span className="uppercase tracking-widest">Cancel</span>
          </button>
          <button
            onClick={validateAndSubmit}
            className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90"
            style={{
              backgroundColor: "#2D241E",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "0.78rem",
              letterSpacing: "0.12em",
            }}
          >
            <span className="uppercase tracking-widest">{isEditing ? "Save Changes" : "Add Product"}</span>
          </button>
        </div>
      </motion.div>

      {cropDialog ? (
        <ImageCropDialog
          imageSrc={cropDialog.imageSrc}
          title={cropDialog.title}
          initialCroppedAreaPixels={cropDialog.initialCroppedAreaPixels}
          initialZoom={cropDialog.initialZoom}
          initialCrop={cropDialog.initialCrop}
          onClose={closeCropDialog}
          onCancel={() => {
            cropDialog.onCancel?.();
            closeCropDialog();
          }}
          onComplete={cropDialog.onComplete}
        />
      ) : null}
    </div>
  );
}

/* ─────────────────────────────────────────────
   USER MODAL
───────────────────────────────────────────── */
interface UserFormData {
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  password: string;
}

function UserModal({
  onClose,
  onSave,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (data: UserFormData) => void;
}) {
  const [form, setForm] = useState<UserFormData>({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
  });

  const isEditing = false;

  const fieldLabel =
    "block text-xs mb-2 tracking-widest uppercase";
  const fieldLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    color: "rgba(45,36,30,0.4)",
    letterSpacing: "0.14em",
  };
  const fieldInput =
    "w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20 placeholder:text-[#2D241E]/20";
  const fieldInputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    borderColor: "rgba(45,36,30,0.15)",
  };

  return (
    <AdminModalShell
      eyebrow="New User"
      title="Register Customer"
      onClose={onClose}
      maxWidth="lg"
      bodyClassName="p-8 space-y-5"
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} />
          <AdminModalPrimaryButton onClick={() => onSave(form)}>
            {isEditing ? "Save Changes" : "Add User"}
          </AdminModalPrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={fieldLabel} style={fieldLabelStyle}>First Name</label>
          <input type="text" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="Sophie" className={fieldInput} style={fieldInputStyle} />
        </div>
        <div>
          <label className={fieldLabel} style={fieldLabelStyle}>Last Name</label>
          <input type="text" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Laurent" className={fieldInput} style={fieldInputStyle} />
        </div>
      </div>
      <div>
        <label className={fieldLabel} style={fieldLabelStyle}>Username</label>
        <input type="text" value={form.userName} onChange={(e) => setForm((p) => ({ ...p, userName: e.target.value }))} placeholder="sophie.laurent" className={fieldInput} style={fieldInputStyle} />
      </div>
      <div>
        <label className={fieldLabel} style={fieldLabelStyle}>Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="sophie@example.com" className={fieldInput} style={fieldInputStyle} />
      </div>
      <div>
        <label className={fieldLabel} style={fieldLabelStyle}>Password</label>
        <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" className={fieldInput} style={fieldInputStyle} />
      </div>
    </AdminModalShell>
  );
}

/* ─────────────────────────────────────────────
   CATEGORY MODAL
───────────────────────────────────────────── */
function CategoryModal({
  editing,
  onClose,
  onSave,
}: {
  editing: { id: number; name: string } | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  useEffect(() => { setName(editing?.name ?? ""); }, [editing?.id, editing?.name]);
  const isEditing = !!editing;
  return (
    <AdminModalShell
      eyebrow={isEditing ? "Edit Category" : "New Category"}
      title={isEditing ? editing.name : "Add Category"}
      onClose={onClose}
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} />
          <AdminModalPrimaryButton onClick={() => onSave(name)}>{isEditing ? "Save" : "Add"}</AdminModalPrimaryButton>
        </>
      }
    >
      <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Category Name</label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sweaters" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20 placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
    </AdminModalShell>
  );
}

/* ─────────────────────────────────────────────
   COLOR MODAL
───────────────────────────────────────────── */
function ColorModal({
  editing,
  onClose,
  onSave,
  labels,
}: {
  editing: { id: number; name: string; nameUk?: string | null; hexCode: string } | null;
  onClose: () => void;
  onSave: (name: string, hexCode?: string, nameUk?: string) => void;
  labels?: {
    eyebrowNew?: string;
    eyebrowEdit?: string;
    titleNew?: string;
  };
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [nameUk, setNameUk] = useState(editing?.nameUk ?? "");
  const [hexCode, setHexCode] = useState(editing?.hexCode ?? "#2D241E");
  useEffect(() => {
    setName(editing?.name ?? "");
    setNameUk(editing?.nameUk ?? "");
    setHexCode(editing?.hexCode ?? "#2D241E");
  }, [editing?.id, editing?.name, editing?.nameUk, editing?.hexCode]);
  const isEditing = !!editing;
  const eyebrowNew = labels?.eyebrowNew ?? "New Color";
  const eyebrowEdit = labels?.eyebrowEdit ?? "Edit Color";
  const titleNew = labels?.titleNew ?? "Add Color";
  const fieldLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    color: "rgba(45,36,30,0.4)",
    letterSpacing: "0.14em",
  };
  const fieldInput =
    "w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20 placeholder:text-[#2D241E]/20";
  const fieldInputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    borderColor: "rgba(45,36,30,0.15)",
  };
  return (
    <AdminModalShell
      eyebrow={isEditing ? eyebrowEdit : eyebrowNew}
      title={isEditing ? editing.name : titleNew}
      onClose={onClose}
      bodyClassName="p-8 space-y-5"
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} />
          <AdminModalPrimaryButton onClick={() => onSave(name, sanitizeColorHex(hexCode), nameUk.trim() || undefined)}>
            {isEditing ? "Save" : "Add"}
          </AdminModalPrimaryButton>
        </>
      }
    >
      <div>
        <label className="block text-xs mb-2 tracking-widest uppercase" style={fieldLabelStyle}>English name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Black" className={fieldInput} style={fieldInputStyle} />
      </div>
      <div>
        <label className="block text-xs mb-2 tracking-widest uppercase" style={fieldLabelStyle}>Ukrainian name</label>
        <input type="text" value={nameUk} onChange={(e) => setNameUk(e.target.value)} placeholder="напр. Чорний" className={fieldInput} style={fieldInputStyle} />
      </div>
      <div>
        <label className="block text-xs mb-2 tracking-widest uppercase" style={fieldLabelStyle}>Color</label>
        <AdminColorPicker value={hexCode} onChange={setHexCode} />
      </div>
    </AdminModalShell>
  );
}

/* ─────────────────────────────────────────────
   COUNTRY MODAL
───────────────────────────────────────────── */
function CountryModal({
  editing,
  onClose,
  onSave,
}: {
  editing: { id: number; name: string } | null;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  useEffect(() => { setName(editing?.name ?? ""); }, [editing?.id, editing?.name]);
  const isEditing = !!editing;
  return (
    <AdminModalShell
      eyebrow={isEditing ? "Edit Country" : "New Country"}
      title={isEditing ? editing.name : "Add Country"}
      onClose={onClose}
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} />
          <AdminModalPrimaryButton onClick={() => onSave(name)}>{isEditing ? "Save" : "Add"}</AdminModalPrimaryButton>
        </>
      }
    >
      <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Country Name</label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ukraine" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20 placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
    </AdminModalShell>
  );
}

function SizeModal({
  editing,
  onClose,
  onSave,
}: {
  editing: { id: number; name: string; nameUk?: string | null } | null;
  onClose: () => void;
  onSave: (name: string, nameUk?: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [nameUk, setNameUk] = useState(editing?.nameUk ?? "");
  useEffect(() => {
    setName(editing?.name ?? "");
    setNameUk(editing?.nameUk ?? "");
  }, [editing?.id, editing?.name, editing?.nameUk]);
  const isEditing = !!editing;
  const fieldLabelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    color: "rgba(45,36,30,0.4)",
    letterSpacing: "0.14em",
  };
  const fieldInput =
    "w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/20 placeholder:text-[#2D241E]/20";
  const fieldInputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "0.9rem",
    borderColor: "rgba(45,36,30,0.15)",
  };
  return (
    <AdminModalShell
      eyebrow={isEditing ? "Edit Size" : "New Size"}
      title={isEditing ? editing.name : "Add Size"}
      onClose={onClose}
      bodyClassName="p-8 space-y-5"
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} />
          <AdminModalPrimaryButton onClick={() => onSave(name, nameUk.trim() || undefined)}>
            {isEditing ? "Save" : "Add"}
          </AdminModalPrimaryButton>
        </>
      }
    >
      <div>
        <label className="block text-xs mb-2 tracking-widest uppercase" style={fieldLabelStyle}>English name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. M" className={fieldInput} style={fieldInputStyle} />
      </div>
      <div>
        <label className="block text-xs mb-2 tracking-widest uppercase" style={fieldLabelStyle}>Ukrainian name</label>
        <input type="text" value={nameUk} onChange={(e) => setNameUk(e.target.value)} placeholder="напр. М" className={fieldInput} style={fieldInputStyle} />
      </div>
    </AdminModalShell>
  );
}

/* ─────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────── */
function DeleteModal({
  name,
  error,
  onClose,
  onConfirm,
}: {
  name: string;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AdminModalShell
      eyebrow="Confirm"
      title={`Delete “${name}”?`}
      onClose={onClose}
      maxWidth="sm"
      bodyClassName="px-8 pt-6 pb-2 text-center"
      footerClassName="flex gap-3 px-8 py-6"
      footer={
        <>
          <AdminModalCancelButton onClick={onClose} className="flex-1" />
          <AdminModalPrimaryButton onClick={onConfirm} variant="danger" className="flex-1">
            Delete
          </AdminModalPrimaryButton>
        </>
      }
    >
      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: "rgba(74,14,14,0.08)" }}>
        <AlertTriangle size={22} style={{ color: "#4A0E0E" }} />
      </div>
      <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
        This action cannot be undone. This record will be permanently removed.
      </p>
      {error && (
        <p className="text-sm text-[#4A0E0E] mt-5 p-3 rounded-[12px] bg-[#4A0E0E]/8 text-left" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </AdminModalShell>
  );
}

/* ─────────────────────────────────────────────
   MAIN ADMIN PAGE
───────────────────────────────────────────── */
type AdminTab = "dashboard" | "contents" | "products" | "users" | "orders" | "logs" | "accounting" | "categories" | "collections" | "countries" | "colors" | "furniture" | "sizes";
type LogsSubTab = "all" | "product" | "user" | "push" | "order" | "catalog" | "image";

function formatLogTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatLogAction(action: string) {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

type LogDiffPill = { label: string; from: string; to: string };

const LOG_FIELD_LABELS: Record<string, string> = {
  name: "Name",
  productCode: "SKU",
  price: "Price",
  quantityInStock: "Stock",
  categoryName: "Category",
  material: "Material",
  isActive: "Active",
  isNew: "New",
  isBestseller: "Bestseller",
  lace: "Lace",
  description: "Description",
};

function formatFieldValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "price") return formatPriceCompact(Number(value), "uk");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  const s = String(value);
  return s.length > 28 ? `${s.slice(0, 26)}…` : s;
}

function parseLogDiff(detailsJson: string | null): { pills: LogDiffPill[]; extra: string | null } {
  if (!detailsJson) return { pills: [], extra: null };
  try {
    const obj = JSON.parse(detailsJson) as Record<string, unknown>;
    const pills: LogDiffPill[] = [];
    const extras: string[] = [];

    if (obj.changes && typeof obj.changes === "object" && !Array.isArray(obj.changes)) {
      const changes = obj.changes as Record<string, { from?: unknown; to?: unknown }>;
      for (const [key, change] of Object.entries(changes)) {
        pills.push({
          label: LOG_FIELD_LABELS[key] ?? key,
          from: formatFieldValue(key, change.from),
          to: formatFieldValue(key, change.to),
        });
      }
    }

    if (typeof obj.previousStatus === "string" && typeof obj.newStatus === "string") {
      pills.push({ label: "Status", from: obj.previousStatus, to: obj.newStatus });
    }

    if (typeof obj.originalFileName === "string") extras.push(obj.originalFileName);
    if (typeof obj.catalogType === "string" && !pills.length) extras.push(obj.catalogType);
    if (typeof obj.customerEmail === "string") extras.push(obj.customerEmail);
    if (typeof obj.email === "string") extras.push(obj.email);
    if (typeof obj.label === "string") extras.push(obj.label);
    if (typeof obj.productCode === "string" && !pills.length) extras.push(obj.productCode);

    const extra = extras.length > 0 ? extras.join(" · ") : null;
    return { pills, extra };
  } catch {
    return { pills: [], extra: null };
  }
}

function LogDiffPills({ pills }: { pills: LogDiffPill[] }) {
  if (pills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pills.map((p) => (
        <span
          key={p.label}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px]"
          style={{
            backgroundColor: "rgba(45,36,30,0.06)",
            color: "#2D241E",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.02em",
          }}
        >
          <span style={{ color: "rgba(45,36,30,0.5)" }}>{p.label}</span>
          <span className="mx-0.5" style={{ color: "rgba(45,36,30,0.3)" }}>·</span>
          <span style={{ color: "#4A0E0E", opacity: 0.75, textDecoration: "line-through" }}>{p.from}</span>
          <span style={{ color: "rgba(45,36,30,0.35)", margin: "0 1px" }}>→</span>
          <span style={{ color: "#2D6A4F" }}>{p.to}</span>
        </span>
      ))}
    </div>
  );
}

type LogImageGroups = { added: string[]; removed: string[]; current: string[] };

function extractLogImageGroups(detailsJson: string | null, action: string, category: string): LogImageGroups {
  if (!detailsJson) return { added: [], removed: [], current: [] };
  try {
    const obj = JSON.parse(detailsJson) as Record<string, unknown>;
    const imageUrl = typeof obj.imageUrl === "string" ? obj.imageUrl : null;
    const imageUrls = asStringArray(obj.imageUrls);
    const addedImageUrls = asStringArray(obj.addedImageUrls);
    const removedImageUrls = asStringArray(obj.removedImageUrls);

    if (category === "image" && imageUrl) {
      return { added: [imageUrl], removed: [], current: [imageUrl] };
    }

    if (category === "product") {
      if (action === "created") {
        return { added: imageUrls, removed: [], current: [] };
      }
      if (action === "deleted") {
        const removed = removedImageUrls.length > 0 ? removedImageUrls : imageUrls;
        return { added: [], removed, current: [] };
      }
      if (action === "updated") {
        return {
          added: addedImageUrls,
          removed: removedImageUrls,
          current: [],
        };
      }
    }

    return { added: [], removed: [], current: imageUrls };
  } catch {
    return { added: [], removed: [], current: [] };
  }
}

function LogImageStrip({ groups }: { groups: LogImageGroups }) {
  const maxVisible = 10;
  const thumbClass = "w-12 h-12 rounded-[10px] overflow-hidden shrink-0";
  const hasAdded = groups.added.length > 0;
  const hasRemoved = groups.removed.length > 0;
  const showCurrent = !hasAdded && !hasRemoved && groups.current.length > 0;

  if (!hasAdded && !hasRemoved && !showCurrent) return null;

  const renderThumbs = (urls: string[], label: string, faded?: boolean) => (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-[10px] uppercase tracking-wider text-[#2D241E]/40 shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {urls.slice(0, maxVisible).map((url) => (
          <div
            key={`${label}-${url}`}
            className={thumbClass}
            style={{
              backgroundColor: "#EDE9E2",
              opacity: faded ? 0.55 : 1,
              border: faded ? "1px dashed rgba(74,14,14,0.35)" : "1px solid rgba(45,36,30,0.08)",
            }}
          >
            <img src={resolveMediaUrl(url)} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
        {urls.length > maxVisible && (
          <span className="text-[10px] text-[#2D241E]/40 self-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            +{urls.length - maxVisible}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-2 flex flex-col gap-2">
      {hasAdded && renderThumbs(groups.added, "Added")}
      {hasRemoved && renderThumbs(groups.removed, "Removed", true)}
      {showCurrent && renderThumbs(groups.current, "Images")}
    </div>
  );
}

export function AdminPage() {
  const { user } = useApp();
  const {
    products,
    users,
    categories,
    countries,
    loading,
    apiAvailable,
    loadWarnings,
    refetch,
    addProduct,
    editProduct,
    removeProduct,
    addCategory,
    editCategory,
    removeCategory,
    addCountry,
    editCountry,
    removeCountry,
    colors,
    addColor,
    editColor,
    removeColor,
    furnitureColors,
    addFurnitureColor,
    editFurnitureColor,
    removeFurnitureColor,
    sizes,
    addSize,
    editSize,
    removeSize,
    orders,
    ordersSummary,
    setOrderStatus,
    addUser,
    refetchOrders,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [productSearch, setProductSearch] = useState("");
  const [mobileProductsPage, setMobileProductsPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [orderActionError, setOrderActionError] = useState<string | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<number | null>(null);
  const [orderStatusDrafts, setOrderStatusDrafts] = useState<Record<number, OrderStatus>>({});
  const [orderDeliveryDrafts, setOrderDeliveryDrafts] = useState<Record<number, string>>({});
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});
  const [carouselProductCodes, setCarouselProductCodes] = useState<string[]>([]);
  const [homeSectionsSelection, setHomeSectionsSelection] = useState<HomeSectionsSelection>(
    getDefaultHomeSectionsSelection
  );
  const [featuredShowcaseSelection, setFeaturedShowcaseSelectionState] =
    useState<FeaturedShowcaseSelection>(getDefaultFeaturedShowcaseSelection);
  const [showcaseUploading, setShowcaseUploading] = useState<Record<string, boolean>>({});
  const [showcaseUploadError, setShowcaseUploadError] = useState<string | null>(null);
  const [showcaseTextLocale, setShowcaseTextLocale] = useState<Locale>("uk");
  const [homePageMedia, setHomePageMedia] = useState<HomePageMediaSelection>(
    getDefaultHomePageMediaSelection
  );
  const [productGuaranteeContent, setProductGuaranteeContent] = useState<ProductGuaranteeContent>(
    getEmptyProductGuaranteeContent
  );
  const [productSaveError, setProductSaveError] = useState<string | null>(null);
  const [homeMediaUploading, setHomeMediaUploading] = useState<Record<string, boolean>>({});
  const [homeMediaUploadError, setHomeMediaUploadError] = useState<string | null>(null);
  const [contentsCropMeta, setContentsCropMeta] = useState<Record<string, ImageCropMeta>>(() =>
    loadImageCropMeta(CONTENTS_CROP_META_ID),
  );
  const updateContentsCropMeta = useCallback(
    (updater: (prev: Record<string, ImageCropMeta>) => Record<string, ImageCropMeta>) => {
      setContentsCropMeta((prev) => {
        const next = updater(prev);
        persistImageCropMeta(CONTENTS_CROP_META_ID, next);
        return next;
      });
    },
    [],
  );
  const contentsCrop = useCropDialog();
  const [logsSubTab, setLogsSubTab] = useState<LogsSubTab>("all");
  const [activityLogs, setActivityLogs] = useState<AdminActivityLogDto[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const [productModal, setProductModal] = useState<{ open: boolean; editing: AdminProduct | null }>({ open: false, editing: null });
  const [userModal, setUserModal] = useState<{ open: boolean }>({ open: false });
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: { id: number; name: string } | null }>({ open: false, editing: null });
  const [countryModal, setCountryModal] = useState<{ open: boolean; editing: { id: number; name: string } | null }>({ open: false, editing: null });
  const [colorModal, setColorModal] = useState<{ open: boolean; editing: { id: number; name: string; nameUk?: string | null; hexCode: string } | null }>({ open: false, editing: null });
  const [furnitureModal, setFurnitureModal] = useState<{ open: boolean; editing: { id: number; name: string; nameUk?: string | null; hexCode: string } | null }>({ open: false, editing: null });
  const [sizeModal, setSizeModal] = useState<{ open: boolean; editing: { id: number; name: string; nameUk?: string | null } | null }>({ open: false, editing: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: "product" | "user" | "category" | "country" | "color" | "furniture" | "size"; id: string; idNum?: number; name: string } | null>(null);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  const filteredProducts = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.category.toLowerCase().includes(productSearch.toLowerCase())),
    [products, productSearch]
  );
  const mobileProductsPerPage = 15;
  const mobileProductsTotalPages = Math.max(1, Math.ceil(filteredProducts.length / mobileProductsPerPage));
  const mobileCurrentPage = Math.min(mobileProductsPage, mobileProductsTotalPages);
  const mobileProductsStartIndex = (mobileCurrentPage - 1) * mobileProductsPerPage;
  const mobileVisibleProducts = filteredProducts.slice(mobileProductsStartIndex, mobileProductsStartIndex + mobileProductsPerPage);

  const filteredUsers = useMemo(
    () => users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())),
    [users, userSearch]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        const search = orderSearch.toLowerCase();
        return (
          o.id.toString().includes(search) ||
          o.customerName.toLowerCase().includes(search) ||
          o.customerEmail.toLowerCase().includes(search) ||
          (o.customerPhoneNumber ?? "").toLowerCase().includes(search) ||
          o.status.toLowerCase().includes(search)
        );
      }),
    [orders, orderSearch]
  );

  useEffect(() => {
    let cancelled = false;
    const syncFromApi = async () => {
      try {
        const [carousel, home, showcase, media, guarantee] = await Promise.all([
          loadCarouselSelectionForAdmin(),
          loadHomeSectionsSelectionForAdmin(),
          loadFeaturedShowcaseSelectionForAdmin(),
          loadHomePageMediaSelectionForAdmin(),
          loadProductGuaranteeContentForAdmin(),
        ]);
        if (cancelled) return;
        setCarouselProductCodes(carousel.productCodes);
        setHomeSectionsSelection(home);
        setFeaturedShowcaseSelectionState(showcase);
        setHomePageMedia(media);
        setProductGuaranteeContent(guarantee);
      } catch (e) {
        if (!cancelled) {
          setSaveError(
            e instanceof Error
              ? e.message
              : "Could not load storefront settings from server."
          );
        }
      }
    };
    void syncFromApi();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMobileProductsPage(1);
  }, [productSearch]);

  useEffect(() => {
    if (mobileProductsPage > mobileProductsTotalPages) {
      setMobileProductsPage(mobileProductsTotalPages);
    }
  }, [mobileProductsPage, mobileProductsTotalPages]);

  useEffect(() => {
    if (activeTab !== "logs" || !apiAvailable) return;
    let cancelled = false;
    setLogsLoading(true);
    fetchActivityLogs({
      category: logsSubTab === "all" ? undefined : logsSubTab,
      limit: 200,
    })
      .then((rows) => {
        if (!cancelled) setActivityLogs(rows);
      })
      .catch(() => {
        if (!cancelled) setActivityLogs([]);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, logsSubTab, apiAvailable]);

  const carouselProductSet = useMemo(() => new Set(carouselProductCodes), [carouselProductCodes]);
  const featuredHomeProductSet = useMemo(
    () => new Set(homeSectionsSelection.featuredProductCodes),
    [homeSectionsSelection.featuredProductCodes]
  );
  const moreFromCollectionProductSet = useMemo(
    () => new Set(homeSectionsSelection.moreFromCollectionProductCodes),
    [homeSectionsSelection.moreFromCollectionProductCodes]
  );

  const carouselProducts = useMemo(
    () =>
      carouselProductCodes
        .map((code) => products.find((p) => p.id === code))
        .filter((p): p is AdminProduct => Boolean(p)),
    [carouselProductCodes, products]
  );

  const updateCarouselSelection = (nextCodes: string[]) => {
    setSaveError(null);
    void persistCarouselSelection(nextCodes)
      .then((codes) => setCarouselProductCodes(codes))
      .catch((e) =>
        setSaveError(e instanceof Error ? e.message : "Failed to save carousel to server.")
      );
  };

  const featuredHomeProducts = useMemo(
    () =>
      homeSectionsSelection.featuredProductCodes
        .map((code) => products.find((p) => p.id === code))
        .filter((p): p is AdminProduct => Boolean(p)),
    [homeSectionsSelection.featuredProductCodes, products]
  );

  const moreFromCollectionProducts = useMemo(
    () =>
      homeSectionsSelection.moreFromCollectionProductCodes
        .map((code) => products.find((p) => p.id === code))
        .filter((p): p is AdminProduct => Boolean(p)),
    [homeSectionsSelection.moreFromCollectionProductCodes, products]
  );

  const updateHomeSelection = (next: HomeSectionsSelection) => {
    setSaveError(null);
    void persistHomeSectionsSelection(next)
      .then((selection) => setHomeSectionsSelection(selection))
      .catch((e) =>
        setSaveError(e instanceof Error ? e.message : "Failed to save home sections to server.")
      );
  };

  const addFeaturedHomeProduct = (productCode: string) => {
    if (featuredHomeProductSet.has(productCode)) return;
    updateHomeSelection({
      ...homeSectionsSelection,
      featuredProductCodes: [...homeSectionsSelection.featuredProductCodes, productCode],
    });
  };

  const removeFeaturedHomeProduct = (productCode: string) => {
    updateHomeSelection({
      ...homeSectionsSelection,
      featuredProductCodes: homeSectionsSelection.featuredProductCodes.filter((code) => code !== productCode),
    });
  };

  const addMoreFromCollectionProduct = (productCode: string) => {
    if (moreFromCollectionProductSet.has(productCode)) return;
    updateHomeSelection({
      ...homeSectionsSelection,
      moreFromCollectionProductCodes: [...homeSectionsSelection.moreFromCollectionProductCodes, productCode],
    });
  };

  const removeMoreFromCollectionProduct = (productCode: string) => {
    updateHomeSelection({
      ...homeSectionsSelection,
      moreFromCollectionProductCodes: homeSectionsSelection.moreFromCollectionProductCodes.filter((code) => code !== productCode),
    });
  };

  const updateFeaturedShowcaseSelection = (next: FeaturedShowcaseSelection) => {
    setSaveError(null);
    void persistFeaturedShowcaseSelection(next)
      .then((selection) => setFeaturedShowcaseSelectionState(selection))
      .catch((e) =>
        setSaveError(
          e instanceof Error ? e.message : "Failed to save Editorial Picks to server. Are you logged in as admin?"
        )
      );
  };

  const updateShowcaseProductSlot = (
    slotKey: "slot1" | "slot2" | "slot4",
    patch: Partial<ShowcaseProductSlot>
  ) => {
    updateFeaturedShowcaseSelection({
      ...featuredShowcaseSelection,
      [slotKey]: { ...featuredShowcaseSelection[slotKey], ...patch },
    });
  };

  /** Shared `ctaHref` and/or a partial locale copy merge for `en` / `uk`. */
  const updateShowcaseTextSlot = (
    patch: Partial<Pick<ShowcaseTextSlot, "ctaHref">> &
      Partial<Record<Locale, Partial<ShowcaseTextLocaleCopy>>>
  ) => {
    const prev = featuredShowcaseSelection.slot3;
    updateFeaturedShowcaseSelection({
      ...featuredShowcaseSelection,
      slot3: {
        ctaHref:
          patch.ctaHref !== undefined
            ? normalizeShowcaseCtaHref(patch.ctaHref)
            : prev.ctaHref,
        en: patch.en ? { ...prev.en, ...patch.en } : prev.en,
        uk: patch.uk ? { ...prev.uk, ...patch.uk } : prev.uk,
      },
    });
  };

  type HomeMediaField = keyof HomePageMediaSelection;

  const HOME_MEDIA_ASPECT: Record<HomeMediaField, number> = {
    heroImageUrl: 16 / 10,
    editorialImageUrl: 4 / 5,
    lookbookImageUrl: 16 / 9,
  };

  const SHOWCASE_SLOT_ASPECT = {
    slot1: 3 / 5,
    slot2: 1,
    slot4: 1,
  } as const;

  const HOME_MEDIA_HINTS: Record<HomeMediaField, string> = {
    heroImageUrl:
      "Crop ratio: 16 × 10 — matches the home page hero. Re-crop opens the original so you can zoom out and show more.",
    editorialImageUrl:
      "Crop ratio: 4 × 5 — matches the editorial image block. Re-crop opens the original so you can zoom out and show more.",
    lookbookImageUrl:
      "Crop ratio: 16 × 9 — matches the lookbook banner. Re-crop opens the original so you can zoom out and show more.",
  };

  const SHOWCASE_SLOT_HINTS = {
    slot1:
      "Crop ratio: 3 × 5 — matches the large portrait showcase tile. Re-crop opens the original so you can zoom out and show more.",
    slot2:
      "Crop ratio: 1 × 1 — matches the square showcase tile. Re-crop opens the original so you can zoom out and show more.",
    slot4:
      "Crop ratio: 1 × 1 — matches the square showcase tile. Re-crop opens the original so you can zoom out and show more.",
  } as const;

  const updateHomePageMedia = (patch: Partial<HomePageMediaSelection>) => {
    setSaveError(null);
    setHomePageMedia((prev) => {
      const next = { ...prev, ...patch };
      void persistHomePageMediaSelection(next).catch((e) =>
        setSaveError(e instanceof Error ? e.message : "Failed to save home page images to server.")
      );
      return next;
    });
  };

  const homeMediaPreview = (field: HomeMediaField): string =>
    resolveMediaUrl(homePageMedia[field]);

  const handleHomeMediaQuickUpload = async (field: HomeMediaField, file: File | null, label: string) => {
    if (!file || contentsCrop.cropBusy) return;
    setHomeMediaUploadError(null);
    try {
      setHomeMediaUploading((prev) => ({ ...prev, [field]: true }));
      const normalizedDisplayUrl = await uploadRawMediaFile(file);
      const oldUrl = homePageMedia[field];
      if (oldUrl.trim()) {
        updateContentsCropMeta((prev) => removeImageCropMeta(prev, oldUrl));
      }
      updateHomePageMedia({ [field]: normalizedDisplayUrl });
    } catch (err) {
      setHomeMediaUploadError(
        err instanceof Error ? err.message : `Failed to upload ${label.toLowerCase()}.`,
      );
    } finally {
      setHomeMediaUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleHomeMediaUpload = async (field: HomeMediaField, file: File | null, label: string) => {
    if (!file || contentsCrop.cropBusy) return;
    setHomeMediaUploadError(null);
    try {
      const { croppedFile, settings, originalFile } = await contentsCrop.promptCropForUpload(file, {
        title: `Crop ${label}`,
        aspect: HOME_MEDIA_ASPECT[field],
        hintText: HOME_MEDIA_HINTS[field],
      });
      setHomeMediaUploading((prev) => ({ ...prev, [field]: true }));
      const { displayUrl, sourceUrl } = await uploadCroppedWithOriginal(croppedFile, originalFile);
      const normalizedDisplayUrl = normalizeStoredMediaUrl(displayUrl);
      const oldUrl = homePageMedia[field];
      if (oldUrl.trim()) {
        updateContentsCropMeta((prev) => removeImageCropMeta(prev, oldUrl));
      }
      updateContentsCropMeta((prev) =>
        setImageCropMeta(prev, normalizedDisplayUrl, buildCropMetaEntry(sourceUrl, settings)),
      );
      updateHomePageMedia({ [field]: normalizedDisplayUrl });
    } catch (err) {
      if (err instanceof CropCancelledError) return;
      setHomeMediaUploadError(
        err instanceof Error ? err.message : "Failed to upload home page image.",
      );
    } finally {
      setHomeMediaUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleHomeMediaRecrop = async (field: HomeMediaField, label: string) => {
    const url = homePageMedia[field];
    if (!url.trim() || contentsCrop.cropBusy) return;
    setHomeMediaUploadError(null);
    try {
      const { blob, settings } = await contentsCrop.promptCropForUrl(url, contentsCropMeta, {
        title: `Re-crop ${label}`,
        aspect: HOME_MEDIA_ASPECT[field],
        hintText: HOME_MEDIA_HINTS[field],
      });
      setHomeMediaUploading((prev) => ({ ...prev, [field]: true }));
      const file = toUploadableCroppedFile(blob, "cropped");
      const newUrl = normalizeStoredMediaUrl(await uploadImage(file));
      updateContentsCropMeta((prev) => transferImageCropMeta(prev, url, newUrl, settings));
      updateHomePageMedia({ [field]: newUrl });
    } catch (err) {
      if (err instanceof CropCancelledError) return;
      setHomeMediaUploadError(
        err instanceof Error ? err.message : "Failed to re-crop home page image.",
      );
    } finally {
      setHomeMediaUploading((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleShowcaseImageUpload = async (
    slotKey: "slot1" | "slot2" | "slot4",
    file: File | null,
    label: string,
  ) => {
    if (!file || contentsCrop.cropBusy) return;
    setShowcaseUploadError(null);
    try {
      const { croppedFile, settings, originalFile } = await contentsCrop.promptCropForUpload(file, {
        title: `Crop ${label}`,
        aspect: SHOWCASE_SLOT_ASPECT[slotKey],
        hintText: SHOWCASE_SLOT_HINTS[slotKey],
      });
      setShowcaseUploading((prev) => ({ ...prev, [slotKey]: true }));
      const { displayUrl, sourceUrl } = await uploadCroppedWithOriginal(croppedFile, originalFile);
      const normalizedDisplayUrl = normalizeStoredMediaUrl(displayUrl);
      const oldUrl = featuredShowcaseSelection[slotKey].imageUrl;
      if (oldUrl.trim()) {
        updateContentsCropMeta((prev) => removeImageCropMeta(prev, oldUrl));
      }
      updateContentsCropMeta((prev) =>
        setImageCropMeta(prev, normalizedDisplayUrl, buildCropMetaEntry(sourceUrl, settings)),
      );
      updateShowcaseProductSlot(slotKey, { imageUrl: normalizedDisplayUrl });
    } catch (err) {
      if (err instanceof CropCancelledError) return;
      setShowcaseUploadError(
        err instanceof Error ? err.message : "Image upload failed",
      );
    } finally {
      setShowcaseUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const handleShowcaseImageRecrop = async (
    slotKey: "slot1" | "slot2" | "slot4",
    label: string,
  ) => {
    const url = featuredShowcaseSelection[slotKey].imageUrl;
    if (!url.trim() || contentsCrop.cropBusy) return;
    setShowcaseUploadError(null);
    try {
      const { blob, settings } = await contentsCrop.promptCropForUrl(url, contentsCropMeta, {
        title: `Re-crop ${label}`,
        aspect: SHOWCASE_SLOT_ASPECT[slotKey],
        hintText: SHOWCASE_SLOT_HINTS[slotKey],
      });
      setShowcaseUploading((prev) => ({ ...prev, [slotKey]: true }));
      const file = toUploadableCroppedFile(blob, "cropped");
      const newUrl = normalizeStoredMediaUrl(await uploadImage(file));
      updateContentsCropMeta((prev) => transferImageCropMeta(prev, url, newUrl, settings));
      updateShowcaseProductSlot(slotKey, { imageUrl: newUrl });
    } catch (err) {
      if (err instanceof CropCancelledError) return;
      setShowcaseUploadError(
        err instanceof Error ? err.message : "Failed to re-crop showcase image.",
      );
    } finally {
      setShowcaseUploading((prev) => ({ ...prev, [slotKey]: false }));
    }
  };

  const addToCarousel = (productCode: string) => {
    if (carouselProductSet.has(productCode)) return;
    updateCarouselSelection([...carouselProductCodes, productCode]);
  };

  const removeFromCarousel = (productCode: string) => {
    updateCarouselSelection(carouselProductCodes.filter((code) => code !== productCode));
  };

  const sanitizeImageUrls = (urls: string[] | undefined) =>
    (urls ?? [])
      .map((url) => normalizeStoredMediaUrl(url))
      .filter((url) => url && !url.startsWith("Upload failed:"));

  const unique = (items: string[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item)) return false;
      seen.add(item);
      return true;
    });
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    setSaveError(null);
    setProductSaveError(null);
    try {
      const normalizeIds = (ids: number[]) => Array.from(new Set(ids.filter((id) => Number.isFinite(id) && id > 0)));
      const fallbackSizeId = sizes.find((s) => s.name === "M")?.id ?? sizes[0]?.id;
      const sizeIds = (() => {
        const requested = normalizeIds(
          (data.colorIds ?? []).flatMap((colorId) => data.colorSizeIds?.[colorId] ?? [])
        );
        if (requested.length > 0) return requested;
        return fallbackSizeId ? [fallbackSizeId] : [];
      })();
      const normalizedDefaultSizeId = data.defaultSizeId && sizeIds.includes(data.defaultSizeId)
        ? data.defaultSizeId
        : (fallbackSizeId && sizeIds.includes(fallbackSizeId) ? fallbackSizeId : sizeIds[0] ?? null);
      const colorIds = normalizeIds(data.colorIds ?? []);
      const furnitureColorIds = normalizeIds(data.furnitureColorIds ?? []);
      const colorSizeVariants = Object.entries(data.colorSizeVariants ?? {})
        .map(([key, urls]) => {
          const [colorIdRaw, sizeIdRaw, laceRaw] = key.split(":");
          const colorId = Number(colorIdRaw);
          const sizeId = Number(sizeIdRaw);
          const lace = laceRaw === "true";
          return {
            colorId,
            sizeId,
            lace,
            imageUrls: unique(sanitizeImageUrls(urls)),
          };
        })
        .filter(
          (v) =>
            colorIds.includes(v.colorId) &&
            sizeIds.includes(v.sizeId) &&
            (data.lace || v.lace === false) &&
            v.imageUrls.length > 0
        );
      const variantStocks = Object.entries(data.variantStocks ?? {})
        .map(([key, value]) => {
          const [colorIdRaw, sizeIdRaw, laceRaw] = key.split(":");
          const colorId = Number(colorIdRaw);
          const sizeId = Number(sizeIdRaw);
          const lace = laceRaw === "true";
          const quantityInStock = Number(value);
          return { colorId, sizeId, lace, quantityInStock };
        })
        .filter(
          (v) =>
            colorIds.includes(v.colorId) &&
            sizeIds.includes(v.sizeId) &&
            (data.lace || v.lace === false) &&
            Number.isFinite(v.quantityInStock) &&
            v.quantityInStock >= 0
        );
      const computedTotalStock = variantStocks.reduce((sum, v) => sum + v.quantityInStock, 0);
      const parsedTotalStock = data.stock.trim() ? parseInt(data.stock, 10) : NaN;
      const quantityInStock = variantStocks.length > 0
        ? computedTotalStock
        : Number.isFinite(parsedTotalStock) && parsedTotalStock >= 0
          ? parsedTotalStock
          : 0;

      const variantPrimaryUrls = unique(
        colorSizeVariants
          .filter((v) => v.sizeId === normalizedDefaultSizeId && v.lace === false)
          .map((v) => v.imageUrls[0])
          .filter((url): url is string => Boolean(url))
      );
      const nextPrimaryImageUrls = variantPrimaryUrls.length > 0
        ? variantPrimaryUrls
        : unique(sanitizeImageUrls(data.imageUrls));

      const payload = {
        productCode: data.sku.trim() ? data.sku.trim() : undefined,
        name: data.name,
        description: data.description,
        price: parseFloat(data.price) || 0,
        quantityInStock,
        material: data.subtitle,
        categoryId: data.categoryId,
        defaultSizeId: normalizedDefaultSizeId ?? undefined,
        defaultColorId: data.defaultColorId && colorIds.includes(data.defaultColorId)
          ? data.defaultColorId
          : colorIds[0] ?? undefined,
        defaultFurnitureColorId: data.defaultFurnitureColorId && furnitureColorIds.includes(data.defaultFurnitureColorId)
          ? data.defaultFurnitureColorId
          : furnitureColorIds[0] ?? undefined,
        sizeIds,
        imageUrls: nextPrimaryImageUrls,
        colorIds,
        furnitureColorIds,
        colorSizeVariants,
        variantStocks,
        isNew: data.isNew,
        isBestseller: data.isBestseller,
        lace: data.lace,
        ...(productModal.editing
          ? data.suggestionsHydrated
            ? { suggestedProductCodes: data.suggestedProductCodes }
            : {}
          : data.suggestionsTouched
            ? { suggestedProductCodes: data.suggestedProductCodes }
            : {}),
      };
      if (productModal.editing && "idNum" in productModal.editing) {
        await editProduct(productModal.editing.idNum, { ...payload, isActive: true });
      } else {
        await addProduct(payload);
      }
      setProductModal({ open: false, editing: null });
      setProductSaveError(null);
      refetch();
    } catch (e) {
      const message = e instanceof ApiRequestError
        ? e.invalidSuggestedCodes.length > 0
          ? `${e.message} (${e.invalidSuggestedCodes.join(", ")})`
          : e.message
        : e instanceof Error
          ? e.message
          : "Failed to save product";
      setProductSaveError(message);
      setSaveError(message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteModal || deleteModal.type !== "product") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    try {
      await removeProduct(id);
      setDeleteModal(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete product");
    }
  };

  const handleDeleteUser = () => {
    setDeleteModal(null);
  };

  const handleSaveUser = async (data: UserFormData) => {
    setSaveError(null);
    try {
      await addUser(data);
      setUserModal({ open: false });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to register user");
    }
  };

  const handleSaveCategory = async (name: string) => {
    setSaveError(null);
    try {
      if (categoryModal.editing) {
        await editCategory(categoryModal.editing.id, name);
      } else {
        await addCategory(name);
      }
      setCategoryModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save category");
    }
  };

  const handleSaveCountry = async (name: string) => {
    setSaveError(null);
    try {
      if (countryModal.editing) {
        await editCountry(countryModal.editing.id, name);
      } else {
        await addCountry(name);
      }
      setCountryModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save country");
    }
  };

  const handleSaveColor = async (name: string, hexCode?: string, nameUk?: string) => {
    setSaveError(null);
    try {
      if (colorModal.editing) {
        await editColor(colorModal.editing.id, name, hexCode, nameUk);
      } else {
        await addColor(name, hexCode, nameUk);
      }
      setColorModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save color");
    }
  };

  const handleSaveFurnitureColor = async (name: string, hexCode?: string, nameUk?: string) => {
    setSaveError(null);
    try {
      if (furnitureModal.editing) {
        await editFurnitureColor(furnitureModal.editing.id, name, hexCode, nameUk);
      } else {
        await addFurnitureColor(name, hexCode, nameUk);
      }
      setFurnitureModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save furniture color");
    }
  };

  const handleSaveSize = async (name: string, nameUk?: string) => {
    setSaveError(null);
    try {
      if (sizeModal.editing) {
        await editSize(sizeModal.editing.id, name, nameUk);
      } else {
        await addSize(name, nameUk);
      }
      setSizeModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save size");
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteModal || deleteModal.type !== "category") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    try {
      await removeCategory(id);
      setDeleteModal(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete category");
    }
  };

  const handleDeleteColor = async () => {
    if (!deleteModal || deleteModal.type !== "color") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    setDeleteModalError(null);
    try {
      await removeColor(id);
      setDeleteModal(null);
      setDeleteModalError(null);
      refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete color";
      setDeleteModalError(message);
      setSaveError(message);
    }
  };

  const handleDeleteFurnitureColor = async () => {
    if (!deleteModal || deleteModal.type !== "furniture") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    setDeleteModalError(null);
    try {
      await removeFurnitureColor(id);
      setDeleteModal(null);
      setDeleteModalError(null);
      refetch();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete furniture color";
      setDeleteModalError(message);
      setSaveError(message);
    }
  };

  const handleDeleteCountry = async () => {
    if (!deleteModal || deleteModal.type !== "country") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    try {
      await removeCountry(id);
      setDeleteModal(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete country");
    }
  };

  const handleDeleteSize = async () => {
    if (!deleteModal || deleteModal.type !== "size") return;
    const id = deleteModal.idNum ?? parseInt(deleteModal.id);
    if (isNaN(id)) return;
    setSaveError(null);
    try {
      await removeSize(id);
      setDeleteModal(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete size");
    }
  };

  const totalRevenue = Number(ordersSummary.totalRevenue ?? 0);
  const activeUsers = users.filter((u) => u.status === "active").length;
  const lowStockCount = products.filter((p) => (p.stock ?? 0) < 10).length;
  const criticalLowStockCount = products.filter((p) => (p.stock ?? 0) <= 2).length;
  const criticalLowStockProducts = useMemo(
    () =>
      products
        .filter((p) => (p.stock ?? 0) <= 2)
        .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0)),
    [products]
  );
  const pendingOrdersCount = Number(ordersSummary.pendingOrders ?? 0);
  const adminDisplayName = user?.name || "Administrator";
  const adminDisplayEmail = user?.email || "admin@yarne.local";
  const adminDisplayRole = user?.role || "Admin";

  const handleUpdateOrderStatus = async (orderId: number, nextStatus: OrderStatus, estimatedDelivery: string | null) => {
    setOrderActionError(null);
    setSavingOrderId(orderId);
    try {
      await setOrderStatus(orderId, nextStatus, estimatedDelivery);
      setOrderStatusDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
      setOrderDeliveryDrafts((prev) => {
        const next = { ...prev };
        delete next[orderId];
        return next;
      });
    } catch (e) {
      setOrderActionError(e instanceof Error ? e.message : "Failed to update order status.");
    } finally {
      setSavingOrderId(null);
    }
  };

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }} className="relative">
      {!apiAvailable && !loading && (
        <div className="fixed top-20 left-0 right-0 z-50 mx-4 md:mx-auto max-w-xl bg-[#4A0E0E] text-[#F5F2ED] px-6 py-4 rounded-2xl shadow-lg text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Cannot reach the backend API. Check that the mindful-flexibility service is running on Railway and that <code className="bg-black/20 px-2 py-0.5 rounded">VITE_API_URL</code> points to it.
          <button onClick={() => refetch()} className="ml-3 underline">Retry</button>
        </div>
      )}
      {apiAvailable && loadWarnings.length > 0 && !loading && (
        <div className="fixed top-20 left-0 right-0 z-50 mx-4 md:mx-auto max-w-2xl bg-[#6B4E1E] text-[#F5F2ED] px-6 py-4 rounded-2xl shadow-lg text-center text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          <p className="font-medium mb-1">Some admin data could not be loaded</p>
          <ul className="space-y-1 opacity-90">
            {loadWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <button onClick={() => refetch()} className="mt-2 underline">Retry</button>
        </div>
      )}
      {saveError && (
        <div className="fixed top-24 left-0 right-0 z-50 mx-4 md:mx-auto max-w-xl bg-[#4A0E0E] text-[#F5F2ED] px-6 py-4 rounded-2xl shadow-lg text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          {saveError}
          <button onClick={() => setSaveError(null)} className="ml-4 underline">Dismiss</button>
        </div>
      )}
      {/* Admin Page Header */}
      <section
        className="pt-20 pb-6 md:pt-24 md:pb-8"
        style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <motion.div
            className="flex flex-col md:flex-row md:items-center justify-between gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: easing }}
          >
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-[18px] flex items-center justify-center flex-shrink-0 overflow-hidden bg-white p-1" style={{ border: "1px solid rgba(45,36,30,0.1)" }}>
                <img src="/logo.png" alt="Yarné" className="h-full w-full object-contain" />
              </div>
              <div>
                <p
                  className="text-[#2D241E]/40 tracking-widest uppercase mb-1"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.2em", fontSize: "0.65rem" }}
                >
                  Admin Panel
                </p>
                <h1
                  className="text-[#2D241E]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(1.4rem, 3.4vw, 2rem)",
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  {adminDisplayName}
                </h1>
                <p
                  className="text-[#2D241E]/40 mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem" }}
                >
                  {adminDisplayEmail} · {adminDisplayRole}
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Products", value: products.length.toString(), color: "#2D241E" },
                { label: "Users", value: users.length.toString(), color: "#0A1128" },
                { label: "Orders", value: orders.length.toString(), color: "#4A0E0E" },
                { label: "Low Stock", value: lowStockCount.toString(), color: lowStockCount > 0 ? "#9B6B2E" : "#2D6A4F" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-[16px] px-5 py-3 text-center"
                  style={{ backgroundColor: "rgba(45,36,30,0.05)" }}
                >
                  <p
                    className="text-[#2D241E]"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400, color: s.color }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="text-[#2D241E]/40 text-xs"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tab Nav */}
      <div
        className="sticky top-[var(--main-header-h)] z-30"
        style={{
          backgroundColor: "rgba(245,242,237,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45,36,30,0.08)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {([
              { key: "dashboard" as AdminTab, label: "Dashboard", icon: <LayoutDashboard size={14} /> },
              { key: "contents" as AdminTab, label: "Contents", icon: <ImagePlus size={14} /> },
              { key: "products" as AdminTab, label: "Products", icon: <Package size={14} /> },
              { key: "users" as AdminTab, label: "Users", icon: <Users size={14} /> },
              { key: "orders" as AdminTab, label: "Orders", icon: <ShoppingCart size={14} /> },
              { key: "logs" as AdminTab, label: "Logs", icon: <ScrollText size={14} /> },
              { key: "accounting" as AdminTab, label: "Accounting", icon: <DollarSign size={14} /> },
              { key: "categories" as AdminTab, label: "Categories", icon: <Tag size={14} /> },
              { key: "collections" as AdminTab, label: "Collections", icon: <Star size={14} /> },
              { key: "countries" as AdminTab, label: "Countries", icon: <Globe size={14} /> },
              { key: "colors" as AdminTab, label: "Colors", icon: <Palette size={14} /> },
              { key: "furniture" as AdminTab, label: "Furniture", icon: <Palette size={14} /> },
              { key: "sizes" as AdminTab, label: "Sizes", icon: <Tag size={14} /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="py-4 relative flex items-center gap-2 whitespace-nowrap transition-colors duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30 rounded-sm hover:text-[#2D241E]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.12em",
                  color: activeTab === tab.key ? "#2D241E" : "rgba(45,36,30,0.42)",
                }}
              >
                {tab.icon}
                <span className="uppercase tracking-widest">{tab.label}</span>
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="admin-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: "#4A0E0E" }}
                    transition={{ duration: 0.3, ease: easing }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-12 md:py-16">
        <AnimatePresence mode="wait">

          {/* ── DASHBOARD ── */}
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              {/* Stat Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-12">
                {[
                  { icon: <DollarSign size={20} />, label: "Est. Revenue", value: formatPriceCompact(totalRevenue, "uk"), sub: "Sum of all placed orders", color: "#2D6A4F" },
                  { icon: <ShoppingCart size={20} />, label: "Total Orders", value: String(ordersSummary.totalOrders ?? 0), sub: `${pendingOrdersCount} pending`, color: "#0A1128", goTo: "orders" as AdminTab },
                  {
                    icon: <Package size={20} />,
                    label: "Products",
                    value: products.length.toString(),
                    sub: criticalLowStockCount === 1
                      ? "1 product low stock"
                      : `${criticalLowStockCount} products low stock`,
                    color: criticalLowStockCount > 0 ? "#9B6B2E" : "#2D241E",
                    goTo: "products" as AdminTab,
                  },
                  { icon: <DollarSign size={20} />, label: "Accounting", value: "Finance", sub: "Purchases, revenue & reports", color: "#1E3A5F", goTo: "accounting" as AdminTab },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    className="rounded-[24px] p-6"
                    style={{ backgroundColor: "#EDE9E2" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.5, ease: easing }}
                    onClick={() => card.goTo && setActiveTab(card.goTo)}
                    role={card.goTo ? "button" : undefined}
                    tabIndex={card.goTo ? 0 : -1}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: "rgba(45,36,30,0.08)", color: card.color }}
                    >
                      {card.icon}
                    </div>
                    <p
                      className="text-[#2D241E]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.6rem", fontWeight: 400 }}
                    >
                      {card.value}
                    </p>
                    <p className="text-[#2D241E]/50 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
                      {card.label}
                    </p>
                    <p className="text-[#2D241E]/30 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {card.sub}
                    </p>
                  </motion.div>
                ))}
              </div>

              {criticalLowStockProducts.length > 0 && (
                <div
                  className="rounded-[24px] p-6 mb-12"
                  style={{
                    border: "1px solid rgba(196,48,48,0.25)",
                    backgroundColor: "rgba(196,48,48,0.08)",
                  }}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "rgba(196,48,48,0.15)", color: "#9B2C2C" }}
                    >
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem" }}>
                        Low stock alert
                      </p>
                      <p className="text-[#2D241E]/55 text-sm mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {criticalLowStockProducts.length === 1
                          ? "1 product has 2 or fewer units left."
                          : `${criticalLowStockProducts.length} products have 2 or fewer units left.`}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {criticalLowStockProducts.map((p) => (
                      <button
                        key={`low-stock-${p.id}`}
                        type="button"
                        onClick={() => {
                          setProductSearch(p.name);
                          setActiveTab("products");
                        }}
                        className="flex items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors hover:bg-[#2D241E]/[0.04]"
                        style={{ border: "1px solid rgba(45,36,30,0.1)", backgroundColor: "rgba(245,242,237,0.85)" }}
                      >
                        <div className="w-11 h-11 rounded-[10px] overflow-hidden shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                          <img src={getProductPreviewUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[#2D241E] text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {p.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif", color: p.stock === 0 ? "#4A0E0E" : "#9B6B2E" }}>
                            {p.stock === 0 ? "Out of stock" : `${p.stock} left`} · {p.sku}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Products Preview */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Recent Products */}
                <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                  <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                    <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 400 }}>
                      Products Overview
                    </h3>
                    <button onClick={() => setActiveTab("products")} className="text-xs text-[#4A0E0E] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
                      View all
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                    {products.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[10px] overflow-hidden flex-shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                            <img src={getProductPreviewUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{p.name}</p>
                            <p className="text-[#2D241E]/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{formatPriceCompact(p.price, "uk")}</p>
                          <p className="text-xs" style={{ fontFamily: "'DM Sans', sans-serif", color: p.stock < 10 ? "#9B6B2E" : "rgba(45,36,30,0.4)" }}>
                            {p.stock} in stock
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users Preview */}
                <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                  <div className="flex items-center justify-between p-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                    <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem", fontWeight: 400 }}>
                      Users Overview
                    </h3>
                    <button onClick={() => setActiveTab("users")} className="text-xs text-[#4A0E0E] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em" }}>
                      View all
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                    {users.slice(0, 5).map((u) => (
                      <div key={u.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={32} />
                          <div>
                            <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{u.name}</p>
                            <p className="text-[#2D241E]/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <RolePill role={u.role} />
                          <StatusPill active={u.status === "active"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CONTENTS ── */}
          {activeTab === "contents" && (
            <motion.div
              key="contents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <AdminHomeCopyEditor onError={(message) => setSaveError(message)} />

              <AdminOurHistoryEditor onError={(message) => setSaveError(message)} />

              {/* Home page images */}
              <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                    Home Page Images
                  </p>
                  <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Hero, editorial block, and lookbook banner. Upload-only — empty slots stay blank until you add an image.
                  </p>
                </div>
                <div className="px-6 py-5">
                  {homeMediaUploadError && (
                    <div className="rounded-[14px] px-4 py-3 mb-4" style={{ backgroundColor: "rgba(196,48,48,0.08)", border: "1px solid rgba(196,48,48,0.25)" }}>
                      <p className="text-xs text-[#C43030]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {homeMediaUploadError}
                      </p>
                    </div>
                  )}
                  <div className="grid md:grid-cols-3 gap-5">
                    {(
                      [
                        { field: "heroImageUrl" as const, label: "Hero (top)", aspect: "16 / 10" },
                        { field: "editorialImageUrl" as const, label: "Editorial", aspect: "4 / 5" },
                        { field: "lookbookImageUrl" as const, label: "Lookbook banner", aspect: "16 / 9" },
                      ] as const
                    ).map(({ field, label, aspect }) => {
                      const preview = homeMediaPreview(field);
                      const hasCustom = Boolean(homePageMedia[field].trim());
                      const isUploading = Boolean(homeMediaUploading[field]);
                      const cropDisabled = isUploading || contentsCrop.cropBusy;
                      return (
                        <div
                          key={field}
                          className="rounded-[20px] p-4"
                          style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
                        >
                          <p
                            className="text-[#2D241E] uppercase tracking-widest text-xs mb-3"
                            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                          >
                            {label}
                          </p>
                          <div
                            className="relative w-full overflow-hidden rounded-[16px] mb-3"
                            style={{
                              aspectRatio: aspect,
                              backgroundColor: "#EDE9E2",
                              border: "1px solid rgba(45,36,30,0.08)",
                            }}
                          >
                            <img src={preview} alt={label} className="w-full h-full object-cover" />
                            {!hasCustom && (
                              <span
                                className="absolute bottom-2 left-2 right-2 text-center text-[9px] uppercase tracking-widest px-2 py-1 rounded-full"
                                style={{
                                  backgroundColor: "rgba(245,242,237,0.9)",
                                  color: "rgba(45,36,30,0.55)",
                                  fontFamily: "'DM Sans', sans-serif",
                                }}
                              >
                                No image yet
                              </span>
                            )}
                          </div>
                          <label
                            className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${cropDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            style={{
                              backgroundColor: "#2D241E",
                              color: "#F5F2ED",
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.7rem",
                              letterSpacing: "0.12em",
                            }}
                          >
                            <ImagePlus size={13} />
                            <span className="uppercase tracking-widest">
                              {isUploading ? "Uploading…" : "Upload & crop"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={cropDisabled}
                              onChange={(e) => {
                                void handleHomeMediaUpload(field, e.target.files?.[0] ?? null, label);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <label
                            className={`mt-2 flex items-center justify-center gap-2 rounded-full px-4 py-2 border transition-all duration-300 hover:opacity-85 ${cropDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                            style={{
                              borderColor: "rgba(45,36,30,0.2)",
                              color: "#2D241E",
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: "0.7rem",
                              letterSpacing: "0.12em",
                            }}
                          >
                            <span className="uppercase tracking-widest">
                              {isUploading ? "Uploading…" : "Quick upload"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={cropDisabled}
                              onChange={(e) => {
                                void handleHomeMediaQuickUpload(field, e.target.files?.[0] ?? null, label);
                                e.target.value = "";
                              }}
                            />
                          </label>
                          {hasCustom && (
                            <>
                              <button
                                type="button"
                                disabled={cropDisabled}
                                onClick={() => void handleHomeMediaRecrop(field, label)}
                                className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs uppercase tracking-widest text-[#2D241E]/70 hover:opacity-80 disabled:opacity-40"
                                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                              >
                                <Crop size={12} />
                                {contentsCrop.cropFetching ? "Loading…" : "Re-crop"}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const oldUrl = homePageMedia[field];
                                  if (oldUrl.trim()) {
                                    updateContentsCropMeta((prev) => removeImageCropMeta(prev, oldUrl));
                                    purgeUploadIfOrphaned(oldUrl);
                                  }
                                  updateHomePageMedia({ [field]: "" });
                                }}
                                className="mt-2 w-full text-xs uppercase tracking-widest text-[#4A0E0E] hover:opacity-80"
                                style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                              >
                                Remove custom image
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Carousel Editor */}
              <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <div>
                    <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                      Edit Carousel
                    </p>
                    <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Selected: {carouselProducts.length} product{carouselProducts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-5">
                  {carouselProducts.length > 0 && (
                    <div className="mb-5">
                      <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                        In Carousel
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {carouselProducts.map((product) => (
                          <span
                            key={`carousel-chip-${product.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                            style={{
                              backgroundColor: "rgba(45,36,30,0.06)",
                              color: "#2D241E",
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {product.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="rounded-[18px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                    <div
                      className="grid px-5 py-3 text-xs tracking-widest uppercase"
                      style={{
                        gridTemplateColumns: "2fr 1fr 110px",
                        fontFamily: "'DM Sans', sans-serif",
                        letterSpacing: "0.1em",
                        color: "rgba(45,36,30,0.45)",
                        backgroundColor: "rgba(45,36,30,0.02)",
                        borderBottom: "1px solid rgba(45,36,30,0.06)",
                      }}
                    >
                      <span>Product</span>
                      <span>Category</span>
                      <span className="text-right">Carousel</span>
                    </div>
                    <div className="max-h-[420px] overflow-y-auto divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                      {products.length === 0 ? (
                        <p className="py-10 text-center text-[#2D241E]/35 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          No products available.
                        </p>
                      ) : (
                        products.map((product) => {
                          const isInCarousel = carouselProductSet.has(product.id);
                          return (
                            <div
                              key={`carousel-list-${product.id}`}
                              className="grid items-center px-5 py-3.5"
                              style={{ gridTemplateColumns: "2fr 1fr 110px" }}
                            >
                              <div className="min-w-0">
                                <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
                                  {product.name}
                                </p>
                                <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                  {product.sku}
                                </p>
                              </div>
                              <p className="text-[#2D241E]/60 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {product.category}
                              </p>
                              <div className="flex justify-end">
                                <button
                                  onClick={() => (isInCarousel ? removeFromCarousel(product.id) : addToCarousel(product.id))}
                                  className="px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-85"
                                  style={{
                                    fontFamily: "'DM Sans', sans-serif",
                                    letterSpacing: "0.1em",
                                    backgroundColor: isInCarousel ? "rgba(74,14,14,0.1)" : "#2D241E",
                                    color: isInCarousel ? "#4A0E0E" : "#F5F2ED",
                                  }}
                                >
                                  {isInCarousel ? "Delete" : "Add"}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Home Collection Sections Editor */}
              <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                    Home Collection Sections
                  </p>
                  <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Choose products for the featured grid and “More from the collection”. Section titles are edited in Home Page Text above.
                  </p>
                </div>
                <div className="px-6 py-5 space-y-8">
                  <div>
                    {featuredHomeProducts.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {featuredHomeProducts.map((product) => (
                          <span
                            key={`featured-home-chip-${product.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                            style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {product.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="max-h-[280px] overflow-y-auto divide-y rounded-[18px]" style={{ border: "1px solid rgba(45,36,30,0.08)", borderColor: "rgba(45,36,30,0.08)" }}>
                      {products.map((product) => {
                        const isSelected = featuredHomeProductSet.has(product.id);
                        return (
                          <div key={`featured-home-list-${product.id}`} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: "2fr 1fr 110px" }}>
                            <div className="min-w-0">
                              <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
                                {product.name}
                              </p>
                              <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {product.sku}
                              </p>
                            </div>
                            <p className="text-[#2D241E]/60 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {product.category}
                            </p>
                            <div className="flex justify-end">
                              <button
                                onClick={() => (isSelected ? removeFeaturedHomeProduct(product.id) : addFeaturedHomeProduct(product.id))}
                                className="px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-85"
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  letterSpacing: "0.1em",
                                  backgroundColor: isSelected ? "rgba(74,14,14,0.1)" : "#2D241E",
                                  color: isSelected ? "#4A0E0E" : "#F5F2ED",
                                }}
                              >
                                {isSelected ? "Delete" : "Add"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    {moreFromCollectionProducts.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {moreFromCollectionProducts.map((product) => (
                          <span
                            key={`more-home-chip-${product.id}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                            style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {product.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="max-h-[280px] overflow-y-auto divide-y rounded-[18px]" style={{ border: "1px solid rgba(45,36,30,0.08)", borderColor: "rgba(45,36,30,0.08)" }}>
                      {products.map((product) => {
                        const isSelected = moreFromCollectionProductSet.has(product.id);
                        return (
                          <div key={`more-home-list-${product.id}`} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: "2fr 1fr 110px" }}>
                            <div className="min-w-0">
                              <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>
                                {product.name}
                              </p>
                              <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {product.sku}
                              </p>
                            </div>
                            <p className="text-[#2D241E]/60 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {product.category}
                            </p>
                            <div className="flex justify-end">
                              <button
                                onClick={() => (isSelected ? removeMoreFromCollectionProduct(product.id) : addMoreFromCollectionProduct(product.id))}
                                className="px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-85"
                                style={{
                                  fontFamily: "'DM Sans', sans-serif",
                                  letterSpacing: "0.1em",
                                  backgroundColor: isSelected ? "rgba(74,14,14,0.1)" : "#2D241E",
                                  color: isSelected ? "#4A0E0E" : "#F5F2ED",
                                }}
                              >
                                {isSelected ? "Delete" : "Add"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <ProductGuaranteeEditor
                initialContent={productGuaranteeContent}
                onSaved={(content) => {
                  setProductGuaranteeContent(content);
                  setSaveError(null);
                }}
                onError={(message) => setSaveError(message)}
              />

              {/* Featured Showcase Editor */}
              <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="px-6 py-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                    Featured Showcase
                  </p>
                  <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Editorial grid on the home page. Pick a product per slot, upload its image, and clicks open the product page.
                  </p>
                </div>

                <div className="px-6 py-5 space-y-6">
                  <p className="text-[#2D241E]/45 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Section heading (“Featured Showcase” / “Editorial Picks”) is edited in Home Page Text above.
                  </p>

                  {showcaseUploadError && (
                    <div className="rounded-[14px] px-4 py-3" style={{ backgroundColor: "rgba(196,48,48,0.08)", border: "1px solid rgba(196,48,48,0.25)" }}>
                      <p className="text-xs text-[#C43030]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                        {showcaseUploadError}
                      </p>
                    </div>
                  )}

                  {/* Product slots */}
                  {([
                    { key: "slot1" as const, label: "Slot 1 — Large (Left)", isLarge: true },
                    { key: "slot2" as const, label: "Slot 2 — Top Right", isLarge: false },
                    { key: "slot4" as const, label: "Slot 4 — Bottom Right", isLarge: false },
                  ]).map(({ key, label, isLarge }) => {
                    const slot = featuredShowcaseSelection[key];
                    const linkedProduct = slot.productCode
                      ? products.find((p) => p.id === slot.productCode) ?? null
                      : null;
                    const previewImage =
                      resolveMediaUrl(slot.imageUrl) ||
                      getProductPreviewUrl(linkedProduct ?? { colors: [] }) ||
                      "";
                    const isUploading = Boolean(showcaseUploading[key]);
                    const cropDisabled = isUploading || contentsCrop.cropBusy;
                    return (
                      <div
                        key={key}
                        className="rounded-[20px] p-4 md:p-5"
                        style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <p
                            className="text-[#2D241E] uppercase tracking-widest text-xs"
                            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                          >
                            {label}
                          </p>
                          {linkedProduct && (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest"
                              style={{
                                backgroundColor: "rgba(45,106,79,0.08)",
                                color: "#2D6A4F",
                                fontFamily: "'DM Sans', sans-serif",
                                letterSpacing: "0.12em",
                              }}
                            >
                              Linked
                            </span>
                          )}
                        </div>

                        <div className="grid md:grid-cols-[160px_1fr] gap-4">
                          {/* Image preview & upload */}
                          <div>
                            <div
                              className="relative w-full overflow-hidden rounded-[16px] flex items-center justify-center"
                              style={{
                                aspectRatio: isLarge ? "3 / 5" : "1 / 1",
                                backgroundColor: "#EDE9E2",
                                border: "1px solid rgba(45,36,30,0.08)",
                              }}
                            >
                              {previewImage ? (
                                <img src={previewImage} alt="Slot preview" className="w-full h-full object-cover" />
                              ) : (
                                <p className="text-[10px] text-[#2D241E]/35 uppercase tracking-widest text-center px-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                                  No image
                                </p>
                              )}
                            </div>

                            <label
                              className={`mt-3 flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${cropDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                              style={{
                                backgroundColor: "#2D241E",
                                color: "#F5F2ED",
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: "0.7rem",
                                letterSpacing: "0.12em",
                              }}
                            >
                              <ImagePlus size={13} />
                              <span className="uppercase tracking-widest">{isUploading ? "Uploading…" : "Upload & crop"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={cropDisabled}
                                onChange={(e) => {
                                  const file = e.target.files?.[0] ?? null;
                                  void handleShowcaseImageUpload(key, file, label);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                            {slot.imageUrl && (
                              <>
                                <button
                                  type="button"
                                  disabled={cropDisabled}
                                  onClick={() => void handleShowcaseImageRecrop(key, label)}
                                  className="mt-2 w-full flex items-center justify-center gap-1.5 text-center text-[11px] text-[#2D241E]/70 uppercase tracking-widest disabled:opacity-40"
                                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                                >
                                  <Crop size={12} />
                                  {contentsCrop.cropFetching ? "Loading…" : "Re-crop"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (slot.imageUrl.trim()) {
                                      updateContentsCropMeta((prev) => removeImageCropMeta(prev, slot.imageUrl));
                                      purgeUploadIfOrphaned(slot.imageUrl);
                                    }
                                    updateShowcaseProductSlot(key, { imageUrl: "" });
                                  }}
                                  className="mt-2 w-full text-center text-[11px] text-[#4A0E0E] uppercase tracking-widest"
                                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                                >
                                  Clear image
                                </button>
                              </>
                            )}
                          </div>

                          {/* Form fields */}
                          <div className="space-y-3">
                            <div>
                              <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                                Bag (Product)
                              </p>
                              <select
                                value={slot.productCode}
                                onChange={(e) => updateShowcaseProductSlot(key, { productCode: e.target.value })}
                                className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                                style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                              >
                                <option value="">— Select a product —</option>
                                {products.map((product) => (
                                  <option key={`${key}-opt-${product.id}`} value={product.id}>
                                    {product.name} ({product.sku})
                                  </option>
                                ))}
                              </select>
                              {linkedProduct && (
                                <p className="text-[11px] text-[#2D241E]/45 mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                  Clicking this tile opens <span className="text-[#2D241E]">/product/{linkedProduct.id}</span>
                                </p>
                              )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-3">
                              <div>
                                <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                                  Eyebrow {isLarge ? "" : "(optional)"}
                                </p>
                                <input
                                  type="text"
                                  value={slot.eyebrow}
                                  onChange={(e) => updateShowcaseProductSlot(key, { eyebrow: e.target.value })}
                                  placeholder={isLarge ? "New Season" : ""}
                                  className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                                  style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                                />
                              </div>
                              <div>
                                <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                                  CTA label {isLarge ? "" : "(optional)"}
                                </p>
                                <input
                                  type="text"
                                  value={slot.ctaLabel}
                                  onChange={(e) => updateShowcaseProductSlot(key, { ctaLabel: e.target.value })}
                                  placeholder={isLarge ? "Discover" : ""}
                                  className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                                  style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Slot 3 — Text card */}
                  <div
                    className="rounded-[20px] p-4 md:p-5"
                    style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className="text-[#2D241E] uppercase tracking-widest text-xs"
                        style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
                      >
                        Slot 3 — Story Card (text)
                      </p>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest"
                        style={{
                          backgroundColor: "rgba(45,36,30,0.08)",
                          color: "#2D241E",
                          fontFamily: "'DM Sans', sans-serif",
                          letterSpacing: "0.12em",
                        }}
                      >
                        Editorial
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      {(["en", "uk"] as const).map((locale) => (
                        <button
                          key={locale}
                          type="button"
                          onClick={() => setShowcaseTextLocale(locale)}
                          className="px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            letterSpacing: "0.1em",
                            backgroundColor: showcaseTextLocale === locale ? "#2D241E" : "transparent",
                            color: showcaseTextLocale === locale ? "#F5F2ED" : "#2D241E",
                            border: showcaseTextLocale === locale ? "1.5px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
                          }}
                        >
                          {locale === "en" ? "English" : "Ukrainian"}
                        </button>
                      ))}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                          Eyebrow
                        </p>
                        <input
                          type="text"
                          value={featuredShowcaseSelection.slot3[showcaseTextLocale].eyebrow}
                          onChange={(e) =>
                            updateShowcaseTextSlot({ [showcaseTextLocale]: { eyebrow: e.target.value } })
                          }
                          placeholder="The Craft"
                          className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                          style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                          CTA label
                        </p>
                        <input
                          type="text"
                          value={featuredShowcaseSelection.slot3[showcaseTextLocale].ctaLabel}
                          onChange={(e) =>
                            updateShowcaseTextSlot({ [showcaseTextLocale]: { ctaLabel: e.target.value } })
                          }
                          placeholder="Read our story"
                          className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none"
                          style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                          Heading
                        </p>
                        <textarea
                          value={featuredShowcaseSelection.slot3[showcaseTextLocale].heading}
                          onChange={(e) =>
                            updateShowcaseTextSlot({ [showcaseTextLocale]: { heading: e.target.value } })
                          }
                          placeholder="Every stitch tells a story of patience and precision."
                          rows={2}
                          className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E] focus:outline-none resize-y"
                          style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                          CTA destination (fixed)
                        </p>
                        <input
                          type="text"
                          value="/pages/our-history"
                          readOnly
                          className="w-full rounded-[14px] border bg-transparent px-3 py-2.5 text-[#2D241E]/55 focus:outline-none cursor-default"
                          style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                        />
                        <p className="text-[#2D241E]/40 text-[0.7rem] mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          Story card always opens the in-app Our History page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PRODUCTS ── */}
          {activeTab === "products" && (
            <motion.div
              key="products"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="relative">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(45,36,30,0.35)" }} />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 rounded-[14px] border bg-transparent text-[#2D241E] focus:outline-none w-64 placeholder:text-[#2D241E]/30"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", borderColor: "rgba(45,36,30,0.15)" }}
                  />
                </div>
                <button
                  onClick={() => setProductModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Product</span>
                </button>
              </div>

              {/* Mobile Products List */}
              <div className="md:hidden rounded-[24px] overflow-hidden mb-6" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>
                    Products ({filteredProducts.length})
                  </p>
                  <p className="text-[10px] text-[#2D241E]/45 uppercase tracking-widest" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                    15 / page
                  </p>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {mobileVisibleProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#2D241E]/30" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>
                        No products found
                      </p>
                    </div>
                  ) : (
                    mobileVisibleProducts.map((p) => (
                      <div key={`mobile-product-${p.id}`} className="px-4 py-3">
                        <div
                          className="rounded-[18px] p-3.5"
                          style={{
                            border: (p.stock ?? 0) <= 2 ? "1px solid rgba(196,48,48,0.35)" : "1px solid rgba(45,36,30,0.09)",
                            backgroundColor: (p.stock ?? 0) <= 2 ? "rgba(196,48,48,0.12)" : "rgba(245,242,237,0.8)",
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-[12px] overflow-hidden shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                              <img src={getProductPreviewUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[#2D241E] leading-tight" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
                                  {p.name}
                                </p>
                                <span
                                  className="px-2 py-0.5 rounded-full text-[10px] shrink-0"
                                  style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif" }}
                                >
                                  {p.category}
                                </span>
                              </div>
                              <p className="text-[#2D241E]/45 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {p.subtitle}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem", lineHeight: 1 }}>
                              {formatPriceCompact(p.price, "uk")}
                            </p>
                            <div className="flex items-center gap-2">
                              {p.isNew && (
                                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: "rgba(74,14,14,0.08)", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}>
                                  New
                                </span>
                              )}
                              {p.isBestseller && (
                                <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif" }}>
                                  Best
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex-1 pr-3">
                              <p className="text-[11px] text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                Stock: {p.stock}
                              </p>
                              <p className="text-[11px] text-[#2D241E]/38 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                SKU: {p.sku}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => setProductModal({ open: true, editing: p })}
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "rgba(45,36,30,0.07)" }}
                                title="Edit"
                              >
                                <Pencil size={12} style={{ color: "#2D241E", opacity: 0.55 }} />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ open: true, type: "product", id: String(p.idNum ?? p.id), idNum: p.idNum, name: p.name })}
                                className="w-8 h-8 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: "rgba(74,14,14,0.08)" }}
                                title="Delete"
                              >
                                <Trash2 size={12} style={{ color: "#4A0E0E", opacity: 0.6 }} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div
                  className="px-4 py-3 flex items-center justify-between"
                  style={{ borderTop: "1px solid rgba(45,36,30,0.06)", backgroundColor: "rgba(45,36,30,0.02)" }}
                >
                  <span className="text-[11px] text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Showing {filteredProducts.length === 0 ? 0 : mobileProductsStartIndex + 1}-
                    {Math.min(filteredProducts.length, mobileProductsStartIndex + mobileProductsPerPage)} of {filteredProducts.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileProductsPage((p) => Math.max(1, p - 1))}
                      disabled={mobileCurrentPage === 1}
                      className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest disabled:opacity-40"
                      style={{ fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(45,36,30,0.15)", color: "#2D241E" }}
                    >
                      Prev
                    </button>
                    <span className="text-[11px] text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {mobileCurrentPage}/{mobileProductsTotalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMobileProductsPage((p) => Math.min(mobileProductsTotalPages, p + 1))}
                      disabled={mobileCurrentPage >= mobileProductsTotalPages}
                      className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest disabled:opacity-40"
                      style={{ fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(45,36,30,0.15)", color: "#2D241E" }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>

              {/* Products Table */}
              <div className="hidden md:block rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                {/* Table Header */}
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>Product</span>
                  <span>Category</span>
                  <span>Price</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span>SKU</span>
                  <span className="text-right">Actions</span>
                </div>

                {/* Rows */}
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#2D241E]/30" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>No products found</p>
                    </div>
                  ) : (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors"
                        style={{
                          gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px 100px",
                          backgroundColor: (p.stock ?? 0) <= 2 ? "rgba(196,48,48,0.12)" : "transparent",
                        }}
                      >
                        {/* Product */}
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-[12px] overflow-hidden flex-shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                            <img src={getProductPreviewUrl(p)} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>{p.name}</p>
                            <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.subtitle}</p>
                          </div>
                        </div>
                        {/* Category */}
                        <span className="text-[#2D241E]/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.category}</span>
                        {/* Price */}
                        <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}>{formatPriceCompact(p.price, "uk")}</span>
                        {/* Stock */}
                        <span
                          className="text-sm"
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            color: p.stock < 10 ? "#9B6B2E" : p.stock === 0 ? "#4A0E0E" : "rgba(45,36,30,0.6)",
                          }}
                        >
                          {p.stock}
                        </span>
                        {/* Status */}
                        <div className="flex flex-wrap gap-1">
                          {p.isNew && (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "rgba(74,14,14,0.08)", color: "#4A0E0E", fontFamily: "'DM Sans', sans-serif" }}>New</span>
                          )}
                          {p.isBestseller && (
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "#2D241E", fontFamily: "'DM Sans', sans-serif" }}>Best</span>
                          )}
                          {!p.isNew && !p.isBestseller && (
                            <span className="text-xs" style={{ color: "rgba(45,36,30,0.3)", fontFamily: "'DM Sans', sans-serif" }}>—</span>
                          )}
                        </div>
                        {/* SKU */}
                        <span className="text-xs text-[#2D241E]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.sku}</span>
                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setProductModal({ open: true, editing: p })}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, type: "product", id: String(p.idNum ?? p.id), idNum: p.idNum, name: p.name })}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Table Footer */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{
                    borderTop: "1px solid rgba(45,36,30,0.06)",
                    backgroundColor: "rgba(45,36,30,0.02)",
                  }}
                >
                  <span className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Showing {filteredProducts.length} of {products.length} products
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── USERS ── */}
          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="relative">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(45,36,30,0.35)" }} />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 rounded-[14px] border bg-transparent text-[#2D241E] focus:outline-none w-64 placeholder:text-[#2D241E]/30"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", borderColor: "rgba(45,36,30,0.15)" }}
                  />
                </div>
                <button
                  onClick={() => setUserModal({ open: true })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add User</span>
                </button>
              </div>

              {/* Users Table */}
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                {/* Header */}
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "2fr 2fr 90px 80px 90px 100px 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>User</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span>Orders</span>
                  <span>Spent</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>

                {/* Rows */}
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#2D241E]/30" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors"
                        style={{ gridTemplateColumns: "2fr 2fr 90px 80px 90px 100px 100px" }}
                      >
                        {/* User */}
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={34} />
                          <div className="min-w-0">
                            <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>{u.name}</p>
                            <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>Since {u.joined}</p>
                          </div>
                        </div>
                        {/* Email */}
                        <span className="text-[#2D241E]/60 text-sm truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{u.email}</span>
                        {/* Role */}
                        <RolePill role={u.role} />
                        {/* Orders */}
                        <span className="text-[#2D241E]/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{u.orders}</span>
                        {/* Spent */}
                        <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}>
                          {u.totalSpent > 0 ? formatPriceCompact(u.totalSpent, "uk") : "—"}
                        </span>
                        {/* Status */}
                        <StatusPill active={u.status === "active"} />
                        {/* Actions - Edit/Delete not yet implemented for users */}
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-[#2D241E]/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>—</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{
                    borderTop: "1px solid rgba(45,36,30,0.06)",
                    backgroundColor: "rgba(45,36,30,0.02)",
                  }}
                >
                  <span className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Showing {filteredUsers.length} of {users.length} users · {activeUsers} active
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ORDERS ── */}
          {activeTab === "orders" && (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="relative">
                  <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(45,36,30,0.35)" }} />
                  <input
                    type="text"
                    placeholder="Search orders..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 rounded-[14px] border bg-transparent text-[#2D241E] focus:outline-none w-64 placeholder:text-[#2D241E]/30"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem", borderColor: "rgba(45,36,30,0.15)" }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void refetchOrders()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-colors duration-200 hover:bg-[#2D241E]/5 cursor-pointer"
                    style={{ border: "1px solid rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", color: "#2D241E" }}
                    title="Refresh orders"
                  >
                    <RefreshCw size={14} />
                    <span className="uppercase tracking-widest">Refresh</span>
                  </button>
                  <p className="text-[#2D241E]/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {orders.length} placed orders
                  </p>
                </div>
              </div>

              {orderActionError && (
                <p className="mb-4 text-sm text-[#4A0E0E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {orderActionError}
                </p>
              )}

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredOrders.length === 0 ? (
                  <div className="rounded-[24px] p-8 text-center" style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(45,36,30,0.02)" }}>
                    <p className="text-[#2D241E]/35" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
                      No orders found
                    </p>
                  </div>
                ) : (
                  filteredOrders.map((order) => {
                    const currentStatus = toOrderStatus(order.status);
                    const draftStatus = orderStatusDrafts[order.id] ?? currentStatus;
                    const currentDeliveryDate = order.estimatedDelivery ? order.estimatedDelivery.slice(0, 10) : "";
                    const draftDeliveryDate = orderDeliveryDrafts[order.id] ?? currentDeliveryDate;
                    const hasStatusChange = draftStatus !== currentStatus || draftDeliveryDate !== currentDeliveryDate;
                    const isExpanded = !!expandedOrders[order.id];

                    return (
                      <div
                        key={`mobile-order-${order.id}`}
                        className="rounded-[22px] p-4 space-y-3"
                        style={{ border: "1px solid rgba(45,36,30,0.1)", backgroundColor: "#F5F2ED" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                              Order #{order.id}
                            </p>
                            <p className="text-[#2D241E]/45 text-xs mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {new Date(order.orderDate).toLocaleDateString()} · {order.itemCount} items
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrders((prev) => ({
                                  ...prev,
                                  [order.id]: !prev[order.id],
                                }))
                              }
                              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors"
                              title={isExpanded ? "Hide details" : "Show details"}
                            >
                              {isExpanded ? <ChevronUp size={16} style={{ color: "#2D241E", opacity: 0.6 }} /> : <ChevronDown size={16} style={{ color: "#2D241E", opacity: 0.6 }} />}
                            </button>
                            <OrderStatusPill status={order.status} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                          <p className="text-[#2D241E]/60 truncate">{order.customerName}</p>
                          <div className="text-right">
                            <PriceTag amount={order.total} locale="uk" />
                          </div>
                          <p className="text-[#2D241E]/45 text-xs col-span-2 truncate">{order.customerEmail}</p>
                          {order.customerPhoneNumber ? (
                            <a
                              href={`tel:${order.customerPhoneNumber.replace(/\s+/g, "")}`}
                              className="text-[#4A0E0E] text-xs col-span-2 inline-flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                              style={{ fontFamily: "'DM Sans', sans-serif" }}
                            >
                              <Phone size={12} />
                              {order.customerPhoneNumber}
                            </a>
                          ) : (
                            <p className="text-[#2D241E]/35 text-xs col-span-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              No phone
                            </p>
                          )}
                        </div>

                        {isExpanded && order.items.length > 0 && (
                          <div
                            className="rounded-[18px] p-3 space-y-3"
                            style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(255,255,255,0.55)" }}
                          >
                            {order.items.map((item) => {
                              const img = item.productImageUrl ? resolveMediaUrl(item.productImageUrl) : "";
                              return (
                                <div
                                  key={`mobile-order-${order.id}-item-${item.id}`}
                                  className="flex gap-3"
                                  style={{ borderBottom: "1px solid rgba(45,36,30,0.06)", paddingBottom: 12, marginBottom: 12 }}
                                >
                                  <div className="w-[58px] h-[58px] rounded-[14px] overflow-hidden shrink-0" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
                                    {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <OrderLineDetails line={orderItemDtoToLineDetails(item)} locale="uk" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="space-y-2">
                          <select
                            value={draftStatus}
                            onChange={(e) =>
                              setOrderStatusDrafts((prev) => ({
                                ...prev,
                                [order.id]: e.target.value as OrderStatus,
                              }))
                            }
                            disabled={savingOrderId === order.id}
                            className="w-full px-3 py-2.5 rounded-[14px] border bg-transparent text-[#2D241E] focus:outline-none disabled:opacity-70"
                            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", borderColor: hasStatusChange ? "#4A0E0E" : "rgba(45,36,30,0.2)" }}
                          >
                            {ORDER_STATUSES.map((status) => (
                              <option key={`mobile-${order.id}-${status}`} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            value={draftDeliveryDate}
                            onChange={(e) =>
                              setOrderDeliveryDrafts((prev) => ({
                                ...prev,
                                [order.id]: e.target.value,
                              }))
                            }
                            disabled={savingOrderId === order.id}
                            className="w-full px-3 py-2.5 rounded-[14px] border bg-transparent text-[#2D241E] focus:outline-none disabled:opacity-70"
                            style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", borderColor: hasStatusChange ? "#4A0E0E" : "rgba(45,36,30,0.2)" }}
                          />
                          <button
                            onClick={() => handleUpdateOrderStatus(order.id, draftStatus, draftDeliveryDate || null)}
                            disabled={!hasStatusChange || savingOrderId === order.id}
                            className="w-full py-2.5 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 disabled:opacity-45"
                            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em" }}
                          >
                            <span className="inline-flex items-center gap-1">
                              <Check size={11} />
                              Confirm Changes
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "80px 1.1fr 0.6fr 0.5fr 0.7fr 0.95fr 380px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>ID</span>
                  <span>Customer</span>
                  <span>Total</span>
                  <span>Items</span>
                  <span>Placed</span>
                  <span>Status</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-[#2D241E]/30" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>
                        No orders found
                      </p>
                    </div>
                  ) : (
                    filteredOrders.map((order) => {
                      const currentStatus = toOrderStatus(order.status);
                      const draftStatus = orderStatusDrafts[order.id] ?? currentStatus;
                      const currentDeliveryDate = order.estimatedDelivery ? order.estimatedDelivery.slice(0, 10) : "";
                      const draftDeliveryDate = orderDeliveryDrafts[order.id] ?? currentDeliveryDate;
                      const hasStatusChange = draftStatus !== currentStatus || draftDeliveryDate !== currentDeliveryDate;
                      const isExpanded = !!expandedOrders[order.id];
                      return (
                        <div key={order.id} className="hover:bg-[#2D241E]/[0.02] transition-colors">
                          <div
                            className="grid items-center px-6 py-4"
                            style={{ gridTemplateColumns: "80px 1.1fr 0.6fr 0.5fr 0.7fr 0.95fr 380px" }}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedOrders((prev) => ({
                                    ...prev,
                                    [order.id]: !prev[order.id],
                                  }))
                                }
                                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors"
                                title={isExpanded ? "Hide details" : "Show details"}
                              >
                                {isExpanded ? <ChevronUp size={16} style={{ color: "#2D241E", opacity: 0.6 }} /> : <ChevronDown size={16} style={{ color: "#2D241E", opacity: 0.6 }} />}
                              </button>
                              <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1rem" }}>
                                #{order.id}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem" }}>
                                {order.customerName}
                              </p>
                              <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {order.customerEmail}
                              </p>
                              {order.customerPhoneNumber ? (
                                <a
                                  href={`tel:${order.customerPhoneNumber.replace(/\s+/g, "")}`}
                                  className="text-[#4A0E0E] text-xs truncate inline-flex items-center gap-1 hover:opacity-80 transition-opacity mt-0.5"
                                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                                >
                                  <Phone size={11} />
                                  {order.customerPhoneNumber}
                                </a>
                              ) : (
                                <p className="text-[#2D241E]/35 text-xs truncate mt-0.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                  No phone
                                </p>
                              )}
                            </div>
                            <div>
                              <PriceTag amount={order.total} locale="uk" />
                            </div>
                            <span className="text-[#2D241E]/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {order.itemCount}
                            </span>
                            <span className="text-[#2D241E]/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                              {new Date(order.orderDate).toLocaleDateString()}
                            </span>
                            <div className="pr-4">
                              <OrderStatusPill status={order.status} />
                            </div>
                            <div className="flex items-center justify-end gap-2 pl-3 border-l border-[#2D241E]/10">
                            <select
                              value={draftStatus}
                              onChange={(e) =>
                                setOrderStatusDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value as OrderStatus,
                                }))
                              }
                              disabled={savingOrderId === order.id}
                              className="w-[100px] px-2.5 py-1.5 rounded-full border bg-transparent text-[#2D241E] focus:outline-none disabled:opacity-70"
                              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", borderColor: hasStatusChange ? "#4A0E0E" : "rgba(45,36,30,0.2)" }}
                            >
                              {ORDER_STATUSES.map((status) => (
                                <option key={`${order.id}-${status}`} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <input
                              type="date"
                              value={draftDeliveryDate}
                              onChange={(e) =>
                                setOrderDeliveryDrafts((prev) => ({
                                  ...prev,
                                  [order.id]: e.target.value,
                                }))
                              }
                              disabled={savingOrderId === order.id}
                              className="w-[120px] px-2 py-1.5 rounded-full border bg-transparent text-[#2D241E] focus:outline-none disabled:opacity-70"
                              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.68rem", borderColor: hasStatusChange ? "#4A0E0E" : "rgba(45,36,30,0.2)" }}
                              title="Estimated delivery"
                            />
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, draftStatus, draftDeliveryDate || null)}
                              disabled={!hasStatusChange || savingOrderId === order.id}
                              className="px-2.5 py-1.5 rounded-full text-[#F5F2ED] uppercase tracking-widest transition-all duration-300 disabled:opacity-45"
                              style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.6rem", letterSpacing: "0.09em" }}
                              title="Confirm status change"
                            >
                              <span className="inline-flex items-center gap-1">
                                <Check size={11} />
                                Confirm
                              </span>
                            </button>
                          </div>
                          </div>

                          {isExpanded && order.items.length > 0 && (
                            <div className="px-6 pb-5">
                              <div
                                className="rounded-[20px] p-4"
                                style={{ border: "1px solid rgba(45,36,30,0.08)", backgroundColor: "rgba(245,242,237,0.7)" }}
                              >
                                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                                  {order.items.map((item) => {
                                    const img = item.productImageUrl ? resolveMediaUrl(item.productImageUrl) : "";
                                    return (
                                      <div key={`order-${order.id}-item-${item.id}`} className="flex gap-4">
                                        <div className="w-[72px] h-[72px] rounded-[18px] overflow-hidden shrink-0" style={{ backgroundColor: "rgba(45,36,30,0.06)" }}>
                                          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : null}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <OrderLineDetails line={orderItemDtoToLineDetails(item)} locale="uk" />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div
                  className="px-6 py-4 flex items-center justify-between"
                  style={{
                    borderTop: "1px solid rgba(45,36,30,0.06)",
                    backgroundColor: "rgba(45,36,30,0.02)",
                  }}
                >
                  <span className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Showing {filteredOrders.length} of {orders.length} orders
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── ACCOUNTING ── */}
          {activeTab === "accounting" && (
            <AdminAccountingTab />
          )}

          {/* ── CATEGORIES ── */}
          {activeTab === "categories" && (
            <motion.div
              key="categories"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{categories.length} categories</p>
                <button
                  type="button"
                  onClick={() => setCategoryModal({ open: true, editing: null })}
                  className={ADMIN_ADD_BTN}
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Category</span>
                </button>
              </div>
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "1fr 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>Category</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {categories.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>No categories yet</p>
                  ) : (
                    categories.map((c) => (
                      <div key={c.id} className={ADMIN_ROW} style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{c.name}</p>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setCategoryModal({ open: true, editing: c })} className={ADMIN_ICON_EDIT} title="Edit" aria-label={`Edit ${c.name}`}><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button type="button" onClick={() => setDeleteModal({ open: true, type: "category", id: String(c.id), idNum: c.id, name: c.name })} className={ADMIN_ICON_DELETE} title="Delete" aria-label={`Delete ${c.name}`}><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── COLLECTIONS ── */}
          {activeTab === "collections" && (
            <AdminCollectionsTab
              products={products.map((product) => ({
                idNum: product.idNum,
                name: product.name,
                sku: product.sku,
              }))}
              onError={(message) => setSaveError(message)}
            />
          )}

          {/* ── COUNTRIES ── */}
          {activeTab === "countries" && (
            <motion.div
              key="countries"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{countries.length} countries</p>
                <button
                  type="button"
                  onClick={() => setCountryModal({ open: true, editing: null })}
                  className={ADMIN_ADD_BTN}
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Country</span>
                </button>
              </div>
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "1fr 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>Country</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {countries.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>No countries yet</p>
                  ) : (
                    countries.map((c) => (
                      <div key={c.id} className={ADMIN_ROW} style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>{c.name}</p>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setCountryModal({ open: true, editing: c })} className={ADMIN_ICON_EDIT} title="Edit" aria-label={`Edit ${c.name}`}><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button type="button" onClick={() => setDeleteModal({ open: true, type: "country", id: String(c.id), idNum: c.id, name: c.name })} className={ADMIN_ICON_DELETE} title="Delete" aria-label={`Delete ${c.name}`}><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── COLORS ── */}
          {activeTab === "colors" && (
            <motion.div
              key="colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{colors.length} colors</p>
                <button
                  type="button"
                  onClick={() => setColorModal({ open: true, editing: null })}
                  className={ADMIN_ADD_BTN}
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Color</span>
                </button>
              </div>
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "1fr 1fr 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>Color</span>
                  <span>Preview</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {colors.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>No colors yet</p>
                  ) : (
                    colors.map((c) => (
                      <div key={c.id} className={ADMIN_ROW} style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                          {adminBilingualLabel(c.name, c.nameUk)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: c.hexCode || "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} />
                          <span className="text-[#2D241E]/50 text-sm uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem" }}>{c.hexCode}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setColorModal({ open: true, editing: c })} className={ADMIN_ICON_EDIT} title="Edit" aria-label={`Edit ${c.name}`}><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button type="button" onClick={() => { setDeleteModalError(null); setDeleteModal({ open: true, type: "color", id: String(c.id), idNum: c.id, name: c.name }); }} className={ADMIN_ICON_DELETE} title="Delete" aria-label={`Delete ${c.name}`}><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── FURNITURE COLORS ── */}
          {activeTab === "furniture" && (
            <motion.div
              key="furniture"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{furnitureColors.length} furniture colors</p>
                <button
                  type="button"
                  onClick={() => setFurnitureModal({ open: true, editing: null })}
                  className={ADMIN_ADD_BTN}
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Furniture Color</span>
                </button>
              </div>
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase"
                  style={{
                    gridTemplateColumns: "1fr 1fr 100px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>Furniture Color</span>
                  <span>Preview</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {furnitureColors.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>No furniture colors yet</p>
                  ) : (
                    furnitureColors.map((c) => (
                      <div key={c.id} className={ADMIN_ROW} style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                          {adminBilingualLabel(c.name, c.nameUk)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: c.hexCode || "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} />
                          <span className="text-[#2D241E]/50 text-sm uppercase tracking-wider" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem" }}>{c.hexCode}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setFurnitureModal({ open: true, editing: c })} className={ADMIN_ICON_EDIT} title="Edit" aria-label={`Edit ${c.name}`}><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button type="button" onClick={() => { setDeleteModalError(null); setDeleteModal({ open: true, type: "furniture", id: String(c.id), idNum: c.id, name: c.name }); }} className={ADMIN_ICON_DELETE} title="Delete" aria-label={`Delete ${c.name}`}><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── LOGS ── */}
          {activeTab === "logs" && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.35rem" }}>
                    Activity logs
                  </p>
                  <p className="text-[#2D241E]/45 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Products, orders, users, catalog, images, and storefront publishes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!apiAvailable) return;
                    setLogsLoading(true);
                    fetchActivityLogs({
                      category: logsSubTab === "all" ? undefined : logsSubTab,
                      limit: 200,
                    })
                      .then(setActivityLogs)
                      .catch(() => setActivityLogs([]))
                      .finally(() => setLogsLoading(false));
                  }}
                  className="px-5 py-2.5 rounded-full text-[#2D241E] transition-colors hover:bg-[#2D241E]/5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", border: "1px solid rgba(45,36,30,0.15)" }}
                >
                  <span className="uppercase tracking-widest">Refresh</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-8">
                {([
                  { key: "all" as LogsSubTab, label: "All" },
                  { key: "product" as LogsSubTab, label: "Products" },
                  { key: "order" as LogsSubTab, label: "Orders" },
                  { key: "catalog" as LogsSubTab, label: "Catalog" },
                  { key: "image" as LogsSubTab, label: "Images" },
                  { key: "user" as LogsSubTab, label: "Users" },
                  { key: "push" as LogsSubTab, label: "Pushes" },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setLogsSubTab(tab.key)}
                    className="px-4 py-2 rounded-full transition-colors"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "0.75rem",
                      letterSpacing: "0.08em",
                      backgroundColor: logsSubTab === tab.key ? "#2D241E" : "rgba(45,36,30,0.06)",
                      color: logsSubTab === tab.key ? "#F5F2ED" : "rgba(45,36,30,0.55)",
                    }}
                  >
                    <span className="uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div
                  className="grid px-6 py-4 text-xs tracking-widest uppercase hidden md:grid"
                  style={{
                    gridTemplateColumns: "140px 90px 1fr 160px",
                    fontFamily: "'DM Sans', sans-serif",
                    letterSpacing: "0.12em",
                    color: "rgba(45,36,30,0.4)",
                    backgroundColor: "rgba(45,36,30,0.03)",
                    borderBottom: "1px solid rgba(45,36,30,0.06)",
                  }}
                >
                  <span>When</span>
                  <span>Action</span>
                  <span>Summary</span>
                  <span>By</span>
                </div>

                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {logsLoading ? (
                    <p className="py-12 text-center text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Loading logs…
                    </p>
                  ) : activityLogs.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.05rem" }}>
                      {apiAvailable ? "No activity recorded yet." : "Connect to the API to view logs."}
                    </p>
                  ) : (
                    activityLogs.map((log) => {
                      const { pills, extra } = parseLogDiff(log.detailsJson);
                      const imageGroups = extractLogImageGroups(log.detailsJson, log.action, log.category);
                      return (
                        <div
                          key={log.id}
                          className="px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors md:grid md:items-start md:gap-4"
                          style={{ gridTemplateColumns: "140px 90px 1fr 160px" }}
                        >
                          <p className="text-[#2D241E]/45 text-xs mb-2 md:mb-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {formatLogTimestamp(log.createdAt)}
                          </p>
                          <div className="mb-2 md:mb-0">
                            <span
                              className="inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider"
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                backgroundColor:
                                  log.action === "deleted"
                                    ? "rgba(74,14,14,0.1)"
                                    : log.action === "created"
                                      ? "rgba(45,36,30,0.08)"
                                      : "rgba(155,107,46,0.12)",
                                color: log.action === "deleted" ? "#4A0E0E" : log.action === "created" ? "#2D241E" : "#9B6B2E",
                              }}
                            >
                              {formatLogAction(log.action)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                              {log.summary}
                            </p>
                            {extra && (
                              <p className="text-[#2D241E]/40 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                {extra}
                              </p>
                            )}
                            <LogDiffPills pills={pills} />
                            <LogImageStrip groups={imageGroups} />
                          </div>
                          <p className="text-[#2D241E]/40 text-xs mt-2 md:mt-0 truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                            {log.actorEmail ?? "System"}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {!logsLoading && activityLogs.length > 0 && (
                  <div
                    className="px-6 py-4"
                    style={{ borderTop: "1px solid rgba(45,36,30,0.06)", backgroundColor: "rgba(45,36,30,0.02)" }}
                  >
                    <span className="text-xs text-[#2D241E]/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Showing {activityLogs.length} most recent entries
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── SIZES ── */}
          {activeTab === "sizes" && (
            <motion.div
              key="sizes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: easing }}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <p className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{sizes.length} sizes</p>
                <button
                  type="button"
                  onClick={() => setSizeModal({ open: true, editing: null })}
                  className={ADMIN_ADD_BTN}
                  style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
                >
                  <Plus size={15} />
                  <span className="uppercase tracking-widest">Add Size</span>
                </button>
              </div>
              <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                <div className="grid px-6 py-4 text-xs tracking-widest uppercase" style={{ gridTemplateColumns: "1fr 100px", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em", color: "rgba(45,36,30,0.4)", backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
                  <span>Size</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(45,36,30,0.06)" }}>
                  {sizes.length === 0 ? (
                    <p className="py-12 text-center text-[#2D241E]/40 px-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>No sizes yet</p>
                  ) : (
                    sizes.map((s) => (
                      <div key={s.id} className={ADMIN_ROW} style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.15rem" }}>
                          {adminBilingualLabel(s.name, s.nameUk)}
                        </p>
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => setSizeModal({ open: true, editing: s })} className={ADMIN_ICON_EDIT} title="Edit" aria-label={`Edit ${s.name}`}><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button type="button" onClick={() => setDeleteModal({ open: true, type: "size", id: String(s.id), idNum: s.id, name: s.name })} className={ADMIN_ICON_DELETE} title="Delete" aria-label={`Delete ${s.name}`}><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {productModal.open && (
          <ProductModal
            key="product-modal"
            product={productModal.editing}
            allProducts={products}
            categories={categories}
            colors={colors}
            furnitureColors={furnitureColors}
            sizes={sizes}
            onClose={() => {
              setProductModal({ open: false, editing: null });
              setProductSaveError(null);
            }}
            saveError={productSaveError}
            onSave={handleSaveProduct}
          />
        )}
        {userModal.open && (
          <UserModal
            key="user-modal"
            user={null}
            onClose={() => setUserModal({ open: false })}
            onSave={handleSaveUser}
          />
        )}
        {categoryModal.open && (
          <CategoryModal editing={categoryModal.editing} onClose={() => setCategoryModal({ open: false, editing: null })} onSave={handleSaveCategory} />
        )}
        {countryModal.open && (
          <CountryModal editing={countryModal.editing} onClose={() => setCountryModal({ open: false, editing: null })} onSave={handleSaveCountry} />
        )}
        {colorModal.open && (
          <ColorModal editing={colorModal.editing} onClose={() => setColorModal({ open: false, editing: null })} onSave={handleSaveColor} />
        )}
        {furnitureModal.open && (
          <ColorModal
            editing={furnitureModal.editing}
            onClose={() => setFurnitureModal({ open: false, editing: null })}
            onSave={handleSaveFurnitureColor}
            labels={{
              eyebrowNew: "New Furniture Color",
              eyebrowEdit: "Edit Furniture Color",
              titleNew: "Add Furniture Color",
            }}
          />
        )}
        {sizeModal.open && (
          <SizeModal editing={sizeModal.editing} onClose={() => setSizeModal({ open: false, editing: null })} onSave={handleSaveSize} />
        )}
        {deleteModal && (
          <DeleteModal
            key="delete-modal"
            name={deleteModal.name}
            error={deleteModalError}
            onClose={() => { setDeleteModal(null); setDeleteModalError(null); }}
            onConfirm={() => {
              if (deleteModal.type === "product") handleDeleteProduct();
              else if (deleteModal.type === "user") handleDeleteUser();
              else if (deleteModal.type === "category") handleDeleteCategory();
              else if (deleteModal.type === "country") handleDeleteCountry();
              else if (deleteModal.type === "color") handleDeleteColor();
              else if (deleteModal.type === "furniture") handleDeleteFurnitureColor();
              else if (deleteModal.type === "size") handleDeleteSize();
            }}
          />
        )}
      </AnimatePresence>
      {contentsCrop.cropDialogNode}
    </main>
  );
}
