import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Crosshair, RotateCcw } from "lucide-react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { updateFocalPoint } from "../../api/products";

type Props = {
  imageSrc: string;
  initialFocalX?: number;
  initialFocalY?: number;
  onClose: () => void;
  onSaved: (focalX: number, focalY: number) => void;
};

export function FocalPointEditor({
  imageSrc,
  initialFocalX = 0.5,
  initialFocalY = 0.35,
  onClose,
  onSaved,
}: Props) {
  const [focalX, setFocalX] = useState(initialFocalX);
  const [focalY, setFocalY] = useState(initialFocalY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateFromClient = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setFocalX(x);
    setFocalY(y);
  }, []);

  const updatePosition = useCallback((e: MouseEvent | React.MouseEvent) => {
    updateFromClient(e.clientX, e.clientY);
  }, [updateFromClient]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => { e.preventDefault(); updatePosition(e); };
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); updateFromClient(e.touches[0].clientX, e.touches[0].clientY); };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, updatePosition, updateFromClient]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const normalizedUrl = imageSrc.startsWith("http") ? new URL(imageSrc).pathname : imageSrc;
      await updateFocalPoint(normalizedUrl, focalX, focalY);
      onSaved(focalX, focalY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFocalX(initialFocalX);
    setFocalY(initialFocalY);
  };

  const resolved = resolveMediaUrl(imageSrc) || imageSrc;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-[90vw] max-h-[90vh] w-[680px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-800">Set Focal Point</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        {/* Image with focal point */}
        <div className="relative flex-1 min-h-0 p-4">
          <div className="relative w-full h-full flex items-center justify-center">
            <div
              ref={containerRef}
              className="relative cursor-crosshair select-none max-w-full max-h-[60vh] touch-none"
              onMouseDown={(e) => { e.preventDefault(); setDragging(true); updatePosition(e); }}
              onTouchStart={(e) => { e.preventDefault(); setDragging(true); updateFromClient(e.touches[0].clientX, e.touches[0].clientY); }}
            >
              <img
                src={resolved}
                alt="Focal point target"
                className="block max-w-full max-h-[60vh] rounded-lg object-contain"
                draggable={false}
              />

              {/* Grid overlay */}
              <div className="absolute inset-0 pointer-events-none rounded-lg">
                <div className="absolute inset-0 border border-white/20 rounded-lg" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
              </div>

              {/* Focal point marker */}
              <div
                className="absolute pointer-events-none"
                style={{
                  left: `${focalX * 100}%`,
                  top: `${focalY * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative">
                  <div className="w-7 h-7 rounded-full border-[2.5px] border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.3),inset_0_0_0_1.5px_rgba(0,0,0,0.2)] bg-red-500/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                  {/* Crosshairs */}
                  <div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 w-3 h-px bg-white/80" />
                  <div className="absolute top-1/2 right-0 translate-x-full -translate-y-1/2 w-3 h-px bg-white/80" />
                  <div className="absolute left-1/2 top-0 -translate-y-full -translate-x-1/2 h-3 w-px bg-white/80" />
                  <div className="absolute left-1/2 bottom-0 translate-y-full -translate-x-1/2 h-3 w-px bg-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview strip */}
        <div className="px-5 pb-2">
          <p className="text-xs text-neutral-500 mb-2">Preview (different crops):</p>
          <div className="flex gap-3">
            {[
              { label: "Card 3:4", w: 60, h: 80 },
              { label: "PDP 4:5", w: 64, h: 80 },
              { label: "Thumb", w: 48, h: 48 },
            ].map(({ label, w, h }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div
                  className="rounded overflow-hidden bg-neutral-100 border border-neutral-200"
                  style={{ width: w, height: h }}
                >
                  <img
                    src={resolved}
                    alt={label}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: `${(focalX * 100).toFixed(1)}% ${(focalY * 100).toFixed(1)}%` }}
                    draggable={false}
                  />
                </div>
                <span className="text-[10px] text-neutral-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 font-mono">
              x: {(focalX * 100).toFixed(0)}% &nbsp; y: {(focalY * 100).toFixed(0)}%
            </span>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-2">
            {error && <span className="text-xs text-red-500">{error}</span>}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-sm rounded-lg border border-neutral-300 text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3.5 py-1.5 text-sm rounded-lg bg-[#2D241E] text-white hover:bg-[#3D342E] disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
