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
    key: { clerkUserId: 1 },
    name: "platform_users_clerk_user_id_unique",
    partialFilterExpression: { clerkUserId: { $type: "string" } },
    unique: true,
  },
  {
    key: { "invitation.clerkInvitationId": 1 },
    name: "platform_users_invitation_id_unique",
    partialFilterExpression: {
      "invitation.clerkInvitationId": { $type: "string" },
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
    })();
  }

  return globalThis.authIndexesPromise;
}

export async function findPlatformUserByClerkId(
  clerkUserId: string,
): Promise<PlatformUser | null> {
  await ensureAuthIndexes();
  const collection = await getPlatformUsersCollection();
  const document = await collection.findOne({ clerkUserId });

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

export async function claimInvitedPlatformUser({
  clerkUserId,
  verifiedEmails,
}: {
  clerkUserId: string;
  verifiedEmails: readonly string[];
}): Promise<PlatformUser | null> {
  const existing = await findPlatformUserByClerkId(clerkUserId);

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
    status: { $in: ["invited", "active"] },
    $or: [{ clerkUserId: null }, { clerkUserId: { $exists: false } }],
  };

  const document = await collection.findOneAndUpdate(
    claimableUser,
    {
      $set: {
        activatedAt: now,
        clerkSyncStatus: "synced",
        clerkUserId,
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
    clerkSyncStatus: "synced",
    clerkUserId: null,
    createdAt: now,
    deactivatedAt: null,
    displayName,
    invitation: {
      clerkInvitationId: null,
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

export async function setPlatformUserInvitation({
  clerkInvitationId,
  expiresAt,
  id,
}: {
  clerkInvitationId: string;
  expiresAt: Date;
  id: string;
}) {
  const collection = await getPlatformUsersCollection();
  const now = new Date();

  await collection.updateOne(
    { _id: new ObjectId(id), status: "invited" },
    {
      $set: {
        "invitation.clerkInvitationId": clerkInvitationId,
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
        clerkSyncStatus: "pending_deactivation",
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
        clerkSyncStatus: "synced",
        deactivatedAt: null,
        status,
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return document ? toPlatformUser(document) : null;
}

export async function setPlatformUserClerkSyncStatus({
  id,
  status,
}: {
  id: string;
  status: PlatformUserDocument["clerkSyncStatus"];
}) {
  const collection = await getPlatformUsersCollection();

  await collection.updateOne(
    { _id: new ObjectId(id) },
    { $set: { clerkSyncStatus: status, updatedAt: new Date() } },
  );
}
