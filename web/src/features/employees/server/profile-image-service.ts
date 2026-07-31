import "server-only";

import { File as NodeFile } from "node:buffer";

import { clerkClient } from "@clerk/nextjs/server";
import sharp from "sharp";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import { recordEmployeeAudit } from "@/features/employees/server/employee-audit-repository";
import { findEmployeeByPlatformUserId } from "@/features/employees/server/employee-repository";

const finalImageByteLimit = 1_000_000;
const sourceImageByteLimit = 2_000_000;
const inputPixelLimit = 25_000_000;
const acceptedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const acceptedFormats = new Set(["jpeg", "png", "webp"]);

export type ProfileImageErrorCode =
  | "empty_image"
  | "image_too_large"
  | "invalid_image"
  | "unsupported_image";

export class ProfileImageError extends Error {
  constructor(readonly code: ProfileImageErrorCode) {
    super(code);
    this.name = "ProfileImageError";
  }
}

type ProfileImageSource = {
  arrayBuffer: () => Promise<ArrayBuffer>;
  size: number;
  type: string;
};

export async function normalizeProfileImage(file: ProfileImageSource) {
  if (!file.size) throw new ProfileImageError("empty_image");
  if (file.size > sourceImageByteLimit) {
    throw new ProfileImageError("image_too_large");
  }
  if (!acceptedMimeTypes.has(file.type)) {
    throw new ProfileImageError("unsupported_image");
  }

  const input = Buffer.from(await file.arrayBuffer());
  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

  try {
    metadata = await sharp(input, {
      animated: false,
      failOn: "error",
      limitInputPixels: inputPixelLimit,
    }).metadata();
  } catch {
    throw new ProfileImageError("invalid_image");
  }

  if (
    !metadata.format ||
    !acceptedFormats.has(metadata.format) ||
    (metadata.pages ?? 1) > 1 ||
    !metadata.width ||
    !metadata.height ||
    metadata.width * metadata.height > inputPixelLimit
  ) {
    throw new ProfileImageError("invalid_image");
  }

  const dimensions = [512, 384, 320, 256] as const;
  const qualities = [82, 72, 62, 52, 42] as const;

  try {
    for (const dimension of dimensions) {
      for (const quality of qualities) {
        const output = await sharp(input, {
          animated: false,
          failOn: "error",
          limitInputPixels: inputPixelLimit,
        })
          .rotate()
          .resize(dimension, dimension, {
            fit: "cover",
            position: "centre",
            withoutEnlargement: true,
          })
          .webp({ effort: 4, quality, smartSubsample: true })
          .toBuffer();

        if (output.byteLength <= finalImageByteLimit) {
          return new NodeFile([new Uint8Array(output)], "profile.webp", {
            type: "image/webp",
          });
        }
      }
    }
  } catch {
    throw new ProfileImageError("invalid_image");
  }

  throw new ProfileImageError("image_too_large");
}

export async function updateOwnEmployeeProfileImage(file: File) {
  const { clerkUserId, platformUser } = await requirePlatformUser();
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  if (!employee) throw new EmployeeDomainError("employee_not_found");

  const normalizedFile = await normalizeProfileImage(file);
  const client = await clerkClient();
  const updatedUser = await client.users.updateUserProfileImage(clerkUserId, {
    file: normalizedFile as unknown as Blob,
  });

  await recordEmployeeAudit({
    action: "profile_image_updated",
    actorPlatformUserId: platformUser.id,
    changedFields: ["profileImage"],
    targetEmployeeId: employee.id,
  });

  return { imageUrl: updatedUser.imageUrl };
}

export async function removeOwnEmployeeProfileImage() {
  const { clerkUserId, platformUser } = await requirePlatformUser();
  const employee = await findEmployeeByPlatformUserId(platformUser.id);
  if (!employee) throw new EmployeeDomainError("employee_not_found");

  const client = await clerkClient();
  await client.users.deleteUserProfileImage(clerkUserId);
  await recordEmployeeAudit({
    action: "profile_image_removed",
    actorPlatformUserId: platformUser.id,
    changedFields: ["profileImage"],
    targetEmployeeId: employee.id,
  });
}
