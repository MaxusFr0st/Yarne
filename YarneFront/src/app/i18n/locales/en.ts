// English translations.
// Keep keys short and grouped by surface (header, footer, home, etc.).
// Add a key here, then mirror it in `uk.ts`.

const en = {
  common: {
    viewAll: "View All",
    discover: "Discover",
    explore: "Explore",
    shopAll: "Shop All",
    readStory: "Read our story",
    arrow: "→",
  },
  header: {
    home: "Home",
    collection: "Collection",
    journal: "Journal",
    about: "About",
    admin: "Admin",
    myAccount: "My Account",
    signIn: "Sign in",
    cart: "Cart",
    search: "Search",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    searchTitle: "Search The Knit Gallery",
    searchPlaceholder: "Cashmere, turtleneck, bouclé...",
  },
  language: {
    label: "Language",
    en: "English",
    uk: "Ukrainian",
    short: { en: "EN", uk: "UA" },
  },
  home: {
    hero: {
      eyebrow: "New Collection — Spring 2026",
      titleLine1: "Woven in",
      titleAccent: "quiet luxury",
      subtitle:
        "Timeless knitwear crafted from the world's finest fibres. Each piece is made to outlast every season.",
      ctaPrimary: "Explore Collection",
      ctaSecondary: "New Arrivals",
      scroll: "Scroll",
    },
    brandStrip: {
      yarnOriginsLabel: "Yarn Origins",
      yarnOriginsValue: "Scotland, Italy & Peru",
      craftedSinceLabel: "Crafted Since",
      craftedSinceValue: "2011",
      materialsLabel: "Materials",
      materialsValue: "100% Natural Fibres",
      carbonLabel: "Carbon Neutral",
      carbonValue: "Since 2023",
    },
    bestSellers: {
      eyebrow: "Most Loved",
      title: "Best Sellers",
    },
    featured: {
      eyebrow: "Curated Pieces",
      viewAll: "View all",
      shopAllPieces_one: "Shop All {{count}} Piece",
      shopAllPieces_other: "Shop All {{count}} Pieces",
    },
    editorial: {
      eyebrow: "Our Philosophy",
      titleLine1: "Every stitch tells",
      titleLine2: "a longer story",
      paragraph1:
        "We source our yarns from family mills in the Scottish Highlands, the Peruvian altiplano, and the foothills of the Italian Alps. Each fibre is selected for its provenance, its handle, and its longevity.",
      paragraph2:
        "A Yarné piece is not designed for one season. It is designed to be worn, reworn, and passed on — a small act of resistance against disposable fashion.",
      ourStory: "Our Story",
      yearsLabel: "Years of craft",
    },
    lookbook: {
      eyebrow: "Lookbook — Winter 2026",
      titleLine1: "The art of dressing",
      titleLine2: "for yourself",
      cta: "View Lookbook",
    },
    moreFromCollection: {
      eyebrow: "Complete the look",
    },
  },
  showcase: {
    defaultEyebrow: "Featured Showcase",
    defaultTitle: "Editorial Picks",
    openProduct: "Open {{title}}",
    railScrollHint: "Swipe",
  },
  product: {
    badgeNew: "NEW",
    badgeBestseller: "BESTSELLER",
    quickAdd: "Quick Add",
    fromPrice: "From {{price}}",
    lace: {
      label: "Lace",
      withLace: "With lace",
      withoutLace: "Without lace",
    },
  },
  footer: {
    tagline: "Crafted slowly. Worn forever.",
    columns: {
      shop: {
        title: "Shop",
        items: ["New Arrivals", "Sweaters", "Cardigans", "Vests", "Accessories"],
      },
      brand: {
        title: "The Brand",
        items: ["Our Story", "Journal", "Craftsmanship", "Sustainability"],
      },
      help: {
        title: "Help",
        items: ["Size Guide", "Shipping & Returns", "Care Instructions", "Contact"],
      },
      connect: {
        title: "Connect",
        items: ["Instagram", "Pinterest", "Stockists", "Newsletter"],
      },
    },
    newsletter: {
      title: "The Edit",
      subtitle: "New arrivals, seasonal stories and early access — delivered to you.",
      placeholder: "Your email address",
      submit: "Subscribe",
    },
    rights: "© {{year}} Yarné — The Knit Gallery. All rights reserved.",
    legal: { privacy: "Privacy", terms: "Terms", cookies: "Cookies" },
  },
} as const;

export default en;
export type Translations = typeof en;
