import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";
import { isPhotoLoaded, markPhotoLoaded } from "../../utils/photoQueue";
import { drawSnapshot, hasSnapshot, snapshotPhoto } from "../../utils/photoSnapshots";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export interface FocalPoint {
  x: number;
  y: number;
}

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Pass true for above-the-fold / LCP images to load eagerly with high priority. */
  priority?: boolean;
  /** Per-image focal point (0–1 normalized). Defaults to center-upper-third. */
  focal?: FocalPoint;
  /**
   * Stay invisible until the file has loaded, then fade in (the .img-fade-in CSS animation),
   * instead of painting in progressively or popping. Only a photo that is actually downloading
   * fades: one this visit already has (utils/photoQueue.ts) shows with the page. Only for photos
   * meant to be seen: an image hidden on purpose would flash through.
   */
  fadeIn?: boolean;
  /**
   * Cover the photo with its ready-to-draw copy (utils/photoSnapshots.ts) until the <img> itself
   * can paint, so a photo this visit has already shown is there in the page's first frame instead
   * of an empty frame while the phone unpacks it again. The parent must be positioned and sized
   * to the photo: the copy is laid over it with `absolute inset-0`.
   */
  poster?: boolean;
}

/** A load event that never comes (a stalled request) must not leave a photo invisible. */
const FADE_SAFETY_MS = 5000;

export function ImageWithFallback({ priority, focal, fadeIn = false, poster = false, ...props }: ImageWithFallbackProps) {
  const { src, alt, style, className, loading, decoding, onLoad, ...rest } = props;
  const resolvedSrc = src ? resolveMediaUrl(String(src)) : "";

  const [didError, setDidError] = useState(false);
  // "hidden" until loaded, then "fading" (plays the animation) or "shown" (already on the phone).
  const [reveal, setReveal] = useState<"hidden" | "fading" | "shown">(() =>
    fadeIn && !isPhotoLoaded(resolvedSrc) ? "hidden" : "shown",
  );
  const imgRef = useRef<HTMLImageElement>(null);
  const posterRef = useRef<HTMLCanvasElement>(null);
  const [posterFor, setPosterFor] = useState(() => (poster && hasSnapshot(resolvedSrc) ? resolvedSrc : ""));
  const showPoster = posterFor === resolvedSrc && resolvedSrc !== "";

  useEffect(() => {
    setDidError(false);
  }, [resolvedSrc]);

  useLayoutEffect(() => {
    if (!fadeIn) return;
    const img = imgRef.current;
    if (isPhotoLoaded(resolvedSrc) || (img?.complete && img.naturalWidth > 0)) {
      setReveal("shown");
      return;
    }
    setReveal("hidden");
    const timer = window.setTimeout(() => setReveal((r) => (r === "hidden" ? "shown" : r)), FADE_SAFETY_MS);
    return () => window.clearTimeout(timer);
  }, [fadeIn, resolvedSrc]);

  // Draw the copy before the first paint, and take it away once the <img> can paint.
  useLayoutEffect(() => {
    if (!poster) return;
    const img = imgRef.current;
    const canvas = posterRef.current;
    if (!img || !canvas || !drawSnapshot(resolvedSrc, canvas)) {
      setPosterFor("");
      return;
    }
    let cancelled = false;
    let frame = 0;
    const lift = () => {
      // Two frames: the <img> has to have been painted under the copy before the copy goes.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (!cancelled) setPosterFor("");
        });
      });
    };
    const whenLoaded = () => {
      if (cancelled) return;
      if (typeof img.decode === "function") img.decode().then(lift, lift);
      else lift();
    };
    const whenFailed = () => {
      if (!cancelled) setPosterFor("");
    };
    if (img.complete && img.naturalWidth > 0) whenLoaded();
    else {
      img.addEventListener("load", whenLoaded, { once: true });
      img.addEventListener("error", whenFailed, { once: true });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      img.removeEventListener("load", whenLoaded);
      img.removeEventListener("error", whenFailed);
    };
  }, [poster, resolvedSrc, showPoster]);

  if (!resolvedSrc) {
    return (
      <div
        className={`inline-block bg-[#EDE9E2] ${className ?? ""}`}
        style={style}
        aria-hidden
      />
    );
  }

  const imgLoading: React.ImgHTMLAttributes<HTMLImageElement>["loading"] =
    loading ?? (priority ? "eager" : "lazy");
  const imgDecoding: React.ImgHTMLAttributes<HTMLImageElement>["decoding"] =
    decoding ?? (priority ? "auto" : "async");

  const focalPosition = focal
    ? `${(focal.x * 100).toFixed(1)}% ${(focal.y * 100).toFixed(1)}%`
    : undefined;
  const mergedStyle: React.CSSProperties = {
    ...style,
    ...(focalPosition ? { objectPosition: focalPosition } : undefined),
    ...(reveal === "hidden" ? { opacity: 0 } : undefined),
  };
  const mergedClassName = reveal === "fading" ? `${className ?? ""} img-fade-in` : className;

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={resolvedSrc} />
      </div>
    </div>
  ) : (
    <>
      {showPoster && (
        <canvas
          ref={posterRef}
          aria-hidden
          className={className}
          style={{ ...style, ...(focalPosition ? { objectPosition: focalPosition } : undefined), position: "absolute", inset: 0, pointerEvents: "none" }}
        />
      )}
      <img
        ref={imgRef}
        src={resolvedSrc}
        alt={alt}
        className={mergedClassName}
        style={mergedStyle}
        loading={imgLoading}
        decoding={imgDecoding}
        {...(priority ? { fetchPriority: "high" } : {})}
        {...rest}
        onLoad={(e) => {
          markPhotoLoaded(resolvedSrc);
          if (poster) snapshotPhoto(e.currentTarget, resolvedSrc);
          if (fadeIn) setReveal((r) => (r === "hidden" ? "fading" : r));
          onLoad?.(e);
        }}
        onError={() => setDidError(true)}
      />
    </>
  );
}
