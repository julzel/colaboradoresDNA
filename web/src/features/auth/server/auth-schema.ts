import type { Db } from "mongodb";

export async function ensureAuthenticationSchema(database: Db) {
  await database.collection("auth_users").createIndex({ email: 1 }, { unique: true });
  await database
    .collection("auth_sessions")
    .createIndex({ token: 1 }, { unique: true });
  await database.collection("auth_sessions").createIndex({ userId: 1 });
  await database
    .collection("auth_sessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database.collection("auth_accounts").createIndex({ userId: 1 });
  await database
    .collection("auth_accounts")
    .createIndex({ providerId: 1, accountId: 1 }, { unique: true });
  await database
    .collection("auth_verifications")
    .createIndex({ identifier: 1 }, { unique: true });
  await database
    .collection("auth_verifications")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database
    .collection("auth_two_factors")
    .createIndex({ userId: 1 }, { unique: true });
  await database
    .collection("auth_rate_limits")
    .createIndex({ key: 1 }, { unique: true });
}
