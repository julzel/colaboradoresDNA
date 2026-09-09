import { MongoClient } from "mongodb";
import { migrateLegacyAccounts } from "../src/features/auth/server/legacy-account-migration";

const args = process.argv.slice(2);
const target = args[0];
if (!target || target !== process.env.MONGODB_DB || !process.env.MONGODB_URI) {
  throw new Error("Pass the exact MONGODB_DB as the first argument. No changes made.");
}
if (
  args.slice(1).some((arg) => !["--apply", "--dry-run"].includes(arg)) ||
  (args.includes("--apply") && args.includes("--dry-run"))
) {
  throw new Error("Choose --dry-run (default) or --apply.");
}
const apply = args.includes("--apply");
if (
  apply &&
  process.env.APP_ENVIRONMENT === "production" &&
  process.env.ALLOW_PRODUCTION_AUTH_MIGRATION !== "true"
) {
  throw new Error(
    "Production migration requires ALLOW_PRODUCTION_AUTH_MIGRATION=true for this operation only.",
  );
}
const client = await new MongoClient(process.env.MONGODB_URI).connect();
try {
  const result = await migrateLegacyAccounts(client.db(target), client, apply);
  console.log(
    JSON.stringify({ database: target, mode: apply ? "apply" : "dry-run", ...result }),
  );
  if (apply)
    console.log(
      "Business IDs and records preserved. Bootstrap an administrator and resend reviewed invitations; no emails were sent by this migration.",
    );
} catch {
  console.error(
    "Authentication migration failed. Keep traffic paused and inspect database permissions/validation before retrying.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
