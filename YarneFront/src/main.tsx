import { createRoot } from "react-dom/client";
import { AppProvider } from "./app/context/AppContext";
import App from "./app/App.tsx";
import "./styles/index.css";
import "./app/i18n";
import { initStableViewport } from "./app/utils/stableViewport";

initStableViewport();

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>,
);
