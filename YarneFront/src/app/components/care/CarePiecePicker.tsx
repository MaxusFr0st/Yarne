import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FOCUS_RING, LABEL } from "./careUi";

export type CarePieceOption = { id: string; name: string; notes: number };

type Props = {
  materialName: string;
  options: CarePieceOption[];
  /** Selected piece id, or null for "all pieces". */
  selected: string | null;
  onSelect: (id: string | null) => void;
};

/** "Which piece is yours?": the one place the visitor picks their bag; it applies to every topic. */
export function CarePiecePicker({ materialName, options, selected, onSelect }: Props) {
  const { t } = useTranslation();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allLabel = t("care.panel.allPieces", { material: materialName });
  const rows = [
    { id: null as string | null, label: allLabel, meta: t("care.piecePicker.allMeta") },
    ...options.map((option) => ({
      id: option.id as string | null,
      label: option.name,
      meta: option.notes > 0 ? t("care.piecePicker.notes", { count: option.notes }) : t("care.piecePicker.noNotes"),
    })),
  ];
  const current = options.find((option) => option.id === selected) ?? null;

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close(true);
    } else if (event.key === "Tab") {
      setOpen(false);
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? []);
      const at = items.indexOf(document.activeElement as HTMLElement);
      const next =
        event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : at + (event.key === "ArrowDown" ? 1 : -1);
      items[(next + items.length) % items.length]?.focus();
    }
  };

  const hint = !current
    ? t("care.piecePicker.hintAll")
    : current.notes > 0
      ? t("care.piecePicker.hintSome", { piece: current.name, count: current.notes })
      : t("care.piecePicker.hintNone", { piece: current.name });

  return (
    <div ref={rootRef} className="relative flex flex-col gap-2 pt-4 border-t border-[#2D241E]/10">
      <span id={labelId} className={`${LABEL} text-[11.5px]`}>
        {t("care.piecePicker.label")}
      </span>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`h-[52px] pl-4 pr-[18px] rounded-full border border-[#2D241E]/20 bg-[#F5F2ED] flex items-center gap-3 text-sm cursor-pointer hover:border-[#2D241E]/40 transition-colors ${FOCUS_RING}`}
      >
        <ShoppingBag size={18} strokeWidth={1.5} className="shrink-0" aria-hidden />
        <span className="grow text-left truncate">{current?.name ?? allLabel}</span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          className={`shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-labelledby={labelId}
          onKeyDown={onListKeyDown}
          className="absolute top-[108px] inset-x-0 z-[5] p-1.5 rounded-[14px] bg-[#F5F2ED] border border-[#2D241E]/15 shadow-[0_4px_24px_rgba(45,36,30,0.12)] flex flex-col max-h-[320px] overflow-y-auto"
        >
          {rows.map((row) => {
            const isSelected = row.id === (current?.id ?? null);
            return (
              <button
                key={row.id ?? "all"}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(row.id);
                  close(true);
                }}
                className="min-h-12 px-3 py-2 rounded-[10px] flex items-center gap-3 text-left cursor-pointer hover:bg-[#EDE9E2] focus-visible:bg-[#EDE9E2] focus-visible:outline-none"
              >
                <span className="grow flex flex-col gap-0.5">
                  <span className="text-sm">{row.label}</span>
                  <span className="text-xs text-[#2D241E]/72">{row.meta}</span>
                </span>
                {isSelected && <Check size={16} strokeWidth={1.75} className="shrink-0 text-[#4A0E0E]" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}

      <p className="pl-1 text-[12.5px] leading-[1.5] text-[#2D241E]/72" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
