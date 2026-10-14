import { useTranslation } from "react-i18next";

/**
 * The first Tab stop on every page: jumps past the header to the page itself. Off-screen until it
 * has keyboard focus, so mouse and touch visitors never see it.
 */
export function SkipToContent() {
  const { t } = useTranslation();

  // Handled here rather than as a #hash link, so the address and the scroll logic stay untouched.
  const skip = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const main = document.querySelector<HTMLElement>("main");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  };

  return (
    <a
      href="#main"
      onClick={skip}
      className="fixed left-4 top-3 z-[200] -translate-y-[200%] focus:translate-y-0 rounded-full px-5 py-2.5 text-[#F5F2ED] focus:outline-none focus-visible:[outline:2px_solid_#2D241E] focus-visible:[outline-offset:2px]"
      style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.12em" }}
    >
      {t("common.skipToContent")}
    </a>
  );
}
