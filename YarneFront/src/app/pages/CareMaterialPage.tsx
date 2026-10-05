import { useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CareGuidePanel, type CarePiece } from "../components/care/CareGuidePanel";
import { CarePiecePicker } from "../components/care/CarePiecePicker";
import { CareServiceBand } from "../components/care/CareServiceBand";
import { CareTopicIcon, EYEBROW, FOCUS_RING, LABEL, SANS, SERIF, useNarrowScreen } from "../components/care/careUi";
import { useCareContent, useCareProducts } from "../hooks/useCareContent";
import { firstVisitRevealStyle } from "../hooks/useFirstVisitReady";
import { LangLink } from "../i18n/LangLink";
import { useLocale } from "../i18n/useLocale";
import {
  careGuidePath,
  careText,
  countPieceNotes,
  stepsForPiece,
  topicDiffersForPiece,
  topicsForPiece,
  type CareTopic,
} from "../utils/careContent";
import { NotFound } from "./NotFound";

const topicCardId = (topicId: string) => `care-topic-${topicId}`;

/**
 * One material's care guide: topic cards that open the step-by-step panel, do / don't, and
 * small questions.
 *
 * The open topic and the chosen piece live in the URL (?topic=&piece=) so a guide can be shared
 * and linked from a product page. Changing them is not a page change: Root and PageTransition
 * leave the page mounted and where it is (isCareGuidePath). No ScrollReveal here for the same
 * reason: it re-plays when the navigation type changes, which those query changes do.
 */
export function CareMaterialPage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const reduceMotion = useReducedMotion();
  const narrow = useNarrowScreen();
  const { materialSlug } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const care = useCareContent(materialSlug);
  const { products, known } = useCareProducts();
  const { content, current } = care;
  // One reveal, with the piece picker already in place: nothing arrives later and moves the page.
  const ready = care.ready && (known || !content.materials.some((item) => item.slug === materialSlug && item.pieceProductIds.length > 0));

  const materialIndex = content.materials.findIndex((item) => item.slug === materialSlug);
  const material = content.materials[materialIndex];

  // Named from the product data; products that no longer exist are skipped.
  const pieces = useMemo<CarePiece[]>(() => {
    const byId = new Map(products.map((product) => [product.id, product]));
    return (material?.pieceProductIds ?? []).flatMap((id) => {
      const product = byId.get(id);
      return product ? [{ id, name: product.name }] : [];
    });
  }, [material, products]);

  const topicId = params.get("topic");
  const piece = pieces.find((item) => item.id === params.get("piece")) ?? null;
  // A topic left out for the chosen piece is not on its guide at all.
  const topics = material ? topicsForPiece(material, piece?.id ?? null) : [];
  const topic = topics.find((item) => item.id === topicId) ?? null;

  const setQuery = (change: { topic?: string | null; piece?: string | null }, options: { replace?: boolean; state?: unknown }) => {
    const next = new URLSearchParams(location.search);
    for (const [key, value] of Object.entries(change)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const search = next.toString();
    navigate({ search: search ? `?${search}` : "" }, options);
  };

  // Opening adds a history entry, so Back closes the guide (on a phone, that is how a sheet is
  // dismissed). A guide opened straight from a link has no such entry: closing just drops ?topic.
  const openedHere = Boolean((location.state as { careGuide?: boolean } | null)?.careGuide);
  const openTopic = (id: string) => setQuery({ topic: id }, { state: { careGuide: true } });
  const switchTopic = (id: string) => setQuery({ topic: id }, { replace: true, state: location.state });
  const closeTopic = () => {
    if (openedHere) navigate(-1);
    else setQuery({ topic: null }, { replace: true });
  };
  const choosePiece = (id: string | null) => setQuery({ piece: id }, { replace: true, state: location.state });

  // Closing returns focus to the card the guide was opened from (or the last topic shown).
  const lastTopicRef = useRef<string | null>(null);
  useEffect(() => {
    if (topic) {
      lastTopicRef.current = topic.id;
    } else if (lastTopicRef.current) {
      document.getElementById(topicCardId(lastTopicRef.current))?.focus({ preventScroll: true });
      lastTopicRef.current = null;
    }
  }, [topic]);

  if (!material) {
    // Not in the copy this browser saved: wait for the server before calling it missing.
    return current ? <NotFound /> : <main style={{ backgroundColor: "#F5F2ED", minHeight: "var(--app-svh)" }} aria-busy />;
  }

  const name = careText(material.name, locale);
  const heroSubtitle = careText(material.heroSubtitle, locale);
  const dos = material.dos.map((item) => careText(item, locale)).filter(Boolean);
  const donts = material.donts.map((item) => careText(item, locale)).filter(Boolean);
  const questions = material.questions
    .map((item) => ({ q: careText(item.q, locale), a: careText(item.a, locale) }))
    .filter((item) => item.q || item.a);
  const other = content.materials.length > 1 ? content.materials[(materialIndex + 1) % content.materials.length] : null;

  const tagFor = (item: CareTopic) => {
    if (piece) {
      return topicDiffersForPiece(item, piece.id) ? { solid: true, label: t("care.noteFor", { piece: piece.name }) } : null;
    }
    return pieces.some((option) => topicDiffersForPiece(item, option.id) || item.hiddenForPieces.includes(option.id))
      ? { solid: false, label: t("care.topic.differsByPiece") }
      : null;
  };

  const tag = (value: ReturnType<typeof tagFor>) =>
    value && (
      <span
        className={`rounded-full uppercase font-medium text-[9.5px] tracking-[0.1em] px-2 py-1 md:text-[10.5px] md:tracking-[0.12em] md:px-2.5 md:py-[5px] ${
          value.solid ? "bg-[#4A0E0E] text-[#F5F2ED]" : "text-[#4A0E0E]"
        }`}
        style={value.solid ? undefined : { backgroundColor: "rgba(74,14,14,0.08)" }}
      >
        {value.label}
      </span>
    );

  const checkList = (title: string, items: string[], positive: boolean) =>
    items.length > 0 && (
      <div className="flex flex-col md:p-10 md:rounded-[20px] md:border md:border-[#2D241E]/15">
        <h3 className={`${EYEBROW} text-[11px] md:text-xs mb-2 md:mb-3`} style={{ color: positive ? "#315B42" : "#B42318" }}>
          {title}
        </h3>
        <ul className="flex flex-col">
          {items.map((item, index) => (
            <li
              key={index}
              className="flex gap-3 md:gap-3.5 items-center py-3.5 md:py-4 border-t border-[#2D241E]/10 text-sm md:text-[15px]"
            >
              {positive ? (
                <Check size={narrow ? 16 : 18} strokeWidth={1.5} className="shrink-0 text-[#315B42]" aria-hidden />
              ) : (
                <X size={narrow ? 16 : 18} strokeWidth={1.5} className="shrink-0 text-[#B42318]" aria-hidden />
              )}
              {item}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <main
      style={{ backgroundColor: "#F5F2ED", color: "#2D241E", minHeight: "var(--app-svh)", ...SANS, ...firstVisitRevealStyle(ready, Boolean(reduceMotion)) }}
      aria-busy={!ready}
    >
      <div className="max-w-[1400px] mx-auto pt-[var(--main-header-h)]">
        <nav className="px-4 pt-4 md:px-10 md:pt-8 flex items-center gap-4" aria-label={t("care.title")}>
          <LangLink
            to="/pages/care"
            className={`h-11 pl-3 pr-4 md:pl-4 md:pr-5 inline-flex items-center gap-2 rounded-full border border-[#2D241E]/20 ${LABEL} text-[11px] md:text-[11.5px] hover:bg-[#2D241E]/5 transition-colors ${FOCUS_RING}`}
          >
            <ArrowLeft size={14} strokeWidth={1.5} aria-hidden />
            {t("care.backToMaterials")}
          </LangLink>
          <span className="hidden md:inline text-xs text-[#2D241E]/72">{t("care.breadcrumb", { material: name })}</span>
        </nav>

        <section className="px-6 pt-9 pb-8 md:px-10 md:py-[72px] flex flex-col gap-3.5 md:grid md:grid-cols-12 md:gap-x-6 md:gap-y-0 md:items-end">
          <div className="md:col-span-7 flex flex-col gap-3.5 md:gap-5">
            <p className={`${EYEBROW} text-[11px] md:text-xs text-[#4A0E0E]`}>{t("care.guideEyebrow", { material: name })}</p>
            <h1 className="font-normal text-[44px] md:text-[clamp(52px,5.8vw,84px)] leading-[1.04] tracking-[-0.02em] text-pretty" style={SERIF}>
              {careText(material.heroTitle, locale) || name}
              {heroSubtitle && (
                <>
                  <br />
                  <span className="italic font-light">{heroSubtitle}</span>
                </>
              )}
            </h1>
          </div>
          <div className="md:col-start-9 md:col-span-4 flex flex-col gap-3.5 md:gap-4">
            <p className="text-sm md:text-[15px] leading-[1.6] text-[#2D241E]/72">{careText(material.intro, locale)}</p>
            {pieces.length > 0 && (
              <CarePiecePicker
                materialName={name}
                options={pieces.map((item) => ({ ...item, notes: countPieceNotes(material, item.id) }))}
                selected={piece?.id ?? null}
                onSelect={choosePiece}
              />
            )}
          </div>
        </section>

        <section className="px-4 pb-14 md:px-10 md:pb-[104px] flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-6">
          {topics.map((item) => {
            const stepsLabel = t("care.topic.seeSteps", { count: stepsForPiece(item, piece?.id ?? null).length });
            const badge = tag(tagFor(item));
            return (
              <button
                key={item.id}
                id={topicCardId(item.id)}
                type="button"
                aria-haspopup="dialog"
                onClick={() => openTopic(item.id)}
                className={`w-full p-5 md:p-9 rounded-[20px] bg-[#EDE9E2] text-[#2D241E] text-left cursor-pointer flex gap-4 items-start md:flex-col md:gap-3.5 md:items-stretch hover:bg-[#E5E0D8] transition-colors duration-300 ${FOCUS_RING}`}
              >
                <span className="shrink-0 mt-0.5 md:mt-0 md:flex md:justify-between md:items-start">
                  <CareTopicIcon icon={item.icon} size={narrow ? 22 : 26} />
                  {!narrow && badge}
                </span>
                <span className="grow flex flex-col gap-1 md:gap-3.5">
                  <span className="text-[23px] md:text-[30px] leading-tight" style={SERIF}>
                    {careText(item.title, locale)}
                  </span>
                  <span className="text-sm leading-[1.55] md:leading-[1.6] text-[#2D241E]/72">{careText(item.summary, locale)}</span>
                  <span className="mt-1.5 flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex items-center gap-2 ${LABEL} text-[10.5px] md:text-[11.5px]`}>
                      {stepsLabel}
                      {!narrow && <ChevronRight size={14} strokeWidth={1.5} aria-hidden />}
                    </span>
                    {narrow && badge}
                  </span>
                </span>
                {narrow && (
                  <span className="shrink-0 w-9 h-9 rounded-full border border-[#2D241E]/20 flex items-center justify-center" aria-hidden>
                    <ChevronRight size={16} strokeWidth={1.5} />
                  </span>
                )}
              </button>
            );
          })}
        </section>

        {(dos.length > 0 || donts.length > 0) && (
          <section className="px-6 pb-14 md:px-10 md:pb-[104px] flex flex-col gap-5 md:gap-8">
            <h2 className="font-normal text-4xl md:text-5xl leading-[1.1]" style={SERIF}>
              {t("care.doDontTitle", { material: locale === "en" ? name.toLowerCase() : name })}
            </h2>
            <div className="flex flex-col gap-8 md:grid md:grid-cols-2 md:gap-6">
              {checkList(t("care.do"), dos, true)}
              {checkList(t("care.dont"), donts, false)}
            </div>
          </section>
        )}

        {questions.length > 0 && (
          <section className="px-6 pb-14 md:px-10 md:pb-[104px] flex flex-col gap-5 md:grid md:grid-cols-12 md:gap-x-6">
            <h2 className="md:col-span-4 font-normal text-4xl md:text-5xl leading-[1.1]" style={SERIF}>
              {t("care.questionsTitle")}
            </h2>
            <div className="md:col-start-5 md:col-span-8 flex flex-col gap-5 md:grid md:grid-cols-3 md:gap-8">
              {questions.map((item, index) => (
                <div key={index} className="flex flex-col gap-1.5 md:gap-2.5 pt-4 md:pt-5 border-t border-[#2D241E]/15">
                  <h3 className="text-[15px] font-medium">{item.q}</h3>
                  <p className="text-sm leading-[1.6] text-[#2D241E]/72">{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <CareServiceBand />

        {other && (
          <div className="px-6 pt-8 md:px-10 md:pt-12 flex justify-center">
            <LangLink
              to={careGuidePath(other)}
              className={`min-h-11 inline-flex items-center gap-2 ${LABEL} text-[11px] md:text-[11.5px] underline underline-offset-4 hover:text-[#4A0E0E] rounded-sm ${FOCUS_RING}`}
            >
              {t("care.otherMaterial", { material: careText(other.name, locale) })}
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
            </LangLink>
          </div>
        )}
      </div>

      <CareGuidePanel
        material={{ ...material, topics }}
        topic={topic}
        pieces={pieces}
        piece={piece}
        onClose={closeTopic}
        onTopic={switchTopic}
      />
    </main>
  );
}
