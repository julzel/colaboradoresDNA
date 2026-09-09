import "server-only";
import { ObjectId } from "mongodb";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

export async function updateManagedIdentityEmail(
  userId: string,
  platformUserId: string,
  email: string,
) {
  const database = await getDatabase();
  const session = (await getMongoClient()).startSession();
  try {
    await session.withTransaction(async () => {
      const result = await database
        .collection("auth_users")
        .updateOne(
          { _id: new ObjectId(userId) },
          { $set: { email, emailVerified: false, updatedAt: new Date() } },
          { session },
        );
      if (!result.matchedCount) throw new Error("Identity not found");
      const account = await database
        .collection("platform_users")
        .updateOne(
          { _id: new ObjectId(platformUserId), status: "active" },
          { $set: { normalizedEmail: email, updatedAt: new Date() } },
          { session },
        );
      if (!account.matchedCount) throw new Error("Account not editable");
      await database
        .collection("auth_sessions")
        .deleteMany({ userId: new ObjectId(userId) }, { session });
      // Reset tokens issued to the old mailbox must not control the new identity.
      await database
        .collection("auth_verifications")
        .deleteMany({ value: userId }, { session });
    });
  } finally {
    await session.endSession();
  }
}

export async function getIdentityImageUrls(userIds: string[]) {
  const ids = [...new Set(userIds)].filter((id) => ObjectId.isValid(id));
  if (!ids.length) return new Map<string, string>();
  const rows = await (
    await getDatabase()
  )
    .collection("auth_users")
    .find(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { projection: { image: 1 } },
    )
    .toArray();
  return new Map(
    rows.flatMap((row) =>
      typeof row.image === "string" ? [[row._id.toHexString(), row.image]] : [],
    ),
  );
}

export async function setIdentityImage(userId: string, bytes: Uint8Array | null) {
  const database = await getDatabase();
  const id = new ObjectId(userId);
  const image = bytes ? `/api/profile-images/${userId}?v=${Date.now()}` : null;
  if (bytes)
    await database
      .collection("auth_profile_images")
      .updateOne(
        { _id: id },
        { $set: { bytes: Buffer.from(bytes) } },
        { upsert: true },
      );
  else await database.collection("auth_profile_images").deleteOne({ _id: id });
  await database
    .collection("auth_users")
    .updateOne({ _id: id }, { $set: { image, updatedAt: new Date() } });
  return image;
}
