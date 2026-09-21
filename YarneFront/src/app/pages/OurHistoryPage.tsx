import { useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useStaticPageCopy } from "../hooks/useStaticPageCopy";
import { LangLink } from "../i18n/LangLink";
import { ScrollReveal } from "../components/ScrollReveal";
import heroImage from "../../assets/our-history-hero.jpg";

/**
 * Our History — founders portrait + calm editorial column.
 * Photo is the hero (portrait orientation); copy never fights the faces.
 * Yarné: cream #F5F2ED, ink #2D241E, Cormorant + DM Sans.
 */
export function OurHistoryPage() {
  const { t } = useTranslation();
  const copy = useStaticPageCopy("ourHistory");
  const reduceMotion = useReducedMotion();
  const [lead, ...rest] = copy.paragraphs;

  return (
    <main className="overflow-x-hidden" style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
      <section className="pt-[calc(var(--main-header-h)+1.25rem)] pb-16 md:pb-24">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 md:px-10">
          <div className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-10 lg:gap-14 xl:gap-16 items-start">
            {/* Portrait photo — soft frame, no overlay on faces */}
            <ScrollReveal y={reduceMotion ? 0 : 20} className="lg:sticky lg:top-[calc(var(--main-header-h)+1.25rem)]">
              <figure className="relative m-0">
                <div
                  className="relative overflow-hidden rounded-[1.75rem] md:rounded-[2.25rem] bg-[#EDE9E2]"
                  style={{ aspectRatio: "3 / 4" }}
                >
                  <img
                    src={heroImage}
                    alt={copy.title}
                    width={1200}
                    height={1600}
                    decoding="async"
                    fetchPriority="high"
                    className="absolute inset-0 h-full w-full object-cover object-[center_22%]"
                  />
                </div>
                <figcaption className="sr-only">{copy.title}</figcaption>
              </figure>
            </ScrollReveal>

            {/* Story */}
            <div className="lg:pt-4 min-w-0">
              <ScrollReveal y={reduceMotion ? 0 : 14}>
                <p
                  className="text-[#2D241E]/45 uppercase tracking-[0.22em] text-[0.68rem] mb-4"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {copy.eyebrow}
                </p>
                <h1
                  className="text-[#2D241E] text-pretty font-normal leading-[1.08] mb-8 md:mb-10"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.35rem, 5.5vw, 3.6rem)",
                  }}
                >
                  {copy.title}
                </h1>
              </ScrollReveal>

              {lead ? (
                <ScrollReveal delay={0.05} y={reduceMotion ? 0 : 12}>
                  <p
                    className="text-[#2D241E] text-[1.05rem] md:text-[1.2rem] leading-[1.65] mb-8 md:mb-10"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontStyle: "italic",
                      fontWeight: 500,
                    }}
                  >
                    {lead}
                  </p>
                </ScrollReveal>
              ) : null}

              <div className="space-y-6 md:space-y-7">
                {rest.map((paragraph, index) => (
                  <ScrollReveal key={index} delay={0.06 + index * 0.03} y={reduceMotion ? 0 : 10}>
                    <p
                      className="text-[#2D241E]/68 text-[0.95rem] md:text-[1rem] leading-[1.85]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {paragraph}
                    </p>
                  </ScrollReveal>
                ))}
              </div>

              <ScrollReveal delay={0.14} className="mt-12 md:mt-14">
                <LangLink
                  to="/collection"
                  className="inline-flex items-center gap-2.5 text-[#2D241E] hover:text-[#4A0E0E] transition-colors duration-200 cursor-pointer touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D241E]/35 rounded-sm"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "0.72rem",
                    letterSpacing: "0.14em",
                  }}
                >
                  <span className="uppercase tracking-widest border-b border-[#2D241E]/3 pb-0.5 group-hover:border-[#4A0E0E]">
                    {t("checkout.goShopping")}
                  </span>
                  <ArrowRight size={14} aria-hidden="true" className="opacity-70" />
                </LangLink>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
