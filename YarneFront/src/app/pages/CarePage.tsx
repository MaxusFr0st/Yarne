import { useMemo, useRef, type MouseEvent } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, ChevronRight, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ImageWithFallback as Img } from "../components/figma/ImageWithFallback";
import { ScrollReveal } from "../components/ScrollReveal";
import { CareSearch, type CareSearchEntry } from "../components/care/CareSearch";
import { CareWorkshopBand } from "../components/care/CareWorkshopBand";
import {
  CARE_GUARANTEE_PATH,
  CARE_REQUEST_PATH,
  CareNeedleIcon,
  EYEBROW,
  FOCUS_RING,
  LABEL,
  PILL,
  PILL_CREAM,
  PILL_OUTLINE_ON_INK,
  SANS,
  SERIF,
  useNarrowScreen,
} from "../components/care/careUi";
import { useCareContent, useCareProducts } from "../hooks/useCareContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { usePageTitle } from "../hooks/usePageTitle";
import { usePrepareProducts } from "../hooks/usePrepareProducts";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import type { Product } from "../types/product";
import { careGuidePath, careText, type CareMaterial } from "../utils/careContent";

/** The phone's two service buttons: a little smaller than the page's other pills. */
const SMALL_PILL = "h-[46px] px-4 flex items-center justify-center rounded-full uppercase font-medium tracking-[0.12em] text-[11px] text-center";

type MaterialView = { material: CareMaterial; name: string; pieces: Product[] };

/**
 * Yarné Care: the lifetime guarantee up front, then two ways on. "Look after my bag" leads to
 * the materials below (choose one, or find the bag by name, to open its care guide); the other
 * to the Guarantee terms and Request care pages. Materials, their photos and their pieces come
 * from Admin → Care.
 */
export function CarePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  usePageTitle(t("care.tabTitle.landing"));
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
      materials.flatMap(({ material, name, pieces }) => [
        { name, material, materialName: name },
        ...pieces.map((piece) => ({ productId: piece.id, name: piece.name, material, materialName: name })),
      ]),
    [materials],
  );

  // The pieces under each tile link to their product pages: one tap away (desktop only).
  usePrepareProducts(tilesRef, narrow ? [] : materials.flatMap((view) => view.pieces));

  // Scrolled here rather than followed as a link: the address stays the page's own.
  const toMaterials = (event: MouseEvent) => {
    event.preventDefault();
    document.getElementById("materials")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  };

  const guaranteeLink = (
    <LangLink
      to={CARE_GUARANTEE_PATH}
      className={`self-start min-h-11 -my-2 inline-flex items-center gap-2 ${LABEL} text-[11.5px] underline underline-offset-[6px] hover:text-[#4A0E0E] rounded-sm ${FOCUS_RING}`}
    >
      {t("care.landing.guaranteeLink")}
      <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
    </LangLink>
  );

  return (
    <main
      // Clipped, not hidden: "hidden" would make the page a scroll area of its own, with the last
      // reveal's rise as extra height that disappears (and jumps) once it has played.
      className="overflow-x-clip"
      style={{ backgroundColor: "#F5F2ED", color: "#2D241E", minHeight: "var(--app-svh)", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
      aria-busy={!ready}
    >
      <div className="max-w-[1400px] mx-auto pt-[var(--main-header-h)]">
        {narrow ? (
          <>
            <section className="px-6 pt-[22px] pb-5 flex flex-col gap-3">
              <p className={`${EYEBROW} text-[11px] text-[#4A0E0E]`}>{t("care.landing.eyebrow")}</p>
              <h1 className="font-normal text-[38px] leading-[1.04] tracking-[-0.02em]" style={SERIF}>
                {t("care.landing.titleLine1")} <span className="italic font-light">{t("care.landing.titleLine2")}</span>
              </h1>
              <p className="text-[15px] leading-[1.6]">
                <span className="font-medium">{t("care.landing.guaranteeStatement")}</span>{" "}
                <span className="text-[#2D241E]/72">{t("care.landing.guaranteeText")}</span>
              </p>
              {guaranteeLink}
            </section>

            <div className="mx-4 rounded-3xl border border-[#2D241E]/15 overflow-hidden flex flex-col">
              <a
                href="#materials"
                onClick={toMaterials}
                className="min-h-[84px] py-4 pl-[18px] pr-4 bg-[#F5F2ED] text-[#2D241E] flex items-center gap-3.5 focus-visible:outline-none focus-visible:bg-[#EDE9E2]"
              >
                <span className="w-11 h-11 shrink-0 rounded-full bg-[#EDE9E2] flex items-center justify-center">
                  <CareNeedleIcon />
                </span>
                <span className="grow flex flex-col gap-[3px]">
                  <span className="text-[23px] leading-[1.1]" style={SERIF}>
                    {t("care.landing.lookAfter.title")}
                  </span>
                  <span className="text-[13px] leading-[1.45] text-[#2D241E]/72">{t("care.landing.lookAfter.textShort")}</span>
                </span>
                <ArrowDown size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
              </a>
              <div className="p-[18px] bg-[#2D241E] text-[#F5F2ED] flex flex-col gap-3.5">
                <div className="flex gap-3.5 items-center">
                  <span className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: "rgba(245,242,237,0.1)" }}>
                    <ShieldCheck size={20} strokeWidth={1.5} aria-hidden />
                  </span>
                  <h2 className="font-normal text-[22px] leading-[1.12]" style={SERIF}>
                    {t("care.landing.service.title")}
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  <LangLink to={CARE_REQUEST_PATH} className={`${SMALL_PILL} ${PILL_CREAM}`}>
                    {t("care.landing.service.request")}
                  </LangLink>
                  <LangLink to={CARE_GUARANTEE_PATH} className={`${SMALL_PILL} ${PILL_OUTLINE_ON_INK}`}>
                    {t("care.landing.service.terms")}
                  </LangLink>
                </div>
              </div>
            </div>

            <section id="materials" className="scroll-mt-[var(--main-header-h)] px-6 pt-9 pb-5 flex flex-col gap-2">
              <p className={`${EYEBROW} text-[11px] text-[#4A0E0E]`}>{t("care.landing.materialsEyebrow")}</p>
              <h2 className="font-normal text-[32px] leading-[1.08]" style={SERIF}>
                {t("care.landing.materialsTitle")}
              </h2>
            </section>
            <div className="mx-4">
              <CareSearch entries={searchEntries} />
            </div>

            <section className="px-4 pt-8 pb-12 flex flex-col gap-3">
              <div className="px-2 pb-1 flex justify-between items-baseline">
                <h3 className={`${LABEL} text-[10.5px]`}>{t("care.chooseMaterial")}</h3>
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
            </section>
          </>
        ) : (
          <>
            <section className="px-10 pt-8 pb-6 flex flex-col gap-7">
              <div className="grid grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] gap-x-8 lg:gap-x-14 items-center">
                <div className="flex flex-col gap-3.5">
                  <p className={`${EYEBROW} text-xs text-[#4A0E0E]`}>{t("care.landing.eyebrow")}</p>
                  <h1 className="font-normal text-[clamp(38px,4.05vw,58px)] leading-[1.02] tracking-[-0.02em]" style={SERIF}>
                    {t("care.landing.titleLine1")}
                    <br />
                    <span className="italic font-light">{t("care.landing.titleLine2")}</span>
                  </h1>
                </div>
                <span aria-hidden className="self-stretch bg-[#2D241E]/20" />
                <div className="flex flex-col gap-3">
                  <p className={`${EYEBROW} text-xs text-[#4A0E0E]`}>{t("care.landing.guaranteeEyebrow")}</p>
                  <p className="text-[clamp(23px,2.1vw,30px)] leading-[1.2]" style={SERIF}>
                    {t("care.landing.guaranteeStatement")}
                  </p>
                  <p className="text-[15.5px] leading-[1.6] text-[#2D241E]/72">{t("care.landing.guaranteeText")}</p>
                  {guaranteeLink}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <a
                  href="#materials"
                  onClick={toMaterials}
                  className={`min-h-[220px] px-7 lg:px-10 py-[30px] rounded-[28px] bg-[#EDE9E2] text-[#2D241E] flex flex-col justify-between gap-8 hover:bg-[#E5E0D8] transition-colors duration-300 ${FOCUS_RING}`}
                >
                  <span className="flex flex-col gap-3">
                    <span className={`flex items-center gap-2.5 ${LABEL} text-[11.5px] text-[#2D241E]/72`}>
                      <CareNeedleIcon size={18} className="text-[#2D241E]" />
                      {t("care.landing.lookAfter.eyebrow")}
                    </span>
                    <span className="text-[clamp(30px,3.1vw,44px)] leading-[1.05]" style={SERIF}>
                      {t("care.landing.lookAfter.title")}
                    </span>
                    <span className="max-w-[440px] text-[15px] leading-[1.6] text-[#2D241E]/72">{t("care.landing.lookAfter.text")}</span>
                  </span>
                  <span className="flex items-center justify-between">
                    <span className="uppercase font-medium tracking-[0.15em] text-xs">{t("care.landing.lookAfter.cta")}</span>
                    <span className="w-12 h-12 rounded-full border border-[#2D241E]/20 flex items-center justify-center">
                      <ArrowDown size={18} strokeWidth={1.5} aria-hidden />
                    </span>
                  </span>
                </a>
                <div className="min-h-[220px] px-7 lg:px-10 py-[30px] rounded-[28px] bg-[#2D241E] text-[#F5F2ED] flex flex-col justify-between gap-8">
                  <div className="flex flex-col gap-3">
                    <p className={`flex items-center gap-2.5 ${LABEL} text-[11.5px] opacity-80`}>
                      <ShieldCheck size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
                      {t("care.landing.service.eyebrow")}
                    </p>
                    <h2 className="font-normal text-[clamp(30px,3.1vw,44px)] leading-[1.05]" style={SERIF}>
                      {t("care.landing.service.title")}
                    </h2>
                    <p className="max-w-[500px] text-[15px] leading-[1.6] opacity-85">{t("care.landing.service.text")}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <LangLink to={CARE_REQUEST_PATH} className={`${PILL} ${PILL_CREAM} h-[52px] px-[26px] justify-center`}>
                      {t("care.landing.service.request")}
                      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                    </LangLink>
                    <LangLink to={CARE_GUARANTEE_PATH} className={`${PILL} ${PILL_OUTLINE_ON_INK} h-[52px] px-[26px] justify-center`}>
                      {t("care.landing.service.terms")}
                    </LangLink>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="materials"
              className="scroll-mt-[var(--main-header-h)] px-10 pt-14 pb-6 flex flex-col gap-6 lg:flex-row lg:justify-between lg:items-end lg:gap-10"
            >
              <div className="flex flex-col gap-2.5">
                <p className={`${EYEBROW} text-xs text-[#4A0E0E]`}>{t("care.landing.materialsEyebrow")}</p>
                <h2 className="font-normal text-[clamp(36px,3.2vw,46px)] leading-[1.04] tracking-[-0.015em]" style={SERIF}>
                  {t("care.landing.materialsTitle")}
                </h2>
                <p className="text-[14.5px] leading-[1.6] text-[#2D241E]/72">{t("care.landing.materialsHint")}</p>
              </div>
              <div className="w-full lg:w-[520px] lg:shrink-0">
                <CareSearch entries={searchEntries} />
              </div>
            </section>

            <section ref={tilesRef} className="px-10 pb-28 grid grid-cols-2 gap-6">
              {materials.map(({ material, name, pieces }, index) => (
                <ScrollReveal key={material.id} delay={(index % 2) * 0.06} className="flex flex-col">
                  <LangLink
                    to={careGuidePath(material)}
                    className={`group relative block aspect-[16/9] rounded-[32px] overflow-hidden text-white ${FOCUS_RING}`}
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
                    <span className="absolute left-7 right-7 bottom-7 lg:left-10 lg:right-10 lg:bottom-9 flex justify-between items-end gap-4">
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
          </>
        )}

        <CareWorkshopBand />
      </div>
    </main>
  );
}
