import type { Product } from "../types/product";

/** The part of a product the search reads. A `Product` fits; `collectionName` is filled in once the list carries it. */
export type SearchableProduct = Pick<Product, "name" | "category" | "colors"> &
  Partial<Pick<Product, "nameEn" | "categoryEn" | "material" | "materialEn">> & {
    collectionName?: string | null;
    collectionNameEn?: string | null;
  };

/** Why a product matched, when it was not by name or category: the colour (by index) or the material, and the matched word. */
export interface SearchHit<T> {
  product: T;
  /** Lower is better: the sum, over the query words, of the position of the best field that matched. */
  score: number;
  why: { field: "colour"; colorIndex: number } | { field: "material"; word: string } | null;
}

/** Field order is also the rank: name first, then category and collection, then colours, then material. */
const FIELD_COLOUR = 2;
const FIELD_MATERIAL = 3;

/** Lower-cased, Latin accents stripped ("cherie" finds "Chérie"), apostrophes dropped. Cyrillic (й, ї) is left alone. */
export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[À-ɏ]/g, (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, ""))
    .replace(/['ʼ’`]/g, "");
}

const wordsOf = (value: string | null | undefined): string[] =>
  normalizeSearchText(value).split(/[^a-z0-9а-яіїєґ]+/).filter(Boolean);

/** English query words that find Ukrainian products (the English fields are searched directly as well). */
const SYNONYMS: Record<string, string[]> = {
  bag: ["сумк"],
  bags: ["сумк"],
  clutch: ["клатч"],
  clutches: ["клатч"],
  hat: ["капелюх", "шляп"],
  hats: ["капелюх", "шляп"],
  cotton: ["бавовн"],
  raffia: ["рафі"],
  set: ["костюм"],
  suit: ["костюм"],
  skirt: ["спідниц"],
  shorts: ["шорт"],
  straw: ["солом"],
};

/** What a query word may begin with: itself, itself without a Ukrainian ending, and its synonyms. */
function stemsOf(word: string): string[] {
  const stems = [word];
  if (word.length >= 5) stems.push(word.slice(0, -1));
  if (SYNONYMS[word]) stems.push(...SYNONYMS[word]);
  // A word still being typed ("clu") already finds what "clutch" does.
  else if (word.length >= 3) {
    for (const key of Object.keys(SYNONYMS)) if (key.startsWith(word)) stems.push(...SYNONYMS[key]);
  }
  return stems;
}

interface Indexed {
  /** Words of the name, category and collection, colour and material fields, in rank order. */
  fields: string[][];
  colourWords: { word: string; colorIndex: number }[];
}

function indexOf(p: SearchableProduct): Indexed {
  const colourWords = p.colors.flatMap((color, colorIndex) =>
    [...wordsOf(color.name), ...wordsOf(color.nameUk)].map((word) => ({ word, colorIndex })),
  );
  return {
    fields: [
      [...wordsOf(p.name), ...wordsOf(p.nameEn)],
      [...wordsOf(p.category), ...wordsOf(p.categoryEn), ...wordsOf(p.collectionName), ...wordsOf(p.collectionNameEn)],
      colourWords.map((c) => c.word),
      [...wordsOf(p.material), ...wordsOf(p.materialEn)],
    ],
    colourWords,
  };
}

/** True when the text holds something to search for. */
export const hasSearchTerm = (query: string | null | undefined): boolean => wordsOf(query).length > 0;

/**
 * The products that match what the shopper typed, best first (ties keep the list's order).
 * A query word matches when some word of a searched field STARTS with it; every query word must match.
 * The long description is deliberately not searched.
 */
export function searchProducts<T extends SearchableProduct>(products: readonly T[], query: string): SearchHit<T>[] {
  const queryStems = wordsOf(query).map(stemsOf);
  if (queryStems.length === 0) return [];

  const hits: SearchHit<T>[] = [];
  for (const product of products) {
    const { fields, colourWords } = indexOf(product);
    let score = 0;
    let why: SearchHit<T>["why"] = null;
    let matched = true;
    for (const stems of queryStems) {
      let best = -1;
      let matchedWord = "";
      for (let f = 0; f < fields.length && best < 0; f++) {
        const word = fields[f].find((w) => stems.some((s) => w.startsWith(s)));
        if (word !== undefined) {
          best = f;
          matchedWord = word;
        }
      }
      if (best < 0) {
        matched = false;
        break;
      }
      score += best;
      if (!why && best === FIELD_COLOUR) {
        const hit = colourWords.find((c) => c.word === matchedWord);
        if (hit) why = { field: "colour", colorIndex: hit.colorIndex };
      } else if (!why && best === FIELD_MATERIAL) {
        why = { field: "material", word: matchedWord };
      }
    }
    if (matched) hits.push({ product, score, why });
  }
  // Array.prototype.sort is stable, so equal scores keep the order the list came in.
  return hits.sort((a, b) => a.score - b.score);
}
