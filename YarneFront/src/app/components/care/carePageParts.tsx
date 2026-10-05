import { useTranslation } from "react-i18next";
import { LangLink } from "../../i18n/LangLink";
import { ScrollReveal } from "../ScrollReveal";
import { EYEBROW, FOCUS_RING, SERIF } from "./careUi";

/** "Yarné Care / {current}" above the Guarantee terms and Request care pages. */
export function CareBreadcrumb({ current }: { current: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("care.title")} className="px-6 pt-4 md:px-10 md:pt-7 flex gap-2.5 text-xs md:text-[12.5px] text-[#2D241E]/72">
      <LangLink to="/pages/care" className={`min-h-11 -my-3.5 inline-flex items-center underline underline-offset-2 hover:text-[#4A0E0E] rounded-sm ${FOCUS_RING}`}>
        {t("care.title")}
      </LangLink>
      <span aria-hidden>/</span>
      <span aria-current="page" className="text-[#2D241E]">
        {current}
      </span>
    </nav>
  );
}

type StepsProps = { id: string; eyebrow: string; title: string; steps: { title: string; text: string }[] };

/** A heading beside its numbered steps (01, 02…): "How it works", "What happens next". */
export function CareStepsSection({ id, eyebrow, title, steps }: StepsProps) {
  return (
    <ScrollReveal>
      <section
        aria-labelledby={id}
        className="px-6 pb-10 md:px-10 md:pb-28 flex flex-col gap-2 md:gap-8 lg:grid lg:grid-cols-12 lg:gap-x-6 lg:gap-y-0"
      >
        <div className="lg:col-span-4 flex flex-col gap-2 md:gap-3.5">
          <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>{eyebrow}</p>
          <h2 id={id} className="mb-2 md:mb-0 font-normal text-[30px] md:text-5xl leading-[1.08] md:leading-[1.05]" style={SERIF}>
            {title}
          </h2>
        </div>
        <ol className="lg:col-start-6 lg:col-span-7 border-b border-[#2D241E]/12 md:border-b-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
          {steps.map((step, index) => (
            <li
              key={index}
              className="flex gap-3.5 py-3.5 border-t border-[#2D241E]/12 md:flex-col md:gap-3 md:py-0 md:pt-5 md:border-[#2D241E]"
            >
              <span className="w-[30px] shrink-0 text-2xl md:w-auto md:text-4xl leading-none text-[#4A0E0E]" style={SERIF}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-col gap-0.5 md:gap-3">
                <span className="text-[14.5px] md:text-base font-medium">{step.title}</span>
                <span className="text-[13.5px] md:text-[14.5px] leading-[1.55] md:leading-[1.6] text-[#2D241E]/72">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </ScrollReveal>
  );
}
