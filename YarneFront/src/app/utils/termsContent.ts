import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { asRecord, normalizeL10n, normalizeL10nList, trimmedText, type L10n } from "./careContent";
import legalTerms from "../../../scripts/legal-terms.json";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const TERMS_CONTENT_KEY = "yarne.terms.v1";

export type TermsSection = { heading: L10n; body: L10n };

/**
 * The Terms & Conditions page: when it was last changed ("2026-07"), the "In short" points, and the
 * numbered sections (paragraphs separated by a blank line; {{email}} becomes the contact address).
 * Edited in Admin → Care.
 */
export type TermsContent = { version: 1; lastUpdated: string; summary: L10n[]; sections: TermsSection[] };

export const TERMS_LIMITS = { sections: 20, heading: 120, body: 3000, summary: 5, summaryItem: 240 } as const;

const SEED_HEADINGS: L10n[] = [
  { uk: "Згода з умовами", en: "Agreement" },
  { uk: "Товари й ціни", en: "Products and prices" },
  { uk: "Оплата", en: "Payment" },
  { uk: "Доставка й ризики", en: "Delivery and risk" },
  { uk: "Повернення", en: "Returns" },
  { uk: "Матеріали сайту", en: "Site content" },
  { uk: "Відповідальність", en: "Liability" },
  { uk: "Право та контакти", en: "Law and contact" },
];

/** The text agreed with the owner, shown only until the saved one is there (the API saves it at its first start). */
export const TERMS_SEED: TermsContent = {
  version: 1,
  lastUpdated: "2026-07",
  summary: [
    { uk: "На сайті кошти не списуються: ви оплачуєте після того, як ми приймемо замовлення.", en: "Nothing is charged on the site; you pay after we accept the order." },
    { uk: "Повернення — за умовами сторінки «Доставка та повернення»: 14 днів, без слідів носіння.", en: "Returns follow the Delivery & Returns page: 14 days, unworn." },
    { uk: "Ці умови ніколи не обмежують ваших прав споживача.", en: "Your rights as a consumer are never limited by these terms." },
  ],
  sections: SEED_HEADINGS.map((heading, i) => ({
    heading,
    body: { uk: legalTerms.uk.paragraphs[i] ?? "", en: legalTerms.en.paragraphs[i] ?? "" },
  })),
};

export function normalizeTermsContent(value: unknown): TermsContent {
  const source = asRecord(value);
  const lastUpdated = trimmedText(source.lastUpdated, 7);
  const sections = (Array.isArray(source.sections) ? source.sections : [])
    .slice(0, TERMS_LIMITS.sections)
    .map((item) => {
      const row = asRecord(item);
      return { heading: normalizeL10n(row.heading, TERMS_LIMITS.heading), body: normalizeL10n(row.body, TERMS_LIMITS.body) };
    })
    .filter((section) => section.heading.uk || section.heading.en || section.body.uk || section.body.en);
  return {
    version: 1,
    lastUpdated: /^\d{4}-\d{2}$/.test(lastUpdated) ? lastUpdated : "",
    summary: normalizeL10nList(source.summary, TERMS_LIMITS.summary, TERMS_LIMITS.summaryItem),
    sections,
  };
}

export function getInitialTermsContent(): TermsContent | null {
  const saved = peekStorefrontSetting(TERMS_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeTermsContent(saved);
}

export async function loadTermsContent(): Promise<TermsContent | null> {
  try {
    const remote = await fetchStorefrontSetting<TermsContent>(TERMS_CONTENT_KEY);
    return remote == null ? null : normalizeTermsContent(remote);
  } catch {
    return getInitialTermsContent();
  }
}

export async function persistTermsContent(content: TermsContent): Promise<TermsContent> {
  const normalized = normalizeTermsContent(content);
  await saveStorefrontSetting(TERMS_CONTENT_KEY, normalized);
  return normalized;
}
