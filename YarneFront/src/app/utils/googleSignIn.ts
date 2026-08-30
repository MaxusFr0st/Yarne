import { googleClientId } from "../config/oauth";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: { type: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const GSI_SCRIPT_URL = "https://accounts.google.com/gsi/client";

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google Sign-In")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Sign-In"));
    document.head.appendChild(script);
  });

  return scriptLoadPromise;
}

/**
 * Google's popup token flow doesn't always fire `callback` — closing the popup manually (or
 * navigating back in the opener tab before finishing) can leave it silent, which used to leave
 * the login button stuck in a permanent loading state with no error and no recovery short of a
 * page reload. Every path below funnels into a single `settle` so the promise always resolves
 * or rejects, whatever happened to the popup.
 */
export function requestGoogleAccessToken(): Promise<string> {
  if (!googleClientId) {
    return Promise.reject(new Error("Google Sign In is not configured."));
  }

  return loadGoogleScript().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const oauth2 = window.google?.accounts?.oauth2;
        if (!oauth2) {
          reject(new Error("Google Sign-In is not available."));
          return;
        }

        let settled = false;
        const cleanup = () => {
          window.clearTimeout(hardTimeoutId);
          window.clearTimeout(focusGraceId);
          window.removeEventListener("focus", onWindowFocus);
        };
        const settle = (fn: () => void) => {
          if (settled) return;
          settled = true;
          cleanup();
          fn();
        };

        // If the main window regains focus (popup closed one way or another) and no callback
        // follows shortly after, treat it as a cancellation instead of hanging forever.
        let focusGraceId: number;
        const onWindowFocus = () => {
          focusGraceId = window.setTimeout(() => {
            settle(() => reject(new Error("Google sign-in was cancelled or failed.")));
          }, 1000);
        };
        window.addEventListener("focus", onWindowFocus);

        // Ultimate safety net regardless of focus/error_callback support.
        const hardTimeoutId = window.setTimeout(() => {
          settle(() => reject(new Error("Google sign-in timed out.")));
        }, 120_000);

        const client = oauth2.initTokenClient({
          client_id: googleClientId,
          scope: "openid email profile",
          callback: (response) => {
            if (response.error || !response.access_token) {
              const code = response.error ?? "unknown";
              if (code.includes("origin_mismatch")) {
                settle(() =>
                  reject(new Error(`origin_mismatch:${window.location.origin}`)),
                );
                return;
              }
              settle(() => reject(new Error(response.error ?? "Google sign-in was cancelled or failed.")));
              return;
            }
            settle(() => resolve(response.access_token!));
          },
          error_callback: () => {
            settle(() => reject(new Error("Google sign-in was cancelled or failed.")));
          },
        });

        client.requestAccessToken();
      }),
  );
}
