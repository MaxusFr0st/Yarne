// Ukrainian translations. Mirror of `en.ts` — same shape, translated values.

import type { Translations } from "./en";

const uk: Translations = {
  common: {
    viewAll: "Переглянути все",
    discover: "Відкрити",
    explore: "Дослідити",
    shopAll: "Дивитись усе",
    readStory: "Читати нашу історію",
    arrow: "→",
  },
  header: {
    home: "Головна",
    collection: "Колекція",
    journal: "Журнал",
    about: "Про нас",
    admin: "Адмін",
    myAccount: "Мій кабінет",
    signIn: "Увійти",
    cart: "Кошик",
    search: "Пошук",
    openMenu: "Відкрити меню",
    closeMenu: "Закрити меню",
    searchTitle: "Шукати у Knit Gallery",
    searchPlaceholder: "Кашемір, водолазка, букле...",
  },
  language: {
    label: "Мова",
    en: "Англійська",
    uk: "Українська",
    short: { en: "EN", uk: "UA" },
  },
  home: {
    hero: {
      eyebrow: "Нова Колекція — Весна 2026",
      titleLine1: "Сплетено в",
      titleAccent: "тихій розкоші",
      subtitle:
        "Позачасовий трикотаж із найкращих волокон світу. Кожен виріб створено, щоб пережити будь-який сезон.",
      ctaPrimary: "Переглянути колекцію",
      ctaSecondary: "Нові надходження",
      scroll: "Гортайте",
    },
    brandStrip: {
      yarnOriginsLabel: "Походження пряжі",
      yarnOriginsValue: "Шотландія, Італія та Перу",
      craftedSinceLabel: "Створюємо з",
      craftedSinceValue: "2011",
      materialsLabel: "Матеріали",
      materialsValue: "100% натуральні волокна",
      carbonLabel: "Вуглецева нейтральність",
      carbonValue: "З 2023 року",
    },
    bestSellers: {
      eyebrow: "Найулюбленіші",
      title: "Бестселери",
    },
    featured: {
      eyebrow: "Кураторський вибір",
      viewAll: "Дивитись усе",
      shopAllPieces_one: "Переглянути {{count}} модель",
      shopAllPieces_few: "Переглянути {{count}} моделі",
      shopAllPieces_many: "Переглянути всі {{count}} моделей",
      shopAllPieces_other: "Переглянути {{count}} моделей",
    },
    editorial: {
      eyebrow: "Наша філософія",
      titleLine1: "Кожен стібок розповідає",
      titleLine2: "довшу історію",
      paragraph1:
        "Ми отримуємо пряжу з родинних мануфактур Шотландського нагір’я, перуанського альтіплано та передгір’їв Італійських Альп. Кожне волокно обираємо за походженням, дотиком і довговічністю.",
      paragraph2:
        "Виріб Yarné створено не для одного сезону. Його носять, переносять і передають далі — як тихий жест супротиву одноразовій моді.",
      ourStory: "Наша історія",
      yearsLabel: "роки майстерності",
    },
    lookbook: {
      eyebrow: "Лукбук — Зима 2026",
      titleLine1: "Мистецтво вдягатися",
      titleLine2: "для себе",
      cta: "Переглянути лукбук",
    },
    moreFromCollection: {
      eyebrow: "Завершіть образ",
    },
  },
  showcase: {
    defaultEyebrow: "Особлива добірка",
    defaultTitle: "Редакторський вибір",
    openProduct: "Відкрити {{title}}",
  },
  product: {
    badgeNew: "НОВЕ",
    badgeBestseller: "ХІТ ПРОДАЖІВ",
    quickAdd: "Додати",
    fromPrice: "Від {{price}}",
  },
  footer: {
    tagline: "Створено повільно. Носити вічно.",
    columns: {
      shop: {
        title: "Магазин",
        items: ["Нові надходження", "Светри", "Кардигани", "Жилети", "Аксесуари"],
      },
      brand: {
        title: "Бренд",
        items: ["Наша історія", "Журнал", "Майстерність", "Сталий розвиток"],
      },
      help: {
        title: "Допомога",
        items: ["Розмірна сітка", "Доставка та повернення", "Догляд", "Контакти"],
      },
      connect: {
        title: "Зв’язок",
        items: ["Instagram", "Pinterest", "Магазини-партнери", "Розсилка"],
      },
    },
    newsletter: {
      title: "The Edit",
      subtitle: "Новинки, сезонні історії та ранній доступ — у вашій скриньці.",
      placeholder: "Ваша електронна адреса",
      submit: "Підписатися",
    },
    rights: "© {{year}} Yarné — The Knit Gallery. Усі права захищено.",
    legal: { privacy: "Конфіденційність", terms: "Умови", cookies: "Cookies" },
  },
};

export default uk;
