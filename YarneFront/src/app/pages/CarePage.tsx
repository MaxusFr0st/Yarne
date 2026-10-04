import { useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback as Img } from "../components/figma/ImageWithFallback";
import { ScrollReveal } from "../components/ScrollReveal";
import { CareSearch, type CareSearchEntry } from "../components/care/CareSearch";
import { CareServiceBand } from "../components/care/CareServiceBand";
import { CARE_CONTACT_HREF, EYEBROW, FOCUS_RING, LABEL, SANS, SERIF, useNarrowScreen } from "../components/care/careUi";
import { useCareContent, useCareProducts } from "../hooks/useCareContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { usePrepareProducts } from "../hooks/usePrepareProducts";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import type { Product } from "../types/product";
import { careGuidePath, careText, type CareMaterial } from "../utils/careContent";

type MaterialView = { material: CareMaterial; name: string; pieces: Product[] };

/**
 * Yarné Care: choose the material your bag is made of (or find the bag by name) to open its
 * care guide. Materials, their photos and their pieces come from Admin → Care.
 */
export function CarePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const narrow = useNarrowScreen();
  const care = useCareContent();
  const { products, known } = useCareProducts();
  const { content } = care;
  // One reveal, with the pieces already named: nothing arrives later and moves the page.
  const ready = care.ready && (known || !content.materials.some((material) => material.pieceProductIds.length > 0));
  const tilesRef = useRef<HTMLElement>(null);

  // Pieces are named from the product data, so a rename shows here; products that no longer exist are skipped.
  const materials = useMemo<MaterialView[]>(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return content.materials.map((material) => ({
      material,
      name: careText(material.name, locale),
      pieces: material.pieceProductIds.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p)),
    }));
  }, [content, products, locale]);

  const searchEntries = useMemo<CareSearchEntry[]>(
    () =>
      materials.flatMap(({ material, name, pieces }) =>
        pieces.map((piece) => ({ productId: piece.id, productName: piece.name, material, materialName: name })),
      ),
    [materials],
  );

  // The pieces under each tile link to their product pages: one tap away (desktop only).
  usePrepareProducts(tilesRef, narrow ? [] : materials.flatMap((view) => view.pieces));

  return (
    <main
      className="overflow-x-hidden"
      style={{ backgroundColor: "#F5F2ED", color: "#2D241E", minHeight: "var(--app-svh)", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
      aria-busy={!ready}
    >
      <div className="max-w-[1400px] mx-auto pt-[var(--main-header-h)]">
        <section className="px-6 pt-9 pb-6 md:px-10 md:pt-[104px] md:pb-16 flex flex-col gap-2.5 md:gap-5 md:items-center md:text-center">
          <p className={`${EYEBROW} text-[11px] md:text-xs text-[#2D241E]/72`}>{t("care.eyebrow")}</p>
          <h1 className="font-normal text-[44px] md:text-[88px] leading-[1.02] tracking-[-0.02em]" style={SERIF}>
            {t("care.title")}
          </h1>
          <p className="italic font-light text-xl md:text-[26px] text-[#2D241E]/72" style={SERIF}>
            {t("care.question")}
          </p>
          <p className="hidden md:block max-w-[520px] text-[15px] leading-[1.6] text-[#2D241E]/72">{t("care.intro")}</p>
          <div className="hidden md:block mt-4 w-full max-w-[560px]">{!narrow && <CareSearch entries={searchEntries} />}</div>
        </section>

        {narrow && (
          <div className="mx-4">
            <CareSearch entries={searchEntries} />
          </div>
        )}

        {narrow ? (
          <section className="px-4 pt-8 pb-12 flex flex-col gap-3">
            <div className="px-2 pb-1 flex justify-between items-baseline">
              <h2 className={`${LABEL} text-[10.5px]`}>{t("care.chooseMaterial")}</h2>
              <span className="text-xs text-[#2D241E]/72">{t("care.materialCount", { count: materials.length })}</span>
            </div>
            {materials.map(({ material, name, pieces }, index) => (
              <LangLink
                key={material.id}
                to={careGuidePath(material)}
                className={`p-2.5 rounded-3xl bg-[#EDE9E2] flex gap-3.5 items-center text-[#2D241E] ${FOCUS_RING}`}
              >
                <span className="relative block w-[104px] h-32 shrink-0 rounded-2xl overflow-hidden bg-[#E5E0D8]">
                  {material.tileImageUrl && (
                    <Img
                      src={material.tileImageUrl}
                      alt=""
                      priority={index < 3}
                      fadeIn
                      poster
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </span>
                <span className="grow min-w-0 flex flex-col gap-1.5">
                  <span className="text-[30px] leading-none" style={SERIF}>
                    {name}
                  </span>
                  <span className="text-[13px] leading-[1.45] text-[#2D241E]/72 first-letter:uppercase">
                    {careText(material.heroSubtitle, locale)}
                  </span>
                  {pieces.length > 0 && (
                    <span className="text-xs leading-[1.45] text-[#2D241E]/72">
                      <span className={`${LABEL} text-[10px] text-[#2D241E]`}>{t("care.pieces")} </span>
                      {pieces.map((piece) => piece.name).join(", ")}
                    </span>
                  )}
                </span>
                <span className="w-9 h-9 shrink-0 mr-1 rounded-full bg-[#2D241E] text-[#F5F2ED] flex items-center justify-center">
                  <ChevronRight size={14} strokeWidth={1.5} aria-hidden />
                </span>
              </LangLink>
            ))}
            <p className="mx-2 mt-2 text-[13px] leading-[1.6] text-[#2D241E]/72">
              {t("care.notSure")}{" "}
              <a href={CARE_CONTACT_HREF} className="text-[#2D241E] underline underline-offset-2 hover:text-[#4A0E0E]">
                {t("care.askUs")}
              </a>
              .
            </p>
          </section>
        ) : (
          <section ref={tilesRef} className="px-10 pb-[120px] grid grid-cols-2 gap-6">
            {materials.map(({ material, name, pieces }, index) => (
              <ScrollReveal key={material.id} delay={(index % 2) * 0.06} className="flex flex-col">
                <LangLink
                  to={careGuidePath(material)}
                  className={`group relative block aspect-[4/3] rounded-[32px] overflow-hidden text-white ${FOCUS_RING}`}
                  style={{ backgroundColor: index % 2 ? "#E5E0D8" : "#EDE9E2" }}
                >
                  {material.tileImageUrl && (
                    <Img
                      src={material.tileImageUrl}
                      alt=""
                      priority={index < 2}
                      fadeIn
                      poster
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[60%]"
                    style={{ background: "linear-gradient(to top, rgba(45,36,30,0.6), rgba(45,36,30,0))" }}
                  />
                  <span className="absolute left-10 right-10 bottom-9 flex justify-between items-end gap-4">
                    <span className="text-[clamp(36px,4vw,56px)] leading-none" style={SERIF}>
                      {name}
                    </span>
                    <span
                      className={`shrink-0 h-11 px-5 inline-flex items-center gap-2 rounded-full bg-[#F5F2ED] text-[#2D241E] ${LABEL} text-[11.5px]`}
                    >
                      {t("care.tile.cta")}
                      <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
                    </span>
                  </span>
                </LangLink>
                {pieces.length > 0 && (
                  <p className="px-2 pt-4 flex gap-3 items-baseline text-[13px] text-[#2D241E]/72">
                    <span className={`${LABEL} text-[11px] shrink-0`}>{t("care.pieces")}</span>
                    <span>
                      {pieces.map((piece, i) => (
                        <span key={piece.id}>
                          {i > 0 && ", "}
                          <LangLink
                            to={`/product/${piece.id}`}
                            className="text-[#2D241E] underline underline-offset-2 hover:text-[#4A0E0E]"
                          >
                            {piece.name}
                          </LangLink>
                        </span>
                      ))}
                    </span>
                  </p>
                )}
              </ScrollReveal>
            ))}
          </section>
        )}

        <CareServiceBand compact />
      </div>
    </main>
  );
}
