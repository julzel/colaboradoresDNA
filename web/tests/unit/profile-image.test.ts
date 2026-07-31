import { File as NodeFile } from "node:buffer";

import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import {
  normalizeProfileImage,
  updateOwnEmployeeProfileImage,
} from "@/features/employees/server/profile-image-service";

const mocks = vi.hoisted(() => ({
  clerkClient: vi.fn(),
  findEmployeeByPlatformUserId: vi.fn(),
  recordEmployeeAudit: vi.fn(),
  requirePlatformUser: vi.fn(),
  updateUserProfileImage: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: mocks.requirePlatformUser,
}));

vi.mock("@/features/employees/server/employee-repository", () => ({
  findEmployeeByPlatformUserId: mocks.findEmployeeByPlatformUserId,
}));

vi.mock("@/features/employees/server/employee-audit-repository", () => ({
  recordEmployeeAudit: mocks.recordEmployeeAudit,
}));

describe("profile image normalization", () => {
  it("center-crops, converts, and keeps the final image below one MB", async () => {
    const source = await sharp({
      create: {
        background: { b: 180, g: 80, r: 30 },
        channels: 3,
        height: 900,
        width: 1400,
      },
    })
      .jpeg({ quality: 100 })
      .toBuffer();
    const file = new NodeFile([new Uint8Array(source)], "portrait.jpg", {
      type: "image/jpeg",
    });

    const normalized = await normalizeProfileImage(file);
    const metadata = await sharp(
      Buffer.from(await normalized.arrayBuffer()),
    ).metadata();

    expect(normalized.type).toBe("image/webp");
    expect(normalized.size).toBeLessThanOrEqual(1_000_000);
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects unsupported and corrupt files", async () => {
    await expect(
      normalizeProfileImage(
        new NodeFile(["not an image"], "profile.gif", { type: "image/gif" }),
      ),
    ).rejects.toMatchObject({
      code: "unsupported_image",
    });
    await expect(
      normalizeProfileImage(
        new NodeFile(["not an image"], "profile.jpg", { type: "image/jpeg" }),
      ),
    ).rejects.toMatchObject({ code: "invalid_image" });
  });

  it("rejects a submitted source over the server transport allowance", async () => {
    const oversized = new NodeFile([new Uint8Array(2_000_001)], "profile.jpg", {
      type: "image/jpeg",
    });

    await expect(normalizeProfileImage(oversized)).rejects.toMatchObject({
      code: "image_too_large",
    });
  });
});

describe("profile image ownership", () => {
  it("derives employee and Clerk targets from the authenticated actor", async () => {
    mocks.requirePlatformUser.mockResolvedValue({
      clerkUserId: "user_clerk_123",
      platformUser: { id: "507f1f77bcf86cd799439011" },
    });
    mocks.findEmployeeByPlatformUserId.mockResolvedValue({
      id: "507f1f77bcf86cd799439012",
    });
    mocks.updateUserProfileImage.mockResolvedValue({
      imageUrl: "https://img.clerk.com/updated",
    });
    mocks.clerkClient.mockResolvedValue({
      users: { updateUserProfileImage: mocks.updateUserProfileImage },
    });
    const source = await sharp({
      create: {
        background: "#07bbc7",
        channels: 3,
        height: 128,
        width: 128,
      },
    })
      .png()
      .toBuffer();

    await updateOwnEmployeeProfileImage(
      new NodeFile([new Uint8Array(source)], "profile.png", {
        type: "image/png",
      }) as unknown as File,
    );

    expect(mocks.findEmployeeByPlatformUserId).toHaveBeenCalledWith(
      "507f1f77bcf86cd799439011",
    );
    expect(mocks.updateUserProfileImage).toHaveBeenCalledWith(
      "user_clerk_123",
      expect.objectContaining({ file: expect.any(NodeFile) }),
    );
    expect(mocks.recordEmployeeAudit).toHaveBeenCalledWith({
      action: "profile_image_updated",
      actorPlatformUserId: "507f1f77bcf86cd799439011",
      changedFields: ["profileImage"],
      targetEmployeeId: "507f1f77bcf86cd799439012",
    });
  });
});
