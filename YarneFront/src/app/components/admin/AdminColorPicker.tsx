import React, { useMemo } from "react";

const PRESET_COLORS = [
  "#2D241E",
  "#4A0E0E",
  "#F5F2ED",
  "#EDE9E2",
  "#1A1A1A",
  "#FFFFFF",
  "#C4A574",
  "#6B7B8C",
  "#FFF44F",
  "#E8D5B7",
];

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "#2D241E";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(withHash)) return withHash.toUpperCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash.match(/^#(.)(.)(.)$/) ?? [];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return withHash;
}

function isValidHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(normalizeHex(value));
}

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export function AdminColorPicker({ value, onChange }: Props) {
  const displayHex = useMemo(() => normalizeHex(value), [value]);
  const pickerValue = isValidHex(displayHex) ? displayHex : "#2D241E";

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-start">
        <div
          className="w-24 h-24 rounded-[18px] border shrink-0"
          style={{
            backgroundColor: isValidHex(displayHex) ? displayHex : "#2D241E",
            borderColor: "rgba(45,36,30,0.15)",
          }}
          aria-hidden
        />
        <div className="flex-1 space-y-3">
          <div>
            <label
              className="block text-xs mb-1.5 tracking-widest uppercase"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
            >
              Hex code
            </label>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#2D241E"
              className="w-full bg-transparent border rounded-[14px] px-4 py-3 text-[#2D241E] focus:outline-none placeholder:text-[#2D241E]/20"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", borderColor: "rgba(45,36,30,0.15)" }}
            />
          </div>
          <div>
            <label
              className="block text-xs mb-1.5 tracking-widest uppercase"
              style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
            >
              Pick color
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="color"
                value={pickerValue}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="w-12 h-10 rounded-[10px] border cursor-pointer bg-transparent"
                style={{ borderColor: "rgba(45,36,30,0.15)" }}
              />
              <span className="text-xs text-[#2D241E]/55" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Open color picker
              </span>
            </label>
          </div>
        </div>
      </div>

      <div>
        <p
          className="text-xs mb-2 tracking-widest uppercase"
          style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(45,36,30,0.4)", letterSpacing: "0.14em" }}
        >
          Presets
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              className="w-8 h-8 rounded-full border transition-transform hover:scale-110"
              style={{
                backgroundColor: hex,
                borderColor: displayHex === hex ? "#4A0E0E" : "rgba(45,36,30,0.2)",
                boxShadow: displayHex === hex ? "0 0 0 2px #F5F2ED, 0 0 0 4px #4A0E0E" : undefined,
              }}
              title={hex}
              aria-label={`Preset ${hex}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function sanitizeColorHex(value: string): string {
  const normalized = normalizeHex(value);
  return isValidHex(normalized) ? normalized : "#2D241E";
}
