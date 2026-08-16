import React from "react";
import { PackageOpen, X } from "lucide-react";

export const ink = "#2D241E";
export const paper = "#F5F2ED";
export const border = "1px solid rgba(45,36,30,0.12)";
export const stitch = {
  backgroundImage:
    "repeating-linear-gradient(90deg, rgba(117,72,46,.22) 0 5px, transparent 5px 10px)",
  backgroundSize: "100% 1px",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left bottom",
} as const;

export function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function formatLocalDate(value: string): string {
  const [year, month, day] = dateOnly(value).split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function moneyFromCents(cents: number, currency = "UAH"): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function centsFromInput(value: string): number {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) ? Math.round((amount + Number.EPSILON) * 100) : 0;
}

export function inputFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function toApiDate(localDate: string): string {
  return `${dateOnly(localDate)}T00:00:00Z`;
}

export function addDays(isoDate: string, days: number): string {
  const [y, m, d] = dateOnly(isoDate).split("-").map(Number);
  const next = new Date(y, m - 1, d + days);
  return localIsoDate(next);
}

export function startOfWeek(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localIsoDate(d);
}

export function startOfMonth(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function startOfQuarter(date = new Date()): string {
  const q = Math.floor(date.getMonth() / 3) * 3;
  return `${date.getFullYear()}-${String(q + 1).padStart(2, "0")}-01`;
}

export function startOfYear(date = new Date()): string {
  return `${date.getFullYear()}-01-01`;
}

export function controlClass(extra = ""): string {
  return `w-full min-h-11 rounded-xl border border-[#2D241E]/15 bg-white/70 px-3.5 py-2.5 text-sm text-[#2D241E] outline-none transition-colors focus:border-[#75482E] focus:ring-2 focus:ring-[#75482E]/20 motion-reduce:transition-none ${extra}`;
}

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.13em] text-[#2D241E]/60"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </label>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  tone = "dark",
  type = "button",
  className = "",
  "aria-label": ariaLabel,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "dark" | "light" | "danger";
  type?: "button" | "submit";
  className?: string;
  "aria-label"?: string;
}) {
  const colors = tone === "dark"
    ? "bg-[#2D241E] text-[#F5F2ED] hover:bg-[#49382D]"
    : tone === "danger"
      ? "bg-[#641D1D] text-white hover:bg-[#7B2424]"
      : "border border-[#2D241E]/15 bg-white/50 text-[#2D241E] hover:bg-white/80";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-medium uppercase tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F2ED] disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none ${colors} ${className}`}
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </button>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[22px] bg-white/45 ${className}`}
      style={{ border }}
    >
      {children}
    </section>
  );
}

export function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide,
  id = "acct-dialog-title",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  id?: string;
}) {
  return (
    <div className="fixed inset-0 z-[220] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby={id}>
      <button type="button" className="absolute inset-0 cursor-pointer bg-[#2D241E]/55 backdrop-blur-sm" onClick={onClose} aria-label="Close dialog" />
      <div
        className={`relative max-h-[94dvh] w-full overflow-y-auto rounded-t-[26px] bg-[#F5F2ED] p-5 shadow-2xl sm:rounded-[28px] sm:p-7 ${wide ? "sm:max-w-4xl" : "sm:max-w-lg"}`}
        style={{ border }}
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 id={id} className="text-2xl text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{title}</h3>
            {subtitle ? <p className="mt-1 text-sm text-[#2D241E]/60" style={{ fontFamily: "'DM Sans', sans-serif" }}>{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="flex size-11 cursor-pointer items-center justify-center rounded-full hover:bg-[#2D241E]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#75482E]" aria-label="Close dialog">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <PackageOpen className="mx-auto mb-3 text-[#75482E]/45" size={28} strokeWidth={1.5} />
      <p className="text-lg text-[#2D241E]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-[#2D241E]/55">{detail}</p>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="mb-4 rounded-xl px-4 py-3 text-sm text-[#4A0E0E]"
      style={{ backgroundColor: "rgba(74,14,14,0.08)", fontFamily: "'DM Sans', sans-serif" }}
      role="alert"
    >
      {message}
    </div>
  );
}

export function StatusPill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn" | "danger" | "neutral";
}) {
  const style = tone === "ok"
    ? "bg-[#315B42]/10 text-[#315B42]"
    : tone === "warn"
      ? "bg-[#9A672D]/12 text-[#7A4D1D]"
      : tone === "danger"
        ? "bg-[#641D1D]/10 text-[#641D1D]"
        : "bg-[#2D241E]/08 text-[#2D241E]/70";
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] ${style}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="mb-3 text-xl text-[#2D241E]"
      style={{ fontFamily: "'Cormorant Garamond', serif", ...stitch, paddingBottom: 10 }}
    >
      {children}
    </h3>
  );
}
