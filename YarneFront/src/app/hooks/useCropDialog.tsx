import { useCallback, useRef, useState, type ReactNode } from "react";
import type { Area } from "react-easy-crop";
import { ImageCropDialog } from "../components/admin/ImageCropDialog";
import {
  extractUploadPath,
  fileToDataUrl,
  resolveImageSrcForCrop,
  revokeCropImageSrc,
} from "../utils/cropImage";
import {
  clampCropZoom,
  getCropMetaForDisplayUrl,
  resolveCropSourceUrl,
  type CropResultSettings,
  type ImageCropMeta,
} from "../utils/imageCropMeta";
import { toUploadableCroppedFile } from "../utils/uploadCropPair";
import { resolveMediaUrl } from "../utils/storefrontMedia";

export class CropCancelledError extends Error {
  constructor() {
    super("Crop cancelled");
    this.name = "CropCancelledError";
  }
}

type CropDialogState = {
  imageSrc: string;
  title?: string;
  aspect?: number;
  hintText?: string;
  initialCroppedAreaPixels?: Area;
  initialZoom?: number;
  initialCrop?: { x: number; y: number };
  onComplete: (blob: Blob, settings: CropResultSettings) => void | Promise<void>;
  onCancel?: () => void;
  revokeSrc?: string;
};

type CropUploadOptions = {
  title?: string;
  aspect?: number;
  hintText?: string;
};

type CropUrlOptions = CropUploadOptions;

export function useCropDialog() {
  const cropInFlightRef = useRef(false);
  const [cropDialog, setCropDialog] = useState<CropDialogState | null>(null);
  const [cropFetching, setCropFetching] = useState(false);

  const closeCropDialog = useCallback(() => {
    setCropDialog((prev) => {
      if (prev?.revokeSrc) revokeCropImageSrc(prev.revokeSrc);
      return null;
    });
    cropInFlightRef.current = false;
  }, []);

  const promptCropForUpload = useCallback(
    (
      file: File,
      options?: CropUploadOptions,
    ): Promise<{ croppedFile: File; settings: CropResultSettings; originalFile: File }> =>
      new Promise((resolve, reject) => {
        if (cropInFlightRef.current) {
          reject(new Error("Crop dialog already open"));
          return;
        }
        cropInFlightRef.current = true;
        void fileToDataUrl(file)
          .then((imageSrc) => {
            setCropDialog({
              imageSrc,
              title: options?.title ?? "Crop image",
              aspect: options?.aspect,
              hintText: options?.hintText,
              onComplete: async (blob, settings) => {
                resolve({
                  croppedFile: toUploadableCroppedFile(blob, file.name.replace(/\.[^.]+$/, "") || "image"),
                  settings,
                  originalFile: file,
                });
              },
              onCancel: () => reject(new CropCancelledError()),
            });
          })
          .catch((err) => {
            cropInFlightRef.current = false;
            reject(err);
          });
      }),
    [],
  );

  const promptCropForUrl = useCallback(
    (
      displayUrl: string,
      metaByDisplayUrl: Record<string, ImageCropMeta>,
      options?: CropUrlOptions,
    ): Promise<{ blob: Blob; settings: CropResultSettings }> =>
      new Promise((resolve, reject) => {
        if (cropInFlightRef.current) {
          reject(new Error("Crop dialog already open"));
          return;
        }
        cropInFlightRef.current = true;
        setCropFetching(true);
        const sourceUrl = resolveCropSourceUrl(displayUrl, metaByDisplayUrl);
        const savedMeta = getCropMetaForDisplayUrl(displayUrl, metaByDisplayUrl);
        const rawSrc = sourceUrl.trim().startsWith("data:")
          ? sourceUrl.trim()
          : extractUploadPath(sourceUrl.trim()) ?? resolveMediaUrl(sourceUrl.trim());
        if (!rawSrc) {
          cropInFlightRef.current = false;
          setCropFetching(false);
          reject(new Error("No image to crop"));
          return;
        }
        void resolveImageSrcForCrop(rawSrc)
          .then((imageSrc) => {
            const revokeSrc = imageSrc.startsWith("blob:") ? imageSrc : undefined;
            setCropDialog({
              imageSrc,
              revokeSrc,
              title: options?.title ?? "Re-crop image",
              aspect: options?.aspect,
              hintText: options?.hintText,
              initialCroppedAreaPixels: savedMeta?.croppedAreaPixels,
              initialZoom: clampCropZoom(savedMeta?.zoom),
              initialCrop: savedMeta?.crop,
              onComplete: async (blob, settings) => resolve({ blob, settings }),
              onCancel: () => reject(new CropCancelledError()),
            });
            setCropFetching(false);
          })
          .catch((err) => {
            cropInFlightRef.current = false;
            setCropFetching(false);
            reject(err);
          });
      }),
    [],
  );

  const cropDialogNode: ReactNode = cropDialog ? (
    <ImageCropDialog
      imageSrc={cropDialog.imageSrc}
      title={cropDialog.title}
      aspect={cropDialog.aspect}
      hintText={cropDialog.hintText}
      initialCroppedAreaPixels={cropDialog.initialCroppedAreaPixels}
      initialZoom={cropDialog.initialZoom}
      initialCrop={cropDialog.initialCrop}
      onClose={closeCropDialog}
      onCancel={() => {
        cropDialog.onCancel?.();
        closeCropDialog();
      }}
      onComplete={cropDialog.onComplete}
    />
  ) : null;

  return {
    cropBusy: Boolean(cropDialog) || cropFetching,
    cropFetching,
    closeCropDialog,
    promptCropForUpload,
    promptCropForUrl,
    cropDialogNode,
  };
}
