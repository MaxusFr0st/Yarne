import { useId, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, Check, Droplet, Mail, Minus, Phone, Plus, RotateCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScrollReveal } from "../components/ScrollReveal";
import { CareBreadcrumb, CareStepsSection } from "../components/care/carePageParts";
import {
  CARE_REQUEST_PATH,
  CareKnitIcon,
  CareNeedleIcon,
  EYEBROW,
  FOCUS_RING,
  FOCUS_RING_ON_INK,
  LABEL,
  PILL,
  PILL_CREAM,
  PILL_INK,
  PILL_OUTLINE,
  PILL_OUTLINE_ON_INK,
  SANS,
  SERIF,
} from "../components/care/careUi";
import { useContactContent, useGuaranteeContent } from "../hooks/useCareServiceContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import { careText } from "../utils/careContent";
import { mailtoHref } from "../utils/contactContent";
import { formatGuaranteeDate, type GuaranteeIcon } from "../utils/guaranteeContent";

function IncludeIcon({ icon }: { icon: GuaranteeIcon }) {
  if (icon === "knit") return <CareKnitIcon />;
  if (icon === "needle") return <CareNeedleIcon />;
  const Icon = icon === "drop" ? Droplet : RotateCw;
  return <Icon size={20} strokeWidth={1.5} aria-hidden />;
}

/**
 * Guarantee terms: what the lifetime guarantee covers and how to use it. The lists, steps and
 * questions come from Admin → Care → Guarantee terms; the phone and email from Contact details.
 */
export function CareGuaranteePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const guarantee = useGuaranteeContent();
  const contact = useContactContent();
  const ready = guarantee.ready && contact.ready;
  const terms = guarantee.content;
  const { phone, email } = contact.content;
  const faqId = useId();
  // One answer open at a time; the first one to begin with.
  const [openQuestion, setOpenQuestion] = useState(0);

  const text = (value: Parameters<typeof careText>[0]) => careText(value, locale);
  const lastUpdated = formatGuaranteeDate(terms.lastUpdated, locale);
  const statutoryNote = text(terms.statutoryNote);
  const notCoveredNote = text(terms.notCoveredNote);
  const steps = terms.steps.map((step) => ({ title: text(step.title), text: text(step.text) }));

  const requestButton = (className: string) => (
    <LangLink to={CARE_REQUEST_PATH} className={`${PILL} ${PILL_INK} h-[52px] px-[26px] ${className}`}>
      {t("care.landing.service.request")}
      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
    </LangLink>
  );

  const coverageList = (items: string[], covered: boolean) => (
    <ul>
      {items.map((item, index) => (
        <li key={index} className="flex gap-3 md:gap-3.5 items-start py-3 md:py-3.5 border-t border-[#2D241E]/12 text-sm md:text-[15px] leading-[1.5]">
          <span
            className={`w-6 h-6 md:w-[26px] md:h-[26px] shrink-0 rounded-full flex items-center justify-center ${
              covered ? "bg-[#315B42] text-[#F5F2ED]" : "border border-[#2D241E]/35"
            }`}
          >
            {covered ? <Check size={14} strokeWidth={2} aria-hidden /> : <Minus size={14} strokeWidth={2} aria-hidden />}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <main
      className="overflow-x-hidden"
      style={{ backgroundColor: "#F5F2ED", color: "#2D241E", minHeight: "var(--app-svh)", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
      aria-busy={!ready}
    >
      <div className="max-w-[1400px] mx-auto pt-[var(--main-header-h)]">
        <CareBreadcrumb current={t("care.guarantee.breadcrumb")} />

        <section className="px-3 pt-[22px] pb-9 md:px-10 md:pt-10 md:pb-24 flex flex-col gap-7 md:gap-10 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0 lg:items-center">
          <div className="px-3 md:px-0 lg:col-span-7 flex flex-col gap-3.5 md:gap-6 items-start">
            <p className={`inline-flex items-center gap-2 md:gap-2.5 ${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>
              <ShieldCheck size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              {t("care.guarantee.eyebrow")}
            </p>
            <h1 className="font-normal text-[44px] md:text-[clamp(56px,5.6vw,80px)] leading-none md:leading-[0.98] tracking-[-0.02em]" style={SERIF}>
              {t("care.guarantee.titleLine1")} <br className="hidden md:inline" />
              <span className="italic font-light">{t("care.guarantee.titleLine2")}</span>
            </h1>
            <p className="max-w-[580px] text-[14.5px] md:text-[16.5px] leading-[1.6] md:leading-[1.65] text-[#2D241E]/72">{t("care.guarantee.intro")}</p>
            <div className="hidden md:flex flex-wrap gap-3 mt-1">
              {requestButton("justify-center")}
              <LangLink to="/pages/care" className={`${PILL} ${PILL_OUTLINE} h-[52px] px-[26px] justify-center`}>
                {t("care.guarantee.howToLookAfter")}
              </LangLink>
            </div>
            {lastUpdated && <p className="hidden md:block text-[12.5px] text-[#2D241E]/72">{t("care.guarantee.lastUpdated", { date: lastUpdated })}</p>}
          </div>

          <div className="lg:col-start-9 lg:col-span-4 flex flex-col gap-3.5">
            <div className="p-2 md:p-2.5 rounded-[26px] md:rounded-[32px] bg-[#EDE9E2]">
              <div
                className="px-[18px] pt-5 pb-4 md:px-7 md:pt-7 md:pb-[22px] rounded-[20px] md:rounded-3xl flex flex-col gap-3 md:gap-[18px]"
                style={{ border: "1.5px dashed rgba(45,36,30,0.28)" }}
              >
                <div className="flex justify-between items-center">
                  <p className={`hidden md:block ${LABEL} text-[11.5px]`}>{t("care.guarantee.yourGuarantee")}</p>
                  <h2 className="md:hidden font-normal text-[26px]" style={SERIF}>
                    {t("care.guarantee.glanceTitle")}
                  </h2>
                  <span className="w-[38px] h-[38px] md:w-11 md:h-11 rounded-full bg-[#2D241E] text-[#F5F2ED] flex items-center justify-center">
                    <ShieldCheck size={19} strokeWidth={1.5} aria-hidden />
                  </span>
                </div>
                <h2 className="hidden md:block font-normal text-[34px] leading-[1.05]" style={SERIF}>
                  {t("care.guarantee.glanceTitle")}
                </h2>
                <dl>
                  {terms.glance.map((row, index) => (
                    <div
                      key={index}
                      className="flex flex-col gap-[3px] py-3 md:py-3.5 border-t border-[#2D241E]/14 md:grid md:grid-cols-[120px_minmax(0,1fr)] md:gap-4"
                    >
                      <dt className={`${LABEL} text-[10px] md:text-[11.5px] text-[#2D241E]/72`}>{text(row.label)}</dt>
                      <dd className="text-[14.5px] md:text-[15px] leading-[1.45] md:leading-[1.5]">{text(row.value)}</dd>
                    </div>
                  ))}
                </dl>
                {(statutoryNote || lastUpdated) && (
                  <p className="text-[11.5px] md:text-xs leading-[1.5] text-[#2D241E]/72">
                    {statutoryNote}
                    {lastUpdated && <span className="md:hidden"> {t("care.guarantee.lastUpdated", { date: lastUpdated })}.</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="md:hidden px-1 flex flex-col">{requestButton("justify-between")}</div>
          </div>
        </section>

        {terms.includes.length > 0 && (
          <ScrollReveal>
            <section aria-labelledby="guarantee-includes" className="px-3 pb-10 md:px-10 md:pb-28 flex flex-col gap-2.5 md:gap-10">
              <div className="px-3 pb-1.5 md:p-0 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end lg:gap-10">
                <div className="flex flex-col gap-2 md:gap-3.5">
                  <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>{t("care.guarantee.includesEyebrow")}</p>
                  <h2 id="guarantee-includes" className="font-normal text-[32px] md:text-[56px] leading-[1.06] md:leading-[1.04]" style={SERIF}>
                    {t("care.guarantee.includesTitle")}
                  </h2>
                </div>
                <p className="hidden md:block max-w-[400px] lg:mb-1.5 text-[15px] leading-[1.6] text-[#2D241E]/72">{t("care.guarantee.includesNote")}</p>
              </div>
              <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-5 xl:grid-cols-4">
                {terms.includes.map((item, index) => (
                  <div
                    key={index}
                    className="p-[18px] rounded-[22px] md:px-7 md:py-8 md:rounded-[28px] bg-[#EDE9E2] flex gap-3.5 items-start md:flex-col md:items-stretch"
                  >
                    <span className="w-[42px] h-[42px] md:w-12 md:h-12 shrink-0 rounded-full bg-[#F5F2ED] text-[#4A0E0E] flex items-center justify-center">
                      <IncludeIcon icon={item.icon} />
                    </span>
                    <span className="grow flex flex-col gap-1 md:gap-3.5">
                      <span className="text-2xl md:text-3xl leading-[1.1] md:leading-[1.05]" style={SERIF}>
                        {text(item.title)}
                      </span>
                      <span className="text-[13.5px] md:text-[14.5px] leading-[1.55] md:leading-[1.6] text-[#2D241E]/72">{text(item.text)}</span>
                      <span className={`mt-1 md:mt-auto md:pt-2 ${LABEL} text-[10px] md:text-[11.5px] text-[#4A0E0E]`}>{text(item.tag)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}

        <ScrollReveal>
          <section className="px-3 pb-10 md:px-10 md:pb-28 flex flex-col gap-2.5 md:grid md:grid-cols-2 md:gap-6">
            <div className="px-5 py-6 rounded-[26px] md:p-11 md:rounded-[32px] border border-[#2D241E]/15 flex flex-col gap-2.5 md:gap-5">
              <p className={`${EYEBROW} text-[11px] md:text-xs text-[#315B42]`}>{t("care.guarantee.covered")}</p>
              <h2 className="mb-1 md:mb-0 font-normal text-[28px] md:text-[40px] leading-[1.05]" style={SERIF}>
                {t("care.guarantee.coveredTitle")}
              </h2>
              {coverageList(terms.covered.map(text), true)}
            </div>
            <div className="px-5 py-6 rounded-[26px] md:p-11 md:rounded-[32px] bg-[#EDE9E2] flex flex-col gap-2.5 md:gap-5">
              <p className={`${EYEBROW} text-[11px] md:text-xs text-[#2D241E]/72`}>{t("care.guarantee.notCovered")}</p>
              <h2 className="mb-1 md:mb-0 font-normal text-[28px] md:text-[40px] leading-[1.05]" style={SERIF}>
                {t("care.guarantee.notCoveredTitle")}
              </h2>
              {coverageList(terms.notCovered.map(text), false)}
              {notCoveredNote && (
                <p className="mt-1.5 md:mt-auto px-4 py-3.5 md:px-5 md:py-[18px] rounded-2xl md:rounded-[18px] bg-[#F5F2ED] text-[13.5px] md:text-sm leading-[1.55] md:leading-[1.6]">
                  {notCoveredNote}{" "}
                  <LangLink to={CARE_REQUEST_PATH} className={`underline underline-offset-2 hover:text-[#4A0E0E] whitespace-nowrap rounded-sm ${FOCUS_RING}`}>
                    {t("care.landing.service.request")} →
                  </LangLink>
                </p>
              )}
            </div>
          </section>
        </ScrollReveal>

        {steps.length > 0 && (
          <CareStepsSection id="guarantee-how" eyebrow={t("care.guarantee.howEyebrow")} title={t("care.guarantee.howTitle")} steps={steps} />
        )}

        {terms.faq.length > 0 && (
          <ScrollReveal>
            <section
              aria-labelledby="guarantee-faq"
              className="px-6 pb-10 md:px-10 md:pb-28 flex flex-col gap-2 md:gap-8 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0"
            >
              <div className="lg:col-span-4 flex flex-col gap-2 md:gap-3.5">
                <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>{t("care.guarantee.faqEyebrow")}</p>
                <h2 id="guarantee-faq" className="mb-2 md:mb-0 font-normal text-[30px] md:text-5xl leading-[1.05]" style={SERIF}>
                  {t("care.guarantee.faqTitle")}
                </h2>
              </div>
              <div className="lg:col-start-6 lg:col-span-7 border-b border-[#2D241E]/14">
                {terms.faq.map((item, index) => {
                  const open = index === openQuestion;
                  return (
                    <div key={index} className="border-t border-[#2D241E]/14">
                      <h3>
                        <button
                          type="button"
                          aria-expanded={open}
                          aria-controls={`${faqId}-${index}`}
                          onClick={() => setOpenQuestion(open ? -1 : index)}
                          className={`w-full py-4 md:py-5 flex justify-between items-center gap-4 text-left text-[#2D241E] cursor-pointer rounded-sm ${FOCUS_RING}`}
                        >
                          <span className="text-[19px] md:text-[22px] leading-[1.2]" style={SERIF}>
                            {text(item.q)}
                          </span>
                          <span className="w-8 h-8 shrink-0 rounded-full border border-[#2D241E]/20 flex items-center justify-center">
                            {open ? <Minus size={14} strokeWidth={1.5} aria-hidden /> : <Plus size={14} strokeWidth={1.5} aria-hidden />}
                          </span>
                        </button>
                      </h3>
                      <p
                        id={`${faqId}-${index}`}
                        hidden={!open}
                        className="pr-12 pb-[18px] md:pb-[22px] text-sm md:text-[15px] leading-[1.65] text-[#2D241E]/72"
                      >
                        {text(item.a)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        )}

        <ScrollReveal className="mx-3 md:mx-10">
          <section
            className="px-[22px] pt-[30px] pb-6 rounded-[28px] md:p-12 lg:p-16 md:rounded-[32px] flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-center lg:gap-10"
            style={{ backgroundColor: "#2D241E", color: "#F5F2ED" }}
          >
            <div className="flex flex-col gap-3.5 max-w-[620px]">
              <p className={`${EYEBROW} text-[11px] md:text-xs opacity-80`}>{t("care.guarantee.ctaEyebrow")}</p>
              <h2 className="font-normal text-[32px] md:text-[52px] leading-[1.06] md:leading-[1.04]" style={SERIF}>
                {t("care.guarantee.ctaTitle")} <span className="italic font-light">{t("care.guarantee.ctaTitleAccent")}</span>
              </h2>
            </div>
            <div className="flex flex-col gap-3 lg:w-[300px] lg:shrink-0">
              {phone && (
                <a href={`tel:${phone}`} className={`${PILL} ${PILL_CREAM} h-[52px] px-[26px] justify-between`}>
                  {t("care.guarantee.callUs")}
                  <Phone size={16} strokeWidth={1.5} aria-hidden />
                </a>
              )}
              <a
                href={mailtoHref(email, t("care.request.templateSubject"))}
                className={`${PILL} ${phone ? PILL_OUTLINE_ON_INK : PILL_CREAM} h-[52px] px-[26px] justify-between`}
              >
                {t("care.guarantee.emailUs")}
                <Mail size={16} strokeWidth={1.5} aria-hidden />
              </a>
              <LangLink
                to={CARE_REQUEST_PATH}
                className={`min-h-11 flex items-center justify-center ${LABEL} text-[11px] md:text-[11.5px] text-[#F5F2ED] underline underline-offset-4 hover:opacity-80 rounded-sm ${FOCUS_RING_ON_INK}`}
              >
                {t("care.guarantee.allWays")}
              </LangLink>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </main>
  );
}
