// The address word of a collection: "Beach capsule collection" -> "beach-capsule", so its page is
// /{lang}/collection/beach-capsule in both languages. scripts/server.mjs has the same rule
// (collectionSlug there): keep the two in step.

const CYRILLIC: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ie", ж: "zh", з: "z", и: "y", і: "i",
  ї: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "iu", я: "ia", ы: "y", э: "e", ё: "e", ъ: "",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[а-яёіїєґ]/g, (letter) => CYRILLIC[letter] ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A category's address word, from its English name: "Clutches" -> "clutches" (the same in both languages). */
export function categorySlug(nameEn: string | null | undefined, name: string | null | undefined): string {
  return slugify(nameEn?.trim() || name?.trim() || "");
}

export function collectionSlug(name: string): string {
  const slug = slugify(name);
  const short = slug.replace(/-collection$/, "");
  return short || slug;
}
