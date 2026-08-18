#!/usr/bin/env node
// Replaces `serve` in production: serves the static build, but for HTML
// navigations it stamps real Open Graph / Twitter Card meta tags into
// index.html so links shared in Telegram/WhatsApp/iMessage/etc. render a
// proper preview card instead of the generic empty one those crawlers see
// (they fetch raw HTML and never run the React app's client-side JS).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const distDir = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");
const port = process.env.PORT || 8080;
const apiUrl = (process.env.VITE_API_URL || "").replace(/\/+$/, "");

const SITE_NAME = "Yarné";
const DEFAULT_TITLE = "Yarné";
const DEFAULT_DESCRIPTION = "Handmade knitwear, made to order.";
const DEFAULT_IMAGE_URL = "https://pub-c4e2daa0ab484582b5f8eed726b07e2c.r2.dev/LogoMainShareFinal.jpg_202608181106.jpg";

const indexHtml = await readFile(join(distDir, "index.html"), "utf8");
const extraHeaders = await loadServeJsonHeaders();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".map": "application/json; charset=utf-8",
};

async function loadServeJsonHeaders() {
  const path = join(distDir, "serve.json");
  if (!existsSync(path)) return [];
  try {
    const json = JSON.parse(await readFile(path, "utf8"));
    return json.headers?.[0]?.headers ?? [];
  } catch {
    return [];
  }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function truncate(text, max) {
  if (!text || text.length <= max) return text ?? "";
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function buildMetaBlock({ title, description, imageUrl, pageUrl }) {
  const t = escapeHtml(title);
  const d = escapeHtml(truncate(description, 200));
  const i = escapeHtml(imageUrl);
  const u = escapeHtml(pageUrl);
  return `<title>${t}</title>
      <meta name="description" content="${d}" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
      <meta property="og:title" content="${t}" />
      <meta property="og:description" content="${d}" />
      <meta property="og:image" content="${i}" />
      <meta property="og:url" content="${u}" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${t}" />
      <meta name="twitter:description" content="${d}" />
      <meta name="twitter:image" content="${i}" />`;
}

// Matches "/:lang/product/:id" (id is a productCode or numeric id, no slash).
const PRODUCT_PATH = /^\/[^/]+\/product\/([^/?]+)/;

async function fetchProduct(id) {
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function toAbsoluteImageUrl(src, origin, fallback) {
  if (!src) return fallback;
  if (/^https?:\/\//i.test(src)) return src;
  const base = apiUrl || origin;
  return `${base}${src.startsWith("/") ? src : `/${src}`}`;
}

// Admin-editable default share card (title/description/photo), used for the homepage,
// collection pages, and any product without its own dedicated share photo.
// Cached briefly so most requests don't round-trip to the API just to unfurl a link.
const SHARE_DEFAULT_KEY = "yarne.share.default.v1";
const SHARE_DEFAULT_TTL_MS = 5 * 60 * 1000;
let shareDefaultCache = null;
let shareDefaultFetchedAt = 0;

async function getShareDefault() {
  if (!apiUrl) return null;
  const isStale = Date.now() - shareDefaultFetchedAt > SHARE_DEFAULT_TTL_MS;
  if (!isStale) return shareDefaultCache;

  try {
    const res = await fetch(`${apiUrl}/api/storefront-settings/${SHARE_DEFAULT_KEY}`);
    if (res.ok) {
      const json = await res.json();
      shareDefaultCache = json.value ?? null;
      shareDefaultFetchedAt = Date.now();
    }
  } catch {
    // keep the previous cached value (or null) on failure
  }
  return shareDefaultCache;
}

async function renderHtml(req, origin) {
  const pageUrl = `${origin}${req.url}`;
  const shareDefault = await getShareDefault();
  const fallbackTitle = shareDefault?.title || DEFAULT_TITLE;
  const fallbackDescription = shareDefault?.description || DEFAULT_DESCRIPTION;
  const fallbackImage = shareDefault?.imageUrl || DEFAULT_IMAGE_URL;

  const match = PRODUCT_PATH.exec(req.url);
  if (match) {
    const product = await fetchProduct(match[1]);
    if (product) {
      return buildMetaBlock({
        title: `${product.name} — ${SITE_NAME}`,
        description: product.description || fallbackDescription,
        imageUrl: product.shareImageUrl || toAbsoluteImageUrl(product.primaryImage?.src, origin, fallbackImage),
        pageUrl,
      });
    }
  }

  return buildMetaBlock({
    title: fallbackTitle,
    description: fallbackDescription,
    imageUrl: fallbackImage,
    pageUrl,
  });
}

function applyCommonHeaders(res) {
  for (const { key, value } of extraHeaders) res.setHeader(key, value);
}

async function serveStaticFile(req, res, pathname) {
  const filePath = join(distDir, pathname);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(400).end("Bad request");
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    applyCommonHeaders(res);
    res.setHeader("Content-Type", MIME_TYPES[extname(filePath)] || "application/octet-stream");
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://placeholder");
  const pathname = decodeURIComponent(url.pathname);

  // Any path with a file extension is a static asset (js/css/images/...).
  if (extname(pathname)) {
    await serveStaticFile(req, res, pathname);
    return;
  }

  const proto = req.headers["x-forwarded-proto"] || "https";
  const origin = `${proto}://${req.headers.host}`;
  const head = await renderHtml(req, origin);
  const html = indexHtml.replace("<title>Yarné</title>", head);

  applyCommonHeaders(res);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});

server.listen(port, () => {
  console.log(`Server listening on :${port}`);
});
