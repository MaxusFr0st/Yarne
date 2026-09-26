import { useEffect } from "react";
import { useLocation } from "react-router";
import { useProducts } from "../hooks/useProducts";
import { isDesktop, Priority, queuePhotos, settlePage } from "../utils/photoQueue";
import { allPhotos, defaultPhoto } from "../utils/productPhotos";
import { loadHomePageMediaSelection } from "../utils/homePageMediaSelection";
import { loadWhySectionContent } from "../utils/whySectionContent";
import { loadFeaturedShowcaseSelection } from "../utils/featuredShowcaseSelection";
import { WHY_DEFAULT_IMAGES } from "../utils/whyDefaultImages";

const HOME_PATH = /^\/(uk|en)\/?$/;

/**
 * Gets the storefront's other pages ready while the visitor is on this one (utils/photoQueue.ts):
 * every product's card photo, so the collection is instant from anywhere; the home page's photos
 * when the visitor started elsewhere; and on desktop, every photo of every product. The page
 * itself and what is one tap away from it always go first. Renders nothing.
 */
export function SitePrefetch() {
  const { pathname } = useLocation();
  const { products } = useProducts();

  // A newly opened page loads the photos on its screen before anything in the background.
  useEffect(() => {
    settlePage();
  }, [pathname]);

  const cardPhotos = products.map(defaultPhoto).filter(Boolean).join(" ");
  useEffect(() => {
    if (cardPhotos) queuePhotos(cardPhotos.split(" "), Priority.otherPages);
  }, [cardPhotos]);

  const everything = isDesktop() ? products.flatMap(allPhotos).filter(Boolean).join(" ") : "";
  useEffect(() => {
    if (everything) queuePhotos(everything.split(" "), Priority.everything);
  }, [everything]);

  // Started on another page: the home page's content (saved for its first render, too) and photos.
  // On the home page itself, its sections do this.
  useEffect(() => {
    if (HOME_PATH.test(pathname)) return;
    let cancelled = false;
    void Promise.all([loadHomePageMediaSelection(), loadWhySectionContent(), loadFeaturedShowcaseSelection()]).then(
      ([media, why, showcase]) => {
        if (cancelled) return;
        queuePhotos(
          [
            media.heroImageUrl,
            media.editorialImageUrl,
            ...why.images.map((src, i) => src || WHY_DEFAULT_IMAGES[i]),
            ...why.backgrounds,
            showcase.slot1.imageUrl,
            showcase.slot2.imageUrl,
            showcase.slot4.imageUrl,
          ],
          Priority.otherPages,
        );
      },
    );
    return () => {
      cancelled = true;
    };
    // Once, for the page the visit started on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
