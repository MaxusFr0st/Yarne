import React, { useEffect, useState } from "react";
import type { Locale } from "../i18n/config";
import {
  DEFAULT_HOME_PAGE_COPY,
  loadHomePageCopyForAdmin,
  persistHomePageCopy,
  type HomePageCopy,
  type HomePageCopyLocale,
} from "../../utils/homePageCopy";

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  path: (copy: HomePageCopyLocale) => string;
  set: (copy: HomePageCopyLocale, value: string) => HomePageCopyLocale;
};

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Hero",
    fields: [
      { key: "hero.eyebrow", label: "Eyebrow", path: (c) => c.hero.eyebrow, set: (c, v) => ({ ...c, hero: { ...c.hero, eyebrow: v } }) },
      { key: "hero.titleLine1", label: "Title line 1", path: (c) => c.hero.titleLine1, set: (c, v) => ({ ...c, hero: { ...c.hero, titleLine1: v } }) },
      { key: "hero.titleAccent", label: "Title accent (italic)", path: (c) => c.hero.titleAccent, set: (c, v) => ({ ...c, hero: { ...c.hero, titleAccent: v } }) },
      { key: "hero.subtitle", label: "Subtitle", multiline: true, path: (c) => c.hero.subtitle, set: (c, v) => ({ ...c, hero: { ...c.hero, subtitle: v } }) },
      { key: "hero.ctaPrimary", label: "Primary CTA", path: (c) => c.hero.ctaPrimary, set: (c, v) => ({ ...c, hero: { ...c.hero, ctaPrimary: v } }) },
      { key: "hero.ctaSecondary", label: "Secondary CTA", path: (c) => c.hero.ctaSecondary, set: (c, v) => ({ ...c, hero: { ...c.hero, ctaSecondary: v } }) },
      { key: "hero.scroll", label: "Scroll hint", path: (c) => c.hero.scroll, set: (c, v) => ({ ...c, hero: { ...c.hero, scroll: v } }) },
    ],
  },
  {
    title: "Best Sellers Carousel",
    fields: [
      { key: "bestSellers.eyebrow", label: "Eyebrow", path: (c) => c.bestSellers.eyebrow, set: (c, v) => ({ ...c, bestSellers: { ...c.bestSellers, eyebrow: v } }) },
      { key: "bestSellers.title", label: "Title", path: (c) => c.bestSellers.title, set: (c, v) => ({ ...c, bestSellers: { ...c.bestSellers, title: v } }) },
    ],
  },
  {
    title: "Featured Showcase",
    fields: [
      { key: "showcase.eyebrow", label: "Eyebrow (e.g. Featured Showcase)", path: (c) => c.showcase.eyebrow, set: (c, v) => ({ ...c, showcase: { ...c.showcase, eyebrow: v } }) },
      { key: "showcase.title", label: "Title (e.g. Editorial Picks)", path: (c) => c.showcase.title, set: (c, v) => ({ ...c, showcase: { ...c.showcase, title: v } }) },
    ],
  },
  {
    title: "Featured Grid",
    fields: [
      { key: "featured.eyebrow", label: "Eyebrow", path: (c) => c.featured.eyebrow, set: (c, v) => ({ ...c, featured: { ...c.featured, eyebrow: v } }) },
      { key: "featured.title", label: "Title (e.g. Featured this season)", path: (c) => c.featured.title, set: (c, v) => ({ ...c, featured: { ...c.featured, title: v } }) },
      { key: "featured.viewAll", label: "View all link", path: (c) => c.featured.viewAll, set: (c, v) => ({ ...c, featured: { ...c.featured, viewAll: v } }) },
      { key: "featured.shopAllPieces", label: "Shop all button (use {{count}})", path: (c) => c.featured.shopAllPieces, set: (c, v) => ({ ...c, featured: { ...c.featured, shopAllPieces: v } }) },
    ],
  },
  {
    title: "Editorial Block",
    fields: [
      { key: "editorial.eyebrow", label: "Eyebrow", path: (c) => c.editorial.eyebrow, set: (c, v) => ({ ...c, editorial: { ...c.editorial, eyebrow: v } }) },
      { key: "editorial.titleLine1", label: "Title line 1", path: (c) => c.editorial.titleLine1, set: (c, v) => ({ ...c, editorial: { ...c.editorial, titleLine1: v } }) },
      { key: "editorial.titleLine2", label: "Title line 2", path: (c) => c.editorial.titleLine2, set: (c, v) => ({ ...c, editorial: { ...c.editorial, titleLine2: v } }) },
      { key: "editorial.paragraph1", label: "Paragraph 1", multiline: true, path: (c) => c.editorial.paragraph1, set: (c, v) => ({ ...c, editorial: { ...c.editorial, paragraph1: v } }) },
      { key: "editorial.paragraph2", label: "Paragraph 2", multiline: true, path: (c) => c.editorial.paragraph2, set: (c, v) => ({ ...c, editorial: { ...c.editorial, paragraph2: v } }) },
      { key: "editorial.ourStory", label: "Our story link", path: (c) => c.editorial.ourStory, set: (c, v) => ({ ...c, editorial: { ...c.editorial, ourStory: v } }) },
    ],
  },
  {
    title: "Lookbook Banner",
    fields: [
      { key: "lookbook.eyebrow", label: "Eyebrow", path: (c) => c.lookbook.eyebrow, set: (c, v) => ({ ...c, lookbook: { ...c.lookbook, eyebrow: v } }) },
      { key: "lookbook.titleLine1", label: "Title line 1", path: (c) => c.lookbook.titleLine1, set: (c, v) => ({ ...c, lookbook: { ...c.lookbook, titleLine1: v } }) },
      { key: "lookbook.titleLine2", label: "Title line 2", path: (c) => c.lookbook.titleLine2, set: (c, v) => ({ ...c, lookbook: { ...c.lookbook, titleLine2: v } }) },
      { key: "lookbook.cta", label: "CTA button", path: (c) => c.lookbook.cta, set: (c, v) => ({ ...c, lookbook: { ...c.lookbook, cta: v } }) },
    ],
  },
  {
    title: "More From Collection",
    fields: [
      { key: "moreFromCollection.eyebrow", label: "Eyebrow", path: (c) => c.moreFromCollection.eyebrow, set: (c, v) => ({ ...c, moreFromCollection: { ...c.moreFromCollection, eyebrow: v } }) },
      { key: "moreFromCollection.title", label: "Title (e.g. More from the collection)", path: (c) => c.moreFromCollection.title, set: (c, v) => ({ ...c, moreFromCollection: { ...c.moreFromCollection, title: v } }) },
    ],
  },
];

type Props = {
  onError?: (message: string) => void;
};

export function AdminHomeCopyEditor({ onError }: Props) {
  const [copy, setCopy] = useState<HomePageCopy>(DEFAULT_HOME_PAGE_COPY);
  const [savedCopy, setSavedCopy] = useState<HomePageCopy>(DEFAULT_HOME_PAGE_COPY);
  const [activeLocale, setActiveLocale] = useState<Locale>("uk");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadHomePageCopyForAdmin()
      .then((loaded) => {
        if (cancelled) return;
        setCopy(loaded);
        setSavedCopy(loaded);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = JSON.stringify(copy) !== JSON.stringify(savedCopy);

  const updateField = (field: FieldDef, value: string) => {
    setCopy((prev) => ({
      ...prev,
      [activeLocale]: field.set(prev[activeLocale], value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistHomePageCopy(copy);
      setCopy(persisted);
      setSavedCopy(persisted);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to save home page copy.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocale = () => {
    setCopy((prev) => ({
      ...prev,
      [activeLocale]: DEFAULT_HOME_PAGE_COPY[activeLocale],
    }));
  };

  if (loading) {
    return (
      <div className="rounded-[28px] p-8 mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
        <p className="text-[#2D241E]/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>Loading home page text…</p>
      </div>
    );
  }

  const localeCopy = copy[activeLocale];

  return (
    <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}>
        <div>
          <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
            Home Page Text
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Edit every text field on the home page, including Featured Showcase and Featured this season headings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["en", "uk"] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setActiveLocale(locale)}
              className="px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-all"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.1em",
                backgroundColor: activeLocale === locale ? "#2D241E" : "transparent",
                color: activeLocale === locale ? "#F5F2ED" : "#2D241E",
                border: activeLocale === locale ? "1.5px solid #2D241E" : "1.5px solid rgba(45,36,30,0.2)",
              }}
            >
              {locale === "en" ? "English" : "Ukrainian"}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-4" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
              {section.title}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {section.fields.map((field) => (
                <div key={field.key} className={field.multiline ? "md:col-span-2" : undefined}>
                  <label className="block text-[#2D241E]/55 text-xs mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={field.path(localeCopy)}
                      onChange={(e) => updateField(field, e.target.value)}
                      rows={3}
                      className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none resize-y"
                      style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={field.path(localeCopy)}
                      onChange={(e) => updateField(field, e.target.value)}
                      className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
                      style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
          >
            <span className="uppercase tracking-widest">{saving ? "Saving…" : "Publish Text"}</span>
          </button>
          <button
            type="button"
            onClick={handleResetLocale}
            className="px-5 py-3 rounded-full border text-[#2D241E]/70 hover:text-[#2D241E] transition-colors"
            style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}
          >
            <span className="uppercase tracking-widest">Reset {activeLocale === "en" ? "English" : "Ukrainian"} to defaults</span>
          </button>
          {isDirty && (
            <span className="text-xs text-[#9B6B2E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Unsaved changes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
