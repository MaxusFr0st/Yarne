import { useTranslation } from "react-i18next";

/** The two-part switch above the delivery picker: Ukraine (Nova Poshta) or abroad (Nova Post / another carrier). */
export function DeliveryModeSwitch({ abroad, onChange }: { abroad: boolean; onChange: (abroad: boolean) => void }) {
  const { t } = useTranslation();
  const segment = (isAbroad: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={abroad === isAbroad}
      onClick={() => onChange(isAbroad)}
      className="relative z-10 flex-1 min-h-11 rounded-full uppercase cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F2ED]/70 motion-reduce:transition-none"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.12em",
        color: abroad === isAbroad ? "#2D241E" : "rgba(245,242,237,0.75)",
        transition: "color 220ms ease",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      role="group"
      aria-label={t("checkout.abroad.switchLabel")}
      className="relative flex p-1 mb-2.5 rounded-full"
      style={{ backgroundColor: "rgba(245,242,237,0.10)", border: "1px solid rgba(245,242,237,0.18)" }}
    >
      {/* The cream pill that slides under the chosen word. */}
      <span
        aria-hidden
        className="absolute top-1 bottom-1 left-1 rounded-full motion-reduce:transition-none"
        style={{
          width: "calc(50% - 4px)",
          backgroundColor: "#F5F2ED",
          transform: abroad ? "translateX(100%)" : "translateX(0)",
          transition: "transform 320ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      />
      {segment(false, t("checkout.abroad.ukraine"))}
      {segment(true, t("checkout.abroad.abroad"))}
    </div>
  );
}
