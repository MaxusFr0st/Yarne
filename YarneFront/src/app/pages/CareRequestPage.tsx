import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Camera, Check, Clock, Copy, FileText, Instagram, Mail, Phone, ShieldCheck, ShoppingBag, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollReveal } from "../components/ScrollReveal";
import { CareBreadcrumb, CareStepsSection } from "../components/care/carePageParts";
import {
  CARE_GUARANTEE_PATH,
  EYEBROW,
  FOCUS_RING,
  FOCUS_RING_ON_INK,
  LABEL,
  PILL,
  PILL_CREAM,
  PILL_INK,
  PILL_OUTLINE,
  SANS,
  SERIF,
} from "../components/care/careUi";
import { useContactContent } from "../hooks/useCareServiceContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { careText } from "../utils/careContent";
import { mailtoHref } from "../utils/contactContent";

type Item = { title: string; text: string };
type Copied = "address" | "text";

const COPIED_MS = 2000;
const READY_ICONS = [Tag, ShoppingBag, Camera, FileText];

/**
 * Request care: call or write, nothing to fill in. The phone, email, hours, reply time and
 * Instagram come from Admin → Care → Contact details; with no phone saved, the page offers email only.
 */
export function CareRequestPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const { content: contact, ready } = useContactContent();
  const { phone, phoneDisplay, email, instagramHandle, instagramUrl } = contact;
  const hours = careText(contact.hours, locale);
  const replyTime = careText(contact.replyTime, locale);

  const readyItems = t("care.request.ready", { returnObjects: true }) as Item[];
  const nextSteps = t("care.request.next", { returnObjects: true }) as Item[];
  const subject = t("care.request.templateSubject");
  const body = t("care.request.templateBody");
  const templateHref = mailtoHref(email, subject, body);

  // "Copied" for two seconds, on the button that was pressed.
  const [copied, setCopied] = useState<Copied | null>(null);
  const copiedTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
  const copy = async (what: Copied, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // No clipboard access (an in-app browser, a page not served over https): the older way.
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(field);
      field.select();
      const done = document.execCommand("copy");
      field.remove();
      if (!done) return;
    }
    setCopied(what);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS);
  };

  const copyButton = (what: Copied, label: string, value: string) => (
    <button
      type="button"
      onClick={() => void copy(what, value)}
      className={`w-full md:w-auto h-11 px-[18px] inline-flex items-center justify-center gap-2 rounded-full border border-[#2D241E]/25 uppercase font-medium tracking-[0.14em] text-[11px] text-[#2D241E] cursor-pointer hover:bg-[#2D241E]/5 transition-colors ${FOCUS_RING}`}
    >
      {copied === what ? <Check size={15} strokeWidth={2} aria-hidden /> : <Copy size={15} strokeWidth={1.5} aria-hidden />}
      <span aria-live="polite">{copied === what ? t("care.request.copied") : label}</span>
    </button>
  );

  // One contact card: the icon, what it is best for, the number or address, when to expect an answer, the buttons.
  const contactCard = (card: {
    ink: boolean;
    icon: ReactNode;
    label: string;
    badge: string;
    href: string;
    value: string;
    note: string;
    actions: ReactNode;
  }) => (
    <div
      className={`px-[22px] pt-6 pb-[22px] rounded-[26px] md:p-11 md:rounded-[32px] flex flex-col gap-4 md:gap-7 ${
        card.ink ? "bg-[#2D241E] text-[#F5F2ED]" : "bg-[#EDE9E2]"
      }`}
    >
      <div className="flex items-center gap-3 md:justify-between md:items-start">
        <span
          className={`w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-full flex items-center justify-center ${card.ink ? "" : "bg-[#F5F2ED]"}`}
          style={card.ink ? { backgroundColor: "rgba(245,242,237,0.1)" } : undefined}
        >
          {card.icon}
        </span>
        <span className="md:hidden flex flex-col gap-0.5">
          <span className={`${LABEL} text-[10.5px] ${card.ink ? "opacity-80" : "text-[#2D241E]/72"}`}>{card.label}</span>
          <span className={`text-[12.5px] ${card.ink ? "opacity-85" : "text-[#2D241E]/72"}`}>{card.badge}</span>
        </span>
        <span
          className={`hidden md:inline-flex h-8 px-3.5 items-center rounded-full border ${LABEL} text-[11px] ${
            card.ink ? "border-[#F5F2ED]/30" : "border-[#2D241E]/20"
          }`}
        >
          {card.badge}
        </span>
      </div>
      <div className="flex flex-col gap-4 md:gap-2.5">
        <span className={`hidden md:block ${LABEL} text-[11.5px] ${card.ink ? "opacity-80" : "text-[#2D241E]/72"}`}>{card.label}</span>
        <a
          href={card.href}
          className={`self-start py-1.5 -my-1.5 text-[32px] md:text-[clamp(32px,3.3vw,48px)] leading-none break-all rounded-sm ${
            card.ink ? `text-[#F5F2ED] ${FOCUS_RING_ON_INK}` : `text-[#2D241E] hover:text-[#4A0E0E] ${FOCUS_RING}`
          }`}
          style={SERIF}
        >
          {card.value}
        </a>
        {card.note && (
          <span className={`inline-flex items-center gap-2 text-[13px] md:text-sm ${card.ink ? "opacity-85" : "text-[#2D241E]/72"}`}>
            <Clock size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />
            {card.note}
          </span>
        )}
      </div>
      <div className="md:mt-auto flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:gap-3">{card.actions}</div>
    </div>
  );

  const contactIcon = (Icon: typeof Phone) => <Icon strokeWidth={1.5} className="w-5 h-5 md:w-6 md:h-6" aria-hidden />;

  return (
    <main
      // Clipped, not hidden: "hidden" would make the page a scroll area of its own, with the last
      // reveal's rise as extra height that disappears (and jumps) once it has played.
      className="overflow-x-clip"
      style={{ backgroundColor: "#F5F2ED", color: "#2D241E", minHeight: "var(--app-svh)", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
      aria-busy={!ready}
    >
      <div className="max-w-[1400px] mx-auto pt-[var(--main-header-h)]">
        <CareBreadcrumb current={t("care.request.breadcrumb")} />

        <section className="px-6 pt-[22px] pb-6 md:px-10 md:pt-10 md:pb-12 flex flex-col gap-3.5 md:gap-6 lg:flex-row lg:justify-between lg:items-end lg:gap-12">
          <div className="flex flex-col gap-3.5 md:gap-[22px] max-w-[780px]">
            <p className={`inline-flex items-center gap-2 md:gap-2.5 ${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>
              <ShieldCheck size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              {t("care.request.eyebrow")}
            </p>
            <h1 className="font-normal text-[44px] md:text-[clamp(56px,5.6vw,80px)] leading-none md:leading-[0.98] tracking-[-0.02em]" style={SERIF}>
              {t("care.request.titleLine1")} <br className="hidden md:inline" />
              <span className="italic font-light">{t("care.request.titleLine2")}</span>
            </h1>
          </div>
          <div className="max-w-[420px] flex flex-col gap-4 lg:pb-2">
            <p className="text-[14.5px] md:text-base leading-[1.6] md:leading-[1.65] text-[#2D241E]/72">{t("care.request.intro")}</p>
            <LangLink
              to={CARE_GUARANTEE_PATH}
              className={`hidden md:inline-flex self-start h-10 pl-3 pr-4 items-center gap-2 rounded-full bg-[#EDE9E2] text-[13px] text-[#2D241E] hover:bg-[#E5E0D8] transition-colors ${FOCUS_RING}`}
            >
              <ShieldCheck size={16} strokeWidth={1.5} className="shrink-0 text-[#4A0E0E]" aria-hidden />
              {t("care.request.coveredPill")}
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
            </LangLink>
          </div>
        </section>

        <section aria-label={t("care.request.contactLabel")} className={`px-3 md:px-10 flex flex-col gap-2.5 md:grid md:gap-6 ${phone ? "md:grid-cols-2" : ""}`}>
          {phone &&
            contactCard({
              ink: true,
              icon: contactIcon(Phone),
              label: t("care.request.call.label"),
              badge: t("care.request.call.badge"),
              href: `tel:${phone}`,
              value: phoneDisplay,
              note: hours,
              actions: (
                <a href={`tel:${phone}`} className={`${PILL} ${PILL_CREAM} h-[52px] px-[26px] justify-between md:justify-center`}>
                  {t("care.request.call.cta")}
                  <Phone size={16} strokeWidth={1.5} aria-hidden />
                </a>
              ),
            })}
          {contactCard({
            ink: false,
            icon: contactIcon(Mail),
            label: t("care.request.email.label"),
            badge: t("care.request.email.badge"),
            href: mailtoHref(email, subject),
            value: email,
            note: replyTime,
            actions: (
              <>
                <a href={templateHref} className={`${PILL} ${PILL_INK} h-[52px] px-[26px] justify-between md:justify-center`}>
                  {t("care.request.email.cta")}
                  <Mail size={16} strokeWidth={1.5} aria-hidden />
                </a>
                {copyButton("address", t("care.request.email.copy"), email)}
              </>
            ),
          })}
        </section>
        {instagramHandle && instagramUrl && (
          <p className="px-[22px] pt-3.5 md:px-10 md:pt-5 flex items-center gap-2 md:gap-2.5 text-[13px] md:text-sm text-[#2D241E]/72">
            <Instagram size={17} strokeWidth={1.5} className="shrink-0" aria-hidden />
            <span>
              {t("care.request.instagram")}{" "}
              <a
                href={instagramUrl}
                target="_blank"
                rel="noreferrer"
                className={`text-[#2D241E] underline underline-offset-2 hover:text-[#4A0E0E] rounded-sm ${FOCUS_RING}`}
              >
                {instagramHandle}
              </a>
            </span>
          </p>
        )}

        <ScrollReveal>
          <section
            aria-labelledby="request-ready"
            className="pt-11 md:px-10 md:py-28 flex flex-col gap-7 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:items-start"
          >
            <div className="px-6 md:px-0 lg:col-span-5 flex flex-col gap-2 md:gap-3.5">
              <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>{t("care.request.readyEyebrow")}</p>
              <h2 id="request-ready" className="mb-1.5 md:mb-3 font-normal text-[32px] md:text-[52px] leading-[1.04]" style={SERIF}>
                {t("care.request.readyTitle")}
              </h2>
              <ul className="border-b border-[#2D241E]/12">
                {readyItems.map((item, index) => {
                  const Icon = READY_ICONS[index % READY_ICONS.length];
                  return (
                    <li key={index} className="flex gap-3.5 md:gap-4 items-start py-3.5 md:py-5 border-t border-[#2D241E]/12">
                      <span className="w-10 h-10 md:w-11 md:h-11 shrink-0 rounded-full bg-[#EDE9E2] text-[#4A0E0E] flex items-center justify-center">
                        <Icon size={18} strokeWidth={1.5} aria-hidden />
                      </span>
                      <span className="flex flex-col gap-0.5 md:gap-[3px]">
                        <span className="text-[14.5px] md:text-base font-medium">{item.title}</span>
                        <span className="text-[13.5px] md:text-[14.5px] leading-[1.5] md:leading-[1.55] text-[#2D241E]/72">{item.text}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="mx-3 md:mx-0 lg:col-start-7 lg:col-span-6 px-4 pt-[22px] pb-4 rounded-[26px] md:p-9 md:rounded-[32px] bg-[#EDE9E2] flex flex-col gap-3.5 md:gap-5">
              <h2 className="px-1 md:px-0 font-normal text-2xl md:text-3xl leading-[1.15] md:leading-[1.1]" style={SERIF}>
                {t("care.request.templateTitle")}
              </h2>
              <div className="p-[18px] md:p-7 rounded-[22px] bg-[#F5F2ED] border border-[#2D241E]/12">
                {[
                  [t("care.request.templateTo"), email],
                  [t("care.request.templateSubjectLabel"), subject],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3 py-2.5 border-b border-[#2D241E]/12 text-[13px] md:text-sm">
                    <span className="w-16 shrink-0 text-[#2D241E]/72">{label}</span>
                    <span className="font-medium break-all">{value}</span>
                  </div>
                ))}
                <div className="pt-3.5 text-[13.5px] md:text-[14.5px] leading-[1.9]">
                  {body
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((line, index) => (
                      <p key={index}>
                        {line.trimEnd()}
                        {/* A line the writer finishes: a blank to fill in. */}
                        {/:\s*$/.test(line) && (
                          <span aria-hidden className="inline-block w-[120px] ml-1.5 border-b border-[#2D241E]/35 -translate-y-[3px]" />
                        )}
                      </p>
                    ))}
                </div>
              </div>
              <div className="flex flex-col gap-3.5 md:flex-row md:items-center md:gap-3">
                <a href={templateHref} className={`${PILL} ${PILL_INK} h-[50px] md:h-12 px-[26px] justify-between md:justify-center`}>
                  {t("care.request.openInEmail")}
                  <Mail size={16} strokeWidth={1.5} aria-hidden />
                </a>
                {copyButton("text", t("care.request.copyText"), body)}
              </div>
            </div>
          </section>
        </ScrollReveal>

        <div className="pt-11 md:pt-0">
          <CareStepsSection id="request-next" eyebrow={t("care.request.nextEyebrow")} title={t("care.request.nextTitle")} steps={nextSteps} />
        </div>

        <ScrollReveal className="mx-3 md:mx-10">
          <section className="px-5 py-6 rounded-[26px] md:px-11 md:py-10 md:rounded-[32px] border border-[#2D241E]/15 flex flex-col gap-3.5 md:flex-row md:items-center md:gap-7">
            <div className="flex gap-3.5 md:gap-7 items-center md:grow">
              <span className="w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full bg-[#2D241E] text-[#F5F2ED] flex items-center justify-center">
                <ShieldCheck strokeWidth={1.5} className="w-[22px] h-[22px] md:w-7 md:h-7" aria-hidden />
              </span>
              <div className="flex flex-col gap-1.5">
                <h2 className="font-normal text-[22px] md:text-[32px] leading-[1.15] md:leading-[1.1]" style={SERIF}>
                  {t("care.request.reminder")}
                </h2>
                <p className="hidden md:block text-[15px] text-[#2D241E]/72">{t("care.request.reminderText")}</p>
              </div>
            </div>
            <p className="md:hidden text-[13.5px] leading-[1.55] text-[#2D241E]/72">{t("care.request.reminderText")}</p>
            <LangLink to={CARE_GUARANTEE_PATH} className={`${PILL} ${PILL_OUTLINE} shrink-0 h-12 md:h-[52px] px-[26px] justify-between md:justify-center`}>
              {t("care.landing.service.terms")}
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </LangLink>
          </section>
        </ScrollReveal>
      </div>
    </main>
  );
}
