import React, { useEffect, useState } from "react";
import type { Locale } from "../../i18n/config";
import {
  DEFAULT_STATIC_PAGES_COPY,
  loadStaticPagesCopyForAdmin,
  paragraphsToText,
  persistStaticPagesCopy,
  textToParagraphs,
  type StaticPageLocaleContent,
  type StaticPagesCopy,
} from "../../utils/staticPageCopy";

type Props = {
  onError?: (message: string) => void;
};

export function AdminOurHistoryEditor({ onError }: Props) {
  const [copy, setCopy] = useState<StaticPagesCopy>(DEFAULT_STATIC_PAGES_COPY);
  const [savedCopy, setSavedCopy] = useState<StaticPagesCopy>(DEFAULT_STATIC_PAGES_COPY);
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void loadStaticPagesCopyForAdmin()
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
  const localeCopy = copy.ourHistory[activeLocale];

  const updateLocaleCopy = (next: StaticPageLocaleContent) => {
    setCopy((prev) => ({
      ...prev,
      ourHistory: {
        ...prev.ourHistory,
        [activeLocale]: next,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistStaticPagesCopy(copy);
      setCopy(persisted);
      setSavedCopy(persisted);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Failed to save Our History page.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetLocale = () => {
    setCopy((prev) => ({
      ...prev,
      ourHistory: {
        ...prev.ourHistory,
        [activeLocale]: DEFAULT_STATIC_PAGES_COPY.ourHistory[activeLocale],
      },
    }));
  };

  if (loading) {
    return (
      <div className="rounded-[28px] p-8 mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
        <p className="text-[#2D241E]/45 text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading Our History page…
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div
        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}
      >
        <div>
          <p
            className="text-[#2D241E] uppercase tracking-widest text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
          >
            Our History Page
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Edit the /pages/our-history content shown in the footer.
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

      <div className="px-6 py-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#2D241E]/55 text-xs mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Eyebrow
            </label>
            <input
              type="text"
              value={localeCopy.eyebrow}
              onChange={(e) => updateLocaleCopy({ ...localeCopy, eyebrow: e.target.value })}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
            />
          </div>
          <div>
            <label className="block text-[#2D241E]/55 text-xs mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Title
            </label>
            <input
              type="text"
              value={localeCopy.title}
              onChange={(e) => updateLocaleCopy({ ...localeCopy, title: e.target.value })}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div>
          <label className="block text-[#2D241E]/55 text-xs mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Body text (separate paragraphs with a blank line)
          </label>
          <textarea
            value={paragraphsToText(localeCopy.paragraphs)}
            onChange={(e) => updateLocaleCopy({ ...localeCopy, paragraphs: textToParagraphs(e.target.value) })}
            rows={12}
            className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none resize-y"
            style={{ borderColor: "rgba(45,36,30,0.15)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.85rem" }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="px-6 py-3 rounded-full text-[#F5F2ED] transition-all hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", letterSpacing: "0.12em" }}
          >
            <span className="uppercase tracking-widest">{saving ? "Saving…" : "Publish Page"}</span>
          </button>
          <button
            type="button"
            onClick={handleResetLocale}
            className="px-5 py-3 rounded-full border text-[#2D241E]/70 hover:text-[#2D241E] transition-colors"
            style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.1em" }}
          >
            <span className="uppercase tracking-widest">
              Reset {activeLocale === "en" ? "English" : "Ukrainian"} to defaults
            </span>
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
