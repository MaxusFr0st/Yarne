export function localizedCatalogName(name: string, nameUk: string | null | undefined, locale: string): string {
  if (locale === "uk") return (nameUk?.trim() || name).trim();
  return (name?.trim() || nameUk?.trim() || "").trim();
}
