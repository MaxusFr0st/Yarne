import { createRoot } from "react-dom/client";
import { AppProvider } from "./app/context/AppContext";
import App from "./app/App.tsx";
import { watchForServiceWorkerUpdate } from "./app/offline/swUpdate";
import { precacheCitiesInBackground } from "./app/offline/precacheShipping";
import { watchOrderSync } from "./app/offline/watchOrderSync";
import "./styles/index.css";
import "./app/i18n";

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
  watchForServiceWorkerUpdate();
}

precacheCitiesInBackground();
watchOrderSync();

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
