import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, X } from "lucide-react";
import type { Locale } from "../../i18n/config";
import { emptyL10n, type L10n } from "../../utils/careContent";
import { CONTACT_SEED, loadContactContent, persistContactContent, type ContactContent } from "../../utils/contactContent";
import { loadPaymentContent, PAYMENT_SEED, persistPaymentContent } from "../../utils/paymentContent";
import {
  DELIVERY_ICONS,
  DELIVERY_LIMITS,
  DELIVERY_SEED,
  loadDeliveryContent,
  persistDeliveryContent,
  type DeliveryContent,
  type DeliveryIcon,
} from "../../utils/deliveryContent";
import {
  PRIVACY_SEED,
  TERMS_LIMITS,
  TERMS_SEED,
  loadPrivacyContent,
  loadTermsContent,
  persistPrivacyContent,
  persistTermsContent,
  type TermsContent,
} from "../../utils/termsContent";
import {
  CARE_REQUEST_LIMITS,
  CARE_REQUEST_SEED,
  loadCareRequestContent,
  persistCareRequestContent,
  type CareRequestContent,
} from "../../utils/careRequestContent";
import {
  GUARANTEE_ICONS,
  GUARANTEE_LIMITS,
  GUARANTEE_SEED,
  loadGuaranteeContent,
  persistGuaranteeContent,
  type GuaranteeContent,
  type GuaranteeIcon,
} from "../../utils/guaranteeContent";
import { CARD_STYLE, DM_SANS, Hint, ICON_BUTTON, INPUT_CLASS, INPUT_STYLE, L10nField, L10nList, Label, PillButton, SectionTitle, moved } from "./AdminCareTab";
import { AdminLanguageSelect } from "./AdminLanguageSelect";

type Props = { onError?: (message: string) => void };

const ICON_LABELS: Record<GuaranteeIcon, string> = {
  knit: "Knitted rows (re-knitting)",
  drop: "Drop (washing)",
  needle: "Needle (repairs)",
  return: "Arrow (returns)",
};

/** A setting's draft: loaded once, compared with what is saved, saved on request. */
function useSettingDraft<T>(load: () => Promise<T | null>, persist: (value: T) => Promise<T>, seed: T, onError: Props["onError"], failed: string) {
  const [draft, setDraft] = useState<T>(seed);
  const [saved, setSaved] = useState<T>(seed);
  /** False while the site still shows the built-in text: nothing has been saved yet. */
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void load()
      .then((loaded) => {
        if (cancelled) return;
        setPublished(loaded != null);
        setDraft(loaded ?? seed);
        setSaved(loaded ?? seed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  const save = async () => {
    setSaving(true);
    try {
      const persisted = await persist(draft);
      setDraft(persisted);
      setSaved(persisted);
      setPublished(true);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : failed);
    } finally {
      setSaving(false);
    }
  };

  return { draft, setDraft, isDirty, published, loading, saving, save };
}

type EditorCardProps = {
  title: string;
  note: string;
  /** The page on the site this card edits; none when it feeds a page that is opened with a private link. */
  path?: string;
  locale: Locale;
  state: { isDirty: boolean; published: boolean; loading: boolean; saving: boolean; save: () => Promise<void> };
  children: ReactNode;
};

function EditorCard({ title, note, path, locale, state, children }: EditorCardProps) {
  return (
    <div className="rounded-[28px] overflow-hidden" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4" style={{ backgroundColor: "rgba(45,36,30,0.03)" }}>
        <div>
          <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
            {title}
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1 max-w-2xl" style={DM_SANS}>
            {note}
            {state.published || state.loading ? "" : " The site currently shows the built-in text below — Save to publish your own."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {path ? (
            <a
              href={`/${locale}${path}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#2D241E]/70 hover:text-[#2D241E] underline underline-offset-2"
              style={DM_SANS}
            >
              Open on site <ExternalLink size={12} />
            </a>
          ) : null}
          <span className={`text-xs ${state.isDirty ? "text-[#9B6B2E]" : "text-[#2D241E]/45"}`} style={DM_SANS}>
            {state.isDirty ? "Unsaved changes" : "Saved"}
          </span>
          <PillButton tone="ink" onClick={() => void state.save()} disabled={(!state.isDirty && state.published) || state.saving || state.loading}>
            {state.saving ? "Saving…" : "Save"}
          </PillButton>
        </div>
      </div>
      <div className="p-5 space-y-5">
        {state.loading ? (
          <p className="text-[#2D241E]/45 text-sm" style={DM_SANS}>
            Loading…
          </p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

type RowListProps<T> = {
  title: string;
  note?: string;
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  addLabel: string;
  create: () => T;
  /** The fields of one row; `update` replaces that row. */
  children: (item: T, update: (item: T) => void, index: number) => ReactNode;
};

/** A list of rows with several fields each: add, remove, move up and down. */
function RowList<T>({ title, note, items, onChange, max, addLabel, create, children }: RowListProps<T>) {
  return (
    <div className="rounded-[24px] p-5" style={CARD_STYLE}>
      <SectionTitle title={title} note={note} />
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-1.5">
            <div className="grow min-w-0 space-y-2">{children(item, (next) => onChange(items.map((existing, i) => (i === index ? next : existing))), index)}</div>
            <button type="button" className={`${ICON_BUTTON} mt-5`} aria-label="Move up" disabled={index === 0} onClick={() => onChange(moved(items, index, -1))}>
              <ArrowUp size={14} />
            </button>
            <button type="button" className={`${ICON_BUTTON} mt-5`} aria-label="Move down" disabled={index === items.length - 1} onClick={() => onChange(moved(items, index, 1))}>
              <ArrowDown size={14} />
            </button>
            <button type="button" className={`${ICON_BUTTON} mt-5`} aria-label="Remove" onClick={() => onChange(items.filter((_, i) => i !== index))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      {items.length < max ? (
        <div className="mt-3">
          <PillButton onClick={() => onChange([...items, create()])}>
            <Plus size={13} /> {addLabel}
          </PillButton>
        </div>
      ) : null}
    </div>
  );
}

function GuaranteeTermsEditor({ locale, onError }: Props & { locale: Locale }) {
  const state = useSettingDraft(loadGuaranteeContent, persistGuaranteeContent, GUARANTEE_SEED, onError, "Failed to save the guarantee terms to the server.");
  const { draft } = state;
  const patch = (change: Partial<GuaranteeContent>) => state.setDraft((prev) => ({ ...prev, ...change }));
  const { short, long } = GUARANTEE_LIMITS;

  return (
    <EditorCard
      title="Guarantee terms"
      note="The /pages/care/guarantee page: what the lifetime guarantee covers and how it works. Its headings are fixed; the lists, steps and questions are yours."
      path="/pages/care/guarantee"
      locale={locale}
      state={state}
    >
      <div className="max-w-[220px]">
        <Label>Last updated</Label>
        <input type="month" value={draft.lastUpdated} onChange={(e) => patch({ lastUpdated: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
        <Hint>Shown as “Last updated: October 2026”. Empty hides the line.</Hint>
      </div>

      <RowList
        title="At a glance"
        note="The card beside the page's title: a short label and its answer."
        items={draft.glance}
        onChange={(glance) => patch({ glance })}
        max={GUARANTEE_LIMITS.glance}
        addLabel="Add row"
        create={() => ({ label: emptyL10n(), value: emptyL10n() })}
      >
        {(row, update) => (
          <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-2">
            <L10nField label="Label" value={row.label} locale={locale} maxLength={short} onChange={(label) => update({ ...row, label })} />
            <L10nField label="Answer" value={row.value} locale={locale} maxLength={long} onChange={(value) => update({ ...row, value })} />
          </div>
        )}
      </RowList>
      <L10nField
        label="Consumer rights note"
        value={draft.statutoryNote}
        locale={locale}
        rows={2}
        maxLength={long}
        onChange={(statutoryNote) => patch({ statutoryNote })}
        hint="The small line under the At a glance rows."
      />

      <RowList
        title="What your guarantee includes"
        note="One card per service."
        items={draft.includes}
        onChange={(includes) => patch({ includes })}
        max={GUARANTEE_LIMITS.includes}
        addLabel="Add card"
        create={() => ({ icon: "knit" as GuaranteeIcon, title: emptyL10n(), text: emptyL10n(), tag: emptyL10n() })}
      >
        {(card, update) => (
          <>
            <div className="grid md:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] gap-2">
              <div>
                <Label>Icon</Label>
                <select value={card.icon} onChange={(e) => update({ ...card, icon: e.target.value as GuaranteeIcon })} className={INPUT_CLASS} style={INPUT_STYLE}>
                  {GUARANTEE_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {ICON_LABELS[icon]}
                    </option>
                  ))}
                </select>
              </div>
              <L10nField label="Title" value={card.title} locale={locale} maxLength={short} onChange={(title) => update({ ...card, title })} />
              <L10nField label="Tag" value={card.tag} locale={locale} maxLength={short} onChange={(tag) => update({ ...card, tag })} hint='E.g. "Free under guarantee".' />
            </div>
            <L10nField label="Text" value={card.text} locale={locale} rows={2} maxLength={long} onChange={(text) => update({ ...card, text })} />
          </>
        )}
      </RowList>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="rounded-[24px] p-5" style={CARD_STYLE}>
          <L10nList label="Covered" items={draft.covered} locale={locale} onChange={(covered) => patch({ covered })} max={GUARANTEE_LIMITS.list} addLabel="Add line" maxLength={long} />
        </div>
        <div className="rounded-[24px] p-5 space-y-4" style={CARD_STYLE}>
          <L10nList label="Not covered" items={draft.notCovered} locale={locale} onChange={(notCovered) => patch({ notCovered })} max={GUARANTEE_LIMITS.list} addLabel="Add line" maxLength={long} />
          <L10nField
            label="Note under Not covered"
            value={draft.notCoveredNote}
            locale={locale}
            rows={3}
            maxLength={long}
            onChange={(notCoveredNote) => patch({ notCoveredNote })}
            hint="A “Request care” link follows it on the page."
          />
        </div>
      </div>

      <RowList
        title="How it works"
        note="Numbered 01, 02… in this order."
        items={draft.steps}
        onChange={(steps) => patch({ steps })}
        max={GUARANTEE_LIMITS.steps}
        addLabel="Add step"
        create={() => ({ title: emptyL10n(), text: emptyL10n() })}
      >
        {(step, update, index) => (
          <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
            <L10nField label={`Step ${index + 1}`} value={step.title} locale={locale} maxLength={short} onChange={(title) => update({ ...step, title })} />
            <L10nField label="Text" value={step.text} locale={locale} maxLength={long} onChange={(text) => update({ ...step, text })} />
          </div>
        )}
      </RowList>

      <RowList
        title="Good to know"
        note="Questions and answers; the first one is open when the page loads."
        items={draft.faq}
        onChange={(faq) => patch({ faq })}
        max={GUARANTEE_LIMITS.faq}
        addLabel="Add question"
        create={() => ({ q: emptyL10n(), a: emptyL10n() })}
      >
        {(item, update, index) => (
          <>
            <L10nField label={`Question ${index + 1}`} value={item.q} locale={locale} maxLength={short} onChange={(q) => update({ ...item, q })} />
            <L10nField label="Answer" value={item.a} locale={locale} rows={2} maxLength={long} onChange={(a) => update({ ...item, a })} />
          </>
        )}
      </RowList>
    </EditorCard>
  );
}

function ContactDetailsEditor({ locale, onError }: Props & { locale: Locale }) {
  const state = useSettingDraft(loadContactContent, persistContactContent, CONTACT_SEED, onError, "Failed to save the contact details to the server.");
  const { draft } = state;
  const patch = (change: Partial<ContactContent>) => state.setDraft((prev) => ({ ...prev, ...change }));

  const field = (label: string, key: "phone" | "phoneDisplay" | "email" | "instagramHandle" | "instagramUrl", placeholder: string, hint?: string) => (
    <div>
      <Label>{label}</Label>
      <input type="text" value={draft[key]} placeholder={placeholder} maxLength={200} onChange={(e) => patch({ [key]: e.target.value })} className={`${INPUT_CLASS} placeholder:text-[#2D241E]/30`} style={INPUT_STYLE} />
      {hint ? <Hint>{hint}</Hint> : null}
    </div>
  );

  return (
    <EditorCard
      title="Contact details"
      note="How a customer reaches you about a piece: shown on /pages/care/request and at the end of the Guarantee terms page."
      path="/pages/care/request"
      locale={locale}
      state={state}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {field("Phone", "phone", "+380671234567", "Leave empty to offer email only: the Call us card and button are then hidden.")}
        {field("Phone as shown", "phoneDisplay", "+380 67 123 45 67", "Empty: the number above, spaced.")}
        <L10nField label="Phone hours" value={draft.hours} locale={locale} maxLength={120} onChange={(hours) => patch({ hours })} />
        <div />
        {field("Email", "email", CONTACT_SEED.email)}
        <L10nField label="Email reply time" value={draft.replyTime} locale={locale} maxLength={120} onChange={(replyTime) => patch({ replyTime })} />
        {field("Instagram name", "instagramHandle", "@yarne.acc", "Empty hides the Instagram line.")}
        {field("Instagram link", "instagramUrl", "https://www.instagram.com/yarne.acc/")}
      </div>
    </EditorCard>
  );
}

const DELIVERY_ICON_LABELS: Record<DeliveryIcon, string> = {
  none: "No icon",
  making: "Scissors (making)",
  ukraine: "House (Ukraine)",
  abroad: "Plane (abroad)",
  returns: "Arrow (returns)",
  defect: "Warning (defect)",
  payment: "Card (payment)",
};

function DeliveryPageEditor({ locale, onError }: Props & { locale: Locale }) {
  const state = useSettingDraft(loadDeliveryContent, persistDeliveryContent, DELIVERY_SEED, onError, "Failed to save the Delivery & Returns page to the server.");
  const { draft } = state;
  const patch = (change: Partial<DeliveryContent>) => state.setDraft((prev) => ({ ...prev, ...change }));
  return (
    <EditorCard
      title="Delivery & Returns page"
      note="The line under the title, the facts at the top, then the sections in order. Separate paragraphs with a blank line; {{email}} becomes the contact email."
      path="/pages/delivery"
      locale={locale}
      state={state}
    >
      <L10nField label="Line under the title" value={draft.intro} locale={locale} rows={2} maxLength={DELIVERY_LIMITS.intro} onChange={(intro) => patch({ intro })} />

      <RowList
        title="At a glance"
        note="Up to four facts in a row at the top: a short value and what it means."
        items={draft.glance}
        onChange={(glance) => patch({ glance })}
        max={DELIVERY_LIMITS.glance}
        addLabel="Add fact"
        create={() => ({ value: emptyL10n(), label: emptyL10n() })}
      >
        {(row, update) => (
          <div className="grid md:grid-cols-[200px_minmax(0,1fr)] gap-2">
            <L10nField label="Value" value={row.value} locale={locale} maxLength={DELIVERY_LIMITS.glanceValue} onChange={(value) => update({ ...row, value })} hint='E.g. "14 days".' />
            <L10nField label="What it means" value={row.label} locale={locale} maxLength={DELIVERY_LIMITS.glanceLabel} onChange={(label) => update({ ...row, label })} />
          </div>
        )}
      </RowList>

      <RowList
        title="Sections"
        note="One card each. A section with steps spans the full width on a computer."
        items={draft.sections}
        onChange={(sections) => patch({ sections })}
        max={DELIVERY_LIMITS.sections}
        addLabel="Add section"
        create={() => ({ icon: "none" as DeliveryIcon, heading: emptyL10n(), body: emptyL10n(), steps: [] })}
      >
        {(section, update, index) => (
          <>
            <div className="max-w-[240px]">
              <Label>Icon</Label>
              <select value={section.icon} onChange={(e) => update({ ...section, icon: e.target.value as DeliveryIcon })} className={INPUT_CLASS} style={INPUT_STYLE}>
                {DELIVERY_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {DELIVERY_ICON_LABELS[icon]}
                  </option>
                ))}
              </select>
            </div>
            {/* Both languages at once: the page is read in either, so neither is left to a language switch. */}
            {(["uk", "en"] as const).map((lang) => (
              <div key={lang} className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <L10nField label={`Heading ${index + 1} (${lang})`} value={section.heading} locale={lang} maxLength={DELIVERY_LIMITS.heading} onChange={(heading) => update({ ...section, heading })} />
                <L10nField label={`Text (${lang})`} value={section.body} locale={lang} rows={5} maxLength={DELIVERY_LIMITS.body} onChange={(body) => update({ ...section, body })} />
              </div>
            ))}
            <L10nList label="Numbered steps (optional)" items={section.steps} locale={locale} onChange={(steps) => update({ ...section, steps })} max={DELIVERY_LIMITS.steps} addLabel="Add step" maxLength={DELIVERY_LIMITS.step} numbered />
          </>
        )}
      </RowList>
    </EditorCard>
  );
}

type LegalEditorProps = Props & {
  locale: Locale;
  title: string;
  path: string;
  load: () => Promise<TermsContent | null>;
  persist: (content: TermsContent) => Promise<TermsContent>;
  seed: TermsContent;
  failed: string;
};

/** Terms & Conditions and Privacy Policy: the same kind of page, each saved on its own. */
function LegalPageEditor({ locale, onError, title, path, load, persist, seed, failed }: LegalEditorProps) {
  const state = useSettingDraft(load, persist, seed, onError, failed);
  const { draft } = state;
  const patch = (change: Partial<TermsContent>) => state.setDraft((prev) => ({ ...prev, ...change }));
  return (
    <EditorCard
      title={title}
      note={`The numbered sections of ${path}, with optional 'In short' points above them. A section without a heading is an unnumbered opening. Separate paragraphs with a blank line; {{email}} becomes the contact email.`}
      path={path}
      locale={locale}
      state={state}
    >
      <div className="max-w-[220px]">
        <Label>Last updated</Label>
        <input type="month" value={draft.lastUpdated} onChange={(e) => patch({ lastUpdated: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
        <Hint>Shown as “Last updated: July 2026”. Empty hides it.</Hint>
      </div>
      <div className="rounded-[24px] p-5" style={CARD_STYLE}>
        <L10nList label="In short (optional)" items={draft.summary} locale={locale} onChange={(summary) => patch({ summary })} max={TERMS_LIMITS.summary} addLabel="Add point" maxLength={TERMS_LIMITS.summaryItem} />
      </div>
      <RowList
        title="Sections"
        note="Numbered 01, 02… in this order, and listed beside the text on a computer."
        items={draft.sections}
        onChange={(sections) => patch({ sections })}
        max={TERMS_LIMITS.sections}
        addLabel="Add section"
        create={() => ({ heading: emptyL10n(), body: emptyL10n() })}
      >
        {(section, update, index) => (
          <>
            {(["uk", "en"] as const).map((lang) => (
              <div key={lang} className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
                <L10nField label={`Heading ${index + 1} (${lang})`} value={section.heading} locale={lang} maxLength={TERMS_LIMITS.heading} onChange={(heading) => update({ ...section, heading })} />
                <L10nField label={`Text (${lang})`} value={section.body} locale={lang} rows={4} maxLength={TERMS_LIMITS.body} onChange={(body) => update({ ...section, body })} />
              </div>
            ))}
          </>
        )}
      </RowList>
    </EditorCard>
  );
}

function CareRequestEditor({ locale, onError }: Props & { locale: Locale }) {
  const state = useSettingDraft(loadCareRequestContent, persistCareRequestContent, CARE_REQUEST_SEED, onError, "Failed to save the Request care page to the server.");
  const { draft } = state;
  const patch = (change: Partial<CareRequestContent>) => state.setDraft((prev) => ({ ...prev, ...change }));
  const L = CARE_REQUEST_LIMITS;
  const itemList = (title: string, note: string, key: "ready" | "next", addLabel: string) => (
    <RowList
      title={title}
      note={note}
      items={draft[key]}
      onChange={(list) => patch({ [key]: list })}
      max={L.items}
      addLabel={addLabel}
      create={() => ({ title: emptyL10n(), text: emptyL10n() })}
    >
      {(item, update) => (
        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
          <L10nField label="Title" value={item.title} locale={locale} maxLength={L.itemTitle} onChange={(value) => update({ ...item, title: value })} />
          <L10nField label="Text" value={item.text} locale={locale} maxLength={L.itemText} onChange={(value) => update({ ...item, text: value })} />
        </div>
      )}
    </RowList>
  );
  return (
    <EditorCard
      title="Request care page"
      note="The words of /pages/care/request. The phone, email and Instagram come from Contact details above."
      path="/pages/care/request"
      locale={locale}
      state={state}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <L10nField label="Title, first line" value={draft.titleLine1} locale={locale} maxLength={L.title} onChange={(titleLine1) => patch({ titleLine1 })} />
        <L10nField label="Title, second line (italic)" value={draft.titleLine2} locale={locale} maxLength={L.title} onChange={(titleLine2) => patch({ titleLine2 })} />
      </div>
      <L10nField label="Line under the title" value={draft.intro} locale={locale} rows={2} maxLength={L.intro} onChange={(intro) => patch({ intro })} />
      {itemList("Have these ready", "What to prepare before getting in touch.", "ready", "Add item")}
      <div className="rounded-[24px] p-5 space-y-4" style={CARD_STYLE}>
        <SectionTitle title="Email template" note="Opened by “Open in email” and copied by “Copy text”." />
        <L10nField label="Subject" value={draft.templateSubject} locale={locale} maxLength={L.subject} onChange={(templateSubject) => patch({ templateSubject })} />
        <L10nField label="Text" value={draft.templateBody} locale={locale} rows={7} maxLength={L.body} onChange={(templateBody) => patch({ templateBody })} />
      </div>
      {itemList("What happens next", "Numbered steps after the customer writes.", "next", "Add step")}
    </EditorCard>
  );
}

function PaymentDetailsEditor({ locale, onError }: Props & { locale: Locale }) {
  const state = useSettingDraft(loadPaymentContent, persistPaymentContent, PAYMENT_SEED, onError, "Failed to save the payment details to the server.");
  return (
    <EditorCard
      title="Payment details"
      note="Bank-transfer details a customer sees on their order's status page after choosing to pay by transfer. Visible only to the customer who placed the order. Empty: the page says the details will be sent by email."
      locale={locale}
      state={state}
    >
      <div className="grid md:grid-cols-2 gap-4">
        {(
          [
            ["Recipient name", "recipient", "ФОП Коваль А.", undefined],
            ["Card number", "cardNumber", "4441 1111 1111 1111", undefined],
            ["IBAN", "iban", "UA00 0000 0000 0000 0000 0000 00000", "Optional: leave empty to show only the card."],
            ["Payment reference (призначення платежу)", "reference", "Оплата замовлення {{order}}", "Write {{order}} where the order number should appear. Leave empty to show no reference at all."],
          ] as const
        ).map(([label, key, placeholder, hint]) => (
          <div key={key}>
            <Label>{label}</Label>
            <input
              type="text"
              value={state.draft[key]}
              placeholder={placeholder}
              maxLength={key === "reference" ? 200 : 120}
              onChange={(e) => state.setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              className={`${INPUT_CLASS} placeholder:text-[#2D241E]/30`}
              style={INPUT_STYLE}
            />
            {hint ? <Hint>{hint}</Hint> : null}
          </div>
        ))}
      </div>
      <p className="text-[#2D241E] uppercase tracking-widest text-xs pt-2" style={{ ...DM_SANS, letterSpacing: "0.12em" }}>
        For customers abroad (EUR)
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {(
          [
            ["Recipient name (Latin letters)", "recipient", "Anna Kowal", undefined],
            ["IBAN", "iban", "DE89 3704 0044 0532 0130 00", undefined],
            ["SWIFT/BIC", "swift", "COBADEFF", undefined],
            ["Bank name", "bankName", "Commerzbank", undefined],
            ["Bank address", "bankAddress", "", "Optional."],
            ["Payment reference", "reference", "Order {{order}}", "Write {{order}} where the order number should appear. Leave empty to show no reference at all."],
            ["Note for the customer", "note", "", "Optional, e.g. who pays the bank's fees."],
          ] as const
        ).map(([label, key, placeholder, hint]) => (
          <div key={`eur-${key}`}>
            <Label>{label}</Label>
            <input
              type="text"
              value={state.draft.eur[key]}
              placeholder={placeholder}
              maxLength={key === "note" ? 600 : 200}
              onChange={(e) => state.setDraft((prev) => ({ ...prev, eur: { ...prev.eur, [key]: e.target.value } }))}
              className={`${INPUT_CLASS} placeholder:text-[#2D241E]/30`}
              style={INPUT_STYLE}
            />
            {hint ? <Hint>{hint}</Hint> : null}
          </div>
        ))}
      </div>
    </EditorCard>
  );
}

/** Admin → Care, under the materials: the Guarantee terms page and the contact details of Request care. */
export function AdminCareServiceEditors({ onError }: Props) {
  const [locale, setLocale] = useState<Locale>("uk");
  return (
    <div className="mt-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title="Guarantee and care service" note="Each card below saves on its own." />
        <div className="flex items-center gap-3">
          <label className="text-[#2D241E]/55 text-xs" style={DM_SANS}>
            Language:
          </label>
          <AdminLanguageSelect value={locale} onChange={setLocale} />
        </div>
      </div>
      <GuaranteeTermsEditor locale={locale} onError={onError} />
      <ContactDetailsEditor locale={locale} onError={onError} />
      <DeliveryPageEditor locale={locale} onError={onError} />
      <CareRequestEditor locale={locale} onError={onError} />
      <LegalPageEditor
        locale={locale}
        onError={onError}
        title="Terms & Conditions page"
        path="/pages/terms"
        load={loadTermsContent}
        persist={persistTermsContent}
        seed={TERMS_SEED}
        failed="Failed to save the Terms & Conditions page to the server."
      />
      <LegalPageEditor
        locale={locale}
        onError={onError}
        title="Privacy Policy page"
        path="/pages/privacy"
        load={loadPrivacyContent}
        persist={persistPrivacyContent}
        seed={PRIVACY_SEED}
        failed="Failed to save the Privacy Policy page to the server."
      />
      <PaymentDetailsEditor locale={locale} onError={onError} />
    </div>
  );
}
