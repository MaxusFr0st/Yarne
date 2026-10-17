import { AlertCircle, CreditCard, Home as HomeIcon, Plane, RotateCcw, Scissors } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollReveal } from "../components/ScrollReveal";
import { LABEL, PILL, PILL_CREAM, PILL_OUTLINE_ON_INK, SERIF, SANS } from "../components/care/careUi";
import { useContactContent, useDeliveryContent, usePrivacyContent, useTermsContent } from "../hooks/useCareServiceContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { usePageTitle } from "../hooks/usePageTitle";
import { useLocale } from "../i18n/useLocale";
import type { Locale } from "../i18n/config";
import { careText, type L10n } from "../utils/careContent";
import { mailtoHref } from "../utils/contactContent";
import type { DeliveryIcon } from "../utils/deliveryContent";
import { useReducedMotion } from "motion/react";

type StaticPageKey = "delivery" | "terms" | "privacy";

type Props = {
  pageKey: StaticPageKey;
};

/** Paragraphs are separated by a blank line; {{email}} becomes the contact address. */
function paragraphsOf(text: string, email: string): string[] {
  return text
    .split("{{email}}")
    .join(email)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function SectionIcon({ icon }: { icon: DeliveryIcon }) {
  const props = { size: 17, strokeWidth: 1.5, "aria-hidden": true } as const;
  switch (icon) {
    case "making":
      return <Scissors {...props} />;
    case "ukraine":
      return <HomeIcon {...props} />;
    case "abroad":
      return <Plane {...props} />;
    case "returns":
      return <RotateCcw {...props} />;
    case "defect":
      return <AlertCircle {...props} />;
    case "payment":
      return <CreditCard {...props} />;
    default:
      return null;
  }
}

/** The page's eyebrow, title and the line under it: shared by Delivery, Terms and Privacy. */
function PageHead({ eyebrow, title, intro, aside }: { eyebrow: string; title: string; intro?: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-10 md:items-end">
      <div className="flex flex-col gap-2.5">
        <span className={`${LABEL} text-[0.72rem] md:text-[11.5px] text-[#4A0E0E]`}>{eyebrow}</span>
        <h1 className="font-normal text-[clamp(38px,6vw,64px)] leading-[1.02] tracking-[-0.01em]" style={SERIF}>
          {title}
        </h1>
      </div>
      {intro ? <p className="text-[14px] md:text-[15px] leading-[1.65] text-[#2D241E]/72 max-w-[46ch]">{intro}</p> : aside ?? null}
    </div>
  );
}

/** The dark card at the end of Delivery & Returns: how to reach the atelier. */
function ContactCard({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  const { content: contact } = useContactContent();
  const phone = contact.phone.trim();
  const phoneShown = contact.phoneDisplay.trim() || phone;
  const hours = careText(contact.hours, locale);
  return (
    <div className="rounded-[26px] md:rounded-[32px] bg-[#2D241E] text-[#F5F2ED] px-5 py-6 md:px-9 md:py-8 flex flex-col gap-4 md:grid md:grid-cols-[minmax(0,1.2fr)_auto] md:items-center md:gap-8">
      <div className="flex flex-col gap-2">
        <span className={`${LABEL} text-[0.72rem] md:text-[11.5px] text-[#F5F2ED]/72`}>{t("pages.delivery.contactEyebrow")}</span>
        <p className="text-[26px] md:text-[32px] leading-[1.1]" style={SERIF}>
          {t("pages.delivery.contactTitle")}
        </p>
        <p className="text-[13.5px] leading-[1.6] text-[#F5F2ED]/85 break-words">
          {[contact.email, phoneShown, hours].filter(Boolean).join(" · ")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <a href={mailtoHref(contact.email)} className={`${PILL} ${PILL_CREAM} h-[50px] px-6 justify-center`}>
          {t("pages.delivery.write")}
        </a>
        {phone ? (
          <a href={`tel:${phone}`} className={`${PILL} ${PILL_OUTLINE_ON_INK} h-[50px] px-6 justify-center`}>
            {t("pages.delivery.call")}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function DeliveryPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduced = useReducedMotion() ?? false;
  const { content: delivery, ready } = useDeliveryContent();
  const { content: contact } = useContactContent();
  const text = (value: L10n) => careText(value, locale);
  const intro = text(delivery.intro);
  const glance = delivery.glance.filter((row) => text(row.value));

  return (
    <div className="flex flex-col gap-7 md:gap-9" style={firstVisitRevealStyle(ready, reduced)}>
      <PageHead eyebrow={t("pages.delivery.eyebrow")} title={t("pages.delivery.title")} intro={intro} />

      {glance.length > 0 && (
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {glance.map((row, index) => (
            <div key={index} className="rounded-[20px] md:rounded-[24px] bg-[#EDE9E2] px-3.5 pt-3.5 pb-4 md:px-[22px] md:pt-5 md:pb-[22px] flex flex-col-reverse gap-1">
              <dt className="text-[12.5px] leading-[1.4] text-[#2D241E]/75">{text(row.label)}</dt>
              <dd className="text-[24px] md:text-[30px] leading-[1.05]" style={SERIF}>
                {text(row.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="grid gap-2.5 md:grid-cols-2 md:gap-3.5">
        {delivery.sections.map((section, index) => {
          const steps = section.steps.map(text).filter(Boolean);
          return (
            <section
              key={index}
              className={`rounded-[24px] md:rounded-[30px] bg-[#EDE9E2] px-[18px] pt-5 pb-[22px] md:px-[30px] md:pt-7 md:pb-[30px] flex flex-col gap-2.5 ${steps.length ? "md:col-span-2" : ""}`}
            >
              {section.icon !== "none" && (
                <span className="w-[34px] h-[34px] md:w-10 md:h-10 rounded-full bg-[#F5F2ED] text-[#4A0E0E] flex items-center justify-center">
                  <SectionIcon icon={section.icon} />
                </span>
              )}
              {text(section.heading) ? (
                <h2 className="font-normal text-[25px] md:text-[30px] leading-[1.1]" style={SERIF}>
                  {text(section.heading)}
                </h2>
              ) : null}
              {paragraphsOf(text(section.body), contact.email).map((paragraph, i) => (
                <p key={i} className="text-[14px] md:text-[14.5px] leading-[1.65] text-[#2D241E]/78">
                  {paragraph}
                </p>
              ))}
              {steps.length > 0 && (
                <ol className="mt-1 grid gap-2.5 md:grid-cols-4 md:gap-3">
                  {steps.map((step, i) => (
                    <li key={i} className="rounded-2xl bg-[#F5F2ED] px-3.5 py-3 flex flex-col gap-1 text-[13.5px] leading-[1.5]">
                      <span className="text-[24px] leading-none text-[#4A0E0E]" style={SERIF} aria-hidden>
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })}
      </div>

      <ContactCard locale={locale} />
    </div>
  );
}

type LegalSection = { heading: string; paragraphs: string[] };

/** Terms and Privacy: an optional "In short" box, the list of sections, then the numbered sections. */
function LegalLayout({ eyebrow, title, updated, summary, sections }: { eyebrow: string; title: string; updated: string; summary: string[]; sections: LegalSection[] }) {
  const { t } = useTranslation();
  const anchor = (index: number) => `section-${index + 1}`;
  const jump = (event: React.MouseEvent<HTMLAnchorElement>, index: number) => {
    // Scrolled here rather than through the #hash, so the address and the scroll logic stay untouched.
    event.preventDefault();
    document.getElementById(anchor(index))?.scrollIntoView({ block: "start", behavior: "smooth" });
  };
  const numbered = sections.filter((section) => section.heading);

  return (
    <div className="flex flex-col gap-7 md:gap-10">
      <PageHead
        eyebrow={eyebrow}
        title={title}
        aside={
          updated ? (
            <span className="self-start md:justify-self-end inline-flex items-center h-[30px] px-3 rounded-full bg-[#EDE9E2] text-xs text-[#2D241E]/80">{updated}</span>
          ) : null
        }
      />
      <div className="flex flex-col gap-5 md:grid md:grid-cols-[240px_minmax(0,1fr)] md:gap-14 md:items-start">
        {numbered.length > 1 ? (
          <nav aria-label={t("pages.legal.contents")} className="md:sticky md:top-[calc(var(--main-header-h)+24px)] rounded-[20px] bg-[#EDE9E2] px-[18px] py-4">
            <ol className="flex flex-col gap-2 text-[13px]">
              {sections.map((section, index) =>
                section.heading ? (
                  <li key={index}>
                    <a href={`#${anchor(index)}`} onClick={(event) => jump(event, index)} className="flex gap-2.5 text-[#2D241E] hover:text-[#4A0E0E]">
                      <span className="min-w-[1.4em] text-[#4A0E0E] tabular-nums">{numbered.indexOf(section) + 1}</span>
                      {section.heading}
                    </a>
                  </li>
                ) : null,
              )}
            </ol>
          </nav>
        ) : (
          <span className="hidden md:block" />
        )}
        <div className="flex flex-col gap-[18px] max-w-[640px]">
          {summary.length > 0 && (
            <div className="rounded-[22px] px-[18px] pt-4 pb-5" style={{ border: "1.5px dashed rgba(45,36,30,0.28)" }}>
              <p className={`${LABEL} text-[0.72rem] md:text-[11.5px] text-[#4A0E0E] mb-2`}>{t("pages.legal.inShort")}</p>
              <ul className="list-disc pl-[1.1em] flex flex-col gap-1.5 text-[14px] leading-[1.55]">
                {summary.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          {sections.map((section, index) => (
            <section key={index} id={anchor(index)} className="scroll-mt-[calc(var(--main-header-h)+16px)] flex flex-col gap-1.5 pt-4 border-t border-[#2D241E]/12 first:border-t-0 first:pt-0">
              {section.heading ? (
                <h2 className="font-normal text-[24px] leading-[1.15] flex gap-3 items-baseline" style={SERIF}>
                  <span className="text-xs tracking-[0.1em] text-[#4A0E0E] tabular-nums" style={SANS}>
                    {String(numbered.indexOf(section) + 1).padStart(2, "0")}
                  </span>
                  {section.heading}
                </h2>
              ) : null}
              {section.paragraphs.map((paragraph, i) => (
                <p key={i} className="text-[14.5px] leading-[1.75] text-[#2D241E]/80">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Terms and Privacy: each its own saved setting, edited in Admin → Care, shown in the same layout. */
function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduced = useReducedMotion() ?? false;
  const terms = useTermsContent();
  const privacy = usePrivacyContent();
  const { content, ready } = kind === "terms" ? terms : privacy;
  const { content: contact } = useContactContent();
  const text = (value: L10n) => careText(value, locale);
  const updated = content.lastUpdated
    ? t("pages.legal.lastUpdated", {
        date: new Intl.DateTimeFormat(locale === "uk" ? "uk-UA" : "en-GB", { month: "long", year: "numeric" }).format(new Date(`${content.lastUpdated}-01T12:00:00`)),
      })
    : "";
  return (
    <div style={firstVisitRevealStyle(ready, reduced)}>
      <LegalLayout
        eyebrow={t(`pages.${kind}.eyebrow`)}
        title={t(`pages.${kind}.title`)}
        updated={updated}
        summary={content.summary.map(text).filter(Boolean)}
        sections={content.sections.map((section) => ({ heading: text(section.heading), paragraphs: paragraphsOf(text(section.body), contact.email) }))}
      />
    </div>
  );
}

export function StaticContentPage({ pageKey }: Props) {
  const { t } = useTranslation();
  usePageTitle(t(`seo.${pageKey}Title`));

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "var(--app-svh)", ...SANS }} className="text-[#2D241E]">
      <section className="pt-24 pb-14 md:pt-32 md:pb-20">
        <div className="max-w-[1120px] mx-auto px-[18px] md:px-16">
          <ScrollReveal>{pageKey === "delivery" ? <DeliveryPage /> : <LegalPage kind={pageKey} />}</ScrollReveal>
        </div>
      </section>
    </main>
  );
}
