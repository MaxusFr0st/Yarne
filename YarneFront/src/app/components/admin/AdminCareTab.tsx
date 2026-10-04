import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Copy, ExternalLink, ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { Locale } from "../../i18n/config";
import { CropCancelledError, useCropDialog } from "../../hooks/useCropDialog";
import {
  CARE_ICONS,
  CARE_LIMITS,
  emptyL10n,
  loadCareContent,
  persistCareContent,
  slugify,
  type CareContent,
  type CareIcon,
  type CareMaterial,
  type CareTopic,
  type L10n,
} from "../../utils/careContent";
import { CARE_SEED } from "../../utils/careSeed";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { uploadCroppedWithOriginal } from "../../utils/uploadCropPair";
import { CareTopicIcon } from "../care/careUi";
import { AdminLanguageSelect } from "./AdminLanguageSelect";
import { AdminModalCancelButton, AdminModalPrimaryButton, AdminModalShell } from "./AdminModalShell";

export type AdminCareProduct = { id: string; name: string; sku?: string; photo?: string };

type Props = {
  /** Products a material can list as its pieces. */
  products: AdminCareProduct[];
  onError?: (message: string) => void;
};

const DM_SANS = { fontFamily: "'DM Sans', sans-serif" } as const;
const INPUT_CLASS = "w-full rounded-[12px] border bg-transparent px-3 py-2 text-[#2D241E] text-sm focus:outline-none focus:border-[#2D241E]/40";
const INPUT_STYLE = { borderColor: "rgba(45,36,30,0.12)", ...DM_SANS } as const;
const CARD_STYLE = { backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" } as const;
const ICON_BUTTON =
  "w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[#2D241E]/60 hover:text-[#2D241E] hover:bg-[#2D241E]/8 disabled:opacity-25 disabled:pointer-events-none cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/30";
const TILE_ASPECT = 4 / 3;

const ICON_LABELS: Record<CareIcon, string> = {
  bag: "Bag (carrying)",
  brush: "Brush (cleaning)",
  drop: "Drop (washing)",
  wind: "Wind (drying)",
  box: "Box (storing)",
  sun: "Sun (sun and shape)",
  pilling: "Dots (pilling)",
};

const OTHER: Record<Locale, Locale> = { en: "uk", uk: "en" };

function newTopic(): CareTopic {
  return {
    id: "", // set from the English title on save, then kept (it is the ?topic= in the guide's link)
    icon: "bag",
    title: emptyL10n(),
    summary: emptyL10n(),
    heading: emptyL10n(),
    warning: emptyL10n(),
    need: [],
    steps: [emptyL10n()],
    pieceNotes: {},
  };
}

function newMaterial(): CareMaterial {
  return {
    id: "",
    slug: "",
    name: emptyL10n(),
    heroTitle: emptyL10n(),
    heroSubtitle: emptyL10n(),
    intro: emptyL10n(),
    tileImageUrl: null,
    pieceProductIds: [],
    topics: [],
    dos: [],
    donts: [],
    questions: [],
  };
}

function moved<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5" style={{ ...DM_SANS, letterSpacing: "0.1em" }}>
      {children}
    </p>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return (
    <p className="text-[#2D241E]/40 text-[11px] mt-1" style={DM_SANS}>
      {children}
    </p>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
        {title}
      </p>
      {note ? (
        <p className="text-[#2D241E]/45 text-xs mt-1" style={DM_SANS}>
          {note}
        </p>
      ) : null}
    </div>
  );
}

type L10nFieldProps = {
  label?: string;
  value: L10n;
  locale: Locale;
  onChange: (value: L10n) => void;
  rows?: number;
  hint?: string;
  maxLength: number;
};

/** One language at a time; the other language's text shows as the placeholder (it is the fallback on the site). */
function L10nField({ label, value, locale, onChange, rows, hint, maxLength }: L10nFieldProps) {
  const shared = {
    value: value[locale],
    placeholder: value[OTHER[locale]],
    maxLength,
    className: `${INPUT_CLASS} ${rows ? "resize-y" : ""} placeholder:text-[#2D241E]/30`,
    style: INPUT_STYLE,
  };
  return (
    <div className="grow min-w-0">
      {label ? <Label>{label}</Label> : null}
      {rows ? (
        <textarea rows={rows} {...shared} onChange={(e) => onChange({ ...value, [locale]: e.target.value })} />
      ) : (
        <input type="text" {...shared} onChange={(e) => onChange({ ...value, [locale]: e.target.value })} />
      )}
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}

type L10nListProps = {
  label: string;
  items: L10n[];
  locale: Locale;
  onChange: (items: L10n[]) => void;
  max: number;
  addLabel: string;
  rows?: number;
  maxLength: number;
  numbered?: boolean;
};

function L10nList({ label, items, locale, onChange, max, addLabel, rows, maxLength, numbered }: L10nListProps) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-1.5">
            {numbered ? (
              <span className="w-6 pt-2 text-right text-[#2D241E]/45 text-xs shrink-0" style={DM_SANS}>
                {index + 1}.
              </span>
            ) : null}
            <L10nField
              value={item}
              locale={locale}
              rows={rows}
              maxLength={maxLength}
              onChange={(value) => onChange(items.map((existing, i) => (i === index ? value : existing)))}
            />
            <button type="button" className={ICON_BUTTON} aria-label="Move up" disabled={index === 0} onClick={() => onChange(moved(items, index, -1))}>
              <ArrowUp size={14} />
            </button>
            <button type="button" className={ICON_BUTTON} aria-label="Move down" disabled={index === items.length - 1} onClick={() => onChange(moved(items, index, 1))}>
              <ArrowDown size={14} />
            </button>
            <button type="button" className={ICON_BUTTON} aria-label="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {items.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...items, emptyL10n()])}
          className="mt-2 inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-[#2D241E]/70 hover:text-[#2D241E] cursor-pointer"
          style={{ ...DM_SANS, letterSpacing: "0.1em" }}
        >
          <Plus size={13} /> {addLabel}
        </button>
      ) : null}
    </div>
  );
}

function PillButton({ onClick, children, disabled, tone = "outline" }: { onClick: () => void; children: ReactNode; disabled?: boolean; tone?: "outline" | "ink" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${tone === "outline" ? "border text-[#2D241E]/75" : ""}`}
      style={{
        ...DM_SANS,
        letterSpacing: "0.1em",
        ...(tone === "ink" ? { backgroundColor: "#2D241E", color: "#F5F2ED" } : { borderColor: "rgba(45,36,30,0.2)" }),
      }}
    >
      {children}
    </button>
  );
}

type Confirm = { title: string; body: string; action: string; run: () => void };

/**
 * Admin → Care: everything the Yarné Care pages show. Materials (their order, photo and texts),
 * the pieces made of each one, and each material's topics with their steps and per-piece notes.
 */
export function AdminCareTab({ products, onError }: Props) {
  const [draft, setDraft] = useState<CareContent>(CARE_SEED);
  const [saved, setSaved] = useState<CareContent>(CARE_SEED);
  /** False while the site still shows the built-in guide: nothing has been saved yet. */
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [locale, setLocale] = useState<Locale>("uk");
  const [selected, setSelected] = useState(0);
  const [openTopic, setOpenTopic] = useState<number | null>(null);
  const [pieceQuery, setPieceQuery] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { promptCropForUpload, cropDialogNode, cropBusy } = useCropDialog();

  useEffect(() => {
    let cancelled = false;
    void loadCareContent()
      .then((loaded) => {
        if (cancelled) return;
        setPublished(loaded != null);
        setDraft(loaded ?? CARE_SEED);
        setSaved(loaded ?? CARE_SEED);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const productsById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);

  const material: CareMaterial | undefined = draft.materials[selected];

  const setMaterials = (change: (materials: CareMaterial[]) => CareMaterial[]) =>
    setDraft((prev) => ({ ...prev, materials: change(prev.materials) }));
  const updateMaterial = (change: (current: CareMaterial) => CareMaterial) =>
    setMaterials((materials) => materials.map((item, index) => (index === selected ? change(item) : item)));
  const patchMaterial = (patch: Partial<CareMaterial>) => updateMaterial((current) => ({ ...current, ...patch }));
  const patchTopic = (topicIndex: number, patch: Partial<CareTopic>) =>
    updateMaterial((current) => ({
      ...current,
      topics: current.topics.map((topic, index) => (index === topicIndex ? { ...topic, ...patch } : topic)),
    }));

  const selectMaterial = (index: number) => {
    setSelected(index);
    setOpenTopic(null);
    setPieceQuery("");
  };

  const handleSave = async () => {
    if (draft.materials.some((item) => !item.name.en.trim() && !item.name.uk.trim())) {
      onError?.("Every material needs a name before saving.");
      return;
    }
    setSaving(true);
    try {
      const persisted = await persistCareContent(draft);
      setDraft(persisted);
      setSaved(persisted);
      setPublished(true);
      setSelected((index) => Math.min(index, Math.max(0, persisted.materials.length - 1)));
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save the care guide to the server.");
    } finally {
      setSaving(false);
    }
  };

  const handleTileFile = async (file: File) => {
    setUploading(true);
    try {
      const { croppedFile, originalFile } = await promptCropForUpload(file, {
        title: "Crop material photo",
        aspect: TILE_ASPECT,
        hintText: "Shown 4:3 on the desktop tile; phones show its centre in a tall thumbnail.",
      });
      const { displayUrl } = await uploadCroppedWithOriginal(croppedFile, originalFile);
      patchMaterial({ tileImageUrl: displayUrl });
    } catch (e) {
      if (!(e instanceof CropCancelledError)) onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] p-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
        <p className="text-[#2D241E]/45 text-sm" style={DM_SANS}>
          Loading the care guide…
        </p>
      </div>
    );
  }

  const linkedElsewhere = (productId: string) =>
    draft.materials.find((item, index) => index !== selected && item.pieceProductIds.includes(productId));
  const query = pieceQuery.trim().toLowerCase();
  const candidates = material
    ? products
        .filter((product) => !material.pieceProductIds.includes(product.id))
        .filter((product) => !query || product.name.toLowerCase().includes(query) || (product.sku ?? "").toLowerCase().includes(query))
        .slice(0, 8)
    : [];
  const savedSlug = material ? saved.materials.find((item) => item.id !== "" && item.id === material.id)?.slug : undefined;

  return (
    <div>
      {/* Header: language, state, save */}
      <div className="rounded-[28px] overflow-hidden mb-6" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
        <div
          className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
          style={{ backgroundColor: "rgba(45,36,30,0.03)" }}
        >
          <div>
            <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
              Yarné Care
            </p>
            <p className="text-[#2D241E]/45 text-xs mt-1 max-w-2xl" style={DM_SANS}>
              The /pages/care section: one guide per material. Add a material, link the pieces made of it, then write its
              topics. Texts are per language; a text left empty in one language shows the other language on the site.
              {published ? "" : " The site currently shows the built-in guide below — Save to publish your own."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <label className="text-[#2D241E]/55 text-xs" style={DM_SANS}>
              Language:
            </label>
            <AdminLanguageSelect value={locale} onChange={setLocale} />
            <a
              href={`/${locale}/pages/care`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#2D241E]/70 hover:text-[#2D241E] underline underline-offset-2"
              style={DM_SANS}
            >
              Open on site <ExternalLink size={12} />
            </a>
            <span className={`text-xs ${isDirty ? "text-[#9B6B2E]" : "text-[#2D241E]/45"}`} style={DM_SANS}>
              {isDirty ? "Unsaved changes" : "Saved"}
            </span>
            <PillButton tone="ink" onClick={() => void handleSave()} disabled={(!isDirty && published) || saving || uploading}>
              {saving ? "Saving…" : "Save"}
            </PillButton>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        {/* Materials */}
        <div className="rounded-[24px] p-4 lg:sticky lg:top-[calc(var(--main-header-h)+4.5rem)]" style={CARD_STYLE}>
          <SectionTitle title="Materials" note="Order here is the order on the site." />
          <div className="space-y-1.5">
            {draft.materials.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-1 rounded-[14px] pl-3 pr-1 py-1.5"
                style={{
                  backgroundColor: index === selected ? "#2D241E" : "transparent",
                  color: index === selected ? "#F5F2ED" : "#2D241E",
                  border: "1px solid rgba(45,36,30,0.08)",
                }}
              >
                <button type="button" onClick={() => selectMaterial(index)} className="grow min-w-0 text-left cursor-pointer py-1" style={DM_SANS}>
                  <span className="block text-sm truncate">{item.name[locale] || item.name[OTHER[locale]] || "Untitled material"}</span>
                  <span className="block text-[11px] opacity-60">
                    {item.pieceProductIds.length} pieces · {item.topics.length} topics
                  </span>
                </button>
                <button
                  type="button"
                  className={`${ICON_BUTTON} ${index === selected ? "!text-[#F5F2ED]/70 hover:!text-[#F5F2ED]" : ""}`}
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => {
                    setMaterials((materials) => moved(materials, index, -1));
                    if (selected === index) setSelected(index - 1);
                    else if (selected === index - 1) setSelected(index);
                  }}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className={`${ICON_BUTTON} ${index === selected ? "!text-[#F5F2ED]/70 hover:!text-[#F5F2ED]" : ""}`}
                  aria-label="Move down"
                  disabled={index === draft.materials.length - 1}
                  onClick={() => {
                    setMaterials((materials) => moved(materials, index, 1));
                    if (selected === index) setSelected(index + 1);
                    else if (selected === index + 1) setSelected(index);
                  }}
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            ))}
            {draft.materials.length === 0 ? (
              <p className="text-[#2D241E]/45 text-xs py-2" style={DM_SANS}>
                No materials yet.
              </p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <PillButton
              disabled={draft.materials.length >= CARE_LIMITS.materials}
              onClick={() => {
                setMaterials((materials) => [...materials, newMaterial()]);
                selectMaterial(draft.materials.length);
              }}
            >
              <Plus size={13} /> Add material
            </PillButton>
            <button
              type="button"
              className="text-[11px] text-[#2D241E]/50 hover:text-[#2D241E] underline underline-offset-2 cursor-pointer"
              style={DM_SANS}
              onClick={() =>
                setConfirm({
                  title: "Load the built-in guide?",
                  body: "This replaces everything in this editor with the built-in Raffia and Cotton yarn guides (no pieces linked). Nothing changes on the site until you press Save.",
                  action: "Load",
                  run: () => {
                    setDraft(CARE_SEED);
                    selectMaterial(0);
                  },
                })
              }
            >
              Load the built-in guide
            </button>
          </div>
        </div>

        {/* Selected material */}
        {material ? (
          <div className="space-y-6 min-w-0">
            <div className="rounded-[24px] p-5" style={CARD_STYLE}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <SectionTitle title="Material" note="Name, link and the texts at the top of its guide." />
                <div className="flex flex-wrap items-center gap-2">
                  {savedSlug ? (
                    <a
                      href={`/${locale}/pages/care/${savedSlug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#2D241E]/70 hover:text-[#2D241E] underline underline-offset-2 mr-1"
                      style={DM_SANS}
                      title="Opens the saved version"
                    >
                      Open on site <ExternalLink size={12} />
                    </a>
                  ) : null}
                  <PillButton
                    disabled={draft.materials.length >= CARE_LIMITS.materials}
                    onClick={() => {
                      const copy: CareMaterial = {
                        ...material,
                        id: "",
                        slug: "",
                        name: { en: material.name.en ? `${material.name.en} copy` : "", uk: material.name.uk ? `${material.name.uk} (копія)` : "" },
                        pieceProductIds: [],
                        topics: material.topics.map((topic) => ({ ...topic, pieceNotes: {} })),
                      };
                      setMaterials((materials) => [...materials, copy]);
                      selectMaterial(draft.materials.length);
                    }}
                  >
                    <Copy size={13} /> Duplicate
                  </PillButton>
                  <PillButton
                    onClick={() =>
                      setConfirm({
                        title: "Delete this material?",
                        body: `"${material.name[locale] || material.name[OTHER[locale]] || "Untitled material"}", its topics and its piece notes will be removed. Its page stops existing once you save.`,
                        action: "Delete",
                        run: () => {
                          setMaterials((materials) => materials.filter((_, index) => index !== selected));
                          selectMaterial(Math.max(0, selected - 1));
                        },
                      })
                    }
                  >
                    <Trash2 size={13} /> Delete
                  </PillButton>
                </div>
              </div>

              <div className="grid md:grid-cols-[220px_minmax(0,1fr)] gap-5 mt-2">
                <div>
                  <Label>Photo</Label>
                  <div
                    className="relative w-full overflow-hidden rounded-[16px] mb-3 flex items-center justify-center"
                    style={{ aspectRatio: "4 / 3", backgroundColor: "#EDE9E2", border: "1px solid rgba(45,36,30,0.08)" }}
                  >
                    {material.tileImageUrl ? (
                      <img src={resolveMediaUrl(material.tileImageUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[#2D241E]/40 text-[11px]" style={DM_SANS}>
                        No photo
                      </span>
                    )}
                  </div>
                  <label
                    className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${uploading || cropBusy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...DM_SANS, fontSize: "0.7rem", letterSpacing: "0.12em" }}
                  >
                    <ImagePlus size={13} />
                    <span className="uppercase tracking-widest">{uploading ? "Uploading…" : "Upload"}</span>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading || cropBusy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleTileFile(file);
                      }}
                    />
                  </label>
                  {material.tileImageUrl ? (
                    <button
                      type="button"
                      onClick={() => patchMaterial({ tileImageUrl: null })}
                      className="mt-2 w-full text-xs uppercase tracking-widest text-[#4A0E0E] hover:opacity-80 cursor-pointer"
                      style={{ ...DM_SANS, letterSpacing: "0.1em" }}
                    >
                      Remove photo
                    </button>
                  ) : null}
                  <Hint>The material's tile on the care page. Shared by both languages.</Hint>
                </div>

                <div className="space-y-3 min-w-0">
                  <div className="grid md:grid-cols-2 gap-3">
                    <L10nField
                      label="Name"
                      value={material.name}
                      locale={locale}
                      maxLength={CARE_LIMITS.short}
                      onChange={(name) =>
                        updateMaterial((current) => ({
                          ...current,
                          name,
                          // A new material's link follows its English name until edited by hand;
                          // a saved one keeps its link, which may already be shared.
                          slug: current.id === "" && current.slug === slugify(current.name.en) ? slugify(name.en) : current.slug,
                        }))
                      }
                    />
                    <div>
                      <Label>Link</Label>
                      <input
                        type="text"
                        value={material.slug}
                        onChange={(e) => patchMaterial({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                        className={INPUT_CLASS}
                        style={INPUT_STYLE}
                        maxLength={60}
                      />
                      <Hint>/pages/care/{slugify(material.slug) || "…"} — filled from the English name for a new material. Changing it later breaks links already shared.</Hint>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <L10nField label="Guide title" value={material.heroTitle} locale={locale} maxLength={CARE_LIMITS.short} onChange={(heroTitle) => patchMaterial({ heroTitle })} hint='First line, e.g. "Caring for raffia".' />
                    <L10nField label="Guide subtitle" value={material.heroSubtitle} locale={locale} maxLength={CARE_LIMITS.short} onChange={(heroSubtitle) => patchMaterial({ heroSubtitle })} hint="Italic second line; also the tagline in the phone's material list." />
                  </div>
                  <L10nField label="Intro" value={material.intro} locale={locale} rows={3} maxLength={CARE_LIMITS.long} onChange={(intro) => patchMaterial({ intro })} />
                </div>
              </div>
            </div>

            {/* Pieces */}
            <div className="rounded-[24px] p-5" style={CARD_STYLE}>
              <SectionTitle
                title="Pieces made of this material"
                note="Shown as the Pieces note and in “Which piece is yours?”. Names come from the products, so renames follow automatically. A product page links to the guide of the first material that lists it."
              />
              <div className="space-y-1.5">
                {material.pieceProductIds.map((productId, index) => {
                  const product = productsById.get(productId);
                  return (
                    <div key={productId} className="flex items-center gap-2 rounded-[14px] px-2 py-1.5" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
                      <span className="w-9 h-11 shrink-0 rounded-[8px] overflow-hidden bg-[#EDE9E2]">
                        {product?.photo ? <img src={resolveMediaUrl(product.photo)} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
                      </span>
                      <span className="grow min-w-0 text-sm truncate" style={{ ...DM_SANS, color: product ? "#2D241E" : "#B42318" }}>
                        {product ? product.name : `Missing product (${productId}) — hidden on the site`}
                        {product?.sku ? <span className="text-[#2D241E]/40"> · {product.sku}</span> : null}
                      </span>
                      <button type="button" className={ICON_BUTTON} aria-label="Move up" disabled={index === 0} onClick={() => patchMaterial({ pieceProductIds: moved(material.pieceProductIds, index, -1) })}>
                        <ArrowUp size={14} />
                      </button>
                      <button type="button" className={ICON_BUTTON} aria-label="Move down" disabled={index === material.pieceProductIds.length - 1} onClick={() => patchMaterial({ pieceProductIds: moved(material.pieceProductIds, index, 1) })}>
                        <ArrowDown size={14} />
                      </button>
                      <button
                        type="button"
                        className={ICON_BUTTON}
                        aria-label="Unlink"
                        onClick={() =>
                          updateMaterial((current) => ({
                            ...current,
                            pieceProductIds: current.pieceProductIds.filter((id) => id !== productId),
                            topics: current.topics.map((topic) => {
                              const { [productId]: _removed, ...pieceNotes } = topic.pieceNotes;
                              return { ...topic, pieceNotes };
                            }),
                          }))
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {material.pieceProductIds.length === 0 ? (
                  <p className="text-[#2D241E]/45 text-xs" style={DM_SANS}>
                    No pieces linked yet. Find a product below to link it.
                  </p>
                ) : null}
              </div>

              <div className="mt-4">
                <Label>Link a product</Label>
                <input
                  type="search"
                  value={pieceQuery}
                  onChange={(e) => setPieceQuery(e.target.value)}
                  placeholder="Search products by name or SKU"
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                />
                <div className="mt-2 grid sm:grid-cols-2 gap-1.5">
                  {candidates.map((product) => {
                    const elsewhere = linkedElsewhere(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={material.pieceProductIds.length >= CARE_LIMITS.pieces}
                        onClick={() => patchMaterial({ pieceProductIds: [...material.pieceProductIds, product.id] })}
                        className="flex items-center gap-2 rounded-[14px] px-2 py-1.5 text-left cursor-pointer hover:bg-[#2D241E]/5 transition-colors disabled:opacity-40"
                        style={{ border: "1px dashed rgba(45,36,30,0.18)" }}
                      >
                        <span className="w-9 h-11 shrink-0 rounded-[8px] overflow-hidden bg-[#EDE9E2]">
                          {product.photo ? <img src={resolveMediaUrl(product.photo)} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
                        </span>
                        <span className="grow min-w-0" style={DM_SANS}>
                          <span className="block text-sm text-[#2D241E] truncate">{product.name}</span>
                          {elsewhere ? (
                            <span className="block text-[11px] text-[#9B6B2E] truncate">
                              Also in {elsewhere.name[locale] || elsewhere.name[OTHER[locale]] || "another material"}
                            </span>
                          ) : null}
                        </span>
                        <Plus size={14} className="shrink-0 text-[#2D241E]/60" />
                      </button>
                    );
                  })}
                </div>
                {candidates.length === 0 ? (
                  <Hint>{query ? "No products match." : "Every product is already linked to this material."}</Hint>
                ) : null}
              </div>
            </div>

            {/* Topics */}
            <div className="rounded-[24px] p-5" style={CARD_STYLE}>
              <SectionTitle title="Topics" note="Each topic is a card on the guide that opens its step-by-step panel." />
              <div className="space-y-2">
                {material.topics.map((topic, index) => {
                  const isOpen = openTopic === index;
                  return (
                    <div key={index} className="rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.1)", backgroundColor: "#F5F2ED" }}>
                      <div className="flex items-center gap-1 pl-3 pr-1 py-1.5">
                        <button
                          type="button"
                          onClick={() => setOpenTopic(isOpen ? null : index)}
                          aria-expanded={isOpen}
                          className="grow min-w-0 flex items-center gap-3 text-left cursor-pointer py-1 text-[#2D241E]"
                          style={DM_SANS}
                        >
                          <CareTopicIcon icon={topic.icon} size={18} />
                          <span className="grow min-w-0">
                            <span className="block text-sm truncate">{topic.title[locale] || topic.title[OTHER[locale]] || "Untitled topic"}</span>
                            <span className="block text-[11px] text-[#2D241E]/50">
                              {topic.steps.length} steps · {Object.keys(topic.pieceNotes).length} piece notes
                            </span>
                          </span>
                          <ChevronDown size={16} className={`shrink-0 text-[#2D241E]/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          aria-label="Move up"
                          disabled={index === 0}
                          onClick={() => {
                            patchMaterial({ topics: moved(material.topics, index, -1) });
                            setOpenTopic(isOpen ? index - 1 : null);
                          }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          aria-label="Move down"
                          disabled={index === material.topics.length - 1}
                          onClick={() => {
                            patchMaterial({ topics: moved(material.topics, index, 1) });
                            setOpenTopic(isOpen ? index + 1 : null);
                          }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          className={ICON_BUTTON}
                          aria-label="Delete topic"
                          onClick={() =>
                            setConfirm({
                              title: "Delete this topic?",
                              body: `"${topic.title[locale] || topic.title[OTHER[locale]] || "Untitled topic"}", its steps and its piece notes will be removed.`,
                              action: "Delete",
                              run: () => {
                                patchMaterial({ topics: material.topics.filter((_, i) => i !== index) });
                                setOpenTopic(null);
                              },
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {isOpen ? (
                        <div className="px-4 pb-4 pt-2 space-y-4" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
                          <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-3">
                            <div>
                              <Label>Icon</Label>
                              <select value={topic.icon} onChange={(e) => patchTopic(index, { icon: e.target.value as CareIcon })} className={`${INPUT_CLASS} cursor-pointer`} style={INPUT_STYLE}>
                                {CARE_ICONS.map((icon) => (
                                  <option key={icon} value={icon}>
                                    {ICON_LABELS[icon]}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <L10nField label="Card title" value={topic.title} locale={locale} maxLength={CARE_LIMITS.short} onChange={(title) => patchTopic(index, { title })} hint='Short, e.g. "Cleaning".' />
                          </div>
                          <L10nField label="Card summary" value={topic.summary} locale={locale} rows={2} maxLength={CARE_LIMITS.long} onChange={(summary) => patchTopic(index, { summary })} hint="One or two sentences on the card." />
                          <L10nField label="Panel heading" value={topic.heading} locale={locale} maxLength={CARE_LIMITS.short} onChange={(heading) => patchTopic(index, { heading })} hint='E.g. "How to clean raffia". Empty: the card title is used.' />
                          <L10nField label="Before you start (warning)" value={topic.warning} locale={locale} rows={2} maxLength={CARE_LIMITS.long} onChange={(warning) => patchTopic(index, { warning })} hint="Applies to every piece. Empty: no warning box." />
                          <L10nList label="You'll need" items={topic.need} locale={locale} max={CARE_LIMITS.need} addLabel="Add item" maxLength={CARE_LIMITS.short} onChange={(need) => patchTopic(index, { need })} />
                          <L10nList label="Steps" items={topic.steps} locale={locale} max={CARE_LIMITS.steps} addLabel="Add step" rows={2} maxLength={CARE_LIMITS.long} numbered onChange={(steps) => patchTopic(index, { steps })} />

                          <div>
                            <Label>Piece notes</Label>
                            {material.pieceProductIds.length === 0 ? (
                              <Hint>Link pieces to this material to write a note that shows only for one of them.</Hint>
                            ) : (
                              <div className="space-y-2">
                                {material.pieceProductIds.map((productId) => (
                                  <div key={productId} className="grid md:grid-cols-[180px_minmax(0,1fr)] gap-2 items-start">
                                    <span className="text-sm text-[#2D241E] pt-2 truncate" style={DM_SANS}>
                                      {productsById.get(productId)?.name ?? `Missing product (${productId})`}
                                    </span>
                                    <L10nField
                                      value={topic.pieceNotes[productId] ?? emptyL10n()}
                                      locale={locale}
                                      rows={2}
                                      maxLength={CARE_LIMITS.long}
                                      onChange={(note) => patchTopic(index, { pieceNotes: { ...topic.pieceNotes, [productId]: note } })}
                                    />
                                  </div>
                                ))}
                                <Hint>Optional. Shown as “Only for …” when the visitor has chosen that piece; leave empty when nothing differs.</Hint>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
                {material.topics.length === 0 ? (
                  <p className="text-[#2D241E]/45 text-xs" style={DM_SANS}>
                    No topics yet.
                  </p>
                ) : null}
              </div>
              {material.topics.length < CARE_LIMITS.topics ? (
                <div className="mt-3">
                  <PillButton
                    onClick={() => {
                      patchMaterial({ topics: [...material.topics, newTopic()] });
                      setOpenTopic(material.topics.length);
                    }}
                  >
                    <Plus size={13} /> Add topic
                  </PillButton>
                </div>
              ) : null}
            </div>

            {/* Do / Don't */}
            <div className="rounded-[24px] p-5" style={CARD_STYLE}>
              <SectionTitle title="Do and don't" note="Two short lists under the topics. Leave both empty to hide the section." />
              <div className="grid md:grid-cols-2 gap-5">
                <L10nList label="Do" items={material.dos} locale={locale} max={CARE_LIMITS.dos} addLabel="Add line" maxLength={CARE_LIMITS.short} onChange={(dos) => patchMaterial({ dos })} />
                <L10nList label="Don't" items={material.donts} locale={locale} max={CARE_LIMITS.dos} addLabel="Add line" maxLength={CARE_LIMITS.short} onChange={(donts) => patchMaterial({ donts })} />
              </div>
            </div>

            {/* Questions */}
            <div className="rounded-[24px] p-5" style={CARD_STYLE}>
              <SectionTitle title="Small questions" note={`Up to ${CARE_LIMITS.questions} short questions and answers.`} />
              <div className="space-y-3">
                {material.questions.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="grow min-w-0 grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                      <L10nField label={`Question ${index + 1}`} value={item.q} locale={locale} maxLength={CARE_LIMITS.short} onChange={(q) => patchMaterial({ questions: material.questions.map((existing, i) => (i === index ? { ...existing, q } : existing)) })} />
                      <L10nField label="Answer" value={item.a} locale={locale} rows={2} maxLength={CARE_LIMITS.long} onChange={(a) => patchMaterial({ questions: material.questions.map((existing, i) => (i === index ? { ...existing, a } : existing)) })} />
                    </div>
                    <button type="button" className={`${ICON_BUTTON} mt-5`} aria-label="Remove question" onClick={() => patchMaterial({ questions: material.questions.filter((_, i) => i !== index) })}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {material.questions.length < CARE_LIMITS.questions ? (
                <div className="mt-3">
                  <PillButton onClick={() => patchMaterial({ questions: [...material.questions, { q: emptyL10n(), a: emptyL10n() }] })}>
                    <Plus size={13} /> Add question
                  </PillButton>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-[24px] p-8" style={CARD_STYLE}>
            <p className="text-[#2D241E]/55 text-sm" style={DM_SANS}>
              Add a material to start. With no materials saved, the care page shows only its heading and the Yarné Care panel.
            </p>
          </div>
        )}
      </div>

      {confirm ? (
        <AdminModalShell
          eyebrow="Yarné Care"
          title={confirm.title}
          onClose={() => setConfirm(null)}
          footer={
            <>
              <AdminModalCancelButton onClick={() => setConfirm(null)} />
              <AdminModalPrimaryButton
                variant="danger"
                onClick={() => {
                  confirm.run();
                  setConfirm(null);
                }}
              >
                {confirm.action}
              </AdminModalPrimaryButton>
            </>
          }
        >
          <p className="text-[#2D241E]/70 text-sm leading-relaxed" style={DM_SANS}>
            {confirm.body}
          </p>
        </AdminModalShell>
      ) : null}

      {cropDialogNode}
    </div>
  );
}
