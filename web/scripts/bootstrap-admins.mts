import { z } from "zod";
import { getDatabase, getMongoClient } from "../src/lib/server/mongodb";
import {
  createInvitedPlatformUser,
  ensureAuthIndexes,
  findPlatformUserByEmail,
} from "../src/features/auth/server/platform-user-repository";
import { ensureAuthenticationSchema } from "../src/features/auth/server/auth-schema";
import { safelySendPlatformInvitation } from "../src/features/auth/server/invitation-service";
import { recordAuthAudit } from "../src/features/auth/server/auth-audit-repository";

if (!process.env.MONGODB_DB || process.argv[2] !== process.env.MONGODB_DB)
  throw new Error(
    "Pass the target database name as the first argument; it must match MONGODB_DB.",
  );
if (
  process.env.APP_ENVIRONMENT === "production" &&
  process.env.ALLOW_PRODUCTION_ADMIN_BOOTSTRAP !== "true"
)
  throw new Error(
    "Set ALLOW_PRODUCTION_ADMIN_BOOTSTRAP=true for the reviewed production bootstrap.",
  );
const identities = z
  .array(z.object({ email: z.email(), displayName: z.string().min(2).max(120) }))
  .min(1)
  .max(10)
  .parse(JSON.parse(process.env.BOOTSTRAP_ADMIN_IDENTITIES || "[]"));
try {
  await ensureAuthenticationSchema(await getDatabase());
  await ensureAuthIndexes();
  for (const identity of identities) {
    const existing = await findPlatformUserByEmail(identity.email);
    if (existing && existing.role !== "administrator")
      throw new Error("Refusing to promote an existing account through bootstrap.");
    if (existing?.status === "deactivated")
      throw new Error("Refusing to reactivate an account through bootstrap.");
    if (existing?.status === "active") {
      console.log("Administrator already active; skipped.");
      continue;
    }
    const account =
      existing ??
      (await createInvitedPlatformUser({ ...identity, role: "administrator" }));
    const sent = await safelySendPlatformInvitation({
      email: account.normalizedEmail,
      platformUserId: account.id,
    });
    await recordAuthAudit({
      action: sent ? "invitation_created" : "invitation_failed",
      actorAuthUserId: "system:bootstrap",
      actorPlatformUserId: null,
      targetPlatformUserId: account.id,
      metadata: { bootstrap: true },
    });
    if (!sent) throw new Error("Invitation delivery failed");
    console.log(
      "Administrator invitation sent. Complete email verification and MFA enrollment.",
    );
  }
} catch {
  console.error(
    "Administrator bootstrap failed. Check SMTP/database settings and account eligibility; no account is automatically promoted or reactivated.",
  );
  process.exitCode = 1;
} finally {
  await (await getMongoClient()).close();
}
