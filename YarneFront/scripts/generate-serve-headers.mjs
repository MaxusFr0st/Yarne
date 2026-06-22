import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

function apiOrigin(raw) {
  const trimmed = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return null;
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

const connectSrc = new Set(["'self'", "https://ipwho.is"]);
const api = apiOrigin(process.env.VITE_API_URL);
if (api) connectSrc.add(api);
connectSrc.add("http://localhost:8080");
connectSrc.add("http://localhost:5000");

const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' https: data: blob:",
  `connect-src ${[...connectSrc].join(" ")}`,
  "font-src 'self' data: https://fonts.gstatic.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const serveJson = {
  headers: [
    {
      source: "**/*",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
};

writeFileSync(resolve(distDir, "serve.json"), `${JSON.stringify(serveJson, null, 2)}\n`);
console.log("Wrote dist/serve.json with Content-Security-Policy");
