import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { z } from "zod";

import {
  developmentObjectIdSchema,
  type DevelopmentEncryptedPayload,
} from "@/features/development/domain/shared";

const algorithm = "aes-256-gcm" as const;
const activeKeyVersionEnvironmentName = "DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION";

const keyVersionSchema = z
  .string()
  .trim()
  .regex(/^[a-z\d][a-z\d_]{0,31}$/);

const base64Schema = z
  .string()
  .min(4)
  .max(131_072)
  .regex(/^[A-Za-z\d+/]+={0,2}$/)
  .refine(
    (value) => Buffer.from(value, "base64").toString("base64") === value,
    "The encrypted envelope is not canonical base64.",
  );

function fixedLengthBase64Schema(byteLength: number) {
  return base64Schema.refine(
    (value) => Buffer.from(value, "base64").length === byteLength,
    `The encrypted envelope field must contain ${byteLength} bytes.`,
  );
}

export const developmentEncryptionResourceTypeSchema = z.enum([
  "development_goal",
  "development_goal_update",
  "one_on_one",
  "one_on_one_amendment",
  "one_on_one_void",
  "skill_assessment",
  "skill_assessment_history",
]);

export type DevelopmentEncryptionResourceType = z.infer<
  typeof developmentEncryptionResourceTypeSchema
>;

export const developmentEncryptionAssociatedDataSchema = z
  .object({
    resourceId: developmentObjectIdSchema.transform((value) => value.toLowerCase()),
    resourceType: developmentEncryptionResourceTypeSchema,
  })
  .strict();

export type DevelopmentEncryptionAssociatedData = z.output<
  typeof developmentEncryptionAssociatedDataSchema
>;

export const developmentEncryptedPayloadSchema: z.ZodType<DevelopmentEncryptedPayload> =
  z
    .object({
      algorithm: z.literal("aes-256-gcm"),
      authTag: fixedLengthBase64Schema(16),
      ciphertext: base64Schema,
      iv: fixedLengthBase64Schema(12),
      keyVersion: keyVersionSchema,
    })
    .strict();

export class DevelopmentEncryptionError extends Error {
  constructor(
    public readonly code:
      | "configuration_invalid"
      | "decryption_failed"
      | "key_unavailable"
      | "payload_invalid",
  ) {
    super(code);
    this.name = "DevelopmentEncryptionError";
  }
}

function getActiveKeyVersion() {
  const result = keyVersionSchema.safeParse(
    process.env[activeKeyVersionEnvironmentName],
  );

  if (!result.success) {
    throw new DevelopmentEncryptionError("configuration_invalid");
  }

  return result.data;
}

function getKeyEnvironmentName(keyVersion: string) {
  return `DEVELOPMENT_ENCRYPTION_KEY_${keyVersion.toUpperCase()}`;
}

function decodeVersionedKey(keyVersion: string) {
  const parsedVersion = keyVersionSchema.safeParse(keyVersion);
  if (!parsedVersion.success) {
    throw new DevelopmentEncryptionError("key_unavailable");
  }

  const encodedKey = process.env[getKeyEnvironmentName(parsedVersion.data)]?.trim();
  if (!encodedKey) {
    throw new DevelopmentEncryptionError("key_unavailable");
  }

  const key = Buffer.from(encodedKey, "base64");
  const normalizedInput = encodedKey.replace(/=+$/u, "");
  const canonicalEncoding = key.toString("base64").replace(/=+$/u, "");

  if (key.length !== 32 || canonicalEncoding !== normalizedInput) {
    throw new DevelopmentEncryptionError("configuration_invalid");
  }

  return key;
}

function serializeAssociatedData(
  associatedData: DevelopmentEncryptionAssociatedData,
  keyVersion: string,
) {
  const parsed = developmentEncryptionAssociatedDataSchema.parse(associatedData);
  const parsedKeyVersion = keyVersionSchema.parse(keyVersion);

  // This order is part of the persisted encryption contract. Do not replace it
  // with arbitrary object serialization during future key rotations.
  return Buffer.from(
    JSON.stringify([
      "development",
      parsed.resourceType,
      parsed.resourceId,
      parsedKeyVersion,
    ]),
    "utf8",
  );
}

export function encryptDevelopmentPayload<T>({
  associatedData,
  payload,
  schema,
}: {
  associatedData: DevelopmentEncryptionAssociatedData;
  payload: T;
  schema: z.ZodType<T>;
}): DevelopmentEncryptedPayload {
  const validatedPayload = schema.parse(payload);
  const serialized = JSON.stringify(validatedPayload);
  if (serialized === undefined) {
    throw new DevelopmentEncryptionError("payload_invalid");
  }

  const keyVersion = getActiveKeyVersion();
  const key = decodeVersionedKey(keyVersion);
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, key, iv);
  cipher.setAAD(serializeAssociatedData(associatedData, keyVersion));
  const ciphertext = Buffer.concat([cipher.update(serialized, "utf8"), cipher.final()]);

  return {
    algorithm,
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    keyVersion,
  };
}

export function decryptDevelopmentPayload<T>({
  associatedData,
  encrypted,
  schema,
}: {
  associatedData: DevelopmentEncryptionAssociatedData;
  encrypted: DevelopmentEncryptedPayload;
  schema: z.ZodType<T>;
}): T {
  const envelope = developmentEncryptedPayloadSchema.safeParse(encrypted);
  if (!envelope.success) {
    throw new DevelopmentEncryptionError("decryption_failed");
  }

  const key = decodeVersionedKey(envelope.data.keyVersion);

  try {
    const decipher = createDecipheriv(
      algorithm,
      key,
      Buffer.from(envelope.data.iv, "base64"),
    );
    decipher.setAAD(serializeAssociatedData(associatedData, envelope.data.keyVersion));
    decipher.setAuthTag(Buffer.from(envelope.data.authTag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(envelope.data.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const parsed: unknown = JSON.parse(plaintext);
    const validated = schema.safeParse(parsed);

    if (!validated.success) {
      throw new DevelopmentEncryptionError("payload_invalid");
    }

    return validated.data;
  } catch (error: unknown) {
    if (
      error instanceof DevelopmentEncryptionError &&
      error.code === "payload_invalid"
    ) {
      throw error;
    }

    throw new DevelopmentEncryptionError("decryption_failed");
  }
}
