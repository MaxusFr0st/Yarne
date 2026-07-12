import React, { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X } from "lucide-react";
import { getCroppedImageBlob } from "../../utils/cropImage";

type Props = {
  imageSrc: string;
  aspect?: number;
  title?: string;
  onClose: () => void;
  onCancel?: () => void;
  onComplete: (blob: Blob) => void | Promise<void>;
};

export function ImageCropDialog({
  imageSrc,
  aspect = 3 / 4,
  title = "Crop for product card",
  onClose,
  onCancel,
  onComplete,
}: Props) {
  const dismiss = () => {
    if (onCancel) onCancel();
    else onClose();
  };
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, croppedAreaPixels);
      await onComplete(blob);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to crop image");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(45,36,30,0.65)", backdropFilter: "blur(8px)" }}
      onWheel={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-lg rounded-[28px] overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: "#F5F2ED" }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(45,36,30,0.08)" }}
        >
          <div>
            <p
              className="text-[#2D241E]/40 uppercase tracking-widest text-xs"
              style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.14em" }}
            >
              Image crop
            </p>
            <h3
              className="text-[#2D241E]"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.25rem", fontWeight: 400 }}
            >
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#2D241E]/5"
            aria-label="Close crop dialog"
          >
            <X size={18} style={{ color: "#2D241E" }} />
          </button>
        </div>

        <div className="relative w-full h-[min(52vh,420px)] bg-[#2D241E]/8 shrink-0">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="px-6 py-4 space-y-3 shrink-0" style={{ borderTop: "1px solid rgba(45,36,30,0.08)" }}>
          <label className="block text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-[#2D241E]/45" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Crop ratio matches the storefront product card (3:4).
          </p>
          {error && (
            <p className="text-sm text-[#4A0E0E]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={dismiss}
              className="px-5 py-2.5 rounded-full border text-[#2D241E]/70"
              style={{ borderColor: "rgba(45,36,30,0.2)", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={saving || !croppedAreaPixels}
              className="px-6 py-2.5 rounded-full text-[#F5F2ED] disabled:opacity-50"
              style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem" }}
            >
              {saving ? "Applying…" : "Apply crop"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
