import { Skeleton } from "./ui/skeleton";

const SHAPE = "bg-[#E5E0D8]";

/**
 * What a product page shows for the moment before its data arrives (a link opened directly on a slow
 * connection): grey shapes where the photo, name, text and buy box will be, pulsing like the
 * collection's card placeholders. Sizes follow the real layouts so nothing jumps far when they swap.
 */
export function ProductPageSkeleton() {
  return (
    <div aria-busy="true" aria-hidden="true">
      {/* Phones: the photo at the size MobileProductDetailView gives it, then the info sheet. */}
      <div className="md:hidden">
        <Skeleton
          className={`w-full rounded-none ${SHAPE}`}
          style={{ height: "min(calc(var(--app-svh) * 0.62 + 10px), 470px)" }}
        />
        <div className="px-5 pt-6 flex flex-col gap-3">
          <Skeleton className={`h-3 w-20 rounded ${SHAPE}`} />
          <Skeleton className={`h-8 w-3/5 rounded ${SHAPE}`} />
          <Skeleton className={`h-44 w-full rounded-[24px] mt-2 ${SHAPE}`} />
        </div>
      </div>

      {/* Computers: thumbnail rail, main photo and info column, as in the desktop layout. */}
      <div className="hidden md:block max-w-[1360px] mx-auto px-6 md:px-12 pt-[calc(var(--main-header-h)+16px)] pb-[120px]">
        <div className="h-[18px] mb-5" />
        <div className="grid md:grid-cols-2 lg:grid-cols-[88px_1fr_420px] gap-6 items-start">
          <div className="hidden lg:flex flex-col gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className={`aspect-square w-full rounded-2xl ${SHAPE}`} />
            ))}
          </div>
          <Skeleton
            className={`w-full rounded-[28px] ${SHAPE}`}
            style={{ height: "min(740px, calc(var(--app-svh) - 200px))" }}
          />
          <div className="flex flex-col gap-3">
            <Skeleton className={`h-3 w-24 rounded ${SHAPE}`} />
            <Skeleton className={`h-10 w-2/3 rounded ${SHAPE}`} />
            <Skeleton className={`h-3.5 w-full rounded ${SHAPE}`} />
            <Skeleton className={`h-3.5 w-11/12 rounded ${SHAPE}`} />
            <Skeleton className={`h-3.5 w-4/5 rounded ${SHAPE}`} />
            <Skeleton className={`h-64 w-full rounded-[24px] mt-3 ${SHAPE}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
