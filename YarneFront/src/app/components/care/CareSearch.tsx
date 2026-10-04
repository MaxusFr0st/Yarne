import { useEffect, useId, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLangNavigate } from "../../i18n/useLangNavigate";
import { careGuidePath, type CareMaterial } from "../../utils/careContent";
import { FOCUS_RING, LABEL, SANS } from "./careUi";

export type CareSearchEntry = {
  productId: string;
  productName: string;
  material: CareMaterial;
  materialName: string;
};

const DEBOUNCE_MS = 150;
const MAX_RESULTS = 8;

/** Case- and accent-insensitive. */
function fold(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** "Find care for your bag": finds a piece by name and opens its material's guide with it chosen. */
export function CareSearch({ entries }: { entries: CareSearchEntry[] }) {
  const { t } = useTranslation();
  const navigate = useLangNavigate();
  const inputId = useId();
  const listId = useId();
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(value), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [value]);

  const match = (text: string) => {
    const needle = fold(text);
    return needle ? entries.filter((entry) => fold(entry.productName).includes(needle)).slice(0, MAX_RESULTS) : [];
  };
  const results = useMemo(() => match(query), [query, entries]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActive(0);
  }, [query]);

  const open = (entry: CareSearchEntry) => navigate(careGuidePath(entry.material, entry.productId));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Not the debounced list: Enter can come before it catches up with the typing.
    const current = match(value);
    const chosen = current[query === value ? active : 0] ?? current[0];
    if (chosen) open(chosen);
    else setNotFound(value.trim() !== "");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setValue("");
      setQuery("");
      setNotFound(false);
    } else if (results.length > 0 && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + results.length) % results.length);
    }
  };

  const expanded = results.length > 0;

  return (
    <form role="search" onSubmit={onSubmit} className="relative flex flex-col gap-2 md:gap-2.5 text-left" style={SANS}>
      <label htmlFor={inputId} className={`${LABEL} text-[10.5px] md:text-[11.5px] pl-2 md:pl-6 text-[#2D241E]`}>
        {t("care.search.label")}
      </label>
      <div
        className="h-[52px] md:h-14 pl-[18px] pr-1 md:pl-6 md:pr-1.5 flex items-center gap-2.5 md:gap-3 rounded-full border bg-[#F5F2ED] focus-within:border-[#2D241E]/60 transition-colors"
        style={{ borderColor: "rgba(45,36,30,0.2)" }}
      >
        <Search size={18} strokeWidth={1.5} className="shrink-0 text-[#2D241E]/72" aria-hidden />
        <input
          id={inputId}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
          autoComplete="off"
          value={value}
          placeholder={t("care.search.placeholder")}
          onChange={(event) => {
            setValue(event.target.value);
            setNotFound(false);
          }}
          onKeyDown={onKeyDown}
          className="grow min-w-0 h-11 border-0 bg-transparent text-[15px] text-[#2D241E] placeholder:text-[#2D241E]/72 outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button
          type="submit"
          aria-label={t("care.search.submit")}
          className={`shrink-0 h-11 w-11 md:w-auto md:px-[22px] flex items-center justify-center rounded-full bg-[#2D241E] text-[#F5F2ED] ${LABEL} text-[11.5px] cursor-pointer hover:opacity-90 transition-opacity ${FOCUS_RING}`}
        >
          <span className="hidden md:inline">{t("care.search.submit")}</span>
          <ArrowRight size={16} strokeWidth={1.5} className="md:hidden" aria-hidden />
        </button>
      </div>

      <ul
        id={listId}
        role="listbox"
        aria-label={t("care.search.label")}
        hidden={!expanded}
        className="absolute left-0 right-0 top-full mt-2 z-10 p-1.5 rounded-[14px] bg-[#F5F2ED] border shadow-[0_4px_24px_rgba(45,36,30,0.12)]"
        style={{ borderColor: "rgba(45,36,30,0.15)" }}
      >
        {results.map((entry, index) => (
          <li
            key={`${entry.material.id}:${entry.productId}`}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            onMouseEnter={() => setActive(index)}
            // Not onClick: the input would lose focus first.
            onMouseDown={(event) => {
              event.preventDefault();
              open(entry);
            }}
            className={`min-h-11 px-3 py-2 flex items-center rounded-[10px] text-sm text-[#2D241E] cursor-pointer ${index === active ? "bg-[#EDE9E2]" : ""}`}
          >
            {t("care.search.resultMaterial", { product: entry.productName, material: entry.materialName })}
          </li>
        ))}
      </ul>

      <p role="status" className="pl-2 md:pl-6 text-[13px] text-[#2D241E]/72 empty:hidden">
        {notFound ? t("care.search.noResults") : ""}
      </p>
    </form>
  );
}
