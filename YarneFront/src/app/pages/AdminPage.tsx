import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAdminData } from "../hooks/useAdminData";
import { uploadImage } from "../api/images";
import type { Product } from "../data/products";
import { getCarouselSelection, saveCarouselSelection } from "../utils/carouselSelection";
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
  UserCheck,
  AlertTriangle,
  Tag,
  Globe,
  ImagePlus,
  Palette,
} from "lucide-react";

const easing = [0.25, 0.1, 0.25, 1] as const;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
type AdminProduct = Product & { idNum: number; sku: string; stock: number };
type AdminUser = ReturnType<typeof useAdminData>["users"][number];

/* ─────────────────────────────────────────────
   SMALL HELPERS
───────────────────────────────────────────── */
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
  description: string;
  stock: string;
  sku: string;
  imageUrls: string[];
  defaultSizeId: number | null;
  colorIds: number[];
  /** Per-color available sizes: colorId -> sizeIds */
  colorSizeIds: Record<number, number[]>;
  /** Per color+size image sets: `${colorId}:${sizeId}` -> image URLs */
  colorSizeVariants: Record<string, string[]>;
  /** Optional per color+size stock: `${colorId}:${sizeId}` -> quantity */
  variantStocks: Record<string, string>;
}

function ProductModal({
  product,
  categories,
  colors,
  sizes,
  onClose,
  onSave,
}: {
  product: AdminProduct | null;
  categories: { id: number; name: string }[];
  colors: { id: number; name: string; hexCode: string }[];
  sizes: { id: number; name: string }[];
  onClose: () => void;
  onSave: (data: ProductFormData) => void;
}) {
  const variantKey = (colorId: number, sizeId: number) => `${colorId}:${sizeId}`;
  const [form, setForm] = useState<ProductFormData>(() => {
    const base = product
      ? {
          name: product.name,
          subtitle: product.subtitle,
          price: product.price.toString(),
          categoryId: categories.find((c) => c.name === product.category)?.id ?? categories[0]?.id ?? 0,
          isNew: product.isNew ?? false,
          isBestseller: product.isBestseller ?? false,
          description: product.description,
          stock: String(product.stock ?? 0),
          sku: product.sku ?? product.id,
          imageUrls: product.colors?.map((c) => (c.images?.length ? c.images[0] : c.image)) ?? [],
          defaultSizeId: product.defaultSize
            ? sizes.find((s) => s.name === product.defaultSize)?.id ?? null
            : null,
        }
      : {
          name: "",
          subtitle: "",
          price: "",
          categoryId: categories[0]?.id ?? 0,
          isNew: false,
          isBestseller: false,
          description: "",
          stock: "",
          sku: "",
          imageUrls: [""],
          defaultSizeId: null,
        };
    const preferredSizeId = sizes.find((s) => s.name === "M")?.id ?? sizes[0]?.id ?? null;
    const colorIds = product?.colors
      ? product.colors
          .map((c) => colors.find((col) => col.name === c.name)?.id)
          .filter((id): id is number => id != null) ?? []
      : [];
    const colorSizeIds: Record<number, number[]> = {};
    const colorSizeVariants: Record<string, string[]> = {};
    product?.colors?.forEach((c) => {
      const colorId = colors.find((col) => col.name === c.name)?.id;
      if (colorId != null) {
        const sizeImages = c.sizeImages ?? {};
        const hasSizeScoped = Object.keys(sizeImages).length > 0;
        if (hasSizeScoped) {
          const collectedSizeIds: number[] = [];
          Object.entries(sizeImages).forEach(([sizeName, urls]) => {
            const sizeId = sizes.find((s) => s.name === sizeName)?.id;
            if (sizeId != null) {
              collectedSizeIds.push(sizeId);
              colorSizeVariants[variantKey(colorId, sizeId)] = urls;
            }
          });
          colorSizeIds[colorId] = Array.from(new Set(collectedSizeIds));
        } else {
          const fallbackSizeId = base.defaultSizeId ?? preferredSizeId;
          if (fallbackSizeId != null) {
            colorSizeIds[colorId] = [fallbackSizeId];
            colorSizeVariants[variantKey(colorId, fallbackSizeId)] = c.images?.length ? c.images : [c.image];
          }
        }
      }
    });
    return { ...base, colorIds, colorSizeIds, colorSizeVariants, variantStocks: {} };
  });

  const handleChange = (key: keyof ProductFormData, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const perColorFileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetVariantRef = useRef<{ colorId: number; sizeId: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingColorId, setUploadingColorId] = useState<number | null>(null);
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
  }>({});

  const addImageUrl = () => setForm((p) => ({ ...p, imageUrls: [...p.imageUrls, ""] }));
  const removeImageUrl = (i: number) => setForm((p) => ({ ...p, imageUrls: p.imageUrls.filter((_, idx) => idx !== i) }));
  const setImageUrl = (i: number, url: string) => setForm((p) => {
    const next = [...p.imageUrls];
    next[i] = url;
    return { ...p, imageUrls: next };
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        setForm((p) => ({
          ...p,
          imageUrls: [...p.imageUrls.filter((u) => u.trim() && !u.startsWith("Upload failed:")), url],
        }));
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePerColorFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const target = uploadTargetVariantRef.current;
    if (!files?.length || !target) {
      e.target.value = "";
      uploadTargetVariantRef.current = null;
      return;
    }
    const { colorId, sizeId } = target;
    setUploadingColorId(colorId);
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        setForm((p) => {
          const next = { ...p.colorSizeVariants };
          const key = variantKey(colorId, sizeId);
          const arr = [...(next[key] ?? []).filter((u) => u.trim() && !u.startsWith("Upload failed:")), url];
          next[key] = arr;
          return { ...p, colorSizeVariants: next };
        });
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploadingColorId(null);
      uploadTargetVariantRef.current = null;
      e.target.value = "";
    }
  };

  const triggerPerColorUpload = (colorId: number, sizeId: number) => {
    setUploadError(null);
    uploadTargetVariantRef.current = { colorId, sizeId };
    perColorFileInputRef.current?.click();
  };

  const isEditing = !!product;
  const imagesLockedByColors = form.colorIds.length > 0;
  const selectedSizeIds = Array.from(
    new Set(
      form.colorIds.flatMap((colorId) => form.colorSizeIds[colorId] ?? [])
    )
  );

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
      (form.colorSizeIds[colorId] ?? []).map((sizeId) => variantKey(colorId, sizeId))
    );
    const variantsWithTooFewPhotos = selectedVariantKeys.filter((key) => {
      const validPhotos = (form.colorSizeVariants[key] ?? []).filter(
        (url) => url.trim() && !url.startsWith("Upload failed:")
      );
      return validPhotos.length < 3;
    });

    if (!form.name.trim()) errors.name = "This field must not be empty.";
    if (!form.sku.trim()) errors.sku = "This field must not be empty.";
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

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSave(form);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        className="w-full max-w-2xl lg:max-w-5xl rounded-[32px] overflow-hidden max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between p-8 pb-6"
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

        {/* Form */}
        <div className="p-8 space-y-6">
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
              { label: "Price (€)", key: "price" as const, type: "number", placeholder: "0" },
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
                SKU
              </label>
              <input
                type="text"
                value={form.sku}
                onChange={(e) => handleChange("sku", e.target.value)}
                placeholder="KG-SW-1001"
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
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {uploadError && (
                  <p className="text-sm text-[#4A0E0E] mr-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    Upload failed: {uploadError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                  disabled={uploading || imagesLockedByColors}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-xs border transition-all hover:bg-[#2D241E]/5 disabled:opacity-50"
                  style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                >
                  <ImagePlus size={14} />
                  {uploading ? "Uploading..." : "Add from device"}
                </button>
                {!imagesLockedByColors && (
                  <button type="button" onClick={addImageUrl} className="text-xs text-[#4A0E0E] hover:underline" style={{ fontFamily: "'DM Sans', sans-serif" }}>+ Add URL</button>
                )}
              </div>
            </div>
          <div className="space-y-2">
              {form.imageUrls.map((url, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setImageUrl(i, e.target.value)}
                    readOnly={imagesLockedByColors}
                    placeholder={`Image ${i + 1} URL or upload from device`}
                    className="flex-1 bg-transparent border rounded-[14px] px-4 py-2.5 text-[#2D241E] focus:outline-none text-sm placeholder:text-[#2D241E]/20"
                    style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.15)" }}
                  />
                  <button type="button" disabled={imagesLockedByColors} onClick={() => removeImageUrl(i)} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/10 text-[#4A0E0E] disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
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
                                      const key = variantKey(colorId, s.id);
                                      delete nextVariants[key];
                                      delete nextStocks[key];
                                    }
                                    return { ...p, colorSizeIds: nextColorSizeIds, colorSizeVariants: nextVariants, variantStocks: nextStocks };
                                  });
                                  setFormErrors((prev) => ({ ...prev, sizes: undefined, defaultSizeId: undefined }));
                                }}
                                className="px-3 py-1.5 rounded-full border text-xs"
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: selected ? "#2D241E" : "rgba(45,36,30,0.2)", backgroundColor: selected ? "rgba(45,36,30,0.06)" : "transparent" }}
                              >
                                {s.name}
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
                    <p className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Every selected color-size pair is shown below. Minimum 3 photos per pair.
                    </p>
                  </div>
                  {uploadError && (
                    <p className="text-sm text-[#4A0E0E] mb-3 p-3 rounded-[12px] bg-[#4A0E0E]/8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      Upload failed: {uploadError}
                    </p>
                  )}
                  <input ref={perColorFileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={handlePerColorFileSelect} />
                  <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                    {form.colorIds.flatMap((colorId) =>
                      (form.colorSizeIds[colorId] ?? []).map((sizeId) => {
                        const color = colors.find((c) => c.id === colorId);
                        const size = sizes.find((s) => s.id === sizeId);
                        const key = variantKey(colorId, sizeId);
                        const urls = form.colorSizeVariants[key] ?? [];
                        return (
                        <div key={key} className="rounded-[16px] p-3 sm:p-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full border" style={{ backgroundColor: color?.hexCode ?? "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} />
                              <span className="text-sm font-medium text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                                {color?.name ?? "Color"} · {size?.name ?? "Size"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                placeholder="Stock"
                                value={form.variantStocks[key] ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setForm((p) => ({ ...p, variantStocks: { ...p.variantStocks, [key]: value } }));
                                }}
                                className="w-20 bg-white/60 border rounded-[10px] px-2.5 py-1.5 text-xs text-[#2D241E] focus:outline-none"
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.15)" }}
                              />
                              <button
                                type="button"
                                onClick={() => triggerPerColorUpload(colorId, sizeId)}
                                disabled={uploadingColorId === colorId}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-xs border transition-all hover:bg-[#2D241E]/5 disabled:opacity-50"
                                style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.2)", color: "#2D241E" }}
                              >
                                <ImagePlus size={12} />
                                {uploadingColorId === colorId ? "Uploading..." : "Add from device"}
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {urls.length === 0 && (
                              <p className="text-xs text-[#2D241E]/45 py-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                                No photos for this color-size yet.
                              </p>
                            )}
                            {urls.map((url, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <input
                                  type="url"
                                  value={url}
                                  onChange={(e) => {
                                    setForm((p) => {
                                      const next = { ...p.colorSizeVariants };
                                      const arr = [...(next[key] ?? [])];
                                      arr[i] = e.target.value;
                                      next[key] = arr;
                                      return { ...p, colorSizeVariants: next };
                                    });
                                  }}
                                  placeholder={`Image ${i + 1} URL or upload from device`}
                                  className="flex-1 bg-white/50 border rounded-[12px] px-3 py-2 text-sm text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/30"
                                  style={{ fontFamily: "'DM Sans', sans-serif", borderColor: "rgba(45,36,30,0.15)" }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
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
                                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/10 text-[#4A0E0E] shrink-0"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
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
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-end gap-3 px-8 py-6"
          style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        className="w-full max-w-lg rounded-[32px] overflow-hidden"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        <div
          className="flex items-center justify-between p-8 pb-6"
          style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
        >
          <div>
            <p
              className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}
            >
              New User
            </p>
            <h3
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}
            >
              Register Customer
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5 transition-colors"
          >
            <X size={18} style={{ color: "#2D241E" }} />
          </button>
        </div>

        <div className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>First Name</label>
              <input type="text" value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="Sophie" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
            </div>
            <div>
              <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Last Name</label>
              <input type="text" value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Laurent" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Username</label>
            <input type="text" value={form.userName} onChange={(e) => setForm((p) => ({ ...p, userName: e.target.value }))} placeholder="sophie.laurent" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
          </div>
          <div>
            <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="sophie@example.com" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
          </div>
          <div>
            <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="Min 8 characters" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-8 py-6" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <button onClick={onClose} className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}>
            <span className="uppercase tracking-widest">Cancel</span>
          </button>
          <button onClick={() => onSave(form)} className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90" style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}>
            <span className="uppercase tracking-widest">{isEditing ? "Save Changes" : "Add User"}</span>
          </button>
        </div>
      </motion.div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-md rounded-[32px] overflow-hidden"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        <div className="flex items-center justify-between p-8 pb-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
          <div>
            <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}>{isEditing ? "Edit Category" : "New Category"}</p>
            <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}>{isEditing ? editing.name : "Add Category"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5"><X size={18} style={{ color: "#2D241E" }} /></button>
        </div>
        <div className="p-8">
          <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Category Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sweaters" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
        </div>
        <div className="flex items-center justify-end gap-3 px-8 py-6" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <button onClick={onClose} className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}><span className="uppercase tracking-widest">Cancel</span></button>
          <button onClick={() => onSave(name)} className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90" style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}><span className="uppercase tracking-widest">{isEditing ? "Save" : "Add"}</span></button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   COLOR MODAL
───────────────────────────────────────────── */
function ColorModal({
  editing,
  onClose,
  onSave,
}: {
  editing: { id: number; name: string; hexCode: string } | null;
  onClose: () => void;
  onSave: (name: string, hexCode?: string) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [hexCode, setHexCode] = useState(editing?.hexCode ?? "#2D241E");
  useEffect(() => {
    setName(editing?.name ?? "");
    setHexCode(editing?.hexCode ?? "#2D241E");
  }, [editing?.id, editing?.name, editing?.hexCode]);
  const isEditing = !!editing;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-md rounded-[32px] overflow-hidden"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        <div className="flex items-center justify-between p-8 pb-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
          <div>
            <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}>{isEditing ? "Edit Color" : "New Color"}</p>
            <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}>{isEditing ? editing.name : "Add Color"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5"><X size={18} style={{ color: "#2D241E" }} /></button>
        </div>
        <div className="p-8 space-y-5">
          <div>
            <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Color Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Black" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
          </div>
          <div>
            <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Hex Code</label>
            <div className="flex gap-3 items-center">
              <input type="text" value={hexCode} onChange={(e) => setHexCode(e.target.value)} placeholder="#2D241E" className="flex-1 bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
              <span className="w-10 h-10 rounded-full border shrink-0" style={{ backgroundColor: hexCode || "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} title="Preview" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-8 py-6" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <button onClick={onClose} className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}><span className="uppercase tracking-widest">Cancel</span></button>
          <button onClick={() => onSave(name, hexCode || "#2D241E")} className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90" style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}><span className="uppercase tracking-widest">{isEditing ? "Save" : "Add"}</span></button>
        </div>
      </motion.div>
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-md rounded-[32px] overflow-hidden"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        <div className="flex items-center justify-between p-8 pb-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
          <div>
            <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}>{isEditing ? "Edit Country" : "New Country"}</p>
            <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}>{isEditing ? editing.name : "Add Country"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5"><X size={18} style={{ color: "#2D241E" }} /></button>
        </div>
        <div className="p-8">
          <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Country Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ukraine" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
        </div>
        <div className="flex items-center justify-end gap-3 px-8 py-6" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <button onClick={onClose} className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}><span className="uppercase tracking-widest">Cancel</span></button>
          <button onClick={() => onSave(name)} className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90" style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}><span className="uppercase tracking-widest">{isEditing ? "Save" : "Add"}</span></button>
        </div>
      </motion.div>
    </div>
  );
}

function SizeModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-md rounded-[32px] overflow-hidden"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: easing }}
      >
        <div className="flex items-center justify-between p-8 pb-6" style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}>
          <div>
            <p className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-1" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.18em" }}>{isEditing ? "Edit Size" : "New Size"}</p>
            <h3 className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.4rem", fontWeight: 400 }}>{isEditing ? editing.name : "Add Size"}</h3>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5"><X size={18} style={{ color: "#2D241E" }} /></button>
        </div>
        <div className="p-8">
          <label className="block text-xs mb-2 tracking-widest uppercase" style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}>Size Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. M" className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }} />
        </div>
        <div className="flex items-center justify-end gap-3 px-8 py-6" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <button onClick={onClose} className="px-6 py-3 rounded-full border transition-all duration-300 hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}><span className="uppercase tracking-widest">Cancel</span></button>
          <button onClick={() => onSave(name)} className="px-8 py-3 rounded-full text-[#F5F2ED] transition-all duration-300 hover:opacity-90" style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}><span className="uppercase tracking-widest">{isEditing ? "Save" : "Add"}</span></button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────── */
function DeleteModal({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(45,36,30,0.5)", backdropFilter: "blur(8px)" }}>
      <motion.div
        className="w-full max-w-sm rounded-[28px] p-8 text-center"
        style={{ backgroundColor: "#F5F2ED" }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.25, ease: easing }}
      >
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "rgba(74,14,14,0.08)" }}>
          <AlertTriangle size={22} style={{ color: "#4A0E0E" }} />
        </div>
        <h3 className="text-[#2D241E] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.3rem", fontWeight: 400 }}>Delete "{name}"?</h3>
        <p className="text-[#2D241E]/50 mb-8 text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>This action cannot be undone. This record will be permanently removed.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-full border transition-all hover:bg-[#2D241E]/5" style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em", color: "rgba(45,36,30,0.6)" }}>
            <span className="uppercase tracking-widest">Cancel</span>
          </button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-full text-white transition-all hover:opacity-90" style={{ backgroundColor: "#4A0E0E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}>
            <span className="uppercase tracking-widest">Delete</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN ADMIN PAGE
───────────────────────────────────────────── */
type AdminTab = "dashboard" | "contents" | "products" | "users" | "categories" | "countries" | "colors" | "sizes";

export function AdminPage() {
  const {
    products,
    users,
    categories,
    countries,
    loading,
    apiAvailable,
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
    sizes,
    addSize,
    editSize,
    removeSize,
    addUser,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [productSearch, setProductSearch] = useState("");
  const [mobileProductsPage, setMobileProductsPage] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [carouselProductCodes, setCarouselProductCodes] = useState<string[]>([]);

  const [productModal, setProductModal] = useState<{ open: boolean; editing: AdminProduct | null }>({ open: false, editing: null });
  const [userModal, setUserModal] = useState<{ open: boolean }>({ open: false });
  const [categoryModal, setCategoryModal] = useState<{ open: boolean; editing: { id: number; name: string } | null }>({ open: false, editing: null });
  const [countryModal, setCountryModal] = useState<{ open: boolean; editing: { id: number; name: string } | null }>({ open: false, editing: null });
  const [colorModal, setColorModal] = useState<{ open: boolean; editing: { id: number; name: string; hexCode: string } | null }>({ open: false, editing: null });
  const [sizeModal, setSizeModal] = useState<{ open: boolean; editing: { id: number; name: string } | null }>({ open: false, editing: null });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: "product" | "user" | "category" | "country" | "color" | "size"; id: string; idNum?: number; name: string } | null>(null);

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

  useEffect(() => {
    const syncSelection = () => {
      const { productCodes } = getCarouselSelection();
      setCarouselProductCodes(productCodes);
    };
    syncSelection();
    if (typeof window === "undefined") return;
    window.addEventListener("storage", syncSelection);
    return () => window.removeEventListener("storage", syncSelection);
  }, []);

  useEffect(() => {
    setMobileProductsPage(1);
  }, [productSearch]);

  useEffect(() => {
    if (mobileProductsPage > mobileProductsTotalPages) {
      setMobileProductsPage(mobileProductsTotalPages);
    }
  }, [mobileProductsPage, mobileProductsTotalPages]);

  const carouselProductSet = useMemo(() => new Set(carouselProductCodes), [carouselProductCodes]);

  const carouselProducts = useMemo(
    () =>
      carouselProductCodes
        .map((code) => products.find((p) => p.id === code))
        .filter((p): p is AdminProduct => Boolean(p)),
    [carouselProductCodes, products]
  );

  const updateCarouselSelection = (nextCodes: string[]) => {
    const savedCodes = saveCarouselSelection(nextCodes);
    setCarouselProductCodes(savedCodes);
  };

  const addToCarousel = (productCode: string) => {
    if (carouselProductSet.has(productCode)) return;
    updateCarouselSelection([...carouselProductCodes, productCode]);
  };

  const removeFromCarousel = (productCode: string) => {
    updateCarouselSelection(carouselProductCodes.filter((code) => code !== productCode));
  };

  const sanitizeImageUrls = (urls: string[] | undefined) =>
    (urls ?? []).map((url) => url.trim()).filter((url) => url && !url.startsWith("Upload failed:"));

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
      const colorSizeVariants = Object.entries(data.colorSizeVariants ?? {})
        .map(([key, urls]) => {
          const [colorIdRaw, sizeIdRaw] = key.split(":");
          const colorId = Number(colorIdRaw);
          const sizeId = Number(sizeIdRaw);
          return {
            colorId,
            sizeId,
            imageUrls: unique(sanitizeImageUrls(urls)),
          };
        })
        .filter((v) => colorIds.includes(v.colorId) && sizeIds.includes(v.sizeId) && v.imageUrls.length > 0);
      const variantStocks = Object.entries(data.variantStocks ?? {})
        .map(([key, value]) => {
          const [colorIdRaw, sizeIdRaw] = key.split(":");
          const colorId = Number(colorIdRaw);
          const sizeId = Number(sizeIdRaw);
          const quantityInStock = Number(value);
          return { colorId, sizeId, quantityInStock };
        })
        .filter((v) => colorIds.includes(v.colorId) && sizeIds.includes(v.sizeId) && Number.isFinite(v.quantityInStock) && v.quantityInStock >= 0);
      const computedTotalStock = variantStocks.reduce((sum, v) => sum + v.quantityInStock, 0);
      const parsedTotalStock = data.stock.trim() ? parseInt(data.stock, 10) : NaN;
      const quantityInStock = Number.isFinite(parsedTotalStock) && parsedTotalStock >= 0
        ? parsedTotalStock
        : computedTotalStock;

      const nextPrimaryImageUrls = unique(
        colorSizeVariants
          .filter((v) => v.sizeId === normalizedDefaultSizeId)
          .map((v) => v.imageUrls[0])
          .filter((url): url is string => Boolean(url))
      );

      const payload = {
        productCode: data.sku,
        name: data.name,
        description: data.description,
        price: parseFloat(data.price) || 0,
        quantityInStock,
        material: data.subtitle,
        categoryId: data.categoryId,
        defaultSizeId: normalizedDefaultSizeId ?? undefined,
        sizeIds,
        imageUrls: nextPrimaryImageUrls,
        colorIds,
        colorSizeVariants,
        variantStocks,
      };
      if (productModal.editing && "idNum" in productModal.editing) {
        await editProduct(productModal.editing.idNum, { ...payload, isActive: true });
      } else {
        await addProduct(payload);
      }
      setProductModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save product");
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
    } catch {
      setSaveError("Failed to delete product");
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

  const handleSaveColor = async (name: string, hexCode?: string) => {
    setSaveError(null);
    try {
      if (colorModal.editing) {
        await editColor(colorModal.editing.id, name, hexCode);
      } else {
        await addColor(name, hexCode);
      }
      setColorModal({ open: false, editing: null });
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save color");
    }
  };

  const handleSaveSize = async (name: string) => {
    setSaveError(null);
    try {
      if (sizeModal.editing) {
        await editSize(sizeModal.editing.id, name);
      } else {
        await addSize(name);
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
    try {
      await removeColor(id);
      setDeleteModal(null);
      refetch();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete color");
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

  const totalRevenue = products.reduce((s, p) => s + p.price * 50, 0);
  const activeUsers = users.filter((u) => u.status === "active").length;
  const lowStockCount = products.filter((p) => (p.stock ?? 0) < 10).length;

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100vh" }} className="relative">
      {!apiAvailable && !loading && (
        <div className="fixed top-20 left-0 right-0 z-50 mx-4 md:mx-auto max-w-xl bg-[#4A0E0E] text-[#F5F2ED] px-6 py-4 rounded-2xl shadow-lg text-center" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Backend API unavailable. Docker: ensure api container runs on port 8080. Local: <code className="bg-black/20 px-2 py-0.5 rounded">dotnet run</code> and set <code className="bg-black/20 px-2 py-0.5 rounded">VITE_API_URL=http://localhost:5000</code>.
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
        className="pt-32 pb-10 md:pt-40 md:pb-12"
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
                    fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                    fontWeight: 400,
                    lineHeight: 1.2,
                  }}
                >
                  The Knit Gallery
                </h1>
                <p
                  className="text-[#2D241E]/40 mt-0.5"
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.8rem" }}
                >
                  admin@knitgallery.com · Super Administrator
                </p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Products", value: products.length.toString(), color: "#2D241E" },
                { label: "Users", value: users.length.toString(), color: "#0A1128" },
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
        className="sticky z-30"
        style={{
          top: "80px",
          backgroundColor: "rgba(245,242,237,0.95)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(45,36,30,0.08)",
        }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="flex gap-8 overflow-x-auto scrollbar-hide">
            {([
              { key: "dashboard" as AdminTab, label: "Dashboard", icon: <LayoutDashboard size={14} /> },
              { key: "contents" as AdminTab, label: "Contents", icon: <ImagePlus size={14} /> },
              { key: "products" as AdminTab, label: "Products", icon: <Package size={14} /> },
              { key: "users" as AdminTab, label: "Users", icon: <Users size={14} /> },
              { key: "categories" as AdminTab, label: "Categories", icon: <Tag size={14} /> },
              { key: "countries" as AdminTab, label: "Countries", icon: <Globe size={14} /> },
              { key: "colors" as AdminTab, label: "Colors", icon: <Palette size={14} /> },
              { key: "sizes" as AdminTab, label: "Sizes", icon: <Tag size={14} /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="py-5 relative flex items-center gap-2 whitespace-nowrap transition-colors duration-300"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.12em",
                  color: activeTab === tab.key ? "#2D241E" : "rgba(45,36,30,0.4)",
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
                  { icon: <DollarSign size={20} />, label: "Est. Revenue", value: `€${totalRevenue.toLocaleString()}`, sub: "Based on sales data", color: "#2D6A4F" },
                  { icon: <ShoppingCart size={20} />, label: "Total Orders", value: "127", sub: "+12 this week", color: "#0A1128" },
                  { icon: <Package size={20} />, label: "Products", value: products.length.toString(), sub: `${lowStockCount} low stock`, color: lowStockCount > 0 ? "#9B6B2E" : "#2D241E" },
                  { icon: <UserCheck size={20} />, label: "Active Users", value: activeUsers.toString(), sub: `of ${users.length} total`, color: "#4A0E0E" },
                ].map((card, i) => (
                  <motion.div
                    key={card.label}
                    className="rounded-[24px] p-6"
                    style={{ backgroundColor: "#EDE9E2" }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07, duration: 0.5, ease: easing }}
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
                            <img src={p.colors[0].image} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>{p.name}</p>
                            <p className="text-[#2D241E]/40 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.category}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>€{p.price}</p>
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
              <div className="mb-8">
                <p
                  className="text-[#2D241E]/40 tracking-widest uppercase text-xs mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
                >
                  Website Content Management
                </p>
                <h2
                  className="text-[#2D241E]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 400 }}
                >
                  Contents
                </h2>
                <p className="text-[#2D241E]/50 text-sm mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Manage content blocks shown across the storefront sections.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { name: "Hero Section", status: "Coming soon" },
                  { name: "Collection Highlights", status: "Coming soon" },
                  { name: "Lookbook", status: "Coming soon" },
                  { name: "Best Sellers Carousel", status: "Active editor below" },
                ].map((section) => (
                  <div
                    key={section.name}
                    className="rounded-[20px] p-4"
                    style={{ backgroundColor: "#EDE9E2", border: "1px solid rgba(45,36,30,0.08)" }}
                  >
                    <p className="text-[#2D241E] text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {section.name}
                    </p>
                    <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                      {section.status}
                    </p>
                  </div>
                ))}
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
                        <div className="rounded-[18px] p-3.5" style={{ border: "1px solid rgba(45,36,30,0.09)", backgroundColor: "rgba(245,242,237,0.8)" }}>
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-[12px] overflow-hidden shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                              <img src={p.colors[0].image} alt={p.name} className="w-full h-full object-cover" />
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
                              €{p.price}
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
                              <div className="h-1.5 rounded-full mt-1.5" style={{ backgroundColor: "rgba(45,36,30,0.1)" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.max(8, Math.min(100, Math.round((p.stock / 100) * 100)))}%`,
                                    backgroundColor: p.stock < 10 ? "#9B6B2E" : "#2D241E",
                                  }}
                                />
                              </div>
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
                        style={{ gridTemplateColumns: "2fr 1fr 80px 80px 100px 80px 100px" }}
                      >
                        {/* Product */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[12px] overflow-hidden flex-shrink-0" style={{ backgroundColor: "#EDE9E2" }}>
                            <img src={p.colors[0].image} alt={p.name} className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#2D241E] truncate" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.88rem" }}>{p.name}</p>
                            <p className="text-[#2D241E]/40 text-xs truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.subtitle}</p>
                          </div>
                        </div>
                        {/* Category */}
                        <span className="text-[#2D241E]/60 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{p.category}</span>
                        {/* Price */}
                        <span className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "0.95rem" }}>€{p.price}</span>
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
                          {u.totalSpent > 0 ? `€${u.totalSpent.toLocaleString()}` : "—"}
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
                  onClick={() => setCategoryModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
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
                      <div key={c.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors" style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{c.name}</p>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setCategoryModal({ open: true, editing: c })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors" title="Edit"><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button onClick={() => setDeleteModal({ open: true, type: "category", id: String(c.id), idNum: c.id, name: c.name })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors" title="Delete"><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
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
                  onClick={() => setCountryModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
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
                      <div key={c.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors" style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{c.name}</p>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setCountryModal({ open: true, editing: c })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors" title="Edit"><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button onClick={() => setDeleteModal({ open: true, type: "country", id: String(c.id), idNum: c.id, name: c.name })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors" title="Delete"><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
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
                  onClick={() => setColorModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
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
                      <div key={c.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors" style={{ gridTemplateColumns: "1fr 1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{c.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full border" style={{ backgroundColor: c.hexCode || "#2D241E", borderColor: "rgba(45,36,30,0.2)" }} />
                          <span className="text-[#2D241E]/50 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{c.hexCode}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setColorModal({ open: true, editing: c })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors" title="Edit"><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button onClick={() => setDeleteModal({ open: true, type: "color", id: String(c.id), idNum: c.id, name: c.name })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors" title="Delete"><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                  onClick={() => setSizeModal({ open: true, editing: null })}
                  className="flex items-center gap-2 px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 flex-shrink-0"
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
                      <div key={s.id} className="grid items-center px-6 py-4 hover:bg-[#2D241E]/[0.02] transition-colors" style={{ gridTemplateColumns: "1fr 100px" }}>
                        <p className="text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>{s.name}</p>
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => setSizeModal({ open: true, editing: s })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2D241E]/8 transition-colors" title="Edit"><Pencil size={13} style={{ color: "#2D241E", opacity: 0.5 }} /></button>
                          <button onClick={() => setDeleteModal({ open: true, type: "size", id: String(s.id), idNum: s.id, name: s.name })} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#4A0E0E]/8 transition-colors" title="Delete"><Trash2 size={13} style={{ color: "#4A0E0E", opacity: 0.6 }} /></button>
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
            categories={categories}
            colors={colors}
            sizes={sizes}
            onClose={() => setProductModal({ open: false, editing: null })}
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
        {sizeModal.open && (
          <SizeModal editing={sizeModal.editing} onClose={() => setSizeModal({ open: false, editing: null })} onSave={handleSaveSize} />
        )}
        {deleteModal && (
          <DeleteModal
            key="delete-modal"
            name={deleteModal.name}
            onClose={() => setDeleteModal(null)}
            onConfirm={() => {
              if (deleteModal.type === "product") handleDeleteProduct();
              else if (deleteModal.type === "user") handleDeleteUser();
              else if (deleteModal.type === "category") handleDeleteCategory();
              else if (deleteModal.type === "country") handleDeleteCountry();
              else if (deleteModal.type === "color") handleDeleteColor();
              else if (deleteModal.type === "size") handleDeleteSize();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
