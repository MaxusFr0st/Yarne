import { fetchStorefrontSetting, saveStorefrontSetting } from "../api/storefrontSettings";
import { asRecord, trimmedText } from "./careContent";

// The backend whitelists setting keys (StorefrontSettingsService.AllowedKeys) and serves this one to admins only:
// the bank details reach a customer only through their own order's status page.
export const PAYMENT_CONTENT_KEY = "yarne.payment.v1";

/** How to pay by bank transfer, shown on an order's status page once its customer has chosen "transfer". Edited in Admin → Care → Payment details. */
export type PaymentContent = {
  version: 1;
  recipient: string;
  cardNumber: string;
  /** Optional. */
  iban: string;
  /** What to write in the payment note ("призначення"); {{order}} becomes the order number. Empty: no row. */
  reference: string;
  /** For customers abroad: a euro bank account. Empty (all fields) until filled in; old saved settings have none. */
  eur: EurPaymentDetails;
};

export type EurPaymentDetails = {
  /** In Latin letters. */
  recipient: string;
  iban: string;
  swift: string;
  bankName: string;
  bankAddress: string;
  reference: string;
  /** Free text, e.g. about bank fees. */
  note: string;
};

export const EUR_SEED: EurPaymentDetails = { recipient: "", iban: "", swift: "", bankName: "", bankAddress: "", reference: "Order {{order}}", note: "" };

/** Empty until the owner fills it in. An empty reference hides the row on the customer's page (the order number is at the top of it already). */
export const PAYMENT_SEED: PaymentContent = { version: 1, recipient: "", cardNumber: "", iban: "", reference: "Оплата замовлення {{order}}", eur: EUR_SEED };

export function normalizePaymentContent(value: unknown): PaymentContent {
  const source = asRecord(value);
  const reference = trimmedText(source.reference, 200);
  const eur = asRecord(source.eur);
  return {
    version: 1,
    recipient: trimmedText(source.recipient, 120),
    cardNumber: trimmedText(source.cardNumber, 40),
    iban: trimmedText(source.iban, 40),
    reference,
    eur: {
      recipient: trimmedText(eur.recipient, 120),
      iban: trimmedText(eur.iban, 60),
      swift: trimmedText(eur.swift, 20),
      bankName: trimmedText(eur.bankName, 120),
      bankAddress: trimmedText(eur.bankAddress, 200),
      reference: trimmedText(eur.reference, 200),
      note: trimmedText(eur.note, 600),
    },
  };
}

export async function loadPaymentContent(): Promise<PaymentContent | null> {
  const remote = await fetchStorefrontSetting<PaymentContent>(PAYMENT_CONTENT_KEY);
  return remote == null ? null : normalizePaymentContent(remote);
}

export async function persistPaymentContent(content: PaymentContent): Promise<PaymentContent> {
  const normalized = normalizePaymentContent(content);
  await saveStorefrontSetting(PAYMENT_CONTENT_KEY, normalized);
  return normalized;
}
