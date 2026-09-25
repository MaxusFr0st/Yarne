import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { Locale } from "../../i18n/config";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { uploadRawMediaFile } from "../../utils/uploadCropPair";
import { WHY_DEFAULT_IMAGES } from "../../utils/whyDefaultImages";
import {
  persistWhySectionContent,
  type WhyCare,
  type WhyItem,
  type WhySectionContent,
} from "../../utils/whySectionContent";
import { AdminLanguageSelect } from "./AdminLanguageSelect";

type SlotField = "images" | "backgrounds" | "productCodes";

const SLOT_LABELS = ["Photo 1", "Photo 2", "Photo 3"] as const;

const DM_SANS = { fontFamily: "'DM Sans', sans-serif" } as const;
const INPUT_CLASS =
  "w-full rounded-[12px] border bg-transparent px-3 py-2 text-[#2D241E] text-sm focus:outline-none";
const INPUT_STYLE = { borderColor: "rgba(45,36,30,0.12)", ...DM_SANS } as const;

type TextFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  rows?: number;
};

function TextField({ label, value, onChange, hint, rows }: TextFieldProps) {
  return (
    <div>
      <p
        className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5"
        style={{ ...DM_SANS, letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      {rows ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_CLASS} resize-y`}
          style={INPUT_STYLE}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
          style={INPUT_STYLE}
        />
      )}
      {hint ? (
        <p className="text-[#2D241E]/40 text-[11px] mt-1" style={DM_SANS}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type LinkableProduct = { id: string; name: string; sku?: string };

type AdminWhySectionEditorProps = {
  initialContent: WhySectionContent;
  /** Products a bag can link to. */
  products: LinkableProduct[];
  onSaved?: (content: WhySectionContent) => void;
  onError?: (message: string) => void;
};

export function AdminWhySectionEditor({ initialContent, products, onSaved, onError }: AdminWhySectionEditorProps) {
  const [draft, setDraft] = useState<WhySectionContent>(initialContent);
  const [savedContent, setSavedContent] = useState<WhySectionContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [activeLocale, setActiveLocale] = useState<Locale>("uk");
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    setDraft(initialContent);
    setSavedContent(initialContent);
  }, [initialContent]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedContent),
    [draft, savedContent]
  );

  const updateHeading = (value: string) => {
    setDraft((prev) => ({ ...prev, [activeLocale]: { ...prev[activeLocale], heading: value } }));
  };

  const updateItemField = (index: number, key: keyof WhyItem, value: string) => {
    setDraft((prev) => {
      const items = [...prev[activeLocale].items] as WhySectionContent["uk"]["items"];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, [activeLocale]: { ...prev[activeLocale], items } };
    });
  };

  const updateCareField = (key: "word" | "title" | "linkLabel", value: string) => {
    setDraft((prev) => {
      const care: WhyCare = { ...prev[activeLocale].care, [key]: value };
      return { ...prev, [activeLocale]: { ...prev[activeLocale], care } };
    });
  };

  const updateCareItem = (index: number, key: "title" | "body", value: string) => {
    setDraft((prev) => {
      const items = [...prev[activeLocale].care.items] as WhyCare["items"];
      items[index] = { ...items[index], [key]: value };
      const care: WhyCare = { ...prev[activeLocale].care, items };
      return { ...prev, [activeLocale]: { ...prev[activeLocale], care } };
    });
  };

  const setSlot = (field: SlotField, index: number, url: string) => {
    setDraft((prev) => {
      const next = [...prev[field]] as WhySectionContent[SlotField];
      next[index] = url;
      return { ...prev, [field]: next };
    });
  };

  const handleFile = async (field: SlotField, index: number, file: File) => {
    const key = `${field}-${index}`;
    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      setSlot(field, index, await uploadRawMediaFile(file));
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
      const input = inputRefs.current[key];
      if (input) input.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistWhySectionContent(draft);
      setDraft(persisted);
      setSavedContent(persisted);
      onSaved?.(persisted);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save Why Yarné section to server.");
    } finally {
      setSaving(false);
    }
  };

  const localeCopy = draft[activeLocale];

  return (
    <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div
        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}
      >
        <div>
          <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
            Why Yarné Section
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={DM_SANS}>
            Scroll-through section right after the hero: three bags, then Yarné Care. Photos and backgrounds are
            shared by both languages; all text is per language. A slot without a background reuses its
            neighbour's.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-[#2D241E]/55 text-xs" style={DM_SANS}>
            Language:
          </label>
          <AdminLanguageSelect value={activeLocale} onChange={setActiveLocale} />
          {!isDirty && !saving ? (
            <span className="text-[#2D241E]/45 text-xs" style={DM_SANS}>
              Saved
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              ...DM_SANS,
              letterSpacing: "0.1em",
              backgroundColor: "#2D241E",
              color: "#F5F2ED",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        <TextField
          label="Heading"
          value={localeCopy.heading}
          onChange={updateHeading}
          hint="Small uppercase line above the large product name."
        />

        <div className="grid md:grid-cols-3 gap-5">
          {SLOT_LABELS.map((label, i) => {
            const custom = resolveMediaUrl(draft.images[i]);
            const preview = custom || WHY_DEFAULT_IMAGES[i];
            const isUploading = Boolean(uploading[`images-${i}`]);
            const bg = resolveMediaUrl(draft.backgrounds[i]);
            const bgUploading = Boolean(uploading[`backgrounds-${i}`]);
            const item = localeCopy.items[i];
            return (
              <div
                key={label}
                className="rounded-[20px] p-4"
                style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
              >
                <p className="text-[#2D241E] uppercase tracking-widest text-xs mb-3" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
                  {label}
                </p>
                <div
                  className="relative w-full overflow-hidden rounded-[16px] mb-3 flex items-center justify-center"
                  style={{ aspectRatio: "1 / 1", backgroundColor: "#F1ECE4", border: "1px solid rgba(45,36,30,0.08)" }}
                >
                  <img src={preview} alt="" className="w-full h-full object-contain" />
                  {!custom && (
                    <span
                      className="absolute left-2 top-2 text-[9px] uppercase tracking-widest px-2 py-1 rounded-full"
                      style={{ color: "rgba(45,36,30,0.55)", backgroundColor: "rgba(245,242,237,0.85)", ...DM_SANS }}
                    >
                      Default photo
                    </span>
                  )}
                </div>
                <label
                  className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...DM_SANS, fontSize: "0.7rem", letterSpacing: "0.12em" }}
                >
                  <ImagePlus size={13} />
                  <span className="uppercase tracking-widest">{isUploading ? "Uploading…" : "Upload"}</span>
                  <input
                    ref={(el) => { inputRefs.current[`images-${i}`] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile("images", i, file);
                    }}
                  />
                </label>
                {draft.images[i].trim() && (
                  <button
                    type="button"
                    onClick={() => setSlot("images", i, "")}
                    className="mt-2 w-full text-xs uppercase tracking-widest text-[#4A0E0E] hover:opacity-80"
                    style={{ ...DM_SANS, letterSpacing: "0.1em" }}
                  >
                    Reset to default photo
                  </button>
                )}

                <p
                  className="mt-4 text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5"
                  style={{ ...DM_SANS, letterSpacing: "0.1em" }}
                >
                  Background
                </p>
                <div
                  className="relative w-full overflow-hidden rounded-[16px] mb-3 flex items-center justify-center"
                  style={{
                    aspectRatio: "16 / 10",
                    backgroundColor: "#F1ECE4",
                    backgroundImage: bg ? `url("${bg}")` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    border: "1px solid rgba(45,36,30,0.08)",
                  }}
                >
                  {!bg && (
                    <span className="text-[#2D241E]/40 text-[11px]" style={DM_SANS}>
                      No background
                    </span>
                  )}
                </div>
                <label
                  className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${bgUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...DM_SANS, fontSize: "0.7rem", letterSpacing: "0.12em" }}
                >
                  <ImagePlus size={13} />
                  <span className="uppercase tracking-widest">{bgUploading ? "Uploading…" : "Upload background"}</span>
                  <input
                    ref={(el) => { inputRefs.current[`backgrounds-${i}`] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={bgUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile("backgrounds", i, file);
                    }}
                  />
                </label>
                {draft.backgrounds[i].trim() && (
                  <button
                    type="button"
                    onClick={() => setSlot("backgrounds", i, "")}
                    className="mt-2 w-full text-xs uppercase tracking-widest text-[#4A0E0E] hover:opacity-80"
                    style={{ ...DM_SANS, letterSpacing: "0.1em" }}
                  >
                    Remove background
                  </button>
                )}

                <div className="mt-4">
                  <p
                    className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5"
                    style={{ ...DM_SANS, letterSpacing: "0.1em" }}
                  >
                    Linked product
                  </p>
                  <select
                    value={draft.productCodes[i]}
                    onChange={(e) => setSlot("productCodes", i, e.target.value)}
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                  >
                    <option value="">— Not linked —</option>
                    {draft.productCodes[i] && !products.some((p) => p.id === draft.productCodes[i]) && (
                      <option value={draft.productCodes[i]}>Missing product ({draft.productCodes[i]})</option>
                    )}
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.sku ? ` (${product.sku})` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-[#2D241E]/40 text-[11px] mt-1" style={DM_SANS}>
                    {draft.productCodes[i]
                      ? `Clicking the bag or "View product" opens /product/${draft.productCodes[i]}`
                      : "The bag is not clickable."}
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <TextField
                    label="Product name"
                    value={item.word}
                    onChange={(v) => updateItemField(i, "word", v)}
                    hint="Large display name."
                  />
                  <TextField
                    label="Fact title"
                    value={item.factTitle}
                    onChange={(v) => updateItemField(i, "factTitle", v)}
                  />
                  <TextField
                    label="Fact body"
                    value={item.factBody}
                    onChange={(v) => updateItemField(i, "factBody", v)}
                    rows={3}
                  />
                  <TextField
                    label="Photo description"
                    value={item.caption}
                    onChange={(v) => updateItemField(i, "caption", v)}
                    hint="Not shown on screen; read out by screen readers."
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="rounded-[20px] p-4"
          style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
        >
          <p className="text-[#2D241E] uppercase tracking-widest text-xs mb-1" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
            Yarné Care
          </p>
          <p className="text-[#2D241E]/45 text-xs mb-4" style={DM_SANS}>
            The closing step after the third bag. It reuses the last photo.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            <TextField
              label="Display name"
              value={localeCopy.care.word}
              onChange={(v) => updateCareField("word", v)}
              hint="Large display name."
            />
            <TextField
              label="Link label"
              value={localeCopy.care.linkLabel}
              onChange={(v) => updateCareField("linkLabel", v)}
              hint="Links to the care terms page (desktop only)."
            />
          </div>
          <div className="mt-3">
            <TextField label="Title" value={localeCopy.care.title} onChange={(v) => updateCareField("title", v)} />
          </div>
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            {localeCopy.care.items.map((careItem, j) => (
              <div key={j} className="space-y-3">
                <TextField
                  label={`Promise ${j + 1} title`}
                  value={careItem.title}
                  onChange={(v) => updateCareItem(j, "title", v)}
                />
                <TextField
                  label={`Promise ${j + 1} text`}
                  value={careItem.body}
                  onChange={(v) => updateCareItem(j, "body", v)}
                  rows={2}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
