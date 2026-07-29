import React, { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

/** Visible cream plate so empty slots still paint structure (site + Figma capture). */
const EMPTY_PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'%3E%3Crect fill='%23EDE9E2' width='800' height='1000'/%3E%3Cpath d='M260 560l90-110 90 110 55-75 75 110H220z' fill='%232D241E' fill-opacity='0.14'/%3E%3Ccircle cx='310' cy='340' r='36' fill='%232D241E' fill-opacity='0.14'/%3E%3C/svg%3E";

export interface FocalPoint {
  x: number;
  y: number;
}

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Pass true for above-the-fold / LCP images to load eagerly with high priority. */
  priority?: boolean;
  /** Per-image focal point (0–1 normalized). Defaults to center-upper-third. */
  focal?: FocalPoint;
}

export function ImageWithFallback({ priority, focal, ...props }: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const { src, alt, style, className, loading, decoding, ...rest } = props;
  const resolvedSrc = src ? resolveMediaUrl(String(src)) : "";

  useEffect(() => {
    setDidError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return (
      <img
        src={EMPTY_PLACEHOLDER_IMG}
        alt=""
        aria-hidden
        className={className}
        style={style}
        decoding="async"
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
  };

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
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={mergedStyle}
      loading={imgLoading}
      decoding={imgDecoding}
      {...(priority ? { fetchPriority: "high" } : {})}
      {...rest}
      onError={() => setDidError(true)}
    />
  );
}
