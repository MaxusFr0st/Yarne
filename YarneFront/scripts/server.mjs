#!/usr/bin/env node
// Replaces `serve` in production: serves the static build, but for HTML
// navigations it stamps real Open Graph / Twitter Card meta tags into
// index.html so links shared in Telegram/WhatsApp/iMessage/etc. render a
// proper preview card instead of the generic empty one those crawlers see
// (they fetch raw HTML and never run the React app's client-side JS).
//
// The same pass gives search engines and AI crawlers what they need in the first response,
// without server rendering the app: the canonical address, hreflang alternates, JSON-LD, and a
// plain HTML copy of what the page says inside #root (src/main.tsx uses createRoot, which
// replaces it when the app mounts). It also answers sitemap.xml, robots.txt and llms.txt, and
// gives unknown addresses a real 404 status (still with the app's shell, so its Not Found page
// renders).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const port = process.env.PORT || 8080;
const apiUrl = (process.env.VITE_API_URL || "").replace(/\/+$/, "");
// The public address, fixed: canonical links, og:url and the sitemap must not follow the Host
// header of whoever happens to be asking (the Railway hostname, a proxy, a crawler's own host).
const SITE_ORIGIN = (process.env.SITE_ORIGIN || "https://yarne-acc.com").replace(/\/+$/, "");

const SITE_NAME = "Yarné";
const DEFAULT_TITLE = "Yarné";
const DEFAULT_DESCRIPTION = "Handmade knitted bags, hats and beach sets, made to order.";
const DEFAULT_IMAGE_URL = "https://pub-c4e2daa0ab484582b5f8eed726b07e2c.r2.dev/LogoMainShareFinal.jpg_202608181106.jpg";
const LOGO_PATH = "/LogoWhiteMainAndroid.png";
const FAVICON_PATH = "/LogoWhiteMainIG-Google.png";
// The links the footer shows (src/app/components/Footer.tsx).
const INSTAGRAM_URL = "https://www.instagram.com/yarne.acc/";
const TIKTOK_URL = "https://www.tiktok.com/@yarne.acc";
// src/app/utils/contactContent.ts: the address until the admin saves their own contact details.
const CONTACT_EMAIL = "anastasiia.moroz.yarne@gmail.com";
const contactEmail = (contact) => (/^[^s@]+@[^s@]+.[^s@]+$/.test(contact?.email ?? "") ? contact.email : CONTACT_EMAIL);

// src/app/i18n/config.ts
const LOCALES = ["uk", "en"];
const DEFAULT_LANG = "uk";

const indexHtml = await readFile(join(distDir, "index.html"), "utf8");
const extraHeaders = await loadServeJsonHeaders();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

async function loadServeJsonHeaders() {
  const path = join(distDir, "serve.json");
  if (!existsSync(path)) return [];
  try {
    const json = JSON.parse(await readFile(path, "utf8"));
    return json.headers?.[0]?.headers ?? [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function truncate(text, max) {
  if (!text || text.length <= max) return text ?? "";
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// Names and descriptions come from an admin form: stray trailing spaces and line breaks would
// otherwise end up in titles ("Charlotte  — Yarné") and meta descriptions.
function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function paragraphsOf(value) {
  return String(value ?? "")
    .split(/\n\s*\n/)
    .map(cleanText)
    .filter(Boolean);
}

// A product's text in the page's language: the owner's English text on /en when there is one,
// the Ukrainian (base) text otherwise (src/app/utils/productText.ts does the same in the app).
const inLang = (lang, base, en, clean = cleanText) => (lang === "en" && clean(en) ? en : base);
const productName = (product, lang) => cleanText(inLang(lang, product.name, product.nameEn));
const productDescription = (product, lang) => inLang(lang, product.description, product.descriptionEn);
const productMaterial = (product, lang) => cleanText(inLang(lang, product.material, product.materialEn));
const productCategory = (product, lang) => cleanText(inLang(lang, product.categoryName, product.categoryNameEn));

// JSON-LD sits inside a <script>: "<" must never be able to close it.
function jsonLdScript(data) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `<script type="application/ld+json">${json}</script>`;
}

// Same rules as src/app/i18n/format.ts (hryvnia: the storefront shows UAH everywhere for now).
function hryvniaUnit(amount) {
  const whole = Math.floor(Math.abs(amount));
  const mod100 = whole % 100;
  const mod10 = whole % 10;
  if (mod100 >= 11 && mod100 <= 14) return "гривень";
  if (mod10 === 1) return "гривня";
  if (mod10 >= 2 && mod10 <= 4) return "гривні";
  return "гривень";
}

function formatPrice(amount, lang) {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  const digits = Number.isInteger(safe) ? 0 : 2;
  const number = new Intl.NumberFormat(lang === "uk" ? "uk-UA" : "en-IE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(safe);
  return lang === "uk" ? `₴ ${number} ${hryvniaUnit(safe)}` : `₴${number}`;
}

// src/app/utils/localizedName.ts
function catalogName(name, nameUk, lang) {
  if (lang === "uk") return cleanText(nameUk) || cleanText(name);
  return cleanText(name) || cleanText(nameUk);
}

function localized(value, lang) {
  if (!value || typeof value !== "object") return "";
  const other = lang === "uk" ? "en" : "uk";
  return String(value[lang] || value[other] || "").trim();
}

// ---------------------------------------------------------------------------------------------
// Data from the API, kept in memory for a few minutes so a page's HTML does not wait on it.
// ---------------------------------------------------------------------------------------------

const SHARE_DEFAULT_KEY = "yarne.share.default.v1";
const CARE_CONTENT_KEY = "yarne.care.v1";
const GUARANTEE_CONTENT_KEY = "yarne.guarantee.terms.v1";
const PRODUCT_GUARANTEE_KEY = "yarne.product.guarantee.v1";
const STATIC_PAGES_KEY = "yarne.staticPages.v1";
const CONTACT_CONTENT_KEY = "yarne.contact.v1";
const DELIVERY_CONTENT_KEY = "yarne.delivery.v1";
const CACHE_TTL_MS = 5 * 60 * 1000;
// A product that does not exist is remembered for less: it may be added a minute later.
const MISSING_TTL_MS = 60 * 1000;
// Anyone can ask for any product address; the cache must not grow with the guesses.
const MAX_CACHED_PRODUCTS = 500;
const settingCache = new Map();
const productCache = new Map();
const inFlight = new Map();
const productList = { value: null, fetchedAt: 0 };

// One request at a time per key: a burst of crawlers asking for the same page waits on one answer.
function once(key, load) {
  const existing = inFlight.get(key);
  if (existing) return existing;
  const promise = load().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function getSetting(key) {
  if (!apiUrl) return null;
  const cached = settingCache.get(key);
  if (cached && Date.now() - cached.fetchedAt <= CACHE_TTL_MS) return cached.value;

  await once(`setting:${key}`, async () => {
    try {
      const res = await fetch(`${apiUrl}/api/storefront-settings/${key}`);
      if (res.ok) {
        const json = await res.json();
        settingCache.set(key, { value: json.value ?? null, fetchedAt: Date.now() });
      } else if (res.status === 404) {
        settingCache.set(key, { value: null, fetchedAt: Date.now() });
      }
    } catch {
      // keep the previous cached value (or null) on failure
    }
  });
  return settingCache.get(key)?.value ?? null;
}

const getShareDefault = () => getSetting(SHARE_DEFAULT_KEY);

// All products the shop shows, or null when the API cannot be reached (and nothing is cached).
async function getProducts() {
  if (!apiUrl) return null;
  if (productList.value && Date.now() - productList.fetchedAt <= CACHE_TTL_MS) return productList.value;

  await once("products", async () => {
    try {
      const res = await fetch(`${apiUrl}/api/products`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json)) {
          productList.value = json.filter((product) => product && product.isActive !== false);
          productList.fetchedAt = Date.now();
        }
      }
    } catch {
      // keep the previous list on failure
    }
  });
  return productList.value;
}

function rememberProduct(keys, entry) {
  for (const key of keys) {
    productCache.delete(key);
    productCache.set(key, entry);
  }
  while (productCache.size > MAX_CACHED_PRODUCTS) productCache.delete(productCache.keys().next().value);
}

// { status: "ok", product } | { status: "missing" } (the API said 404) | { status: "error" } (it
// could not be asked). Only a real 404 may turn into a 404 page: an outage must not.
async function getProduct(id) {
  if (!apiUrl) return { status: "error" };
  const cached = productCache.get(id);
  if (cached && Date.now() - cached.fetchedAt <= (cached.status === "ok" ? CACHE_TTL_MS : MISSING_TTL_MS)) return cached;

  return once(`product:${id}`, async () => {
    try {
      const res = await fetch(`${apiUrl}/api/products/${encodeURIComponent(id)}`);
      if (res.status === 404) {
        const entry = { status: "missing", fetchedAt: Date.now() };
        rememberProduct([id], entry);
        return entry;
      }
      if (res.ok) {
        const product = await res.json();
        const entry = { status: "ok", product, fetchedAt: Date.now() };
        // Reachable by numeric id and by productCode.
        rememberProduct([id, String(product.id), String(product.productCode)], entry);
        return entry;
      }
    } catch {
      // fall through to the stale answer
    }
    return cached?.status === "ok" ? cached : { status: "error" };
  });
}

async function fetchProduct(id) {
  const result = await getProduct(id);
  return result.status === "ok" ? result.product : null;
}

function toAbsoluteImageUrl(src, fallback) {
  if (!src) return fallback;
  if (/^https?:\/\//i.test(src)) return src;
  const base = apiUrl || SITE_ORIGIN;
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

// ---------------------------------------------------------------------------------------------
// Routes: what src/app/routes.tsx serves, so an unknown address can be told from a real one.
// ---------------------------------------------------------------------------------------------

// The care materials the app ships with (src/app/utils/careSeed.ts), used until the admin saves their own.
const CARE_SEED_SLUGS = ["raffia", "cotton-yarn"];
const STATIC_PAGE_KINDS = { "our-history": "ourHistory", delivery: "delivery", terms: "terms", privacy: "privacy" };

// `rest` is the path after the language. Static segments match without regard to case, as the router does.
function matchPage(rest, lang) {
  const [a, b, c] = rest.map((segment) => segment.toLowerCase());
  if (rest.length === 0) return { kind: "home", lang };
  if (rest.length === 1 && ["collection", "checkout", "account", "admin"].includes(a)) {
    return { kind: a === "admin" ? "admin" : a, lang };
  }
  if (rest.length === 2 && a === "product") return { kind: "product", lang, id: rest[1] };
  if (rest.length === 2 && a === "order") return { kind: "order", lang };
  if (rest.length === 1 && a === "reset-password") return { kind: "reset-password", lang };
  if (a === "pages" && rest.length === 2 && Object.hasOwn(STATIC_PAGE_KINDS, b)) return { kind: STATIC_PAGE_KINDS[b], lang };
  if (a === "pages" && b === "care") {
    if (rest.length === 2) return { kind: "care", lang };
    if (rest.length === 3 && (c === "guarantee" || c === "request")) return { kind: `care-${c}`, lang };
    if (rest.length === 3) return { kind: "care-material", lang, slug: rest[2] };
  }
  return null;
}

// Addresses without a language ("/collection", old links) are sent on to the visitor's language
// by the app, so they are real as long as what follows the language-less start would be.
function resolveRoute(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return { kind: "home", lang: DEFAULT_LANG };
  if (segments.length === 1 && segments[0].toLowerCase() === "admin") return { kind: "admin", lang: DEFAULT_LANG };
  const prefixed = LOCALES.includes(segments[0]);
  const lang = prefixed ? segments[0] : DEFAULT_LANG;
  return matchPage(segments.slice(prefixed ? 1 : 0), lang) ?? { kind: "notFound", lang };
}

// ---------------------------------------------------------------------------------------------
// Words. Titles and descriptions mirror src/app/i18n/locales (seo.* and care.* keys): keep in step.
// ---------------------------------------------------------------------------------------------

const PAGE_SEO = {
  uk: {
    home: {
      title: "В'язані сумки та аксесуари ручної роботи",
      description:
        "Yarné — в'язані сумки, клатчі, капелюхи та пляжні комплекти ручної роботи. Виготовляємо під замовлення, доставляємо по Україні Новою поштою та за кордон.",
    },
    collection: {
      title: "Колекція в'язаних сумок і аксесуарів",
      description:
        "Колекція Yarné: в'язані сумки, клатчі, капелюхи та пляжні костюми ручної роботи. Оберіть колір і замовте — кожен виріб виготовляємо під замовлення.",
    },
    ourHistory: {
      title: "Наша історія: чому ми в'яжемо сумки",
      description:
        "Yarné заснували у 2025 році з ідеєю створити в'язану сумку, яка не виглядатиме звично. Дізнайтеся, як ми обираємо пряжу та створюємо кожен виріб.",
    },
    delivery: {
      title: "Доставка Новою поштою та повернення",
      description:
        "Як ми доставляємо замовлення Yarné по Україні Новою поштою, у які терміни відправляємо та як працює повернення. Умови доставки й повернення в одному місці.",
    },
    terms: {
      title: "Умови використання та замовлення",
      description:
        "Умови використання сайту Yarné та оформлення замовлення: ціни й наявність, оплата, доставка, повернення та авторські права на матеріали сайту.",
    },
    privacy: {
      title: "Політика конфіденційності",
      description:
        "Які дані ми збираємо на сайті Yarné, навіщо, кому їх передаємо, скільки зберігаємо і як ви можете попросити їх показати чи видалити.",
    },
  },
  en: {
    home: {
      title: "Handmade knitted bags and accessories",
      description:
        "Yarné makes handmade knitted bags, clutches, hats and beach sets to order. Choose your colour; delivery across Ukraine by Nova Poshta and abroad.",
    },
    collection: {
      title: "Shop handmade knitted bags, hats and sets",
      description:
        "Browse the Yarné collection: handmade knitted bags, clutches, hats and beach suits. Pick your colour and order; every piece is made to order for you.",
    },
    ourHistory: {
      title: "Our story: why we make knitted bags",
      description:
        "Yarné was founded in 2025 with one idea: a knitted bag that does not look ordinary. Read how we choose our yarn and make every piece by hand.",
    },
    delivery: {
      title: "Delivery in Ukraine by Nova Poshta and returns",
      description:
        "How Yarné orders are shipped across Ukraine by Nova Poshta, how long delivery takes and how returns work. Delivery and return terms in one place.",
    },
    terms: {
      title: "Terms and conditions of use and ordering",
      description:
        "The terms for using the Yarné website and placing an order: prices and availability, payment, delivery, returns and ownership of site content.",
    },
    privacy: {
      title: "Privacy Policy",
      description:
        "What data we collect on the Yarné website, why, who we share it with, how long we keep it and how you can ask us to show or delete it.",
    },
  },
};

// The same titles the app sets on the tab (src/app/hooks/usePageTitle.ts and the care.* locale
// strings): keep the two in step.
const CARE_TITLES = {
  uk: {
    landing: "Догляд за виробами",
    guarantee: "Умови гарантії",
    request: "Замовити догляд",
    guide: (name) => `${name}: догляд`,
  },
  en: {
    landing: "Care",
    guarantee: "Guarantee terms",
    request: "Request care",
    guide: (name) => `${name} care`,
  },
};

const CARE_DESCRIPTIONS = {
  uk: {
    landing: "Покрокові інструкції з догляду за сумками Yarné для кожного матеріалу. Кожен виріб Yarné має нашу довічну гарантію.",
    guarantee:
      "Кожен виріб Yarné має довічну гарантію: якщо щось трапиться, ми безкоштовно перев'яжемо, виперемо або відремонтуємо його у власній майстерні.",
    request:
      "Зателефонуйте або напишіть нам: разом оглянемо ваш виріб, домовимося, що йому потрібно, і пояснимо умови — ще до того, як ви щось надішлете.",
  },
  en: {
    landing: "Step-by-step care guides for each material of your Yarné bag. Every Yarné piece is covered by our lifetime guarantee.",
    guarantee:
      "Every Yarné piece is covered by a lifetime guarantee: if anything goes wrong, we re-knit, wash or repair it for free in our own workshop.",
    request:
      "Call or write to us. We'll look at your piece together, agree what it needs and explain the terms, before you send anything.",
  },
};

const NOT_FOUND = {
  uk: { title: "Сторінку не знайдено", text: "Сторінку, яку ви шукаєте, перенесено, або її тут ніколи й не було." },
  en: { title: "Page not found", text: "The page you're looking for has moved, or perhaps it was never here to begin with." },
};

const WORDS = {
  uk: {
    home: "Головна",
    collection: "Колекція",
    care: "Догляд",
    ourHistory: "Наша історія",
    delivery: "Доставка та повернення",
    terms: "Умови використання",
    privacy: "Політика конфіденційності",
    resetPassword: "Новий пароль",
    checkout: "Оформлення замовлення",
    order: "Статус замовлення",
    account: "Мій кабінет",
    admin: "Адмін",
    allPieces: "Усі вироби",
    material: "Матеріал",
    price: "Ціна",
    colours: "Кольори",
    sizes: "Розміри",
    strap: "Ремінець",
    withStrap: "З ремінцем",
    withoutStrap: "Без ремінця",
    hardware: "Фурнітура",
    details: "Деталі",
    careGuides: "Інструкції з догляду",
    careGuide: "Як доглядати за цим виробом",
    guaranteeTerms: "Умови гарантії",
    requestCare: "Замовити догляд",
    pieces: "Вироби",
    topics: "Теми догляду",
    do: "Можна",
    dont: "Не можна",
    questions: "Короткі питання",
    contact: "Зв'язатися з нами",
    callUs: "Телефон",
    lastUpdated: "Оновлено",
    homeHeading: "Yarné — в'язані сумки ручної роботи на замовлення",
    brandIntro:
      "Yarné — українська майстерня в'язаних аксесуарів, заснована у 2025 році. Ми в'яжемо вручну сумки, клатчі, капелюхи та пляжні комплекти з бавовняної трикотажної пряжі та рафії. Кожен виріб виготовляємо під замовлення: ви обираєте модель, колір, а для частини моделей — колір фурнітури та ремінець.",
    // The same facts the Delivery & Returns and care pages state; keep them in step with those pages.
    homeFacts: [
      ["Як замовити.", "Замовлення оформлюється на сайті без реєстрації. Ми підтверджуємо його протягом 0–1 дня і відправляємо протягом 5 робочих днів після підтвердження."],
      ["Доставка.", "По Україні — Новою поштою у відділення або поштомат. За кордон — Nova Post або іншим перевізником за домовленістю."],
      ["Оплата.", "В Україні — переказом на картку або при отриманні. За кордон — банківським переказом у євро наперед."],
      ["Повернення та гарантія.", "Виріб можна повернути протягом 14 днів без слідів носіння. На кожен виріб діє гарантія: ремонт і перев'язування у нашій майстерні."],
    ],
    collectionIntro: "Усі вироби Yarné з цінами. Кожен виріб виготовляємо під замовлення.",
    historySummary:
      "YARNE був заснований у 2025 році з однією простою ідеєю — створити в'язану сумку, яка не виглядатиме звично.",
    deliverySummary:
      "Умови доставки замовлень Yarné по Україні Новою поштою, терміни відправлення та правила повернення. Повні умови — на цій сторінці.",
    termsSummary:
      "Умови використання сайту Yarné та оформлення замовлення: ціни й наявність, оплата, доставка, повернення та авторські права на матеріали сайту. Повний текст — на цій сторінці.",
    careLanding: { title1: "Доглядаємо за вашою сумкою,", title2: "доки вона ваша.", lookAfter: "Покрокові інструкції для кожного матеріалу з примітками для вашого виробу.", materials: "З чого зроблена ваша сумка?" },
    guaranteeStatement: "Кожен виріб Yarné має нашу довічну гарантію.",
    guaranteeText: "Якщо щось трапиться, ми безкоштовно перев'яжемо, виперемо або відремонтуємо його.",
    guaranteeIntro:
      "Ми створюємо кожну сумку повільно, вручну, щоб її носили роками. Тож якщо з нею щось трапиться, ми подбаємо про неї: перев'яжемо, виперемо й відремонтуємо у власній майстерні — безкоштовно за цією гарантією.",
    guaranteeSeed: [
      ["Що покриває", "Кожну сумку та аксесуар Yarné"],
      ["Скільки діє", "Доки виріб належить вам"],
      ["Коли починається", "З дня доставки замовлення"],
      ["Скільки коштує", "Гарантійний догляд безкоштовний"],
      ["Що потрібно", "Номер замовлення або ім'я та email, з якими ви замовляли"],
    ],
    requestTitle: "Щось пішло не так? Давайте обговоримо.",
    requestIntro: "Зателефонуйте або напишіть нам. Ми разом оглянемо ваш виріб, домовимося, що йому потрібно, і пояснимо умови — ще до того, як ви щось надішлете.",
    includes: "Що входить у гарантію",
    covered: "Покривається",
    notCovered: "Не покривається",
    howItWorks: "Як це працює",
  },
  en: {
    home: "Home",
    collection: "Collection",
    care: "Care",
    ourHistory: "Our History",
    delivery: "Delivery & Returns",
    terms: "Terms & Conditions",
    privacy: "Privacy Policy",
    resetPassword: "New password",
    checkout: "Checkout",
    order: "Order status",
    account: "My Account",
    admin: "Admin",
    allPieces: "All pieces",
    material: "Material",
    price: "Price",
    colours: "Colours",
    sizes: "Sizes",
    strap: "Strap",
    withStrap: "With strap",
    withoutStrap: "Without strap",
    hardware: "Hardware",
    details: "Details",
    careGuides: "Care guides",
    careGuide: "How to care for this piece",
    guaranteeTerms: "Guarantee terms",
    requestCare: "Request care",
    pieces: "Pieces",
    topics: "Care topics",
    do: "Do",
    dont: "Don't",
    questions: "Small questions",
    contact: "Contact us",
    callUs: "Phone",
    lastUpdated: "Last updated",
    homeHeading: "Yarné — handmade knitted bags, made to order in Ukraine",
    brandIntro:
      "Yarné is a Ukrainian knitting atelier founded in 2025. We hand-knit bags, clutches, hats and beach sets from cotton knitted yarn and raffia. Every piece is made to order: you choose the model and colour, and for some models the hardware colour and a strap.",
    homeFacts: [
      ["How to order.", "Order on the site without an account. We confirm within 0–1 days and ship within 5 working days after confirmation."],
      ["Delivery.", "In Ukraine by Nova Poshta to a branch or parcel locker. Abroad by Nova Post, or another carrier by agreement."],
      ["Payment.", "In Ukraine by bank transfer or on pickup. Abroad by bank transfer in euros, in advance."],
      ["Returns and guarantee.", "A piece can be returned within 14 days if unworn. Every piece is covered by our guarantee: repair and re-knitting in our atelier."],
    ],
    collectionIntro: "Every Yarné piece with its price. Each piece is made to order.",
    historySummary:
      "YARNÉ was founded in 2025 with one simple idea — to create a knitted bag that would not look ordinary.",
    deliverySummary:
      "How Yarné orders are delivered across Ukraine by Nova Poshta, when they ship and how returns work. The full terms are on this page.",
    termsSummary:
      "The terms for using the Yarné website and placing an order: prices and availability, payment, delivery, returns and ownership of site content. The full text is on this page.",
    careLanding: { title1: "Care for your bag,", title2: "for as long as it's yours.", lookAfter: "Step-by-step care guides for each material, with notes for your piece.", materials: "What is your bag made of?" },
    guaranteeStatement: "Every Yarné piece is covered by our lifetime guarantee.",
    guaranteeText: "If anything goes wrong, we'll re-knit, wash or repair it for free.",
    guaranteeIntro:
      "We make every bag slowly, by hand, to be worn for years. So if something happens to it, we look after it: re-knitting, washing and repairing it in our own workshop, free under this guarantee.",
    guaranteeSeed: [
      ["Covers", "Every Yarné bag and accessory"],
      ["Lasts", "For as long as the piece is yours"],
      ["Starts", "The day your order is delivered"],
      ["Costs you", "Nothing for covered care"],
      ["You'll need", "Your order number, or the name and email you ordered with"],
    ],
    requestTitle: "Something went wrong? Let's talk it through.",
    requestIntro: "Call or write to us. We'll look at your piece together, agree what it needs and explain the terms, before you send anything.",
    includes: "What your guarantee includes",
    covered: "Covered",
    notCovered: "Not covered",
    howItWorks: "How it works",
  },
};

// ---------------------------------------------------------------------------------------------
// Pieces of the page
// ---------------------------------------------------------------------------------------------

const careMaterials = async () => {
  const care = await getSetting(CARE_CONTENT_KEY);
  return Array.isArray(care?.materials) ? care.materials.filter((material) => material?.slug) : null;
};

const pagePath = (lang, suffix = "") => `/${lang}${suffix}`;

// The price a card and the product page open on: the default colour, no strap
// (src/app/utils/variantStock.ts resolveDisplayPrice).
function defaultColorOf(product) {
  const colors = Array.isArray(product.colors) ? product.colors : [];
  return colors.find((color) => color?.name === product.defaultColor) ?? colors[0];
}

function priceOf(product, color, withLace) {
  if (withLace && color?.priceWithLace != null) return Number(color.priceWithLace);
  if (color?.price != null) return Number(color.price);
  return Number(product.price);
}

function breadcrumbLd(lang, trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, path], index) => ({
      "@type": "ListItem",
      position: index + 1,
      name,
      item: `${SITE_ORIGIN}${path}`,
    })),
  };
}

const organizationLd = (contact) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_ORIGIN}/#organization`,
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: `${SITE_ORIGIN}${LOGO_PATH}`,
  sameAs: [INSTAGRAM_URL, TIKTOK_URL],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer service",
    email: contactEmail(contact),
    ...(contact?.phone ? { telephone: contact.phone } : {}),
    availableLanguage: ["uk", "en"],
  },
});

const websiteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_ORIGIN}/#website`,
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  inLanguage: LOCALES,
  publisher: { "@id": `${SITE_ORIGIN}/#organization` },
});

// The copy of the page for crawlers: plain semantic HTML, hidden the way screen-reader-only
// text is (clipped, not display:none), and replaced by the app the moment it mounts.
const HIDDEN_STYLE = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);border:0";
// The text of /pages/privacy for crawlers, the same as pages.privacy in the locale files (keep the two in step).
const PRIVACY_BODY = {
  uk: [
    "Ця сторінка пояснює, які дані ми збираємо на yarne-acc.com, навіщо, і як із ними поводимося.",
    { heading: true, text: "Хто ми" },
    "Yarné — майстерня в'язаних аксесуарів. Написати нам: {{email}}.",
    { heading: true, text: "Які дані ми отримуємо" },
    "Коли ви оформлюєте замовлення: ім'я та прізвище, номер телефону, електронну адресу, місто й відділення або адресу доставки, склад замовлення.",
    "Коли ви підтверджуєте оплату переказом: фото квитанції.",
    "Коли ви створюєте акаунт: ім'я, електронну адресу, телефон і пароль. Пароль зберігається у зашифрованому вигляді; ми його не бачимо. Якщо ви входите через Google, ми отримуємо від Google ваше ім'я та електронну адресу.",
    "Коли ви пишете нам або залишаєте запит на догляд: те, що ви вказали у зверненні.",
    { heading: true, text: "Навіщо" },
    "Щоб прийняти, виготовити й відправити ваше замовлення, повідомляти про його статус електронною поштою, виконувати гарантію та відповідати на звернення. Ми не надсилаємо рекламних розсилок.",
    { heading: true, text: "Кому ми передаємо дані" },
    "Перевізнику (Нова пошта, Nova Post або інший, узгоджений із вами): ім'я, телефон і адресу доставки.",
    "Сервісам, на яких працює сайт: хостинг, сховище файлів і сервіс надсилання листів. Вони обробляють дані лише для роботи сайту.",
    "Ми не продаємо ваші дані й не передаємо їх рекламним компаніям.",
    { heading: true, text: "Скільки зберігаємо" },
    "Фото квитанції — 30 днів після завершення замовлення, далі видаляється автоматично.",
    "Фото процесу виготовлення, зроблені на ваш запит, — до позначки «Отримано».",
    "Дані замовлення — доки це потрібно для виконання гарантії та обліку.",
    "Акаунт — доки ви його не видалите.",
    { heading: true, text: "Файли на вашому пристрої" },
    "Сайт зберігає на пристрої лише необхідне для роботи: вхід в акаунт, кошик і вибрану мову. Рекламних чи аналітичних файлів cookie немає.",
    { heading: true, text: "Ваші права" },
    "Ви можете попросити показати, виправити або видалити ваші дані. Напишіть на {{email}} — ми відповімо протягом 30 днів.",
  ],
  en: [
    "This page explains what data we collect on yarne-acc.com, why, and how we handle it.",
    { heading: true, text: "Who we are" },
    "Yarné is an atelier of knitted accessories. Contact: {{email}}.",
    { heading: true, text: "What data we receive" },
    "When you place an order: your name, phone number, email address, city and branch or delivery address, and the order contents.",
    "When you confirm a bank transfer: a photo of the receipt.",
    "When you create an account: your name, email, phone and password. The password is stored encrypted; we cannot see it. If you sign in with Google, we receive your name and email from Google.",
    "When you write to us or send a care request: whatever you put in the message.",
    { heading: true, text: "Why" },
    "To accept, make and ship your order, email you its status, honour the guarantee and answer your messages. We send no marketing emails.",
    { heading: true, text: "Who we share data with" },
    "The carrier (Nova Poshta, Nova Post, or another agreed with you): name, phone and delivery address.",
    "The services the site runs on: hosting, file storage and the email sending service. They process data only to run the site.",
    "We do not sell your data or pass it to advertisers.",
    { heading: true, text: "How long we keep it" },
    "Receipt photo: 30 days after the order is finished, then deleted automatically.",
    "Making-of photos taken at your request: until the order is marked Received.",
    "Order data: for as long as it is needed for the guarantee and our records.",
    "Account: until you delete it.",
    { heading: true, text: "Files on your device" },
    "The site stores only what it needs to work: your sign-in, your bag and your chosen language. There are no advertising or analytics cookies.",
    { heading: true, text: "Your rights" },
    "You can ask us to show, correct or delete your data. Write to {{email}} and we will reply within 30 days.",
  ],
};
const privacyHtml = (lang, email) =>
  PRIVACY_BODY[lang].map((item) => (typeof item === "string" ? para(item.split("{{email}}").join(email)) : `<h2>${escapeHtml(item.text)}</h2>`)).join("");

const contentBlock = (inner) => `<main style="${HIDDEN_STYLE}">${inner}</main>`;
const link = (lang, suffix, label) => `<a href="${escapeHtml(pagePath(lang, suffix))}">${escapeHtml(label)}</a>`;
const para = (text) => (text ? `<p>${escapeHtml(text)}</p>` : "");
const list = (items) => (items.length ? `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>` : "");

function siteLinks(lang) {
  const w = WORDS[lang];
  return `<nav>${list([
    link(lang, "/collection", w.collection),
    link(lang, "/pages/care", w.care),
    link(lang, "/pages/our-history", w.ourHistory),
    link(lang, "/pages/delivery", w.delivery),
    link(lang, "/pages/terms", w.terms),
    link(lang, "/pages/privacy", w.privacy),
  ])}</nav>`;
}

function productListHtml(products, lang) {
  return list(
    products.map((product) => {
      const color = defaultColorOf(product);
      const material = productMaterial(product, lang);
      return `${link(lang, `/product/${encodeURIComponent(product.productCode)}`, productName(product, lang))} — ${escapeHtml(formatPrice(priceOf(product, color, false), lang))}${material ? ` (${escapeHtml(material)})` : ""}`;
    }),
  );
}

function productContent(product, lang, extras) {
  const w = WORDS[lang];
  const name = productName(product, lang);
  const color = defaultColorOf(product);
  const material = lang === "en" && cleanText(product.materialEn) ? cleanText(product.materialEn) : cleanText(product.subtitle) || cleanText(product.material);
  const colors = (product.colors ?? []).map((item) => catalogName(item.name, item.nameUk, lang)).filter(Boolean);
  const sizes = (product.sizes ?? []).map((item) => catalogName(item.name, item.nameUk, lang)).filter(Boolean);
  const hardware = (product.furnitureColors ?? []).map((item) => catalogName(item.name, item.nameUk, lang)).filter(Boolean);
  const facts = [];
  if (material) facts.push(`${escapeHtml(w.material)}: ${escapeHtml(material)}`);
  facts.push(`${escapeHtml(w.price)}: ${escapeHtml(formatPrice(priceOf(product, color, false), lang))}`);
  if (product.lace) {
    facts.push(
      `${escapeHtml(w.strap)}: ${escapeHtml(w.withoutStrap)} ${escapeHtml(formatPrice(priceOf(product, color, false), lang))}, ${escapeHtml(w.withStrap)} ${escapeHtml(formatPrice(priceOf(product, color, true), lang))}`,
    );
  }
  if (colors.length) facts.push(`${escapeHtml(w.colours)}: ${escapeHtml(colors.join(", "))}`);
  if (sizes.length) facts.push(`${escapeHtml(w.sizes)}: ${escapeHtml(sizes.join(", "))}`);
  if (hardware.length) facts.push(`${escapeHtml(w.hardware)}: ${escapeHtml(hardware.join(", "))}`);

  const details = (product.details ?? []).map(cleanText).filter(Boolean);
  const guarantee = extras.guarantee;
  const guaranteeTitle = guarantee ? cleanText(lang === "uk" ? guarantee.titleUk : guarantee.titleEn) : "";
  const guaranteeText = guarantee ? cleanText(lang === "uk" ? guarantee.descriptionUk : guarantee.descriptionEn) : "";
  const material_ = extras.careMaterial;
  const links = [];
  if (material_) links.push(link(lang, `/pages/care/${encodeURIComponent(material_.slug)}?piece=${encodeURIComponent(product.productCode)}`, w.careGuide));
  links.push(link(lang, "/pages/care/guarantee", w.guaranteeTerms));
  links.push(link(lang, "/collection", w.collection));

  return contentBlock(
    `<h1>${escapeHtml(name)}</h1>` +
      paragraphsOf(productDescription(product, lang)).map(para).join("") +
      list(facts) +
      (details.length ? `<h2>${escapeHtml(w.details)}</h2>${list(details.map(escapeHtml))}` : "") +
      (guaranteeText ? `<h2>${escapeHtml(guaranteeTitle)}</h2>${para(guaranteeText)}` : "") +
      list(links),
  );
}

function productLd(product, lang, canonical) {
  const color = defaultColorOf(product);
  const material = productMaterial(product, lang) || cleanText(product.subtitle);
  const images = [...new Set([product.primaryImage?.src, ...(product.images ?? []).map((image) => image?.src)].filter(Boolean))]
    .slice(0, 6)
    .map((src) => toAbsoluteImageUrl(src, undefined));
  const colors = (product.colors ?? []).map((item) => catalogName(item.name, item.nameUk, lang)).filter(Boolean);
  const description = cleanText(productDescription(product, lang));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName(product, lang),
    sku: product.productCode,
    ...(images.length ? { image: images } : {}),
    ...(description ? { description } : {}),
    ...(material ? { material } : {}),
    ...(colors.length ? { color: colors.join(", ") } : {}),
    ...(productCategory(product, lang) ? { category: productCategory(product, lang) } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: canonical,
      price: priceOf(product, color, false),
      priceCurrency: "UAH",
      availability: product.isActive === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

// What the collection and home pages say: the intro, then every product with its price.
async function catalogueContent(lang, intro, heading, facts) {
  const w = WORDS[lang];
  const products = await getProducts();
  return contentBlock(
    `<h1>${escapeHtml(heading)}</h1>` +
      para(intro) +
      (facts ?? []).map(([label, text]) => `<p><strong>${escapeHtml(label)}</strong> ${escapeHtml(text)}</p>`).join("") +
      (products?.length ? `<h2>${escapeHtml(w.allPieces)}</h2>${productListHtml(products, lang)}` : "") +
      siteLinks(lang),
  );
}

function contactHtml(lang, contact) {
  const w = WORDS[lang];
  if (!contact) return "";
  const items = [];
  if (contact.phone) items.push(`${escapeHtml(w.callUs)}: <a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phoneDisplay || contact.phone)}</a>`);
  const hours = localized(contact.hours, lang);
  if (hours) items.push(escapeHtml(hours));
  const reply = localized(contact.replyTime, lang);
  if (reply) items.push(escapeHtml(reply));
  if (contact.instagramUrl) items.push(`<a href="${escapeHtml(contact.instagramUrl)}">Instagram ${escapeHtml(contact.instagramHandle || "")}</a>`);
  return items.length ? `<h2>${escapeHtml(w.contact)}</h2>${list(items)}` : "";
}

function guaranteeContentHtml(lang, guarantee) {
  const w = WORDS[lang];
  if (!guarantee) {
    return `<h2>${escapeHtml(w.guaranteeStatement)}</h2>${para(w.guaranteeText)}${para(w.guaranteeIntro)}${list(w.guaranteeSeed.map(([label, value]) => `${escapeHtml(label)}: ${escapeHtml(value)}`))}`;
  }
  const l10n = (value) => localized(value, lang);
  const glance = (guarantee.glance ?? []).map((row) => `${escapeHtml(l10n(row.label))}: ${escapeHtml(l10n(row.value))}`);
  const includes = (guarantee.includes ?? []).map((item) => `${escapeHtml(l10n(item.title))}: ${escapeHtml(l10n(item.text))}`);
  const covered = (guarantee.covered ?? []).map((item) => escapeHtml(l10n(item)));
  const notCovered = (guarantee.notCovered ?? []).map((item) => escapeHtml(l10n(item)));
  const steps = (guarantee.steps ?? []).map((item) => `${escapeHtml(l10n(item.title))}: ${escapeHtml(l10n(item.text))}`);
  const faq = (guarantee.faq ?? []).map((item) => `${escapeHtml(l10n(item.q))} ${escapeHtml(l10n(item.a))}`);
  return (
    para(w.guaranteeStatement) +
    para(w.guaranteeIntro) +
    list(glance) +
    (includes.length ? `<h2>${escapeHtml(w.includes)}</h2>${list(includes)}` : "") +
    (covered.length ? `<h2>${escapeHtml(w.covered)}</h2>${list(covered)}` : "") +
    (notCovered.length ? `<h2>${escapeHtml(w.notCovered)}</h2>${list(notCovered)}${para(l10n(guarantee.notCoveredNote))}` : "") +
    (steps.length ? `<h2>${escapeHtml(w.howItWorks)}</h2><ol>${steps.map((step) => `<li>${step}</li>`).join("")}</ol>` : "") +
    (faq.length ? `<h2>${escapeHtml(w.questions)}</h2>${list(faq)}` : "") +
    para(l10n(guarantee.statutoryNote))
  );
}

function careMaterialHtml(lang, material) {
  const w = WORDS[lang];
  const l10n = (value) => localized(value, lang);
  const topics = (material.topics ?? [])
    .map((topic) => {
      const steps = (topic.steps ?? []).map((step) => `<li>${escapeHtml(l10n(step))}</li>`).join("");
      return `<h3>${escapeHtml(l10n(topic.title))}</h3>${para(l10n(topic.summary))}${para(l10n(topic.warning))}${steps ? `<ol>${steps}</ol>` : ""}`;
    })
    .join("");
  const dos = (material.dos ?? []).map((item) => escapeHtml(l10n(item))).filter(Boolean);
  const donts = (material.donts ?? []).map((item) => escapeHtml(l10n(item))).filter(Boolean);
  const questions = (material.questions ?? []).map((item) => `${escapeHtml(l10n(item.q))} ${escapeHtml(l10n(item.a))}`);
  return (
    para(l10n(material.heroSubtitle)) +
    para(l10n(material.intro)) +
    (topics ? `<h2>${escapeHtml(w.topics)}</h2>${topics}` : "") +
    (dos.length ? `<h2>${escapeHtml(w.do)}</h2>${list(dos)}` : "") +
    (donts.length ? `<h2>${escapeHtml(w.dont)}</h2>${list(donts)}` : "") +
    (questions.length ? `<h2>${escapeHtml(w.questions)}</h2>${list(questions)}` : "")
  );
}

// ---------------------------------------------------------------------------------------------
// One page: its title, description, canonical address, and everything stamped into the HTML.
// ---------------------------------------------------------------------------------------------

const withSiteName = (title) => `${title} — ${SITE_NAME}`;

function notFoundPage(lang) {
  const text = NOT_FOUND[lang];
  return {
    status: 404,
    lang,
    title: withSiteName(text.title),
    description: text.text,
    noindex: true,
    content: contentBlock(`<h1>${escapeHtml(text.title)}</h1>${para(text.text)}${siteLinks(lang)}`),
  };
}

// A page nobody should find through a search: checkout, the account and the admin panel.
function privatePage(lang, title) {
  return {
    status: 200,
    lang,
    title: withSiteName(title),
    description: "",
    noindex: true,
    content: contentBlock(`<h1>${escapeHtml(title)}</h1>${siteLinks(lang)}`),
  };
}

async function describePage(route, reqUrl) {
  const lang = route.lang;
  const w = WORDS[lang];
  const seo = PAGE_SEO[lang];
  const crumbs = [[w.home, pagePath(lang)]];

  switch (route.kind) {
    case "notFound":
      return notFoundPage(lang);

    case "checkout":
    case "account":
    case "order":
    case "admin":
      return privatePage(lang, w[route.kind]);

    case "reset-password":
      return privatePage(lang, w.resetPassword);

    case "home": {
      // The admin's default share card keeps winning for the home page.
      const [shareDefault, contact] = await Promise.all([getShareDefault(), getSetting(CONTACT_CONTENT_KEY)]);
      return {
        status: 200,
        lang,
        title: shareDefault?.title || withSiteName(seo.home.title),
        description: shareDefault?.description || seo.home.description,
        imageUrl: shareDefault?.imageUrl,
        suffix: "",
        jsonLd: [organizationLd(contact), websiteLd()],
        content: await catalogueContent(lang, w.brandIntro, w.homeHeading, w.homeFacts),
      };
    }

    case "collection":
      return {
        status: 200,
        lang,
        title: withSiteName(seo.collection.title),
        description: seo.collection.description,
        suffix: "/collection",
        content: await catalogueContent(lang, w.collectionIntro, w.collection),
      };

    case "ourHistory": {
      const copy = (await getSetting(STATIC_PAGES_KEY))?.ourHistory?.[lang];
      const paragraphs = Array.isArray(copy?.paragraphs) ? copy.paragraphs.map(cleanText).filter(Boolean) : [w.historySummary];
      return {
        status: 200,
        lang,
        title: withSiteName(seo.ourHistory.title),
        description: seo.ourHistory.description,
        suffix: "/pages/our-history",
        content: contentBlock(`<h1>${escapeHtml(cleanText(copy?.title) || w.ourHistory)}</h1>${paragraphs.map(para).join("")}${siteLinks(lang)}`),
      };
    }

    case "delivery": {
      // The text the owner edits in the admin (the page falls back to its built-in text, which this summary stands in for).
      const [delivery, contact] = await Promise.all([getSetting(DELIVERY_CONTENT_KEY), getSetting(CONTACT_CONTENT_KEY)]);
      const sections = Array.isArray(delivery?.sections) ? delivery.sections : [];
      const email = contactEmail(contact);
      const body = sections
        .map((section) => {
          const heading = localized(section?.heading, lang);
          const text = localized(section?.body, lang).split("{{email}}").join(email);
          return (heading ? `<h2>${escapeHtml(heading)}</h2>` : "") + paragraphsOf(text).map(para).join("");
        })
        .join("");
      return {
        status: 200,
        lang,
        title: withSiteName(seo.delivery.title),
        description: seo.delivery.description,
        suffix: "/pages/delivery",
        content: contentBlock(`<h1>${escapeHtml(w.delivery)}</h1>${body || para(w.deliverySummary)}${siteLinks(lang)}`),
      };
    }

    case "terms":
      return {
        status: 200,
        lang,
        title: withSiteName(seo[route.kind].title),
        description: seo[route.kind].description,
        suffix: `/pages/${route.kind}`,
        content: contentBlock(`<h1>${escapeHtml(w[route.kind])}</h1>${para(w[`${route.kind}Summary`])}${siteLinks(lang)}`),
      };

    case "privacy": {
      const contact = await getSetting(CONTACT_CONTENT_KEY);
      return {
        status: 200,
        lang,
        title: withSiteName(seo.privacy.title),
        description: seo.privacy.description,
        suffix: "/pages/privacy",
        content: contentBlock(`<h1>${escapeHtml(w.privacy)}</h1>${privacyHtml(lang, contactEmail(contact))}${siteLinks(lang)}`),
      };
    }

    case "care":
    case "care-guarantee":
    case "care-request": {
      const key = route.kind === "care" ? "landing" : route.kind.slice(5);
      const suffix = route.kind === "care" ? "/pages/care" : `/pages/care/${key}`;
      const title = CARE_TITLES[lang][key];
      const trail = route.kind === "care" ? [...crumbs, [CARE_TITLES[lang].landing, pagePath(lang, "/pages/care")]] : [...crumbs, [CARE_TITLES[lang].landing, pagePath(lang, "/pages/care")], [title, pagePath(lang, suffix)]];
      return {
        status: 200,
        lang,
        title: withSiteName(title),
        description: CARE_DESCRIPTIONS[lang][key],
        suffix,
        jsonLd: [breadcrumbLd(lang, trail)],
        content: await careContent(route.kind, lang),
      };
    }

    case "care-material": {
      const materials = await careMaterials();
      const material = materials?.find((item) => item.slug === route.slug);
      // With the server's copy in hand, a material that is not in it does not exist. Without it
      // (never saved, or the API unreachable) the app's built-in materials apply: serve the page.
      if (materials && !material) return notFoundPage(lang);

      const pieceId = new URL(reqUrl, "http://placeholder").searchParams.get("piece");
      const piece = pieceId ? await fetchProduct(pieceId) : null;
      const name = (piece ? productName(piece, lang) : "") || (material ? localized(material.name, lang) : "");
      const title = name ? CARE_TITLES[lang].guide(name) : CARE_TITLES[lang].landing;
      const suffix = `/pages/care/${encodeURIComponent(route.slug)}`;
      return {
        status: 200,
        lang,
        title: withSiteName(title),
        description: (material && (localized(material.intro, lang) || localized(material.heroSubtitle, lang))) || CARE_DESCRIPTIONS[lang].landing,
        suffix,
        jsonLd: [breadcrumbLd(lang, [...crumbs, [CARE_TITLES[lang].landing, pagePath(lang, "/pages/care")], [title, pagePath(lang, suffix)]])],
        content: contentBlock(
          `<h1>${escapeHtml(material ? localized(material.heroTitle, lang) || title : title)}</h1>${material ? careMaterialHtml(lang, material) : ""}${list([link(lang, "/pages/care", w.careGuides), link(lang, "/pages/care/guarantee", w.guaranteeTerms), link(lang, "/pages/care/request", w.requestCare)])}`,
        ),
      };
    }

    case "product": {
      const result = await getProduct(route.id);
      if (result.status === "missing") return notFoundPage(lang);
      if (result.status === "error") {
        // The API could not be asked: serve the shell as before, but keep it out of the index.
        return { status: 200, lang, title: DEFAULT_TITLE, description: seo.home.description, noindex: true };
      }
      const product = result.product;
      const name = productName(product, lang);
      const suffix = `/product/${encodeURIComponent(product.productCode)}`;
      const canonical = `${SITE_ORIGIN}${pagePath(lang, suffix)}`;
      const [care, guarantee] = await Promise.all([careMaterials(), getSetting(PRODUCT_GUARANTEE_KEY)]);
      const careMaterial = care?.find((item) => Array.isArray(item.pieceProductIds) && item.pieceProductIds.includes(product.productCode)) ?? null;
      return {
        status: 200,
        lang,
        title: withSiteName(name),
        description: cleanText(productDescription(product, lang)),
        imageUrl: product.shareImageUrl || toAbsoluteImageUrl(product.primaryImage?.src, undefined),
        suffix,
        ogType: "product",
        jsonLd: [
          productLd(product, lang, canonical),
          breadcrumbLd(lang, [...crumbs, [w.collection, pagePath(lang, "/collection")], [name, pagePath(lang, suffix)]]),
        ],
        content: productContent(product, lang, { guarantee, careMaterial }),
      };
    }
  }
  return notFoundPage(lang);
}

async function careContent(kind, lang) {
  const w = WORDS[lang];
  if (kind === "care") {
    const materials = await careMaterials();
    const products = await getProducts();
    const byCode = new Map((products ?? []).map((product) => [product.productCode, product]));
    const tiles = (materials ?? CARE_SEED_SLUGS.map((slug) => ({ slug }))).map((material) => {
      const name = localized(material.name, lang) || material.slug;
      const pieces = (material.pieceProductIds ?? [])
        .map((id) => byCode.get(id))
        .filter(Boolean)
        .map((product) => link(lang, `/product/${encodeURIComponent(product.productCode)}`, productName(product, lang)));
      return `${link(lang, `/pages/care/${encodeURIComponent(material.slug)}`, name)}${para(localized(material.intro, lang))}${pieces.length ? `${escapeHtml(w.pieces)}: ${pieces.join(", ")}` : ""}`;
    });
    return contentBlock(
      `<h1>Yarné Care</h1>` +
        para(`${w.careLanding.title1} ${w.careLanding.title2}`) +
        para(`${w.guaranteeStatement} ${w.guaranteeText}`) +
        para(w.careLanding.lookAfter) +
        `<h2>${escapeHtml(w.careLanding.materials)}</h2>${list(tiles)}` +
        list([link(lang, "/pages/care/guarantee", w.guaranteeTerms), link(lang, "/pages/care/request", w.requestCare)]),
    );
  }
  if (kind === "care-guarantee") {
    const guarantee = await getSetting(GUARANTEE_CONTENT_KEY);
    return contentBlock(
      `<h1>${escapeHtml(CARE_TITLES[lang].guarantee)}</h1>${guaranteeContentHtml(lang, guarantee)}` +
        list([link(lang, "/pages/care/request", w.requestCare), link(lang, "/pages/care", w.careGuides)]),
    );
  }
  const contact = await getSetting(CONTACT_CONTENT_KEY);
  return contentBlock(
    `<h1>${escapeHtml(w.requestTitle)}</h1>${para(w.requestIntro)}${contactHtml(lang, contact)}` +
      list([link(lang, "/pages/care/guarantee", w.guaranteeTerms), link(lang, "/pages/care", w.careGuides)]),
  );
}

// ---------------------------------------------------------------------------------------------
// The <head>
// ---------------------------------------------------------------------------------------------

function buildMetaBlock(page) {
  const lang = page.lang;
  const title = escapeHtml(page.title);
  const description = escapeHtml(truncate(cleanText(page.description) || DEFAULT_DESCRIPTION, 200));
  const image = escapeHtml(page.imageUrl || DEFAULT_IMAGE_URL);
  const canonical = page.suffix == null ? null : `${SITE_ORIGIN}${pagePath(lang, page.suffix)}`;
  const otherLang = lang === "uk" ? "en" : "uk";
  const lines = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
  ];
  if (page.noindex) lines.push(`<meta name="robots" content="noindex, nofollow" />`);
  if (canonical) {
    lines.push(`<link rel="canonical" href="${escapeHtml(canonical)}" />`);
    for (const code of LOCALES) lines.push(`<link rel="alternate" hreflang="${code}" href="${escapeHtml(`${SITE_ORIGIN}${pagePath(code, page.suffix)}`)}" />`);
    lines.push(`<link rel="alternate" hreflang="x-default" href="${escapeHtml(`${SITE_ORIGIN}${pagePath(DEFAULT_LANG, page.suffix)}`)}" />`);
  }
  lines.push(
    `<meta property="og:type" content="${page.ogType || "website"}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:locale" content="${lang === "uk" ? "uk_UA" : "en_US"}" />`,
    `<meta property="og:locale:alternate" content="${otherLang === "uk" ? "uk_UA" : "en_US"}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:image" content="${image}" />`,
  );
  if (canonical) lines.push(`<meta property="og:url" content="${escapeHtml(canonical)}" />`);
  lines.push(
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  );
  for (const data of page.jsonLd ?? []) lines.push(jsonLdScript(data));
  return lines.join("\n      ");
}

async function renderHtml(req, pathname) {
  const route = resolveRoute(pathname);
  const page = await describePage(route, req.url);
  // A page without text of its own (a product with no description) falls back to the admin's default card.
  if (!page.description) {
    const shareDefault = await getShareDefault();
    page.description = shareDefault?.description || PAGE_SEO[page.lang].home.description;
  }
  const html = indexHtml
    .replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`)
    .replace("<title>Yarné</title>", () => buildMetaBlock(page));
  return {
    status: page.status,
    body: page.content ? html.replace('<div id="root"></div>', () => `<div id="root">${page.content}</div>`) : html,
  };
}

// ---------------------------------------------------------------------------------------------
// sitemap.xml, robots.txt, llms.txt
// ---------------------------------------------------------------------------------------------

const STATIC_SITEMAP_SUFFIXES = ["", "/collection", "/pages/our-history", "/pages/delivery", "/pages/terms", "/pages/privacy", "/pages/care", "/pages/care/guarantee", "/pages/care/request"];
const sitemapCache = { xml: null, fetchedAt: 0 };

function sitemapEntry(suffix, lastmod) {
  const alternates = [
    ...LOCALES.map((code) => `<xhtml:link rel="alternate" hreflang="${code}" href="${escapeHtml(`${SITE_ORIGIN}${pagePath(code, suffix)}`)}"/>`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeHtml(`${SITE_ORIGIN}${pagePath(DEFAULT_LANG, suffix)}`)}"/>`,
  ].join("");
  return LOCALES.map(
    (code) =>
      `<url><loc>${escapeHtml(`${SITE_ORIGIN}${pagePath(code, suffix)}`)}</loc>${lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : ""}${alternates}</url>`,
  ).join("");
}

async function buildSitemap() {
  if (sitemapCache.xml && Date.now() - sitemapCache.fetchedAt <= CACHE_TTL_MS) return sitemapCache.xml;
  const [products, materials] = await Promise.all([getProducts(), careMaterials()]);
  const slugs = (materials ?? CARE_SEED_SLUGS.map((slug) => ({ slug }))).map((material) => material.slug);
  const entries = [
    ...STATIC_SITEMAP_SUFFIXES.map((suffix) => sitemapEntry(suffix)),
    ...slugs.map((slug) => sitemapEntry(`/pages/care/${encodeURIComponent(slug)}`)),
    // The API gives no "last changed" date, only when the product was created.
    ...(products ?? []).map((product) =>
      sitemapEntry(`/product/${encodeURIComponent(product.productCode)}`, product.createdAt ? new Date(product.createdAt).toISOString() : undefined),
    ),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join("\n")}\n</urlset>\n`;
  // Without the product list the sitemap is incomplete: do not keep it for the full time.
  if (products) {
    sitemapCache.xml = xml;
    sitemapCache.fetchedAt = Date.now();
  }
  return xml;
}

const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Bingbot"];
const PRIVATE_PATHS = ["/admin", "/*/checkout", "/*/account", "/*/order", "/*/reset-password"];

// A crawler with a group of its own ignores the "*" group, so the private paths repeat in each.
function buildRobots() {
  const disallow = PRIVATE_PATHS.map((path) => `Disallow: ${path}`);
  const groups = ["*", ...AI_CRAWLERS].map((agent) => ["User-agent: " + agent, "Allow: /", ...disallow].join("\n"));
  return `${groups.join("\n\n")}\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
}

async function buildLlms() {
  const lang = DEFAULT_LANG;
  const [products, materials, contact] = await Promise.all([getProducts(), careMaterials(), getSetting(CONTACT_CONTENT_KEY)]);
  const url = (suffix) => `${SITE_ORIGIN}${pagePath(lang, suffix)}`;
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is a Ukrainian knitting atelier founded in 2025 that sells handmade knitted bags, clutches, hats and beach sets. Every piece is hand-knitted to order and delivered across Ukraine by Nova Poshta and abroad by Nova Post. Prices below are in Ukrainian hryvnia (UAH); orders abroad are paid in euros. The site is available in Ukrainian (${SITE_ORIGIN}/uk) and English (${SITE_ORIGIN}/en); replace /uk/ with /en/ in any link below for the English page.`,
    "",
    "## How it works",
    "",
    ...WORDS.en.homeFacts.map(([label, text]) => `- ${label} ${text}`),
    "",
    "## Products",
    "",
  ];
  for (const product of products ?? []) {
    const material = productMaterial(product, "en");
    lines.push(`- [${productName(product, "en")}](${url(`/product/${encodeURIComponent(product.productCode)}`)}): ${priceOf(product, defaultColorOf(product), false)} UAH${material ? `, ${material}` : ""}`);
  }
  lines.push(`- [All products](${url("/collection")})`, "", "## Care guides", "");
  lines.push(`- [Yarné Care](${url("/pages/care")}): step-by-step care for each material`);
  for (const material of materials ?? CARE_SEED_SLUGS.map((slug) => ({ slug }))) {
    lines.push(`- [${localized(material.name, "en") || material.slug}](${url(`/pages/care/${encodeURIComponent(material.slug)}`)})`);
  }
  lines.push("", "## Guarantee", "", `- [Guarantee terms](${url("/pages/care/guarantee")}): every Yarné piece is covered by a lifetime guarantee`);
  lines.push(`- [Request care](${url("/pages/care/request")}): ask for re-knitting, washing or repair`);
  lines.push("", "## Delivery and terms", "", `- [Delivery & Returns](${url("/pages/delivery")})`, `- [Terms & Conditions](${url("/pages/terms")})`, `- [Privacy Policy](${url("/pages/privacy")})`, `- [Our History](${url("/pages/our-history")})`);
  lines.push("", "## Contact", "");
  lines.push(`- [Contact us and request care](${url("/pages/care/request")})`);
  lines.push(`- Email: ${contactEmail(contact)}`);
  if (contact?.phone) lines.push(`- Phone: ${contact.phoneDisplay || contact.phone}${localized(contact.hours, "en") ? ` (${localized(contact.hours, "en")})` : ""}`);
  lines.push(`- Instagram: ${contact?.instagramUrl || INSTAGRAM_URL}`, `- TikTok: ${TIKTOK_URL}`, "");
  return lines.join("\n");
}

function applyCommonHeaders(res) {
  for (const { key, value } of extraHeaders) res.setHeader(key, value);
}

// Vite names everything in /assets/ after its content (index-BdRXgK3R.js), so those files never change under
// the same address and can be kept for a year; fonts too. The service worker must be re-checked every time,
// or a new release would not reach people who already have the old one. Anything else keeps the CDN default.
const HASHED_ASSET = /^\/assets\/.+-[\w-]{8}\.[a-z0-9]+$/i;
const FONT_FILE = /\.(woff2?|ttf|otf)$/i;

function staticCacheControl(pathname) {
  if (pathname === "/sw.js") return "no-cache";
  if (HASHED_ASSET.test(pathname) || FONT_FILE.test(pathname)) return "public, max-age=31536000, immutable";
  return null;
}

async function serveStaticFile(req, res, pathname) {
  const filePath = join(distDir, pathname);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(400).end("Bad request");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    applyCommonHeaders(res);
    res.setHeader("Content-Type", MIME_TYPES[extname(filePath)] || "application/octet-stream");
    const cacheControl = staticCacheControl(pathname);
    if (cacheControl) res.setHeader("Cache-Control", cacheControl);
    createReadStream(filePath).pipe(res);
  } catch {
    // no-store: during a deploy a file can be missing for a few seconds, and a cached 404 would
    // keep it "missing" at the CDN for hours after it exists.
    res.writeHead(404, { "Cache-Control": "no-store" }).end("Not found");
  }
}

function sendText(res, body, type) {
  applyCommonHeaders(res);
  res.setHeader("Content-Type", type);
  res.setHeader("Cache-Control", "public, max-age=300");
  res.end(body);
}

// A product has one address, /{lang}/product/{productCode}. The numeric id still opens it, but is sent on there
// (a permanent redirect, query string kept). Unknown ids stay a 404 and an unreachable API serves the page as before.
async function numericProductRedirect(pathname, search) {
  const segments = pathname.split("/").filter(Boolean);
  if (!LOCALES.includes(segments[0])) return null;
  const route = resolveRoute(pathname);
  if (route.kind !== "product" || !/^\d+$/.test(route.id)) return null;
  const result = await getProduct(route.id);
  if (result.status !== "ok") return null;
  const code = String(result.product.productCode ?? "");
  // A code made only of digits would itself be read as an id, so it cannot be a redirect target.
  if (!code || code === route.id || /^d+$/.test(code)) return null;
  return `${pagePath(route.lang, `/product/${encodeURIComponent(code)}`)}${search}`;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://placeholder");
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400).end("Bad request");
      return;
    }

    // Answered here, ahead of the "has a file extension" rule below.
    if (pathname === "/sitemap.xml") return sendText(res, await buildSitemap(), "application/xml; charset=utf-8");
    if (pathname === "/robots.txt") return sendText(res, buildRobots(), "text/plain; charset=utf-8");
    if (pathname === "/llms.txt") return sendText(res, await buildLlms(), "text/plain; charset=utf-8");
    if (pathname === "/favicon.ico") {
      await serveStaticFile(req, res, FAVICON_PATH);
      return;
    }

    // Any path with a file extension is a static asset (js/css/images/...).
    if (extname(pathname)) {
      await serveStaticFile(req, res, pathname);
      return;
    }

    const redirectTo = await numericProductRedirect(pathname, url.search);
    if (redirectTo) {
      applyCommonHeaders(res);
      res.writeHead(301, { Location: redirectTo, "Cache-Control": "public, max-age=300" });
      res.end();
      return;
    }

    const { status, body } = await renderHtml(req, pathname);
    applyCommonHeaders(res);
    res.statusCode = status;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
