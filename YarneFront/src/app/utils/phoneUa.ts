/**
 * Ukrainian mobile number handling for checkout.
 *
 * Delivery is Nova Poshta, i.e. Ukraine only, so the field is pinned to +380 and the
 * subscriber part is a fixed 9 digits (e.g. +380 67 123 45 67). Keeping the rule that tight
 * is what lets the field reject a wrong number while the user is still looking at it, rather
 * than the courier finding out later.
 */

export const UA_SUBSCRIBER_DIGITS = 9;

export type PhoneProblem = "letters" | "tooLong" | "tooShort" | null;

/**
 * Extracts just the subscriber digits from anything the user typed or pasted, tolerating
 * "+380…", "380…", "0…" and any spacing/punctuation in between.
 */
export function toSubscriberDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380")) digits = digits.slice(3);
  else if (digits.startsWith("80")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** `067 1234567` → `+380 67 123 45 67`, formatting only as far as the user has typed. */
export function formatUaPhone(raw: string): string {
  const d = toSubscriberDigits(raw).slice(0, UA_SUBSCRIBER_DIGITS);
  if (!d) return "";
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+380 ${parts.join(" ")}`;
}

/** Digits only, for sending to the API. Empty until the number is complete. */
export function toE164Ua(raw: string): string {
  const d = toSubscriberDigits(raw);
  return d.length === UA_SUBSCRIBER_DIGITS ? `+380${d}` : "";
}

/**
 * What is wrong with the current input, if anything. `tooShort` is deliberately not reported
 * while the user is mid-type — the caller decides when incompleteness becomes an error.
 */
export function inspectUaPhone(raw: string): PhoneProblem {
  if (!raw.trim()) return null;
  if (/[^\d\s+()\-]/.test(raw)) return "letters";
  if (toSubscriberDigits(raw).length > UA_SUBSCRIBER_DIGITS) return "tooLong";
  if (toSubscriberDigits(raw).length < UA_SUBSCRIBER_DIGITS) return "tooShort";
  return null;
}

export function isCompleteUaPhone(raw: string): boolean {
  return inspectUaPhone(raw) === null && toSubscriberDigits(raw).length === UA_SUBSCRIBER_DIGITS;
}
