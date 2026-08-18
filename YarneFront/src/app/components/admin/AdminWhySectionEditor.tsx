import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import type { Locale } from "../../i18n/config";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { uploadRawMediaFile } from "../../utils/uploadCropPair";
import {
  persistWhySectionContent,
  type WhySectionContent,
} from "../../utils/whySectionContent";
import { AdminLanguageSelect } from "./AdminLanguageSelect";

const SLOT_LABELS = ["Photo 1", "Photo 2", "Photo 3"] as const;

type AdminWhySectionEditorProps = {
  initialContent: WhySectionContent;
  onSaved?: (content: WhySectionContent) => void;
  onError?: (message: string) => void;
};

export function AdminWhySectionEditor({ initialContent, onSaved, onError }: AdminWhySectionEditorProps) {
  const [draft, setDraft] = useState<WhySectionContent>(initialContent);
  const [savedContent, setSavedContent] = useState<WhySectionContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const [activeLocale, setActiveLocale] = useState<Locale>("uk");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDraft(initialContent);
    setSavedContent(initialContent);
  }, [initialContent]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedContent),
    [draft, savedContent]
  );

  const updateLocaleField = <K extends keyof WhySectionContent["uk"]>(key: K, value: WhySectionContent["uk"][K]) => {
    setDraft((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], [key]: value },
    }));
  };

  const updateItemField = (index: number, key: "caption" | "factTitle" | "factBody", value: string) => {
    setDraft((prev) => {
      const items = [...prev[activeLocale].items] as WhySectionContent["uk"]["items"];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, [activeLocale]: { ...prev[activeLocale], items } };
    });
  };

  const handleFile = async (index: number, file: File) => {
    setUploading((prev) => ({ ...prev, [index]: true }));
    try {
      const url = await uploadRawMediaFile(file);
      setDraft((prev) => {
        const images = [...prev.images] as WhySectionContent["images"];
        images[index] = url;
        return { ...prev, images };
      });
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading((prev) => ({ ...prev, [index]: false }));
      const input = inputRefs.current[index];
      if (input) input.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistWhySectionContent(draft);
      setDraft(persisted);
      setSavedContent(persisted);
      onSaved?.(persisted);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save Why Yarné section to server.");
    } finally {
      setSaving(false);
    }
  };

  const localeCopy = draft[activeLocale];

  return (
    <div className="rounded-[28px] overflow-hidden mb-8" style={{ border: "1px solid rgba(45,36,30,0.08)" }}>
      <div
        className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        style={{ backgroundColor: "rgba(45,36,30,0.03)", borderBottom: "1px solid rgba(45,36,30,0.06)" }}
      >
        <div>
          <p className="text-[#2D241E] uppercase tracking-widest text-xs" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
            Why Yarné Section
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            The bag photos, captions, and reasons-to-buy shown right after the hero.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="text-[#2D241E]/55 text-xs" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Language:
          </label>
          <AdminLanguageSelect value={activeLocale} onChange={setActiveLocale} />
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
        <div>
          <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
            Eyebrow
          </p>
          <input
            type="text"
            value={localeCopy.eyebrow}
            onChange={(e) => updateLocaleField("eyebrow", e.target.value)}
            className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
            style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
              Title line 1
            </p>
            <input
              type="text"
              value={localeCopy.titleLine1}
              onChange={(e) => updateLocaleField("titleLine1", e.target.value)}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
          <div>
            <p className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
              Title accent (italic)
            </p>
            <input
              type="text"
              value={localeCopy.titleAccent}
              onChange={(e) => updateLocaleField("titleAccent", e.target.value)}
              className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
              style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {SLOT_LABELS.map((label, i) => {
            const preview = resolveMediaUrl(draft.images[i]);
            const isUploading = Boolean(uploading[i]);
            const item = localeCopy.items[i];
            return (
              <div
                key={label}
                className="rounded-[20px] p-4"
                style={{ backgroundColor: "rgba(45,36,30,0.03)", border: "1px solid rgba(45,36,30,0.08)" }}
              >
                <p className="text-[#2D241E] uppercase tracking-widest text-xs mb-3" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.12em" }}>
                  {label}
                </p>
                <div
                  className="relative w-full overflow-hidden rounded-[16px] mb-3 flex items-center justify-center"
                  style={{ aspectRatio: "1 / 1", backgroundColor: "#F5F2ED", border: "1px solid rgba(45,36,30,0.08)" }}
                >
                  {preview ? (
                    <img src={preview} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span
                      className="text-[9px] uppercase tracking-widest px-2 py-1"
                      style={{ color: "rgba(45,36,30,0.35)", fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Default photo
                    </span>
                  )}
                </div>
                <label
                  className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 transition-all duration-300 hover:opacity-85 ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  style={{ backgroundColor: "#2D241E", color: "#F5F2ED", fontFamily: "'DM Sans', sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
                >
                  <ImagePlus size={13} />
                  <span className="uppercase tracking-widest">{isUploading ? "Uploading…" : "Upload"}</span>
                  <input
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(i, file);
                    }}
                  />
                </label>
                {draft.images[i].trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((prev) => {
                        const images = [...prev.images] as WhySectionContent["images"];
                        images[i] = "";
                        return { ...prev, images };
                      });
                    }}
                    className="mt-2 w-full text-xs uppercase tracking-widest text-[#4A0E0E] hover:opacity-80"
                    style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
                  >
                    Reset to default photo
                  </button>
                )}

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                      Caption
                    </p>
                    <input
                      type="text"
                      value={item.caption}
                      onChange={(e) => updateItemField(i, "caption", e.target.value)}
                      className="w-full rounded-[12px] border bg-transparent px-3 py-2 text-[#2D241E] text-sm focus:outline-none"
                      style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                  <div>
                    <p className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                      Fact title
                    </p>
                    <input
                      type="text"
                      value={item.factTitle}
                      onChange={(e) => updateItemField(i, "factTitle", e.target.value)}
                      className="w-full rounded-[12px] border bg-transparent px-3 py-2 text-[#2D241E] text-sm focus:outline-none"
                      style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                  <div>
                    <p className="text-[#2D241E]/45 text-[10px] uppercase tracking-widest mb-1.5" style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
                      Fact body
                    </p>
                    <textarea
                      rows={2}
                      value={item.factBody}
                      onChange={(e) => updateItemField(i, "factBody", e.target.value)}
                      className="w-full rounded-[12px] border bg-transparent px-3 py-2 text-[#2D241E] text-sm focus:outline-none resize-y"
                      style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
