import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_GUARANTEE_DESCRIPTION_EN,
  DEFAULT_GUARANTEE_DESCRIPTION_UK,
  DEFAULT_GUARANTEE_TITLE_EN,
  DEFAULT_GUARANTEE_TITLE_UK,
  persistProductGuaranteeContent,
  type ProductGuaranteeContent,
} from "../../utils/productGuaranteeContent";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

type ProductGuaranteeEditorProps = {
  initialContent: ProductGuaranteeContent;
  onSaved?: (content: ProductGuaranteeContent) => void;
  onError?: (message: string) => void;
};

export function ProductGuaranteeEditor({
  initialContent,
  onSaved,
  onError,
}: ProductGuaranteeEditorProps) {
  const [draft, setDraft] = useState<ProductGuaranteeContent>(initialContent);
  const [savedContent, setSavedContent] = useState<ProductGuaranteeContent>(initialContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initialContent);
    setSavedContent(initialContent);
  }, [initialContent]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedContent),
    [draft, savedContent]
  );

  const updateField = <K extends keyof ProductGuaranteeContent>(key: K, value: ProductGuaranteeContent[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistProductGuaranteeContent(draft);
      setDraft(persisted);
      setSavedContent(persisted);
      onSaved?.(persisted);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save product guarantee to server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div
        className="px-6 py-4 flex items-start justify-between gap-4"
        style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}
      >
        <div>
          <p
            className="text-[#2D241E] uppercase tracking-widest text-xs"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}
          >
            Product Page Guarantee
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Quality guarantee block shown on product pages (desktop and mobile).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!isDirty && !saving ? (
            <span className="text-[#2D241E]/45 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Saved
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isDirty || saving}
            className="px-5 py-2 rounded-full text-xs uppercase tracking-widest transition-all duration-300 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.1em",
              backgroundColor: "#2D241E",
              color: "#F5F2ED",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
      <div className="px-6 py-5 space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p
              className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
            >
              Title (English)
            </p>
            <input
              type="text"
              maxLength={TITLE_MAX}
              value={draft.titleEn}
              onChange={(e) => updateField("titleEn", e.target.value)}
              placeholder={DEFAULT_GUARANTEE_TITLE_EN}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <p
              className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
            >
              Title (Ukrainian)
            </p>
            <input
              type="text"
              maxLength={TITLE_MAX}
              value={draft.titleUk}
              onChange={(e) => updateField("titleUk", e.target.value)}
              placeholder={DEFAULT_GUARANTEE_TITLE_UK}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p
              className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
            >
              Description (English)
            </p>
            <textarea
              maxLength={DESCRIPTION_MAX}
              rows={4}
              value={draft.descriptionEn}
              onChange={(e) => updateField("descriptionEn", e.target.value)}
              placeholder={DEFAULT_GUARANTEE_DESCRIPTION_EN}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none resize-y"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <p
              className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
            >
              Description (Ukrainian)
            </p>
            <textarea
              maxLength={DESCRIPTION_MAX}
              rows={4}
              value={draft.descriptionUk}
              onChange={(e) => updateField("descriptionUk", e.target.value)}
              placeholder={DEFAULT_GUARANTEE_DESCRIPTION_UK}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none resize-y"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
