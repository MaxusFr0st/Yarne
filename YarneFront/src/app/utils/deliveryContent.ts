import { fetchStorefrontSetting, peekStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { asRecord, normalizeL10n, normalizeL10nList, type L10n } from "./careContent";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys).
export const DELIVERY_CONTENT_KEY = "yarne.delivery.v1";

/** The small picture on a section's card. */
export const DELIVERY_ICONS = ["none", "making", "ukraine", "abroad", "returns", "defect", "payment"] as const;
export type DeliveryIcon = (typeof DELIVERY_ICONS)[number];

/** A section: its card's icon, heading and text, and optional numbered steps under the text (the returns, say). */
export type DeliverySection = { icon: DeliveryIcon; heading: L10n; body: L10n; steps: L10n[] };

/** One of the facts in the row at the top of the page: a short value ("14 days") and what it means. */
export type DeliveryGlance = { value: L10n; label: L10n };

/**
 * The Delivery & Returns page: a line under the title, the facts at the top, then the sections in order
 * (paragraphs separated by a blank line; {{email}} becomes the contact address). Edited in Admin → Care.
 */
export type DeliveryContent = { version: 1; intro: L10n; glance: DeliveryGlance[]; sections: DeliverySection[] };

export const DELIVERY_LIMITS = { sections: 12, heading: 120, body: 2000, intro: 300, glance: 4, glanceValue: 40, glanceLabel: 80, steps: 6, step: 160 } as const;

/** The text agreed with the owner, shown until they save their own. */
export const DELIVERY_SEED: DeliveryContent = {
  version: 1,
  intro: { uk: "", en: "" },
  glance: [],
  sections: (
    [
    { heading: { uk: "Підтвердження та виготовлення", en: "Confirmation and making" }, body: { uk: "Ми підтверджуємо замовлення протягом 0–1 дня після оформлення. Кожен виріб ми виготовляємо вручну на замовлення, тому відправка займає до 5 робочих днів після підтвердження.", en: "We confirm an order within 0–1 days of it being placed. Every piece is made by hand to order, so it ships within up to 5 working days after confirmation." } },
    { heading: { uk: "Доставка по Україні", en: "Delivery in Ukraine" }, body: { uk: "Новою поштою у відділення або поштомат. Доставку ви оплачуєте Новій пошті при отриманні. Саме замовлення можна оплатити переказом на картку або при отриманні.", en: "By Nova Poshta to a branch or parcel locker. You pay Nova Poshta for delivery on pickup. The order itself can be paid by bank transfer or on pickup." } },
    { heading: { uk: "Доставка за кордон", en: "Delivery abroad" }, body: { uk: "Nova Post, де вона доступна, а в інших країнах — перевізником, про якого ми домовимося з вами електронною поштою. Вартість доставки ми надсилаємо на пошту до оплати. Оплата лише банківським переказом наперед. У країні отримувача може стягуватися ввізне мито.", en: "By Nova Post where it is available, and elsewhere by another carrier we agree with you by email. We email you the shipping cost before you pay. Payment is by bank transfer in advance only. Your country may charge import tax." } },
    { heading: { uk: "Повернення", en: "Returns" }, body: { uk: "Якщо виріб вам не підійшов, його можна повернути протягом 14 днів після отримання. Виріб не повинен мати слідів носіння чи використання. Спершу напишіть на {{email}} і вкажіть номер замовлення — у відповідь ми надішлемо адресу для повернення. Доставку повернення оплачує покупець. Вартість виробу ми повертаємо після того, як отримаємо й перевіримо його.\n\nВиріб зі слідами носіння чи використання ми назад не приймаємо.", en: "If you don't like the item, you can return it within 14 days of receiving it. It must show no signs of being worn or used. Write to {{email}} with your order number first — we will reply with the return address. You pay for the return delivery. We refund the price of the item after we receive and check it.\n\nAn item that shows signs of wear or use is not accepted back." } },
    { heading: { uk: "Виріб із дефектом", en: "A defective item" }, body: { uk: "Якщо виріб прийшов із дефектом, напишіть на {{email}} протягом 14 днів після отримання: вкажіть номер замовлення й додайте фото. Ми відремонтуємо виріб, виготовимо його заново або повернемо кошти, а доставку оплатимо ми.", en: "If an item arrives defective, write to {{email}} within 14 days of receiving it with your order number and photos. We will repair it, remake it or refund it, and we cover the delivery." } },
    ] as { heading: L10n; body: L10n }[]
  ).map((section) => ({ icon: "none" as DeliveryIcon, steps: [], ...section })),
};

export function normalizeDeliveryContent(value: unknown): DeliveryContent {
  const source = asRecord(value);
  const sections = (Array.isArray(source.sections) ? source.sections : [])
    .slice(0, DELIVERY_LIMITS.sections)
    .map((item) => {
      const row = asRecord(item);
      const icon = DELIVERY_ICONS.includes(row.icon as DeliveryIcon) ? (row.icon as DeliveryIcon) : "none";
      return {
        icon,
        heading: normalizeL10n(row.heading, DELIVERY_LIMITS.heading),
        body: normalizeL10n(row.body, DELIVERY_LIMITS.body),
        steps: normalizeL10nList(row.steps, DELIVERY_LIMITS.steps, DELIVERY_LIMITS.step),
      };
    })
    .filter((section) => section.heading.uk || section.heading.en || section.body.uk || section.body.en);
  const glance = (Array.isArray(source.glance) ? source.glance : [])
    .slice(0, DELIVERY_LIMITS.glance)
    .map((item) => {
      const row = asRecord(item);
      return { value: normalizeL10n(row.value, DELIVERY_LIMITS.glanceValue), label: normalizeL10n(row.label, DELIVERY_LIMITS.glanceLabel) };
    })
    .filter((row) => row.value.uk || row.value.en);
  return { version: 1, intro: normalizeL10n(source.intro, DELIVERY_LIMITS.intro), glance, sections };
}

export function getInitialDeliveryContent(): DeliveryContent | null {
  const saved = peekStorefrontSetting(DELIVERY_CONTENT_KEY)?.value;
  return saved == null ? null : normalizeDeliveryContent(saved);
}

export async function loadDeliveryContent(): Promise<DeliveryContent | null> {
  try {
    const remote = await fetchStorefrontSetting<DeliveryContent>(DELIVERY_CONTENT_KEY);
    return remote == null ? null : normalizeDeliveryContent(remote);
  } catch {
    return getInitialDeliveryContent();
  }
}

export async function persistDeliveryContent(content: DeliveryContent): Promise<DeliveryContent> {
  const normalized = normalizeDeliveryContent(content);
  await saveStorefrontSetting(DELIVERY_CONTENT_KEY, normalized);
  return normalized;
}
