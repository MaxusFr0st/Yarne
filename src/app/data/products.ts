export interface ColorVariant {
  name: string;
  hex: string;
  image: string;
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  category: string;
  isNew?: boolean;
  isBestseller?: boolean;
  sizes: string[];
  description: string;
  details: string[];
  colors: ColorVariant[];
}

const IMG = {
  cream: "https://images.unsplash.com/photo-1572187076010-85d894e06d82?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  navy: "https://images.unsplash.com/photo-1673168871224-c2012dcb2fb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  vest: "https://images.unsplash.com/photo-1641839272138-5b4eb047e0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  earth: "https://images.unsplash.com/photo-1731402967882-087b875b878e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  burgundy: "https://images.unsplash.com/photo-1668707597105-585748ae50ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  autumn: "https://images.unsplash.com/photo-1698135857846-b683004283cc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  studio: "https://images.unsplash.com/photo-1771092358890-0db24db44e56?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  texture: "https://images.unsplash.com/photo-1636715940535-9be6f64188d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  lookbook: "https://images.unsplash.com/photo-1764697907425-62696b280b31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
};

export const PRODUCTS: Product[] = [
  {
    id: "arles-cocoon",
    name: "Arles Cocoon Sweater",
    subtitle: "Merino Wool Blend",
    price: 285,
    category: "Sweaters",
    isNew: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "Draped in the spirit of southern France, the Arles Cocoon wraps you in a cloud of extra-fine merino. Its oversized silhouette and deep dropped shoulders create a languid, effortless luxury that moves with you.",
    details: [
      "80% Extra-Fine Merino, 20% Cashmere",
      "Hand wash cold or dry clean",
      "Made in Italy",
      "Model is 5'9\" wearing size S",
    ],
    colors: [
      { name: "Parchment", hex: "#E8DCC8", image: IMG.cream },
      { name: "Oxblood", hex: "#4A0E0E", image: IMG.burgundy },
      { name: "Midnight", hex: "#0A1128", image: IMG.navy },
      { name: "Moss", hex: "#3D5040", image: IMG.earth },
    ],
  },
  {
    id: "mistral-turtleneck",
    name: "Mistral Turtleneck",
    subtitle: "Pure Cashmere",
    price: 360,
    category: "Sweaters",
    isBestseller: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "The Mistral is our purest expression of effortless warmth. Knit from grade-A Scottish cashmere, its elongated turtleneck can be worn high and folded or draped loosely around the décolletage.",
    details: [
      "100% Grade-A Scottish Cashmere",
      "Dry clean recommended",
      "Made in Scotland",
      "Model is 5'10\" wearing size S",
    ],
    colors: [
      { name: "Midnight", hex: "#0A1128", image: IMG.navy },
      { name: "Ivory", hex: "#F5F0E8", image: IMG.cream },
      { name: "Slate", hex: "#8B9099", image: IMG.studio },
    ],
  },
  {
    id: "provence-vest",
    name: "Provence Knit Vest",
    subtitle: "Lambswool & Linen",
    price: 195,
    category: "Vests",
    sizes: ["XS", "S", "M", "L"],
    description:
      "A warm-weather essential reimagined. The Provence Vest is knit from a breathable lambswool-linen blend, offering texture and weight without warmth—ideal for layering through the seasons.",
    details: [
      "60% Lambswool, 40% Linen",
      "Hand wash cold",
      "Made in Portugal",
      "Model is 5'8\" wearing size XS",
    ],
    colors: [
      { name: "Ecru", hex: "#F0EBD8", image: IMG.vest },
      { name: "Caramel", hex: "#9B6B2E", image: IMG.earth },
      { name: "Ebony", hex: "#1A1510", image: IMG.lookbook },
    ],
  },
  {
    id: "bretagne-pullover",
    name: "Bretagne Pullover",
    subtitle: "Bouclé Wool",
    price: 320,
    category: "Sweaters",
    isNew: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "Named for the rugged coast of Brittany, the Bretagne is constructed from a sculptural bouclé wool that catches the light and holds its shape beautifully. A statement piece that becomes a staple.",
    details: [
      "75% Virgin Wool, 25% Nylon Bouclé",
      "Dry clean only",
      "Made in France",
      "Model is 5'9\" wearing size S",
    ],
    colors: [
      { name: "Oat", hex: "#D4C5A0", image: IMG.earth },
      { name: "Bordeaux", hex: "#6B1E1E", image: IMG.burgundy },
      { name: "Smoke", hex: "#9DA3AE", image: IMG.studio },
    ],
  },
  {
    id: "riviera-cardigan",
    name: "Riviera Cardigan",
    subtitle: "Fine-Gauge Merino",
    price: 245,
    category: "Cardigans",
    isBestseller: true,
    sizes: ["XS", "S", "M", "L", "XL"],
    description:
      "The Riviera is the cardigan of a quiet, sun-drenched afternoon. Its fine-gauge merino drapes in a long, lean silhouette with mother-of-pearl buttons and deep side pockets for effortless carry.",
    details: [
      "100% Fine-Gauge Merino Wool",
      "Hand wash cold or dry clean",
      "Mother-of-pearl buttons",
      "Made in Italy",
    ],
    colors: [
      { name: "Bordeaux", hex: "#6B1E1E", image: IMG.burgundy },
      { name: "Ivory", hex: "#FAF6EE", image: IMG.cream },
      { name: "Cobalt", hex: "#0A1128", image: IMG.navy },
    ],
  },
  {
    id: "cote-boucle-jacket",
    name: "Côte Bouclé Jacket",
    subtitle: "Structured Bouclé",
    price: 395,
    category: "Jackets",
    sizes: ["XS", "S", "M", "L"],
    description:
      "Our most refined outerwear piece. The Côte is constructed in a dense bouclé weave, then lined in a whisper-soft satin for a jacket that is as comfortable from inside as it is striking from outside.",
    details: [
      "Outer: 80% Wool, 20% Mohair",
      "Lining: 100% Cupro satin",
      "Dry clean only",
      "Made in Italy",
    ],
    colors: [
      { name: "Camel", hex: "#C09060", image: IMG.autumn },
      { name: "Ivory", hex: "#FAF6EE", image: IMG.studio },
      { name: "Ebony", hex: "#1A1510", image: IMG.lookbook },
    ],
  },
];

export const HERO_IMAGES = [IMG.cream, IMG.autumn, IMG.navy];
export const EDITORIAL_IMG = IMG.texture;
export const LOOKBOOK_IMG = IMG.lookbook;
