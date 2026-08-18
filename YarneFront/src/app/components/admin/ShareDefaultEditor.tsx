import { useEffect, useMemo, useRef, useState } from "react";
import { uploadShareDefaultImage } from "../../api/storefrontSettings";
import { persistShareDefaultContent, type ShareDefaultContent } from "../../utils/shareDefaultContent";

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 300;

type ShareDefaultEditorProps = {
  initialContent: ShareDefaultContent;
  onSaved?: (content: ShareDefaultContent) => void;
  onError?: (message: string) => void;
};

export function ShareDefaultEditor({ initialContent, onSaved, onError }: ShareDefaultEditorProps) {
  const [draft, setDraft] = useState<ShareDefaultContent>(initialContent);
  const [savedContent, setSavedContent] = useState<ShareDefaultContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(initialContent);
    setSavedContent(initialContent);
  }, [initialContent]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedContent),
    [draft, savedContent]
  );

  const updateField = <K extends keyof ShareDefaultContent>(key: K, value: ShareDefaultContent[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadShareDefaultImage(file);
      updateField("imageUrl", url);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const persisted = await persistShareDefaultContent(draft);
      setDraft(persisted);
      setSavedContent(persisted);
      onSaved?.(persisted);
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Failed to save default share card to server.");
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
            Default Share Card
          </p>
          <p className="text-[#2D241E]/45 text-xs mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Shown when any link is shared (Telegram, WhatsApp, iMessage, etc.) for pages without their own photo — the homepage,
            collection pages, and any product without a dedicated Share/Email Photo.
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
        <div>
          <p
            className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
          >
            Photo
          </p>
          <div className="flex items-center gap-4">
            {draft.imageUrl ? (
              <img
                src={draft.imageUrl}
                alt=""
                className="w-24 h-14 object-cover rounded-[10px]"
                style={{ backgroundColor: "rgba(45,36,30,0.06)" }}
              />
            ) : (
              <div
                className="w-24 h-14 rounded-[10px] flex items-center justify-center text-[10px]"
                style={{ backgroundColor: "rgba(45,36,30,0.06)", color: "rgba(45,36,30,0.35)", fontFamily: "'DM Sans', sans-serif" }}
              >
                None
              </div>
            )}
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-full text-xs uppercase tracking-widest transition-colors duration-200 disabled:opacity-50"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.12em",
                backgroundColor: "rgba(45,36,30,0.06)",
                color: "#2D241E",
              }}
            >
              {uploading ? "Uploading…" : draft.imageUrl ? "Replace" : "Upload"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </div>
        </div>
        <div>
          <p
            className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
          >
            Title
          </p>
          <input
            type="text"
            maxLength={TITLE_MAX}
            value={draft.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="Yarné"
            className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none"
            style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
        <div>
          <p
            className="text-[#2D241E]/45 text-xs uppercase tracking-widest mb-2"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}
          >
            Description
          </p>
          <textarea
            maxLength={DESCRIPTION_MAX}
            rows={3}
            value={draft.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Handmade knitwear, made to order."
            className="w-full rounded-[14px] border bg-transparent px-4 py-2.5 text-[#2D241E] focus:outline-none resize-y"
            style={{ borderColor: "rgba(45,36,30,0.12)", fontFamily: "'DM Sans', sans-serif" }}
          />
        </div>
      </div>
    </div>
  );
}
