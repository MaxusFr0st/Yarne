import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { asRecord, normalizeL10n, trimmedText, type L10n } from "./careContent";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const CONTACT_CONTENT_KEY = "yarne.contact.v1";

/** How to reach Yarné about a piece: Request care and the Guarantee page's closing panel. Edited in Admin → Care. */
export type ContactContent = {
  version: 1;
  /** Dialled form, "+380671234567". Empty: the pages offer email only. */
  phone: string;
  /** As shown, "+380 67 123 45 67". */
  phoneDisplay: string;
  email: string;
  /** When the phone is answered. */
  hours: L10n;
  /** How soon an email is answered. */
  replyTime: L10n;
  /** "@yarne.acc" */
  instagramHandle: string;
  instagramUrl: string;
};

/** The built-in details, shown until the admin saves their own (Admin → Care → Contact details). */
export const CONTACT_SEED: ContactContent = {
  version: 1,
  phone: "+380952601903",
  phoneDisplay: "+380 95 260 19 03",
  email: "anastasiia.moroz.yarne@gmail.com",
  hours: { en: "Mon–Fri, 10:00–18:00 (Kyiv time)", uk: "Пн–Пт, 10:00–18:00 (за Києвом)" },
  replyTime: { en: "We reply within one business day", uk: "Відповідаємо протягом одного робочого дня" },
  instagramHandle: "@yarne.acc",
  instagramUrl: "https://www.instagram.com/yarne.acc/",
};

export function normalizeContactContent(value: unknown): ContactContent {
  const source = asRecord(value);
  const typed = trimmedText(source.phone, 24).replace(/\D/g, "");
  // A Ukrainian number typed the local way, 067 123 45 67.
  const digits = typed.length === 10 && typed.startsWith("0") ? `38${typed}` : typed;
  // Fewer digits than any real number has, or all zeros (a placeholder): no phone.
  const phone = digits.length >= 9 && /[1-9]/.test(digits.slice(3)) ? `+${digits}` : "";
  const ua = /^380(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(digits);
  const email = trimmedText(source.email, 120);
  const instagramUrl = trimmedText(source.instagramUrl, 200);
  const handle = trimmedText(source.instagramHandle, 60).replace(/^@+/, "");
  return {
    version: 1,
    phone,
    phoneDisplay: phone ? trimmedText(source.phoneDisplay, 32) || (ua ? `+380 ${ua.slice(1).join(" ")}` : phone) : "",
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : CONTACT_SEED.email,
    hours: normalizeL10n(source.hours, 120),
    replyTime: normalizeL10n(source.replyTime, 120),
    instagramHandle: handle ? `@${handle}` : "",
    instagramUrl: /^https:\/\//i.test(instagramUrl) ? instagramUrl : "",
  };
}

/** First paint: the last server answer if this browser has one; null when the admin has never saved the details. */
export function getInitialContactContent(): ContactContent | null {
  const saved = peekStorefrontSetting(CONTACT_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeContactContent(saved);
}

export async function loadContactContent(): Promise<ContactContent | null> {
  try {
    const remote = await fetchStorefrontSetting<ContactContent>(CONTACT_CONTENT_KEY);
    return remote == null ? null : normalizeContactContent(remote);
  } catch {
    return getInitialContactContent(); // unreachable server: keep the last answer
  }
}

export async function persistContactContent(content: ContactContent): Promise<ContactContent> {
  const normalized = normalizeContactContent(content);
  await saveStorefrontSetting(CONTACT_CONTENT_KEY, normalized);
  return normalized;
}

export function mailtoHref(email: string, subject?: string, body?: string): string {
  const query = [subject && `subject=${encodeURIComponent(subject)}`, body && `body=${encodeURIComponent(body)}`].filter(Boolean);
  return `mailto:${email}${query.length ? `?${query.join("&")}` : ""}`;
}
