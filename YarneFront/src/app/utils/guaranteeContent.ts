import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import type { Locale } from "../i18n/config";
import { asRecord, isEmptyL10n, normalizeL10n, normalizeL10nList, trimmedText, type L10n } from "./careContent";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const GUARANTEE_CONTENT_KEY = "yarne.guarantee.terms.v1";

export const GUARANTEE_ICONS = ["knit", "drop", "needle", "return"] as const;
export type GuaranteeIcon = (typeof GUARANTEE_ICONS)[number];

export type GuaranteeGlanceRow = { label: L10n; value: L10n };
export type GuaranteeInclude = { icon: GuaranteeIcon; title: L10n; text: L10n; tag: L10n };
export type GuaranteeStep = { title: L10n; text: L10n };
export type GuaranteeQuestion = { q: L10n; a: L10n };

/** Everything the Guarantee terms page (/pages/care/guarantee) says, edited in Admin → Care. */
export type GuaranteeContent = {
  version: 1;
  /** Year and month, "2026-10"; empty hides the "Last updated" line. */
  lastUpdated: string;
  /** The "At a glance" card. */
  glance: GuaranteeGlanceRow[];
  /** "What your guarantee includes" cards. */
  includes: GuaranteeInclude[];
  covered: L10n[];
  notCovered: L10n[];
  notCoveredNote: L10n;
  /** "How it works", numbered in order. */
  steps: GuaranteeStep[];
  faq: GuaranteeQuestion[];
  statutoryNote: L10n;
};

export const GUARANTEE_LIMITS = {
  glance: 8,
  includes: 6,
  list: 12,
  steps: 6,
  faq: 12,
  short: 120,
  long: 600,
} as const;

function pairs<A extends string, B extends string>(
  value: unknown,
  first: A,
  second: B,
  max: number,
  secondLength: number,
): Record<A | B, L10n>[] {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const source = asRecord(item);
      return {
        [first]: normalizeL10n(source[first], GUARANTEE_LIMITS.short),
        [second]: normalizeL10n(source[second], secondLength),
      } as Record<A | B, L10n>;
    })
    .filter((item) => !isEmptyL10n(item[first]) || !isEmptyL10n(item[second]))
    .slice(0, max);
}

export function normalizeGuaranteeContent(value: unknown): GuaranteeContent {
  const source = asRecord(value);
  const lastUpdated = trimmedText(source.lastUpdated, 7);
  return {
    version: 1,
    lastUpdated: /^\d{4}-(0[1-9]|1[0-2])$/.test(lastUpdated) ? lastUpdated : "",
    glance: pairs(source.glance, "label", "value", GUARANTEE_LIMITS.glance, GUARANTEE_LIMITS.long),
    includes: (Array.isArray(source.includes) ? source.includes : [])
      .map((item) => {
        const include = asRecord(item);
        return {
          icon: GUARANTEE_ICONS.includes(include.icon as GuaranteeIcon) ? (include.icon as GuaranteeIcon) : "knit",
          title: normalizeL10n(include.title, GUARANTEE_LIMITS.short),
          text: normalizeL10n(include.text, GUARANTEE_LIMITS.long),
          tag: normalizeL10n(include.tag, GUARANTEE_LIMITS.short),
        };
      })
      .filter((item) => !isEmptyL10n(item.title) || !isEmptyL10n(item.text))
      .slice(0, GUARANTEE_LIMITS.includes),
    covered: normalizeL10nList(source.covered, GUARANTEE_LIMITS.list, GUARANTEE_LIMITS.long),
    notCovered: normalizeL10nList(source.notCovered, GUARANTEE_LIMITS.list, GUARANTEE_LIMITS.long),
    notCoveredNote: normalizeL10n(source.notCoveredNote, GUARANTEE_LIMITS.long),
    steps: pairs(source.steps, "title", "text", GUARANTEE_LIMITS.steps, GUARANTEE_LIMITS.long),
    faq: pairs(source.faq, "q", "a", GUARANTEE_LIMITS.faq, GUARANTEE_LIMITS.long),
    statutoryNote: normalizeL10n(source.statutoryNote, GUARANTEE_LIMITS.long),
  };
}

const t = (en: string, uk: string): L10n => ({ en, uk });
const FREE_UNDER_GUARANTEE = t("Free under guarantee", "Безкоштовно за гарантією");

/** The built-in terms, shown until the admin saves their own (Admin → Care → Guarantee terms). */
export const GUARANTEE_SEED: GuaranteeContent = {
  version: 1,
  lastUpdated: "2026-10",
  glance: [
    { label: t("Covers", "Що покриває"), value: t("Every Yarné bag and accessory", "Кожну сумку та аксесуар Yarné") },
    { label: t("Lasts", "Скільки діє"), value: t("For as long as the piece is yours", "Доки виріб належить вам") },
    { label: t("Starts", "Коли починається"), value: t("The day your order is delivered", "З дня доставки замовлення") },
    { label: t("Costs you", "Скільки коштує"), value: t("Nothing for covered care", "Гарантійний догляд безкоштовний") },
    {
      label: t("You'll need", "Що потрібно"),
      value: t(
        "Your order number, or the name and email you ordered with",
        "Номер замовлення або ім'я та email, з якими ви замовляли",
      ),
    },
  ],
  includes: [
    {
      icon: "knit",
      title: t("Re-knitting", "Перев'язування"),
      text: t(
        "Loose, pulled or broken stitches are re-knitted by hand, so your piece looks as it should again.",
        "Розпущені, витягнуті чи пошкоджені петлі перев'язуємо вручну, щоб виріб знову мав належний вигляд.",
      ),
      tag: FREE_UNDER_GUARANTEE,
    },
    {
      icon: "drop",
      title: t("Workshop washing", "Прання в майстерні"),
      text: t(
        "We deep-clean your bag the way its fibre needs, then reshape it and let it dry slowly.",
        "Глибоко чистимо сумку так, як потребує її волокно, потім повертаємо їй форму й повільно сушимо.",
      ),
      tag: FREE_UNDER_GUARANTEE,
    },
    {
      icon: "needle",
      title: t("Repairs", "Ремонт"),
      text: t(
        "Handles, straps, linings and fastenings that come loose or wear through are repaired or replaced.",
        "Ручки, ремінці, підкладку й застібки, що розхиталися чи протерлися, ремонтуємо або замінюємо.",
      ),
      tag: FREE_UNDER_GUARANTEE,
    },
    {
      icon: "return",
      title: t("Returns", "Повернення"),
      text: t(
        "Not quite right? Return unworn pieces with their original tags within 14 days of delivery.",
        "Не зовсім те? Поверніть виріб без слідів носіння та з оригінальними бірками протягом 14 днів після доставки.",
      ),
      tag: t("Free for 14 days", "Безкоштовно протягом 14 днів"),
    },
  ],
  covered: [
    t("Stitches that come loose, pull or break", "Петлі, що розпустилися, витягнулися чи порвалися"),
    t("Seams, handles and straps that come apart", "Шви, ручки та ремінці, що розійшлися"),
    t("Wear from everyday use", "Зношення від щоденного використання"),
    t("Marks and stains we can safely clean", "Сліди та плями, які можна безпечно вивести"),
    t("Raffia that loses its shape", "Рафія, що втратила форму"),
  ],
  notCovered: [
    t("Loss or theft", "Втрата або крадіжка"),
    t("Damage from fire, bleach or harsh chemicals", "Пошкодження вогнем, відбілювачем чи агресивною хімією"),
    t("Pieces altered or repaired somewhere else", "Вироби, які переробляли чи ремонтували деінде"),
    t(
      "Natural ageing of the fibre, like softening or a gentle change in colour",
      "Природне старіння волокна: пом'якшення чи легка зміна кольору",
    ),
  ],
  notCoveredNote: t(
    "Not covered doesn't mean we can't help. Get in touch, and we'll tell you what's possible and what it would cost before we do anything.",
    "«Не покривається» не означає, що ми не допоможемо. Зв'яжіться з нами — ми скажемо, що можливо і скільки це коштуватиме, перш ніж щось робити.",
  ),
  steps: [
    {
      title: t("Contact us", "Зв'яжіться з нами"),
      text: t("Call or email us with a photo of your piece.", "Зателефонуйте або напишіть нам і надішліть фото виробу."),
    },
    {
      title: t("We agree the terms", "Домовляємося про умови"),
      text: t(
        "We tell you what it needs, how long it takes, and confirm it's covered.",
        "Кажемо, що потрібно виробу, скільки це триватиме, і підтверджуємо, що це покриває гарантія.",
      ),
    },
    {
      title: t("Send it to our workshop", "Надішліть виріб до майстерні"),
      text: t("We explain exactly how to send it to us.", "Ми детально пояснимо, як його надіслати."),
    },
    {
      title: t("It comes back cared for", "Він повертається доглянутим"),
      text: t(
        "Re-knitted, washed or repaired, and sent back to you.",
        "Перев'язаний, випраний чи відремонтований — і надісланий вам назад.",
      ),
    },
  ],
  faq: [
    {
      q: t("Do I need my receipt?", "Чи потрібен чек?"),
      a: t(
        "No. Your order number is enough, or the name and email you ordered with. We'll find your order.",
        "Ні. Достатньо номера замовлення або імені та email, з якими ви замовляли. Ми знайдемо ваше замовлення.",
      ),
    },
    {
      q: t("What if my bag was a gift?", "А якщо сумку мені подарували?"),
      a: t(
        "It's still covered. Ask for the order number if you can, or simply tell us roughly when it was bought.",
        "Гарантія діє так само. Якщо можете, дізнайтеся номер замовлення або просто скажіть, коли приблизно її купили.",
      ),
    },
    {
      q: t("Who pays for sending it to the workshop?", "Хто оплачує доставку до майстерні?"),
      a: t(
        "We'll confirm this with you when we agree the terms for your piece, before you send anything.",
        "Ми узгодимо це з вами разом з умовами для вашого виробу — до того, як ви щось надішлете.",
      ),
    },
    {
      q: t("How long does care take?", "Скільки триває догляд?"),
      a: t(
        "Most pieces are back with you in about 2–3 weeks. We'll give you a date when we agree the terms.",
        "Більшість виробів повертаються приблизно за 2–3 тижні. Точну дату назвемо, коли домовимося про умови.",
      ),
    },
  ],
  statutoryNote: t(
    "This guarantee is in addition to your statutory consumer rights and doesn't affect them.",
    "Ця гарантія доповнює ваші законні права споживача й не обмежує їх.",
  ),
};

/** First paint: the last server answer if this browser has one; null when the admin has never saved the terms. */
export function getInitialGuaranteeContent(): GuaranteeContent | null {
  const saved = peekStorefrontSetting(GUARANTEE_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeGuaranteeContent(saved);
}

export async function loadGuaranteeContent(): Promise<GuaranteeContent | null> {
  try {
    const remote = await fetchStorefrontSetting<GuaranteeContent>(GUARANTEE_CONTENT_KEY);
    return remote == null ? null : normalizeGuaranteeContent(remote);
  } catch {
    return getInitialGuaranteeContent(); // unreachable server: keep the last answer
  }
}

export async function persistGuaranteeContent(content: GuaranteeContent): Promise<GuaranteeContent> {
  const normalized = normalizeGuaranteeContent(content);
  await saveStorefrontSetting(GUARANTEE_CONTENT_KEY, normalized);
  return normalized;
}

/** "2026-10" → "October 2026" / "жовтень 2026". */
export function formatGuaranteeDate(lastUpdated: string, locale: Locale): string {
  const [year, month] = lastUpdated.split("-").map(Number);
  if (!year || !month) return "";
  const name = new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { month: "long" }).format(new Date(year, month - 1, 1));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}
