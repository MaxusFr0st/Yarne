import { useTranslation } from "react-i18next";
import { useStaticPageCopy } from "../hooks/useStaticPageCopy";
import { ScrollReveal, SectionEyebrow, SectionTitle } from "../components/ScrollReveal";

type StaticPageKey = "ourHistory" | "delivery" | "care" | "terms";

type Props = {
  pageKey: StaticPageKey;
};

export function StaticContentPage({ pageKey }: Props) {
  const { t } = useTranslation();
  const ourHistoryCopy = useStaticPageCopy("ourHistory");

  if (pageKey === "ourHistory") {
    return (
      <main style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
        <section className="pt-28 pb-10 md:pt-32 md:pb-14">
          <div className="max-w-[760px] mx-auto px-6 md:px-10">
            <ScrollReveal>
              <SectionEyebrow className="mb-4">{ourHistoryCopy.eyebrow}</SectionEyebrow>
              <SectionTitle className="mb-6">{ourHistoryCopy.title}</SectionTitle>
              <div className="space-y-5">
                {ourHistoryCopy.paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-[#2D241E]/68 text-[0.95rem] leading-[1.85]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
    );
  }

  const paragraphs = t(`pages.${pageKey}.paragraphs`, { returnObjects: true }) as string[];

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "100svh" }}>
      <section className="pt-28 pb-10 md:pt-32 md:pb-14">
        <div className="max-w-[760px] mx-auto px-6 md:px-10">
          <ScrollReveal>
            <SectionEyebrow className="mb-4">{t(`pages.${pageKey}.eyebrow`)}</SectionEyebrow>
            <SectionTitle className="mb-6">{t(`pages.${pageKey}.title`)}</SectionTitle>
            <div className="space-y-5">
              {Array.isArray(paragraphs) &&
                paragraphs.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-[#2D241E]/68 text-[0.95rem] leading-[1.85]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {paragraph}
                  </p>
                ))}
            </div>
            {pageKey === "terms" && (
              <p className="text-[#2D241E]/40 text-xs mt-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {t("pages.terms.lastUpdated")}
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
