import cherieSrc from "../../../assets/CherieOxBloddGen-removebg-preview.png";
import dvaSrc from "../../../assets/DvaShopperYelowGen-removebg-preview.png";

// This filename has a space + parens — a plain static import trips some
// bundlers on that, so it's resolved via URL instead. The other two import fine.
const femmoraSrc = new URL(
  "../../../assets/FemmoraPinkGen-removebg-preview (1).png",
  import.meta.url
).href;

/** Built-in bag photos, used for any slot the admin hasn't uploaded a photo for. */
export const WHY_DEFAULT_IMAGES = [femmoraSrc, cherieSrc, dvaSrc] as const;
