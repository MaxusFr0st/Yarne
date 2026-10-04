/**
 * Ready-to-draw copies of the photos this visit has shown, at the size they were shown.
 *
 * A page that is rebuilt (Back to the home page, a product opened a second time) creates new
 * <img> elements, and an iPhone does not paint a new <img> at once even when it has the file: it
 * reads it back and unpacks it first, which for a full-size photo takes 0.3-0.5 s of empty frame.
 * A canvas has no such wait - its pixels are already unpacked - so the page draws the copy in its
 * first frame and the real <img> takes over underneath once it can paint
 * (components/figma/ImageWithFallback.tsx, `poster`).
 *
 * - A copy is the whole photo, not the crop, so the same one fits a card and a product page.
 * - Copies are made one at a time, between other work, after the photo has been unpacked anyway.
 * - Memory is bounded: the least recently used copies are dropped past the budget.
 */
const BUDGET_BYTES = 48 * 1024 * 1024;
/** Widest copy kept: enough for a full-width photo to look right for the moment it is shown. */
const MAX_WIDTH = 800;
/** Two pixels per point, not the phone's three: a third of the memory, and no visible difference in that moment. */
const MAX_DENSITY = 2;
const FIRST_DELAY_MS = 300;
const GAP_MS = 80;

/** Insertion order is least recently used first. */
const shots = new Map<string, HTMLCanvasElement>();
const waiting = new Map<string, { img: HTMLImageElement; width: number }>();
let usedBytes = 0;
let working = false;

const bytesOf = (canvas: HTMLCanvasElement) => canvas.width * canvas.height * 4;

function drop(url: string): void {
  const canvas = shots.get(url);
  if (!canvas) return;
  usedBytes -= bytesOf(canvas);
  shots.delete(url);
  // Releases the pixels now instead of whenever the canvas is collected.
  canvas.width = 0;
  canvas.height = 0;
}

function keep(url: string, canvas: HTMLCanvasElement): void {
  drop(url);
  shots.set(url, canvas);
  usedBytes += bytesOf(canvas);
  for (const oldest of shots.keys()) {
    if (usedBytes <= BUDGET_BYTES || oldest === url) break;
    drop(oldest);
  }
}

async function work(): Promise<void> {
  for (;;) {
    const next = waiting.entries().next();
    if (next.done) break;
    const [url, { img, width }] = next.value;
    waiting.delete(url);
    try {
      // Unpacked already if the photo is on screen; otherwise this does it off the main thread,
      // so the draw below is only a resize.
      if (typeof img.decode === "function") await img.decode();
      if (img.naturalWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.max(1, Math.round((width * img.naturalHeight) / img.naturalWidth));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          keep(url, canvas);
        }
      }
    } catch {
      // A photo that cannot be copied simply has no copy.
    }
    await new Promise((resolve) => window.setTimeout(resolve, GAP_MS));
  }
  working = false;
}

/** Whether a copy of this photo (resolved URL) is ready. */
export function hasSnapshot(url: string): boolean {
  return shots.has(url);
}

/** Copy a loaded photo as it is shown now, unless a copy at least this sharp exists. */
export function snapshotPhoto(img: HTMLImageElement, url: string): void {
  if (!url || url.startsWith("data:") || !img.naturalWidth || !img.clientWidth || !img.clientHeight) return;
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DENSITY);
  // object-fit: cover - the photo is scaled until it fills the box both ways.
  const scale = Math.max(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight) * dpr;
  const width = Math.min(img.naturalWidth, MAX_WIDTH, Math.ceil(img.naturalWidth * scale));
  const have = shots.get(url);
  if (have && have.width >= width * 0.9) return;
  waiting.set(url, { img, width });
  if (working) return;
  working = true;
  window.setTimeout(() => void work(), FIRST_DELAY_MS);
}

/** Draw the copy of this photo onto `target`. False when there is none. */
export function drawSnapshot(url: string, target: HTMLCanvasElement): boolean {
  const shot = shots.get(url);
  if (!shot || !shot.width) return false;
  // Most recently used.
  shots.delete(url);
  shots.set(url, shot);
  target.width = shot.width;
  target.height = shot.height;
  const ctx = target.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(shot, 0, 0);
  return true;
}
