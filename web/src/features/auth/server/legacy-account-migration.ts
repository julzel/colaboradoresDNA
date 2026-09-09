import type { Db, MongoClient } from "mongodb";

/** Offline cutover only. Keep legacy identifiers and append a migration event;
 * never rewrite historical audit rows or business foreign keys. */
export async function migrateLegacyAccounts(
  database: Db,
  client: MongoClient,
  apply = false,
) {
  const filter = {
    authMigratedAt: { $exists: false },
    $and: [
      {
        $or: [
          { authUserId: { $exists: false } },
          { authUserId: null },
          { authUserId: { $not: /^[a-f\d]{24}$/i } },
        ],
      },
      {
        $or: [
          { clerkUserId: { $exists: true } },
          { clerkSyncStatus: { $exists: true } },
        ],
      },
    ],
  };
  const users = database.collection("platform_users");
  const candidates = await users.countDocuments(filter);
  const deactivated = await users.countDocuments({ ...filter, status: "deactivated" });
  if (!apply) return { candidates, deactivated, migrated: 0 };
  const session = client.startSession();
  let migrated = 0;
  try {
    await session.withTransaction(async () => {
      const now = new Date();
      const result = await users.updateMany(
        filter,
        [
          {
            $set: {
              authUserId: null,
              authSyncStatus: "synced",
              status: {
                $cond: [{ $eq: ["$status", "deactivated"] }, "deactivated", "invited"],
              },
              "invitation.invitationId": null,
              "invitation.status": "pending",
              "invitation.expiresAt": null,
              "invitation.lastSentAt": null,
              authMigratedAt: now,
              updatedAt: now,
            },
          },
        ],
        { session },
      );
      migrated = result.modifiedCount;
      if (migrated)
        await database.collection("auth_migrations").insertOne(
          {
            migration: "clerk-to-better-auth-v1",
            createdAt: now,
            migrated,
          },
          { session },
        );
    });
    return { candidates, deactivated, migrated };
  } finally {
    await session.endSession();
  }
}
