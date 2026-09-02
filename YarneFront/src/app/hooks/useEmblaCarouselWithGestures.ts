import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
// The React wrapper only re-exports its own hook types; the carousel's own types live in the
// core package. Importing them from the wrapper silently produced `any`, which is why the
// watchResize callback's parameters had no types at any call site.
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";

type WheelAxis = "x" | "y";

type GestureOptions = {
  /**
   * Which wheel axis to listen on. For horizontal carousels, `y` maps
   * vertical trackpad/mouse-wheel scroll to horizontal slide movement.
   */
  wheelAxis?: WheelAxis;
};

export function useEmblaCarouselWithGestures(
  options?: EmblaOptionsType,
  plugins: EmblaPluginType[] = [],
  gestureOptions: GestureOptions = {},
  // The [viewportRef, api] tuple useEmblaCarousel returns, which is what every call site
  // destructures. This was annotated as EmblaCarouselType — the carousel itself, not the pair —
  // and the mismatch was invisible while the type import above silently resolved to `any`.
): UseEmblaCarouselType {
  const { wheelAxis } = gestureOptions;

  return useEmblaCarousel(options, [
    WheelGesturesPlugin({
      ...(wheelAxis ? { forceWheelAxis: wheelAxis } : {}),
      wheelDraggingClass: "",
    }),
    ...plugins,
  ]);
}
