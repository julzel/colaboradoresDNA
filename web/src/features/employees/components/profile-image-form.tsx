"use client";

/* eslint-disable @next/next/no-img-element */

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useUser } from "@clerk/nextjs";

import { updateOwnProfileImageAction } from "@/features/employees/actions/profile-actions";

import styles from "./self-service-profile.module.css";

const acceptedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const sourceByteLimit = 10_000_000;
const clientTargetBytes = 900_000;

type LoadedImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  cleanup: () => void;
};

async function loadImage(file: File): Promise<LoadedImage> {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      cleanup: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
    };
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();
  return {
    cleanup: () => URL.revokeObjectURL(url),
    height: image.naturalHeight,
    source: image,
    width: image.naturalWidth,
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("compression_failed"))),
      "image/webp",
      quality,
    );
  });
}

async function compressProfileImage(file: File) {
  if (!acceptedTypes.has(file.type)) throw new Error("unsupported_type");
  if (file.size > sourceByteLimit) throw new Error("source_too_large");

  const image = await loadImage(file);
  try {
    const largestDimension = Math.max(1, Math.min(512, image.width, image.height));
    const dimensions = [largestDimension, 384, 320, 256]
      .filter(
        (value, index, values) =>
          value <= largestDimension && values.indexOf(value) === index,
      )
      .sort((left, right) => right - left);
    const qualities = [0.86, 0.76, 0.66, 0.56, 0.46];

    for (const dimension of dimensions) {
      const canvas = document.createElement("canvas");
      canvas.width = dimension;
      canvas.height = dimension;
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("compression_failed");

      const sourceSide = Math.min(image.width, image.height);
      const sourceX = (image.width - sourceSide) / 2;
      const sourceY = (image.height - sourceSide) / 2;
      context.drawImage(
        image.source,
        sourceX,
        sourceY,
        sourceSide,
        sourceSide,
        0,
        0,
        dimension,
        dimension,
      );

      for (const quality of qualities) {
        const blob = await canvasBlob(canvas, quality);
        if (blob.size <= clientTargetBytes) {
          return new File([blob], "profile.webp", { type: "image/webp" });
        }
      }
    }
  } finally {
    image.cleanup();
  }

  throw new Error("compression_failed");
}

function clientErrorMessage(error: unknown) {
  if (!(error instanceof Error)) return "No fue posible procesar la imagen.";
  if (error.message === "unsupported_type") return "Usá una imagen JPEG, PNG o WebP.";
  if (error.message === "source_too_large") {
    return "La imagen original no puede superar 10 MB.";
  }
  return "No fue posible comprimir la imagen. Probá con otro archivo.";
}

type ProfileImageFormProps = {
  displayName: string;
  hasImage: boolean;
  imageUrl: string;
  initials: string;
};

export function ProfileImageForm({
  displayName,
  hasImage: initialHasImage,
  imageUrl,
  initials,
}: ProfileImageFormProps) {
  const [hasImage, setHasImage] = useState(initialHasImage);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialHasImage ? imageUrl : null,
  );
  const [busy, setBusy] = useState(false);
  const objectUrlRef = useRef<string | null>(null);
  const router = useRouter();
  const { user } = useUser();

  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function replaceObjectUrl(file: File | null) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = file ? URL.createObjectURL(file) : null;
    setPreviewUrl(objectUrlRef.current ?? (hasImage ? imageUrl : null));
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setBusy(true);

    try {
      const compressed = await compressProfileImage(file);
      replaceObjectUrl(compressed);
      setMessage("Subiendo foto…");

      const formData = new FormData();
      formData.set("profileImage", compressed);
      const result = await updateOwnProfileImageAction(formData);
      setMessage(result.message ?? null);

      if (result.status === "success") {
        setHasImage(true);
        await refreshClerkUser();
      } else {
        replaceObjectUrl(null);
      }
    } catch (error) {
      replaceObjectUrl(null);
      setMessage(clientErrorMessage(error));
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

  async function refreshClerkUser() {
    await user?.reload();
    router.refresh();
  }

  return (
    <div className={styles.heroImageControl}>
      <div className={styles.heroAvatar}>
        {previewUrl ? (
          <img alt={`Foto de perfil de ${displayName}`} src={previewUrl} />
        ) : (
          <span aria-label={`Iniciales de ${displayName}`}>{initials}</span>
        )}
      </div>
      <label className={styles.heroImageButton} htmlFor="profileImage">
        <Camera aria-hidden="true" size={15} />
        {busy ? "Subiendo…" : hasImage ? "Cambiar" : "Subir foto"}
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={busy}
        id="profileImage"
        onChange={handleFileChange}
        type="file"
      />
      {message && (
        <p aria-live="polite" className={styles.heroImageMessage}>
          {message}
        </p>
      )}
    </div>
  );
}
