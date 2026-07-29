import { createClerkClient } from "@clerk/backend";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import { z } from "zod";

const environmentSchema = z.object({
  ALLOW_PRODUCTION_ADMIN_BOOTSTRAP: z.string().optional(),
  APP_BASE_URL: z.string().url(),
  BOOTSTRAP_ADMIN_IDENTITIES: z.string().min(1),
  BOOTSTRAP_ENVIRONMENT: z.enum(["development", "preview", "production"]),
  CLERK_SECRET_KEY: z.string().min(1),
  MONGODB_DB: z.string().min(1),
  MONGODB_URI: z.string().url().startsWith("mongodb"),
});

const bootstrapIdentitiesSchema = z
  .array(
    z.object({
      displayName: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(254),
    }),
  )
  .min(1)
  .max(10);

const invitationExpirationDays = 14;

class BootstrapError extends Error {
  constructor(code) {
    super(code);
    this.name = "BootstrapError";
    this.code = code;
  }
}

function normalizeEmail(email) {
  return email.trim().toLocaleLowerCase("en-US");
}

function readConfiguration() {
  const environmentResult = environmentSchema.safeParse(process.env);

  if (!environmentResult.success) {
    const fields = [
      ...new Set(
        environmentResult.error.issues
          .map((issue) => issue.path[0])
          .filter((field) => typeof field === "string"),
      ),
    ];
    throw new BootstrapError(`invalid_configuration:${fields.join(",")}`);
  }

  const environment = environmentResult.data;
  let rawIdentities;

  try {
    rawIdentities = JSON.parse(environment.BOOTSTRAP_ADMIN_IDENTITIES);
  } catch {
    throw new BootstrapError("invalid_bootstrap_identities_json");
  }

  const identitiesResult = bootstrapIdentitiesSchema.safeParse(rawIdentities);

  if (!identitiesResult.success) {
    throw new BootstrapError("invalid_bootstrap_identities");
  }

  const identities = identitiesResult.data;

  if (
    environment.BOOTSTRAP_ENVIRONMENT === "production" &&
    environment.ALLOW_PRODUCTION_ADMIN_BOOTSTRAP !== "true"
  ) {
    throw new BootstrapError("production_approval_required");
  }

  return { environment, identities };
}

async function ensureIndexes(users, audit) {
  await Promise.all([
    users.createIndex(
      { normalizedEmail: 1 },
      { name: "platform_users_normalized_email_unique", unique: true },
    ),
    users.createIndex(
      { clerkUserId: 1 },
      {
        name: "platform_users_clerk_user_id_unique",
        partialFilterExpression: { clerkUserId: { $type: "string" } },
        unique: true,
      },
    ),
    audit.createIndex(
      { targetPlatformUserId: 1, createdAt: -1 },
      { name: "auth_audit_target_timeline" },
    ),
  ]);
}

async function findExactClerkUser(clerk, normalizedEmail) {
  const response = await clerk.users.getUserList({
    emailAddress: [normalizedEmail],
    limit: 2,
  });

  return (
    response.data.find((user) =>
      user.emailAddresses.some(
        (email) => normalizeEmail(email.emailAddress) === normalizedEmail,
      ),
    ) ?? null
  );
}

async function recordBootstrapAudit(audit, action, targetPlatformUserId) {
  await audit.insertOne({
    _id: new ObjectId(),
    action,
    actorClerkUserId: "bootstrap",
    actorPlatformUserId: null,
    createdAt: new Date(),
    metadata: {},
    targetPlatformUserId,
  });
}

async function linkExistingIdentity({
  audit,
  clerkUser,
  displayName,
  normalizedEmail,
  users,
}) {
  const existing = await users.findOne({ normalizedEmail });

  if (existing?.status === "deactivated") {
    throw new Error("A deactivated account cannot be bootstrapped.");
  }

  if (existing && existing.role !== "administrator") {
    throw new Error("Bootstrap cannot silently promote an existing account.");
  }

  if (existing?.clerkUserId && existing.clerkUserId !== clerkUser.id) {
    throw new Error("The email is already linked to another Clerk identity.");
  }

  const now = new Date();
  let targetPlatformUserId;

  if (existing) {
    await users.updateOne(
      { _id: existing._id },
      {
        $set: {
          activatedAt: existing.activatedAt ?? now,
          clerkSyncStatus: "synced",
          clerkUserId: clerkUser.id,
          deactivatedAt: null,
          displayName,
          "invitation.status": "accepted",
          role: "administrator",
          status: "active",
          updatedAt: now,
        },
      },
    );
    targetPlatformUserId = existing._id;
  } else {
    const document = {
      _id: new ObjectId(),
      activatedAt: now,
      clerkSyncStatus: "synced",
      clerkUserId: clerkUser.id,
      createdAt: now,
      deactivatedAt: null,
      displayName,
      invitation: {
        clerkInvitationId: null,
        expiresAt: null,
        lastSentAt: null,
        status: "accepted",
      },
      normalizedEmail,
      role: "administrator",
      status: "active",
      updatedAt: now,
    };
    await users.insertOne(document);
    targetPlatformUserId = document._id;
  }

  await recordBootstrapAudit(audit, "bootstrap_admin_linked", targetPlatformUserId);
  return "linked";
}

async function inviteBootstrapIdentity({
  appBaseUrl,
  audit,
  clerk,
  displayName,
  normalizedEmail,
  users,
}) {
  const existing = await users.findOne({ normalizedEmail });

  if (existing?.status === "deactivated") {
    throw new Error("A deactivated account cannot be bootstrapped.");
  }

  if (existing && existing.role !== "administrator") {
    throw new Error("Bootstrap cannot silently promote an existing account.");
  }

  const now = new Date();
  const invitationStillValid =
    existing?.status === "invited" &&
    existing.invitation?.status === "pending" &&
    existing.invitation.expiresAt instanceof Date &&
    existing.invitation.expiresAt.getTime() > now.getTime();

  if (invitationStillValid) {
    return "unchanged";
  }

  const target = await users.findOneAndUpdate(
    { normalizedEmail },
    {
      $set: {
        activatedAt: null,
        clerkSyncStatus: "synced",
        clerkUserId: null,
        deactivatedAt: null,
        displayName,
        invitation: {
          clerkInvitationId: null,
          expiresAt: null,
          lastSentAt: null,
          status: "pending",
        },
        role: "administrator",
        status: "invited",
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { returnDocument: "after", upsert: true },
  );

  if (existing?.invitation?.clerkInvitationId) {
    try {
      await clerk.invitations.revokeInvitation(existing.invitation.clerkInvitationId);
    } catch {
      // Expired or already revoked invitations are intentionally replaced.
    }
  }

  const invitation = await clerk.invitations.createInvitation({
    emailAddress: normalizedEmail,
    expiresInDays: invitationExpirationDays,
    ignoreExisting: true,
    redirectUrl: new URL("/sign-up", appBaseUrl).toString(),
  });
  const expiresAt = new Date(
    now.getTime() + invitationExpirationDays * 24 * 60 * 60 * 1000,
  );

  await users.updateOne(
    { _id: target._id },
    {
      $set: {
        "invitation.clerkInvitationId": invitation.id,
        "invitation.expiresAt": expiresAt,
        "invitation.lastSentAt": now,
        updatedAt: now,
      },
    },
  );
  await recordBootstrapAudit(audit, "bootstrap_admin_invited", target._id);

  return "invited";
}

async function main() {
  const { environment, identities } = readConfiguration();
  const mongo = new MongoClient(environment.MONGODB_URI, {
    serverApi: {
      deprecationErrors: true,
      strict: true,
      version: ServerApiVersion.v1,
    },
  });
  const clerk = createClerkClient({
    secretKey: environment.CLERK_SECRET_KEY,
  });
  const counts = { invited: 0, linked: 0, unchanged: 0 };

  try {
    await mongo.connect();
    const database = mongo.db(environment.MONGODB_DB);
    const users = database.collection("platform_users");
    const audit = database.collection("auth_audit");
    await ensureIndexes(users, audit);

    for (const identity of identities) {
      const normalizedEmail = normalizeEmail(identity.email);
      const clerkUser = await findExactClerkUser(clerk, normalizedEmail);
      const result = clerkUser
        ? await linkExistingIdentity({
            audit,
            clerkUser,
            displayName: identity.displayName,
            normalizedEmail,
            users,
          })
        : await inviteBootstrapIdentity({
            appBaseUrl: environment.APP_BASE_URL,
            audit,
            clerk,
            displayName: identity.displayName,
            normalizedEmail,
            users,
          });

      counts[result] += 1;
    }

    console.info(
      `Bootstrap completed: ${counts.linked} linked, ${counts.invited} invited, ${counts.unchanged} unchanged.`,
    );
  } finally {
    await mongo.close();
  }
}

main().catch((error) => {
  const safeReason =
    error instanceof BootstrapError
      ? error.code
      : "provider_connectivity_or_account_policy";

  console.error(`Bootstrap failed safely (${safeReason}).`);
  process.exitCode = 1;
});
