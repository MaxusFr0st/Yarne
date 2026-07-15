import React, { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../utils/storefrontMedia";

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
