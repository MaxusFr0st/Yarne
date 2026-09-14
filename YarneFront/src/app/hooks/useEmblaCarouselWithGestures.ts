import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel, { type UseEmblaCarouselType } from "embla-carousel-react";
// The React wrapper only re-exports its own hook types; the carousel's own types live in the
// core package. Importing them from the wrapper silently produced `any`, which is why the
// watchResize callback's parameters had no types at any call site.
import type {
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

/**
 * How much viewport padding a looping carousel tolerates, as a multiple of the gap Embla already
 * leaves between slides.
 *
 * Embla parks a wrapped slide just outside the viewport's *content* box, but `overflow` clips at
 * the *padding* box — so horizontal padding on the viewport leaves that parked slide sitting
 * visible inside the padding band, on top of the slides still on screen. Measured on the Best
 * Sellers carousel at a fixed 1900px window, sweeping only the padding, the visible overlap came
 * out as exactly `padding - 2 x slide spacing` at every step:
 *
 *   padding   0px  40px  80px  150px  220px  290px
 *   overlap     0     0  16px   86px  156px  226px   (slide spacing 32px)
 *
 * So looping is safe precisely while the padding stays inside that 2x spacing budget. This is the
 * causal condition, not a proxy: slide count and viewport width turned out not to matter — with
 * padding removed, the same carousel looped cleanly at every width and slide count tested.
 */
const LOOP_PADDING_BUDGET = 2;

/**
 * `useEmblaCarousel` plus wheel gestures, and one guarantee it does not give you on its own:
 * `loop` is treated as a *request*. It is honoured only while the viewport's geometry can
 * actually hide a wrapped slide (see LOOP_PADDING_BUDGET); otherwise the carousel silently falls
 * back to a bounded one, which is the difference between "you cannot swipe past the last product"
 * and "two product cards render on top of each other". The measurement re-runs on resize and on
 * every Embla re-init, so a carousel that becomes safe (or stops being safe) as the window
 * changes follows along instead of being decided once at mount.
 */
export function useEmblaCarouselWithGestures(
  options?: EmblaOptionsType,
  plugins: EmblaPluginType[] = [],
  gestureOptions: GestureOptions = {},
  // The [viewportRef, api] tuple useEmblaCarousel returns, which is what every call site
  // destructures. This was annotated as EmblaCarouselType — the carousel itself, not the pair —
  // and the mismatch was invisible while the type import above silently resolved to `any`.
): UseEmblaCarouselType {
  const { wheelAxis } = gestureOptions;
  const wantsLoop = options?.loop === true;
  const [loopIsSafe, setLoopIsSafe] = useState(false);
  const viewportRef = useRef<HTMLElement | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({ ...options, loop: wantsLoop && loopIsSafe }, [
    WheelGesturesPlugin({
      ...(wheelAxis ? { forceWheelAxis: wheelAxis } : {}),
      wheelDraggingClass: "",
    }),
    ...plugins,
  ]);

  // Embla owns the viewport node, but the padding has to be read off it, so keep a handle too.
  const setViewport = useCallback(
    (node: HTMLElement | null) => {
      viewportRef.current = node;
      emblaRef(node);
    },
    [emblaRef],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!wantsLoop || !emblaApi || !viewport) return;

    const measure = () => {
      const slide = emblaApi.slideNodes()[0];
      if (!slide) return;
      // Spacing in this codebase is padding-left per slide against a negative margin on the
      // track (Embla's own slide-gap idiom). A carousel that spaces slides some other way
      // reads 0 here and is simply held to the stricter "no padding at all" bar.
      const spacing = parseFloat(getComputedStyle(slide).paddingLeft) || 0;
      const viewportStyle = getComputedStyle(viewport);
      const padding = Math.max(
        parseFloat(viewportStyle.paddingLeft) || 0,
        parseFloat(viewportStyle.paddingRight) || 0,
      );
      setLoopIsSafe(padding <= spacing * LOOP_PADDING_BUDGET);
    };

    measure();
    // border-box, not the default content-box. The padding being measured here is what changes,
    // and on this carousel it changes *instead of* the content box rather than alongside it: the
    // track's content width is capped by the 1400px column, so growing the window from 1440 to
    // 1900 moved the padding 60px -> 290px while the content box stayed exactly 1305px. A
    // content-box observer never fired, and the guard silently kept a stale answer.
    const observer = new ResizeObserver(measure);
    observer.observe(viewport, { box: "border-box" });
    emblaApi.on("reInit", measure);
    return () => {
      observer.disconnect();
      emblaApi.off("reInit", measure);
    };
  }, [emblaApi, wantsLoop]);

  // Remember where the reader was, so flipping loop mode mid-session does not send them back to
  // the first slide. Only user-driven selection is recorded: a re-init reports index 0 itself,
  // and reading that back would overwrite the position we are trying to restore.
  const lastIndexRef = useRef(0);
  useEffect(() => {
    if (!emblaApi) return;
    const remember = () => {
      lastIndexRef.current = emblaApi.selectedScrollSnap();
    };
    emblaApi.on("select", remember);
    return () => {
      emblaApi.off("select", remember);
    };
  }, [emblaApi]);

  const loopModeRef = useRef(loopIsSafe);
  useEffect(() => {
    if (!emblaApi || loopModeRef.current === loopIsSafe) return;
    loopModeRef.current = loopIsSafe;
    // Bounded mode has fewer snap points than looping mode, so clamp before restoring.
    const target = Math.min(lastIndexRef.current, emblaApi.scrollSnapList().length - 1);
    if (target > 0) emblaApi.scrollTo(target, true); // jump — a re-init should never animate
  }, [emblaApi, loopIsSafe]);

  return [setViewport, emblaApi] as UseEmblaCarouselType;
}
