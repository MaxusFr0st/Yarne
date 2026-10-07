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
  /** What to write in the payment note ("призначення"); {{order}} becomes the order number. */
  reference: string;
};

/** Empty until the owner fills it in; an empty reference means just the order number. */
export const PAYMENT_SEED: PaymentContent = { version: 1, recipient: "", cardNumber: "", iban: "", reference: "{{order}}" };

export function normalizePaymentContent(value: unknown): PaymentContent {
  const source = asRecord(value);
  const reference = trimmedText(source.reference, 200);
  return {
    version: 1,
    recipient: trimmedText(source.recipient, 120),
    cardNumber: trimmedText(source.cardNumber, 40),
    iban: trimmedText(source.iban, 40),
    reference: reference || "{{order}}",
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
