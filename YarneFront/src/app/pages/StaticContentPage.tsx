import { useTranslation } from "react-i18next";
import { ScrollReveal, SectionEyebrow, SectionTitle } from "../components/ScrollReveal";
import { usePageTitle } from "../hooks/usePageTitle";
import { useContactContent, useDeliveryContent } from "../hooks/useCareServiceContent";
import { careText } from "../utils/careContent";
import { useLocale } from "../i18n/useLocale";

type StaticPageKey = "delivery" | "terms" | "privacy";

type Props = {
  pageKey: StaticPageKey;
};

export function StaticContentPage({ pageKey }: Props) {
  const { t } = useTranslation();
  usePageTitle(t(`seo.${pageKey}Title`));
  const { content: contact } = useContactContent();
  // The contact address lives in one place (utils/contactContent.ts); the copy marks where it goes.
  const locale = useLocale();
  const { content: delivery } = useDeliveryContent();
  const fill = (text: string) => text.split("{{email}}").join(contact.email);
  // Terms and Privacy come from the locale files; Delivery & Returns is edited in the admin (the seed is the same text).
  const paragraphs =
    pageKey === "delivery"
      ? delivery.sections.flatMap((section) => [
          ...(careText(section.heading, locale) ? [{ heading: true, text: careText(section.heading, locale) }] : []),
          ...fill(careText(section.body, locale))
            .split(/\n\s*\n/)
            .map((text) => text.trim())
            .filter(Boolean)
            .map((text) => ({ heading: false, text })),
        ])
      : (t(`pages.${pageKey}.paragraphs`, { returnObjects: true, email: contact.email }) as (string | { heading: boolean; text: string })[]).map((item) =>
          typeof item === "string" ? { heading: false, text: item } : item,
        );

  return (
    <main style={{ backgroundColor: "#F5F2ED", minHeight: "var(--app-svh)" }}>
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
                    className={`${paragraph.heading ? "text-[#2D241E] font-medium" : "text-[#2D241E]/68"} text-[0.95rem] leading-[1.85]`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {paragraph.text}
                  </p>
                ))}
            </div>
            {pageKey !== "delivery" && (
              <p className="text-[#2D241E]/[0.68] text-xs mt-10" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {t(`pages.${pageKey}.lastUpdated`)}
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
