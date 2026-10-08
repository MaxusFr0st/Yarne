import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiRequestError } from "../api/errors";
import { fetchMakingPhotoBlob, fetchMakingPhotos, requestMakingPhotos, type MakingPhotosList, type PublicOrderStatus } from "../api/orders";
import { FOCUS_RING, PILL, PILL_INK, SANS, SERIF } from "./care/careUi";
import { PrivateImage } from "./PrivateImage";

const CARD = "rounded-[16px] p-4 md:p-5";

/** Shown while the order is being made (or while there are photos) and gone once it is received or canceled. */
export function isMakingPhotosVisible(data: PublicOrderStatus): boolean {
  if (data.status === "Received" || data.status === "Canceled") return false;
  return data.canRequestPhotos || data.photosRequested || data.photoCount > 0 || ["Accepted", "InProduction", "Made"].includes(data.status);
}

/**
 * "Want to see how we make your piece?": the signed-in owner asks for photos once and sees them here; a guest, or someone else's
 * account, is pointed to the sign-in / account block of the page. The photos are never reachable by the link alone.
 */
export function MakingPhotosBlock({
  token,
  data,
  signedIn,
  accountBlockVisible,
  locale,
}: {
  token: string;
  data: PublicOrderStatus;
  signedIn: boolean;
  accountBlockVisible: boolean;
  locale: string;
}) {
  const { t } = useTranslation();
  // null = not known yet (or not the owner).
  const [list, setList] = useState<MakingPhotosList | null>(null);
  const [owner, setOwner] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!signedIn || !data.isAttachedToAccount) {
      setOwner(false);
      setList(null);
      return;
    }
    let live = true;
    fetchMakingPhotos(token)
      .then((result) => {
        if (!live) return;
        setOwner(true);
        setList(result);
      })
      .catch((err) => {
        if (!live) return;
        if (err instanceof ApiRequestError && err.status === 403) setOwner(false);
      });
    return () => {
      live = false;
    };
  }, [token, signedIn, data.isAttachedToAccount, data.photoCount, data.photosRequested]);

  const request = async () => {
    setSending(true);
    setError(false);
    try {
      setList(await requestMakingPhotos(token));
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  };

  const goToAccount = () => document.getElementById("order-account-title")?.scrollIntoView({ behavior: "smooth", block: "center" });
  const requested = list ? list.requestedAt !== null : data.photosRequested;
  const photos = list?.photos ?? [];
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "uk-UA", { day: "numeric", month: "long" });

  return (
    <section className={`${CARD} bg-[#EDE9E2] flex flex-col gap-3`} aria-labelledby="order-photos-title" style={SANS}>
      <h2 id="order-photos-title" className="text-[#2D241E]" style={{ ...SERIF, fontSize: "1.4rem", fontWeight: 600, lineHeight: 1.15 }}>
        {t("orderStatus.photos.title")}
      </h2>
      {owner === false && (
        <p className="text-[0.9rem] text-[#2D241E]/75">
          {t("orderStatus.photos.signIn")}
          {accountBlockVisible && (
            <>
              {" "}
              <button type="button" onClick={goToAccount} className={`underline underline-offset-2 text-[#2D241E] cursor-pointer ${FOCUS_RING}`}>
                {t("orderStatus.photos.signInLink")}
              </button>
            </>
          )}
        </p>
      )}
      {owner && photos.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <PrivateImage
                key={photo.id}
                load={() => fetchMakingPhotoBlob(token, photo.id)}
                alt={t("orderStatus.photos.alt", { n: index + 1 })}
                className="w-full aspect-square object-cover rounded-[12px]"
              />
            ))}
          </div>
          <p className="text-[0.8rem] text-[#2D241E]/65">{t("orderStatus.photos.added", { date: date(photos[photos.length - 1].createdAt) })}</p>
        </div>
      )}
      {owner && photos.length === 0 && requested && (
        <p className="text-[0.9rem] text-[#2D241E]/75" role="status">
          {t("orderStatus.photos.requested")}
        </p>
      )}
      {owner && photos.length === 0 && !requested && data.canRequestPhotos && (
        <>
          <button type="button" disabled={sending} onClick={() => void request()} className={`${PILL} ${PILL_INK} h-12 px-5 justify-center w-full sm:w-auto disabled:opacity-60`}>
            {t("orderStatus.photos.request")}
          </button>
          {error && (
            <p className="text-[0.85rem]" role="alert" style={{ color: "#8A1C1C" }}>
              {t("orderStatus.photos.error")}
            </p>
          )}
        </>
      )}
    </section>
  );
}
