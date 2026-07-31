"use client";

/* eslint-disable @next/next/no-img-element */

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useUser } from "@clerk/nextjs";

import { Button } from "@/components/ui/button/button";
import {
  removeOwnProfileImageAction,
  updateOwnProfileImageAction,
} from "@/features/employees/actions/profile-actions";

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
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [hasImage, setHasImage] = useState(initialHasImage);
  const [message, setMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialHasImage ? imageUrl : null,
  );
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    setProcessing(true);

    try {
      const compressed = await compressProfileImage(file);
      setCompressedFile(compressed);
      replaceObjectUrl(compressed);
      setMessage(
        `Vista previa lista · ${Math.max(1, Math.round(compressed.size / 1000))} KB`,
      );
    } catch (error) {
      setCompressedFile(null);
      replaceObjectUrl(null);
      setMessage(clientErrorMessage(error));
      event.target.value = "";
    } finally {
      setProcessing(false);
    }
  }

  async function refreshClerkUser() {
    await user?.reload();
    router.refresh();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!compressedFile || submitting) return;
    setSubmitting(true);
    setMessage("Subiendo foto…");

    const formData = new FormData();
    formData.set("profileImage", compressedFile);
    const result = await updateOwnProfileImageAction(formData);
    setMessage(result.message ?? null);

    if (result.status === "success") {
      setHasImage(true);
      setCompressedFile(null);
      await refreshClerkUser();
    }
    setSubmitting(false);
  }

  async function handleRemove() {
    if (submitting) return;
    setSubmitting(true);
    setMessage("Eliminando foto…");
    const result = await removeOwnProfileImageAction();
    setMessage(result.message ?? null);

    if (result.status === "success") {
      setHasImage(false);
      setCompressedFile(null);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
      setPreviewUrl(null);
      await refreshClerkUser();
    }
    setSubmitting(false);
  }

  return (
    <form className={styles.imageForm} onSubmit={handleSubmit}>
      <div className={styles.imagePreview}>
        {previewUrl ? (
          <img alt={`Foto de perfil de ${displayName}`} src={previewUrl} />
        ) : (
          <span aria-label={`Iniciales de ${displayName}`}>{initials}</span>
        )}
      </div>
      <div className={styles.imageControls}>
        <p>JPEG, PNG o WebP. Se recorta al centro y se comprime a un máximo de 1 MB.</p>
        <div className={styles.imageActions}>
          <label className={styles.fileButton} htmlFor="profileImage">
            <ImagePlus aria-hidden="true" size={18} />
            {processing ? "Procesando…" : "Seleccionar foto"}
          </label>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={processing || submitting}
            id="profileImage"
            onChange={handleFileChange}
            type="file"
          />
          {compressedFile && (
            <Button disabled={submitting} type="submit">
              <Upload aria-hidden="true" size={18} />
              {submitting ? "Subiendo…" : "Guardar foto"}
            </Button>
          )}
          {hasImage && !compressedFile && (
            <Button
              disabled={submitting}
              onClick={handleRemove}
              type="button"
              variant="quiet"
            >
              <Trash2 aria-hidden="true" size={18} /> Eliminar foto
            </Button>
          )}
        </div>
        {message && (
          <p aria-live="polite" className={styles.imageMessage}>
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
