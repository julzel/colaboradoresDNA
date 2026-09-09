import { getDatabase, getMongoClient } from "../src/lib/server/mongodb";
import { ensureAuthenticationSchema } from "../src/features/auth/server/auth-schema";
import { ensureAuthIndexes } from "../src/features/auth/server/platform-user-repository";

if (!process.env.MONGODB_DB || process.argv[2] !== process.env.MONGODB_DB) {
  throw new Error(
    "Pass the target database name as the first argument; it must match MONGODB_DB.",
  );
}
try {
  await ensureAuthenticationSchema(await getDatabase());
  await ensureAuthIndexes();
  console.log("Authentication indexes ready.");
} catch {
  console.error(
    "Authentication bootstrap failed. Verify target database access and index compatibility.",
  );
  process.exitCode = 1;
} finally {
  await (await getMongoClient()).close();
}
