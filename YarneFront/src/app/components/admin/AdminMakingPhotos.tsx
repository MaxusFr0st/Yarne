import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  deleteAdminMakingPhoto,
  fetchAdminMakingPhotoBlob,
  fetchAdminMakingPhotos,
  uploadAdminMakingPhotos,
  type MakingPhotosList,
} from "../../api/orders";
import { PrivateImage } from "../PrivateImage";

const SANS = { fontFamily: "'DM Sans', sans-serif" } as const;
const MAX = 5;

/** The owner's side of "making of": upload up to five photos, remove one, see when the customer asked. */
export function AdminMakingPhotos({
  orderId,
  onChanged,
  onError,
}: {
  orderId: number;
  onChanged: (count: number) => void;
  onError: (message: string) => void;
}) {
  const [list, setList] = useState<MakingPhotosList | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    fetchAdminMakingPhotos(orderId)
      .then((result) => live && setList(result))
      .catch(() => live && onError("Failed to load the photos."));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const apply = (result: MakingPhotosList) => {
    setList(result);
    onChanged(result.photos.length);
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      apply(await uploadAdminMakingPhotos(orderId, Array.from(files)));
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to upload the photos.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (photoId: number) => {
    if (!window.confirm("Remove this photo?")) return;
    setBusy(true);
    try {
      apply(await deleteAdminMakingPhoto(orderId, photoId));
    } catch {
      onError("Failed to remove the photo.");
    } finally {
      setBusy(false);
    }
  };

  const photos = list?.photos ?? [];
  return (
    <div className="space-y-2" style={SANS}>
      <p className="text-sm text-[#2D241E]/65">
        {list?.requestedAt ? `Customer asked: ${new Date(list.requestedAt).toLocaleString()}` : "The customer has not asked for photos."}
      </p>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="relative">
              <PrivateImage load={() => fetchAdminMakingPhotoBlob(orderId, photo.id)} alt="" className="w-full aspect-square object-cover rounded-[12px]" />
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(photo.id)}
                aria-label="Remove photo"
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-[#2D241E]/80 text-[#F5F2ED] flex items-center justify-center disabled:opacity-50 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
      <button
        type="button"
        disabled={busy || photos.length >= MAX}
        onClick={() => input.current?.click()}
        className="px-3 py-1.5 rounded-full text-[#F5F2ED] disabled:opacity-50 cursor-pointer"
        style={{ backgroundColor: "#2D241E", fontSize: "0.7rem", letterSpacing: "0.06em" }}
      >
        {busy ? "Working…" : `Upload photos (${photos.length}/${MAX})`}
      </button>
    </div>
  );
}
