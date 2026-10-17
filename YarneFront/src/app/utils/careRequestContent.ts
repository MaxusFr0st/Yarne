import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { asRecord, normalizeL10n, type L10n } from "./careContent";
import pageSeeds from "../../../scripts/page-seeds.json";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const CARE_REQUEST_CONTENT_KEY = "yarne.careRequest.v1";

/** A titled line: one of the things to have ready, or one of the steps after writing. */
export type CareRequestItem = { title: L10n; text: L10n };

/**
 * The Request care page (/pages/care/request): its title, the line under it, what to have ready,
 * the email template and what happens next. The contact details come from the contact setting.
 * Edited in Admin → Care.
 */
export type CareRequestContent = {
  version: 1;
  titleLine1: L10n;
  titleLine2: L10n;
  intro: L10n;
  ready: CareRequestItem[];
  templateSubject: L10n;
  templateBody: L10n;
  next: CareRequestItem[];
};

export const CARE_REQUEST_LIMITS = { title: 120, intro: 400, items: 6, itemTitle: 120, itemText: 300, subject: 120, body: 1200 } as const;

function items(value: unknown): CareRequestItem[] {
  return (Array.isArray(value) ? value : [])
    .slice(0, CARE_REQUEST_LIMITS.items)
    .map((item) => {
      const row = asRecord(item);
      return { title: normalizeL10n(row.title, CARE_REQUEST_LIMITS.itemTitle), text: normalizeL10n(row.text, CARE_REQUEST_LIMITS.itemText) };
    })
    .filter((item) => item.title.uk || item.title.en);
}

/** The template body keeps its line breaks, so it is cleaned without collapsing them. */
function multiline(value: unknown): L10n {
  const source = asRecord(value);
  const clean = (text: unknown) => (typeof text === "string" ? text.replace(/\r\n/g, "\n").slice(0, CARE_REQUEST_LIMITS.body) : "");
  return { uk: clean(source.uk), en: clean(source.en) };
}

export function normalizeCareRequestContent(value: unknown): CareRequestContent {
  const source = asRecord(value);
  return {
    version: 1,
    titleLine1: normalizeL10n(source.titleLine1, CARE_REQUEST_LIMITS.title),
    titleLine2: normalizeL10n(source.titleLine2, CARE_REQUEST_LIMITS.title),
    intro: normalizeL10n(source.intro, CARE_REQUEST_LIMITS.intro),
    ready: items(source.ready),
    templateSubject: normalizeL10n(source.templateSubject, CARE_REQUEST_LIMITS.subject),
    templateBody: multiline(source.templateBody),
    next: items(source.next),
  };
}

/** The same words the API saves at its first start (scripts/page-seeds.json); shown only until that answer is here. */
export const CARE_REQUEST_SEED: CareRequestContent = normalizeCareRequestContent(pageSeeds.careRequest);

export function getInitialCareRequestContent(): CareRequestContent | null {
  const saved = peekStorefrontSetting(CARE_REQUEST_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeCareRequestContent(saved);
}

export async function loadCareRequestContent(): Promise<CareRequestContent | null> {
  try {
    const remote = await fetchStorefrontSetting<CareRequestContent>(CARE_REQUEST_CONTENT_KEY);
    return remote == null ? null : normalizeCareRequestContent(remote);
  } catch {
    return getInitialCareRequestContent();
  }
}

export async function persistCareRequestContent(content: CareRequestContent): Promise<CareRequestContent> {
  const normalized = normalizeCareRequestContent(content);
  await saveStorefrontSetting(CARE_REQUEST_CONTENT_KEY, normalized);
  return normalized;
}
