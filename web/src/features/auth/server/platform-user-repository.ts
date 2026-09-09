import "server-only";

import {
  ObjectId,
  type ClientSession,
  type Collection,
  type Filter,
  type IndexDescription,
} from "mongodb";

import {
  normalizeEmail,
  toPlatformUser,
  type PlatformRole,
  type PlatformUser,
  type PlatformUserDocument,
} from "@/features/auth/domain/platform-user";
import { getDatabase } from "@/lib/server/mongodb";

const collectionName = "platform_users";

const indexes: IndexDescription[] = [
  {
    key: { normalizedEmail: 1 },
    name: "platform_users_normalized_email_unique",
    unique: true,
  },
  {
    key: { authUserId: 1 },
    name: "platform_users_auth_user_id_unique",
    partialFilterExpression: { authUserId: { $type: "string" } },
    unique: true,
  },
  {
    key: { "invitation.invitationId": 1 },
    name: "platform_users_auth_invitation_id_unique",
    partialFilterExpression: {
      "invitation.invitationId": { $type: "string" },
    },
    unique: true,
  },
  {
    key: { status: 1, role: 1, displayName: 1 },
    name: "platform_users_directory",
  },
];

declare global {
  var authIndexesPromise: Promise<void> | undefined;
}

async function getPlatformUsersCollection(): Promise<Collection<PlatformUserDocument>> {
  const database = await getDatabase();
  return database.collection<PlatformUserDocument>(collectionName);
}

export async function ensureAuthIndexes() {
  if (!globalThis.authIndexesPromise) {
    globalThis.authIndexesPromise = (async () => {
      const collection = await getPlatformUsersCollection();
      await Promise.all(
        indexes.map((index) => collection.createIndex(index.key, index)),
      );
    })().catch((error: unknown) => {
      globalThis.authIndexesPromise = undefined;
      throw error;
    });
  }

  return globalThis.authIndexesPromise;
}

export async function findPlatformUserByAuthId(
  authUserId: string,
): Promise<PlatformUser | null> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOne({ authUserId });

  return document ? toPlatformUser(document) : null;
}

export async function findPlatformUserByEmail(
  email: string,
): Promise<PlatformUser | null> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOne({
    normalizedEmail: normalizeEmail(email),
  });

  return document ? toPlatformUser(document) : null;
}

export async function findPlatformUserById(id: string): Promise<PlatformUser | null> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOne({ _id: new ObjectId(id) });

  return document ? toPlatformUser(document) : null;
}

export async function listPlatformUserDisplayNamesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, string>();
  const collection = await getPlatformUsersCollection();
  const users = await collection
    .find(
      { _id: { $in: [...new Set(ids)].map((id) => new ObjectId(id)) } },
      { projection: { _id: 1, displayName: 1 } },
    )
    .toArray();
  return new Map(users.map((user) => [user._id.toHexString(), user.displayName]));
}

export async function claimInvitedPlatformUser({
  authUserId,
  verifiedEmails,
}: {
  authUserId: string;
  verifiedEmails: readonly string[];
}): Promise<PlatformUser | null> {
  const existing = await findPlatformUserByAuthId(authUserId);

  if (existing) {
    return existing;
  }

  const normalizedEmails = [...new Set(verifiedEmails.map(normalizeEmail))];

  if (normalizedEmails.length === 0) {
    return null;
  }

  const collection = await getPlatformUsersCollection();
  const now = new Date();
  const claimableUser: Filter<PlatformUserDocument> = {
    normalizedEmail: { $in: normalizedEmails },
    status: "invited",
    "invitation.expiresAt": { $gt: now },
    "invitation.status": "pending",
    $or: [{ authUserId: null }, { authUserId: { $exists: false } }],
  };

  const document = await collection.findOneAndUpdate(
    claimableUser,
    {
      $set: {
        activatedAt: now,
        authSyncStatus: "synced",
        authUserId,
        "invitation.status": "accepted",
        status: "active",
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function createInvitedPlatformUser(
  {
    displayName,
    email,
    role,
  }: {
    displayName: string;
    email: string;
    role: PlatformRole;
  },
  { session }: { session?: ClientSession } = {},
): Promise<PlatformUser> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const now = new Date();
  const document: PlatformUserDocument = {
    _id: new ObjectId(),
    activatedAt: null,
    authSyncStatus: "synced",
    authUserId: null,
    createdAt: now,
    deactivatedAt: null,
    displayName,
    invitation: {
      invitationId: null,
      expiresAt: null,
      lastSentAt: null,
      status: "pending",
    },
    normalizedEmail: normalizeEmail(email),
    role,
    status: "invited",
    updatedAt: now,
  };

  await collection.insertOne(document, session ? { session } : undefined);
  return toPlatformUser(document);
}

export async function updatePlatformUserRole({
  id,
  role,
}: {
  id: string;
  role: PlatformRole;
}) {
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: { $ne: "deactivated" } },
    { $set: { role, updatedAt: new Date() } },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function updatePlatformUserEmail({
  email,
  id,
}: {
  email: string;
  id: string;
}) {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: { $in: ["active", "invited"] } },
    {
      $set: {
        normalizedEmail: normalizeEmail(email),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function setPlatformUserInvitation({
  invitationId,
  expiresAt,
  id,
}: {
  invitationId: string;
  expiresAt: Date;
  id: string;
}) {
  const collection = await getPlatformUsersCollection();
  const now = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id), status: "invited" },
    {
      $set: {
        "invitation.invitationId": invitationId,
        "invitation.expiresAt": expiresAt,
        "invitation.lastSentAt": now,
        "invitation.status": "pending",
        updatedAt: now,
      },
    },
  );
}

export async function markPlatformUserInvitationFailed(id: string) {
  const collection = await getPlatformUsersCollection();

  await collection.updateOne(
    { _id: new ObjectId(id), status: "invited" },
    {
      $set: {
        "invitation.status": "failed",
        updatedAt: new Date(),
      },
    },
  );
}

export async function listPlatformUsers(): Promise<PlatformUser[]> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const documents = await collection
    .find({})
    .sort({ status: 1, displayName: 1 })
    .toArray();

  return documents.map(toPlatformUser);
}

export async function deactivatePlatformUserRecord(id: string) {
  const collection = await getPlatformUsersCollection();
  const now = new Date();
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: { $ne: "deactivated" } },
    {
      $set: {
        authSyncStatus: "pending_deactivation",
        deactivatedAt: now,
        status: "deactivated",
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function reactivatePlatformUserRecord({
  id,
  status,
}: {
  id: string;
  status: "active" | "invited";
}) {
  const collection = await getPlatformUsersCollection();
  const now = new Date();
  const document = await collection.findOneAndUpdate(
    { _id: new ObjectId(id), status: "deactivated" },
    {
      $set: {
        authSyncStatus: "synced",
        deactivatedAt: null,
        status,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function setPlatformUserAuthSyncStatus({
  id,
  status,
}: {
  id: string;
  status: PlatformUserDocument["authSyncStatus"];
}) {
  const collection = await getPlatformUsersCollection();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { authSyncStatus: status, updatedAt: new Date() } },
  );
}
