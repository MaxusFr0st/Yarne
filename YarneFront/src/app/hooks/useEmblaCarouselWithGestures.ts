import useEmblaCarousel, {
  type EmblaCarouselType,
  type EmblaOptionsType,
  type EmblaPluginType,
} from "embla-carousel-react";
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
): EmblaCarouselType {
  const { wheelAxis } = gestureOptions;

  return useEmblaCarousel(options, [
    WheelGesturesPlugin({
      ...(wheelAxis ? { forceWheelAxis: wheelAxis } : {}),
      wheelDraggingClass: "",
    }),
    ...plugins,
  ]);
}
