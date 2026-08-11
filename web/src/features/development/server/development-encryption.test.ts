import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import {
  decryptDevelopmentPayload,
  DevelopmentEncryptionError,
  encryptDevelopmentPayload,
} from "@/features/development/server/development-encryption";

vi.mock("server-only", () => ({}));

const payloadSchema = z
  .object({
    summary: z.string(),
  })
  .strict();

const associatedData = {
  resourceId: "507f1f77bcf86cd799439011",
  resourceType: "one_on_one" as const,
};

const originalEnvironment = {
  active: process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION,
  v1: process.env.DEVELOPMENT_ENCRYPTION_KEY_V1,
  v2: process.env.DEVELOPMENT_ENCRYPTION_KEY_V2,
};

function expectEncryptionCode(callback: () => unknown, code: string) {
  try {
    callback();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(DevelopmentEncryptionError);
    expect((error as DevelopmentEncryptionError).code).toBe(code);
    return;
  }

  throw new Error("Expected the encryption boundary to reject the operation.");
}

describe("development narrative encryption", () => {
  beforeEach(() => {
    process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION = "v1";
    process.env.DEVELOPMENT_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 7).toString("base64");
    delete process.env.DEVELOPMENT_ENCRYPTION_KEY_V2;
  });

  afterEach(() => {
    if (originalEnvironment.active === undefined) {
      delete process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION;
    } else {
      process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION =
        originalEnvironment.active;
    }
    if (originalEnvironment.v1 === undefined) {
      delete process.env.DEVELOPMENT_ENCRYPTION_KEY_V1;
    } else {
      process.env.DEVELOPMENT_ENCRYPTION_KEY_V1 = originalEnvironment.v1;
    }
    if (originalEnvironment.v2 === undefined) {
      delete process.env.DEVELOPMENT_ENCRYPTION_KEY_V2;
    } else {
      process.env.DEVELOPMENT_ENCRYPTION_KEY_V2 = originalEnvironment.v2;
    }
  });

  it("round-trips a validated payload with a fresh nonce", () => {
    const first = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Acuerdo compartido" },
      schema: payloadSchema,
    });
    const second = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Acuerdo compartido" },
      schema: payloadSchema,
    });

    expect(first.algorithm).toBe("aes-256-gcm");
    expect(first.iv).not.toBe(second.iv);
    expect(
      decryptDevelopmentPayload({
        associatedData,
        encrypted: first,
        schema: payloadSchema,
      }),
    ).toEqual({ summary: "Acuerdo compartido" });
  });

  it("binds ciphertext to its stable resource identity", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "No debe cruzar expedientes" },
      schema: payloadSchema,
    });

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData: {
            ...associatedData,
            resourceId: "507f1f77bcf86cd799439012",
          },
          encrypted,
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
  });

  it("canonicalizes an ObjectId before binding associated data", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData: {
        ...associatedData,
        resourceId: associatedData.resourceId.toUpperCase(),
      },
      payload: { summary: "Identidad estable" },
      schema: payloadSchema,
    });

    expect(
      decryptDevelopmentPayload({
        associatedData,
        encrypted,
        schema: payloadSchema,
      }),
    ).toEqual({ summary: "Identidad estable" });
  });

  it("detects ciphertext tampering", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Contenido protegido" },
      schema: payloadSchema,
    });
    const ciphertext = Buffer.from(encrypted.ciphertext, "base64");
    ciphertext[0] = (ciphertext[0] ?? 0) ^ 1;

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: { ...encrypted, ciphertext: ciphertext.toString("base64") },
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
  });

  it("rejects truncated or tampered authentication fields", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Contenido protegido" },
      schema: payloadSchema,
    });
    const authTag = Buffer.from(encrypted.authTag, "base64");
    authTag[0] = (authTag[0] ?? 0) ^ 1;

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: { ...encrypted, authTag: authTag.toString("base64") },
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: {
            ...encrypted,
            authTag: Buffer.from(encrypted.authTag, "base64")
              .subarray(0, 4)
              .toString("base64"),
          },
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: {
            ...encrypted,
            iv: Buffer.from(encrypted.iv, "base64").subarray(0, 8).toString("base64"),
          },
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
  });

  it("rejects the wrong key even when it has the expected version and length", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Registro" },
      schema: payloadSchema,
    });
    process.env.DEVELOPMENT_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 8).toString("base64");

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted,
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
  });

  it("decrypts an older key version after the active key rotates", () => {
    const encryptedWithV1 = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Registro histórico" },
      schema: payloadSchema,
    });
    process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION = "v2";
    process.env.DEVELOPMENT_ENCRYPTION_KEY_V2 = Buffer.alloc(32, 9).toString("base64");

    expect(
      decryptDevelopmentPayload({
        associatedData,
        encrypted: encryptedWithV1,
        schema: payloadSchema,
      }),
    ).toEqual({ summary: "Registro histórico" });
  });

  it("authenticates key-version metadata even when two versions share a key", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Registro" },
      schema: payloadSchema,
    });
    process.env.DEVELOPMENT_ENCRYPTION_KEY_V2 =
      process.env.DEVELOPMENT_ENCRYPTION_KEY_V1;

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: { ...encrypted, keyVersion: "v2" },
          schema: payloadSchema,
        }),
      "decryption_failed",
    );
  });

  it("fails closed when the stored key version is unavailable", () => {
    const encrypted = encryptDevelopmentPayload({
      associatedData,
      payload: { summary: "Registro" },
      schema: payloadSchema,
    });

    expectEncryptionCode(
      () =>
        decryptDevelopmentPayload({
          associatedData,
          encrypted: { ...encrypted, keyVersion: "v9" },
          schema: payloadSchema,
        }),
      "key_unavailable",
    );
  });

  it("does not require secrets until encryption or decryption is used", () => {
    delete process.env.DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION;
    delete process.env.DEVELOPMENT_ENCRYPTION_KEY_V1;

    expectEncryptionCode(
      () =>
        encryptDevelopmentPayload({
          associatedData,
          payload: { summary: "Registro" },
          schema: payloadSchema,
        }),
      "configuration_invalid",
    );
  });
});
