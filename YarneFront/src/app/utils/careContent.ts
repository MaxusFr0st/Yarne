import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const CARE_CONTENT_KEY = "yarne.care.v1";

export type L10n = { en: string; uk: string };

export const CARE_ICONS = ["bag", "brush", "drop", "wind", "box", "sun", "pilling"] as const;
export type CareIcon = (typeof CARE_ICONS)[number];

export type CareTopic = {
  /** Stable id; the open guide is addressed by it (?topic=clean). */
  id: string;
  icon: CareIcon;
  /** Card title, "Cleaning". */
  title: L10n;
  /** Card sentence. */
  summary: L10n;
  /** Guide heading, "How to clean raffia". */
  heading: L10n;
  /** "Before you start": applies to every piece. */
  warning: L10n;
  /** "You'll need" chips; can be empty. */
  need: L10n[];
  steps: L10n[];
  /** Product id → note shown only for that piece. */
  pieceNotes: Record<string, L10n>;
};

export type CareQuestion = { q: L10n; a: L10n };

export type CareMaterial = {
  id: string;
  /** URL segment: /pages/care/<slug>. */
  slug: string;
  name: L10n;
  heroTitle: L10n;
  /** The italic second line of the guide's title; the tagline on the phone's material row. */
  heroSubtitle: L10n;
  intro: L10n;
  tileImageUrl: string | null;
  /** Product ids made of this material, in display order. */
  pieceProductIds: string[];
  topics: CareTopic[];
  dos: L10n[];
  donts: L10n[];
  questions: CareQuestion[];
};

export type CareContent = {
  version: 1;
  /** Display order. */
  materials: CareMaterial[];
};

export const CARE_LIMITS = {
  materials: 24,
  pieces: 60,
  topics: 12,
  need: 8,
  steps: 12,
  dos: 10,
  questions: 3,
  short: 120,
  long: 600,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function text(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function l10n(value: unknown, maxLength: number): L10n {
  const source = asRecord(value);
  return { en: text(source.en, maxLength), uk: text(source.uk, maxLength) };
}

export function emptyL10n(): L10n {
  return { en: "", uk: "" };
}

export function isEmptyL10n(value: L10n): boolean {
  return !value.en.trim() && !value.uk.trim();
}

function l10nList(value: unknown, maxItems: number, maxLength: number): L10n[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => l10n(item, maxLength))
    .filter((item) => !isEmptyL10n(item))
    .slice(0, maxItems);
}

/** Lowercase latin letters, digits and dashes; anything else becomes a dash. */
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function unique(candidate: string, taken: Set<string>, fallback: string): string {
  const base = candidate || fallback;
  let result = base;
  for (let n = 2; taken.has(result); n += 1) result = `${base}-${n}`;
  taken.add(result);
  return result;
}

function normalizeTopic(value: unknown, pieceIds: Set<string>, takenIds: Set<string>): CareTopic {
  const source = asRecord(value);
  const title = l10n(source.title, CARE_LIMITS.short);
  const pieceNotes: Record<string, L10n> = {};
  for (const [productId, note] of Object.entries(asRecord(source.pieceNotes))) {
    if (!pieceIds.has(productId)) continue;
    const normalized = l10n(note, CARE_LIMITS.long);
    if (!isEmptyL10n(normalized)) pieceNotes[productId] = normalized;
  }
  return {
    id: unique(slugify(text(source.id, 60)) || slugify(title.en), takenIds, "topic"),
    icon: CARE_ICONS.includes(source.icon as CareIcon) ? (source.icon as CareIcon) : "bag",
    title,
    summary: l10n(source.summary, CARE_LIMITS.long),
    heading: l10n(source.heading, CARE_LIMITS.short),
    warning: l10n(source.warning, CARE_LIMITS.long),
    need: l10nList(source.need, CARE_LIMITS.need, CARE_LIMITS.short),
    steps: l10nList(source.steps, CARE_LIMITS.steps, CARE_LIMITS.long),
    pieceNotes,
  };
}

function normalizeMaterial(value: unknown, takenIds: Set<string>, takenSlugs: Set<string>): CareMaterial {
  const source = asRecord(value);
  const name = l10n(source.name, CARE_LIMITS.short);
  const slug = unique(slugify(text(source.slug, 60)) || slugify(name.en), takenSlugs, "material");
  const pieceProductIds = Array.isArray(source.pieceProductIds)
    ? [...new Set(source.pieceProductIds.filter((id): id is string => typeof id === "string" && id.trim() !== ""))].slice(
        0,
        CARE_LIMITS.pieces,
      )
    : [];
  const pieceIds = new Set(pieceProductIds);
  const topicIds = new Set<string>();
  const tileImageUrl = text(source.tileImageUrl, 500);
  return {
    id: unique(slugify(text(source.id, 60)) || slug, takenIds, "material"),
    slug,
    name,
    heroTitle: l10n(source.heroTitle, CARE_LIMITS.short),
    heroSubtitle: l10n(source.heroSubtitle, CARE_LIMITS.short),
    intro: l10n(source.intro, CARE_LIMITS.long),
    tileImageUrl: tileImageUrl || null,
    pieceProductIds,
    topics: (Array.isArray(source.topics) ? source.topics : [])
      .slice(0, CARE_LIMITS.topics)
      .map((topic) => normalizeTopic(topic, pieceIds, topicIds)),
    dos: l10nList(source.dos, CARE_LIMITS.dos, CARE_LIMITS.short),
    donts: l10nList(source.donts, CARE_LIMITS.dos, CARE_LIMITS.short),
    questions: (Array.isArray(source.questions) ? source.questions : [])
      .map((item) => {
        const question = asRecord(item);
        return { q: l10n(question.q, CARE_LIMITS.short), a: l10n(question.a, CARE_LIMITS.long) };
      })
      .filter((item) => !isEmptyL10n(item.q) || !isEmptyL10n(item.a))
      .slice(0, CARE_LIMITS.questions),
  };
}

export function normalizeCareContent(value: unknown): CareContent {
  const source = asRecord(value);
  const ids = new Set<string>();
  const slugs = new Set<string>();
  return {
    version: 1,
    materials: (Array.isArray(source.materials) ? source.materials : [])
      .slice(0, CARE_LIMITS.materials)
      .map((material) => normalizeMaterial(material, ids, slugs)),
  };
}

/**
 * First paint: the last server answer if this browser has one. Null when the admin has never
 * saved care content (or this browser has never asked): the care pages then show the built-in
 * guide (utils/careSeed.ts), which is kept out of this file so the product page does not carry it.
 */
export function getInitialCareContent(): CareContent | null {
  const saved = peekStorefrontSetting(CARE_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeCareContent(saved);
}

export async function loadCareContent(): Promise<CareContent | null> {
  try {
    const remote = await fetchStorefrontSetting<CareContent>(CARE_CONTENT_KEY);
    return remote == null ? null : normalizeCareContent(remote);
  } catch {
    return getInitialCareContent(); // unreachable server: keep the last answer
  }
}

export async function persistCareContent(content: CareContent): Promise<CareContent> {
  const normalized = normalizeCareContent(content);
  await saveStorefrontSetting(CARE_CONTENT_KEY, normalized);
  return normalized;
}

/** The text in `locale`, or the other language when that one is empty. */
export function careText(value: L10n, locale: Locale): string {
  const other = locale === "uk" ? "en" : "uk";
  return value[locale].trim() || value[other].trim();
}

export function topicDiffersByPiece(topic: CareTopic): boolean {
  return Object.keys(topic.pieceNotes).length > 0;
}

/** How many of the material's topics carry a note for this piece. */
export function countPieceNotes(material: CareMaterial, productId: string): number {
  return material.topics.filter((topic) => topic.pieceNotes[productId]).length;
}

export function findCareMaterialForProduct(content: CareContent | null, productId: string): CareMaterial | null {
  return content?.materials.find((material) => material.pieceProductIds.includes(productId)) ?? null;
}

export function careGuidePath(material: CareMaterial, productId?: string): string {
  const base = `/pages/care/${material.slug}`;
  return productId ? `${base}?piece=${encodeURIComponent(productId)}` : base;
}
