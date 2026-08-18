import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";

export const SHARE_DEFAULT_CONTENT_KEY = "yarne.share.default.v1";

export type ShareDefaultContent = {
  title: string;
  description: string;
  imageUrl: string;
};

function normalizeText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

export function normalizeShareDefaultContent(value: unknown): ShareDefaultContent {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    title: normalizeText(source.title, 120),
    description: normalizeText(source.description, 300),
    imageUrl: normalizeText(source.imageUrl, 2000),
  };
}

export function getEmptyShareDefaultContent(): ShareDefaultContent {
  return { title: "", description: "", imageUrl: "" };
}

export async function loadShareDefaultContentForAdmin(): Promise<ShareDefaultContent> {
  try {
    const remote = await fetchStorefrontSetting<ShareDefaultContent>(SHARE_DEFAULT_CONTENT_KEY);
    if (remote != null) return normalizeShareDefaultContent(remote);
  } catch {
    // continue
  }
  return getEmptyShareDefaultContent();
}

export async function persistShareDefaultContent(content: ShareDefaultContent): Promise<ShareDefaultContent> {
  const normalized = normalizeShareDefaultContent(content);
  await saveStorefrontSetting(SHARE_DEFAULT_CONTENT_KEY, normalized);
  return normalized;
}
