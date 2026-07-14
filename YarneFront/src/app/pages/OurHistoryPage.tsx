import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStaticPageCopy } from "../hooks/useStaticPageCopy";
import { LangLink } from "../i18n/LangLink";
import { ScrollReveal, SectionEyebrow } from "../components/ScrollReveal";
import heroImage from "../../assets/our-history-hero.jpg";

/**
 * Brand story page — scroll storytelling (intro hero → narrative → shop CTA).
 * Yarné tokens: cream #F5F2ED, ink #2D241E; Cormorant + DM Sans.
 */
export function OurHistoryPage() {
  const { t } = useTranslation();
  const copy = useStaticPageCopy("ourHistory");
  const reduceMotion = useReducedMotion();
  const chapters = copy.paragraphs;

  return (
    <main className="overflow-x-hidden" style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
      <section className="relative w-full overflow-hidden">
        <div className="relative h-[min(78svh,720px)] min-h-[340px] w-full">
          <img
            src={heroImage}
            alt={copy.title}
            width={1600}
            height={1200}
            decoding="async"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover object-[center_32%]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(45,36,30,0.28) 0%, rgba(45,36,30,0.12) 38%, rgba(45,36,30,0.55) 78%, rgba(245,242,237,0.97) 100%)",
            }}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0 px-6 md:px-10 pb-12 md:pb-16 pt-24">
            <div className="max-w-[900px] mx-auto">
              <ScrollReveal y={reduceMotion ? 0 : 18}>
                <p
                  className="text-white/75 uppercase tracking-[0.22em] text-[0.65rem] mb-3"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.eyebrow}
                </p>
                <h1
                  className="text-white text-pretty font-normal leading-[1.08]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.4rem, 7vw, 4.25rem)",
                  }}
                >
                  {copy.title}
                </h1>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <section className="relative pb-16 md:pb-24 -mt-1">
        <div className="max-w-[720px] mx-auto px-6 md:px-10">
          <ScrollReveal delay={0.04}>
            <SectionEyebrow className="mb-8 md:mb-10">{copy.eyebrow}</SectionEyebrow>
          </ScrollReveal>

          <div className="space-y-10 md:space-y-12">
            {chapters.map((paragraph, index) => {
              const isLead = index === 0;
              return (
                <ScrollReveal key={index} delay={0.04 + index * 0.04} y={reduceMotion ? 0 : 16}>
                  {index === 1 ? (
                    <div className="h-px w-16 bg-[#2D241E]/15 mb-10 md:mb-12" aria-hidden="true" />
                  ) : null}
                  <p
                    className={
                      isLead
                        ? "text-[#2D241E] text-[1.05rem] md:text-[1.15rem] leading-[1.75]"
                        : "text-[#2D241E]/68 text-[0.95rem] md:text-[1rem] leading-[1.85]"
                    }
                    style={{
                      fontFamily: isLead
                        ? "'Cormorant Garamond', serif"
                        : "'DM Sans', sans-serif",
                      fontStyle: isLead ? "italic" : "normal",
                      fontWeight: isLead ? 500 : 400,
                    }}
                  >
                    {paragraph}
                  </p>
                </ScrollReveal>
              );
            })}
          </div>

          <ScrollReveal delay={0.12} className="mt-14 md:mt-16">
            <div
              className="rounded-[28px] md:rounded-[32px] px-7 py-8 md:px-10 md:py-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
              style={{ backgroundColor: "#2D241E" }}
            >
              <div>
                <p
                  className="text-white/50 uppercase tracking-[0.18em] text-[0.62rem] mb-2"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Yarné
                </p>
                <p
                  className="text-white text-pretty leading-[1.2]"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: "italic",
                    fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
                    fontWeight: 500,
                  }}
                >
                  {copy.title}
                </p>
              </div>
              <LangLink
                to="/collection"
                className="inline-flex items-center gap-2.5 self-start sm:self-auto rounded-full px-6 py-3 text-[#2D241E] bg-[#F5F2ED] hover:bg-white transition-colors duration-200 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "0.72rem",
                  letterSpacing: "0.14em",
                }}
              >
                <span className="uppercase tracking-widest">{t("checkout.goShopping")}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </LangLink>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
