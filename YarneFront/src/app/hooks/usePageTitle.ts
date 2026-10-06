import { useEffect } from "react";

const SITE_NAME = "Yarné";

/**
 * Names the browser tab after the page while it is open. scripts/server.mjs stamps the same
 * titles into the HTML for crawlers and link previews: keep the two in step.
 */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} — ${SITE_NAME}`;
    return () => {
      document.title = SITE_NAME;
    };
  }, [title]);
}
