import { MongoClient } from "mongodb";

const [targetDatabase, preservedEmail, confirmation] = process.argv.slice(2);
const expectedConfirmation = `DELETE_ALL_EXCEPT:${preservedEmail}`;

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  throw new Error("MONGODB_URI and MONGODB_DB are required.");
}
if (!targetDatabase || targetDatabase !== process.env.MONGODB_DB) {
  throw new Error("The target database must exactly match MONGODB_DB.");
}
if (!preservedEmail || confirmation !== expectedConfirmation) {
  throw new Error(`Pass the exact confirmation: ${expectedConfirmation}`);
}

const normalizedEmail = preservedEmail.trim().toLowerCase();
const client = await MongoClient.connect(process.env.MONGODB_URI);

try {
  const database = client.db(targetDatabase);
  const authUser = await database.collection("auth_users").findOne({
    email: normalizedEmail,
  });
  const platformUser = await database.collection("platform_users").findOne({
    normalizedEmail,
  });

  if (!authUser || !platformUser) {
    throw new Error("The preserved identity was not found in both identity stores.");
  }
  if (
    platformUser.role !== "administrator" ||
    platformUser.status !== "active" ||
    platformUser.authUserId !== authUser._id.toString()
  ) {
    throw new Error("The preserved identity is not a linked, active administrator.");
  }

  const timestamp = new Date().toISOString().replaceAll(/[-:.TZ]/g, "");
  const backupDatabaseName = `cdna_backup_${timestamp}`;
  const backupDatabase = client.db(backupDatabaseName);
  const existingBackupCollections = await backupDatabase
    .listCollections({}, { nameOnly: true })
    .toArray();
  if (existingBackupCollections.length > 0) {
    throw new Error("Refusing to overwrite a non-empty backup database.");
  }

  const collections = await database.listCollections({}, { nameOnly: true }).toArray();
  for (const { name } of collections) {
    const documents = await database.collection(name).find({}).toArray();
    if (documents.length > 0) {
      await backupDatabase.collection(name).insertMany(documents, { ordered: true });
    } else {
      await backupDatabase.createCollection(name);
    }
  }
  await backupDatabase.collection("_pilot_backup_metadata").insertOne({
    sourceDatabase: targetDatabase,
    preservedEmail: normalizedEmail,
    createdAt: new Date(),
    collectionCount: collections.length,
  });

  const authIdentityIds = [authUser._id, authUser._id.toString()];
  const preservationFilters = new Map([
    ["auth_users", { _id: authUser._id }],
    ["auth_accounts", { userId: { $in: authIdentityIds } }],
    ["auth_sessions", { userId: { $in: authIdentityIds } }],
    ["auth_two_factors", { userId: { $in: authIdentityIds } }],
    ["auth_profile_images", { _id: { $in: authIdentityIds } }],
    ["platform_users", { _id: platformUser._id }],
  ]);

  const session = client.startSession();
  const deletedCounts = {};
  try {
    await session.withTransaction(async () => {
      for (const { name } of collections) {
        const preservationFilter = preservationFilters.get(name);
        const deletionFilter = preservationFilter
          ? { $nor: [preservationFilter] }
          : {};
        const result = await database
          .collection(name)
          .deleteMany(deletionFilter, { session });
        deletedCounts[name] = result.deletedCount;
      }
    });
  } finally {
    await session.endSession();
  }

  const remainingCounts = {};
  for (const { name } of collections) {
    const count = await database.collection(name).countDocuments();
    if (count > 0) remainingCounts[name] = count;
  }

  console.log(
    JSON.stringify(
      {
        backupDatabase: backupDatabaseName,
        deletedCounts,
        preservedAdministrator: normalizedEmail,
        remainingCounts,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
