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
  // Horizontal carousels: listen on Y so vertical trackpad / mouse-wheel scroll advances slides.
  const { wheelAxis = "y" } = gestureOptions;

  return useEmblaCarousel(options, [
    WheelGesturesPlugin({
      forceWheelAxis: wheelAxis,
      wheelDraggingClass: "",
    }),
    ...plugins,
  ]);
}
