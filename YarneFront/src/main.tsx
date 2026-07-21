import { createRoot } from "react-dom/client";
import { AppProvider } from "./app/context/AppContext";
import App from "./app/App.tsx";
import "./styles/index.css";
import "./app/i18n";
import { initStableViewport } from "./app/utils/stableViewport";

initStableViewport();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) =>
        Promise.all(registrations.map((registration) => registration.update().catch(() => undefined))),
      )
      .finally(() => {
        void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
