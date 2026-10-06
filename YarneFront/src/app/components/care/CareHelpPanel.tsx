import { ArrowRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import { CARE_GUARANTEE_PATH, CARE_REQUEST_PATH, PILL, PILL_CREAM, PILL_OUTLINE_ON_INK, SANS, SERIF } from "./careUi";

/**
 * Under a material's guide: for the reader who would rather not do it at home, or whose piece
 * needs more than home care. Leads to Request care and the Guarantee terms.
 */
export function CareHelpPanel() {
  const { t } = useTranslation();
  return (
    <section
      className="mx-4 px-[22px] pt-6 pb-[22px] rounded-[28px] md:mx-10 md:px-10 md:py-9 md:rounded-[32px] flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-10"
      style={{ backgroundColor: "#2D241E", color: "#F5F2ED", ...SANS }}
    >
      <div className="flex gap-3.5 md:gap-5 items-start md:items-center">
        <span
          className="w-11 h-11 md:w-14 md:h-14 shrink-0 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "rgba(245,242,237,0.1)" }}
        >
          <ShieldCheck strokeWidth={1.5} className="w-5 h-5 md:w-6 md:h-6" aria-hidden />
        </span>
        <div className="flex flex-col gap-1.5 md:gap-2 max-w-[560px]">
          <h2 className="font-normal text-[23px] md:text-[30px] leading-[1.12]" style={SERIF}>
            {t("care.help.title")}
          </h2>
          <p className="text-[13.5px] md:text-[14.5px] leading-[1.55] opacity-85">{t("care.help.text")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap lg:shrink-0 lg:justify-end">
        <LangLink to={CARE_REQUEST_PATH} className={`${PILL} ${PILL_CREAM} h-[50px] md:h-[52px] px-6 justify-between sm:justify-center`}>
          {t("care.landing.service.request")}
          <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
        </LangLink>
        <LangLink to={CARE_GUARANTEE_PATH} className={`${PILL} ${PILL_OUTLINE_ON_INK} h-[50px] md:h-[52px] px-6 justify-center`}>
          {t("care.landing.service.terms")}
        </LangLink>
      </div>
    </section>
  );
}
