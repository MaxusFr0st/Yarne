import { useEffect } from "react";
import { useRouteError } from "react-router";

const RELOADED_KEY = "yarne.reloadedAfterRouteError";

/** A page file that no longer exists: the tab is running a version from before the last deploy. */
function isStaleBuildError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|Importing a module script failed|error loading dynamically imported/i.test(message);
}

/**
 * Shown instead of the router's developer error screen. A stale tab reloads itself once (the new
 * version then loads normally); anything else gets a plain message and a reload button. The page
 * is language-neutral on purpose: it must render even when translations failed to load.
 */
export function RouteError() {
  const error = useRouteError();
  const stale = isStaleBuildError(error);

  useEffect(() => {
    if (!stale) return;
    try {
      const last = Number(window.sessionStorage.getItem(RELOADED_KEY) ?? 0);
      if (Date.now() - last < 60_000) return;
      window.sessionStorage.setItem(RELOADED_KEY, String(Date.now()));
    } catch {
      return;
    }
    window.location.reload();
  }, [stale]);

  return (
    <main
      className="min-h-[var(--app-svh)] flex flex-col items-center justify-center text-center px-6"
      style={{ backgroundColor: "#F5F2ED" }}
    >
      <h1
        className="text-[#2D241E] mb-4"
        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "2rem", fontWeight: 400 }}
      >
        {stale ? "Оновлюємо сторінку…" : "Щось пішло не так"}
      </h1>
      <p
        className="text-[#2D241E]/50 mb-10 max-w-sm"
        style={{ fontFamily: "'DM Sans', sans-serif", lineHeight: 1.7, fontSize: "0.9rem" }}
      >
        {stale
          ? "Сайт щойно оновився. Якщо сторінка не відкрилась сама, натисніть кнопку. / The site was just updated. If the page does not open by itself, press the button."
          : "Спробуйте оновити сторінку. / Please reload the page."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-10 py-4 rounded-full text-white transition-all duration-300 hover:opacity-90 cursor-pointer"
        style={{ backgroundColor: "#2D241E", fontFamily: "'DM Sans', sans-serif", fontSize: "0.75rem", letterSpacing: "0.15em" }}
      >
        <span className="uppercase tracking-widest">Оновити · Reload</span>
      </button>
    </main>
  );
}
