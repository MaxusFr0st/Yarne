import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import { ScrollReveal } from "../ScrollReveal";
import { CARE_GUARANTEE_PATH, CARE_REQUEST_PATH, EYEBROW, FOCUS_RING_ON_INK, LABEL, PILL, PILL_CREAM, SANS, SERIF } from "./careUi";

const HAIRLINE = { borderColor: "rgba(245,242,237,0.16)" } as const;

/** The care landing's closing panel: what the workshop does for a piece, and the way to ask for it. */
export function CareWorkshopBand() {
  const { t } = useTranslation();
  const promises = [
    { title: t("care.landing.band.reknitTitle"), text: t("care.landing.band.reknitText") },
    { title: t("care.landing.band.washTitle"), text: t("care.landing.band.washText") },
    { title: t("care.landing.band.returnsTitle"), text: t("care.landing.band.returnsText") },
  ];
  const termsLink = `${LABEL} text-[0.72rem] md:text-[11.5px] text-[#F5F2ED] underline underline-offset-4 hover:opacity-80 rounded-sm ${FOCUS_RING_ON_INK}`;

  return (
    <ScrollReveal className="mx-4 md:mx-10">
      <section
        className="rounded-[28px] px-[22px] pt-7 pb-6 md:rounded-[32px] md:p-10 lg:px-16 lg:py-14 flex flex-col gap-3.5 md:grid md:grid-cols-3 lg:grid-cols-[1.25fr_1fr_1fr_1fr] md:gap-10 md:items-start"
        style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...SANS }}
      >
        <div className="flex flex-col gap-3.5 md:col-span-3 lg:col-span-1 md:items-start">
          <p className={`${EYEBROW} text-[0.72rem] md:text-xs opacity-[0.72]`}>{t("care.landing.band.eyebrow")}</p>
          <h2 className="font-normal text-[28px] md:text-[32px] leading-[1.12]" style={SERIF}>
            {t("care.landing.band.title")}
          </h2>
          <p className="text-sm md:text-[14.5px] leading-[1.6] opacity-85">{t("care.landing.band.text")}</p>
          <div className="hidden md:flex mt-2 flex-col items-start gap-4">
            <LangLink to={CARE_REQUEST_PATH} className={`${PILL} ${PILL_CREAM} h-12 px-[26px] justify-center`}>
              {t("care.landing.service.request")}
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
            </LangLink>
            <LangLink to={CARE_GUARANTEE_PATH} className={`min-h-11 inline-flex items-center ${termsLink}`}>
              {t("care.landing.service.terms")}
            </LangLink>
          </div>
        </div>

        <div className="flex flex-col border-b md:contents" style={HAIRLINE}>
          {promises.map((item) => (
            <div key={item.title} className="flex flex-col gap-1 md:gap-2 py-3.5 border-t md:py-0 md:pl-8 md:border-t-0 md:border-l" style={HAIRLINE}>
              <p className="text-[22px] md:text-[25px] leading-[1.15]" style={SERIF}>
                {item.title}
              </p>
              <p className="text-[13.5px] md:text-sm leading-[1.55] md:leading-[1.6] opacity-80">{item.text}</p>
            </div>
          ))}
        </div>

        <LangLink to={CARE_REQUEST_PATH} className={`md:hidden ${PILL} ${PILL_CREAM} h-[50px] px-[26px] justify-between`}>
          {t("care.landing.service.request")}
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </LangLink>
        <LangLink to={CARE_GUARANTEE_PATH} className={`md:hidden min-h-11 flex items-center justify-center ${termsLink}`}>
          {t("care.landing.service.terms")}
        </LangLink>
      </section>
    </ScrollReveal>
  );
}
