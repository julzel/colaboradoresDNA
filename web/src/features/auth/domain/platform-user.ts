import type { ObjectId } from "mongodb";
import { z } from "zod";

export const platformRoleSchema = z.enum([
  "administrator",
  "supervisor",
  "collaborator",
]);

export const platformUserStatusSchema = z.enum(["invited", "active", "deactivated"]);

export const invitationStatusSchema = z.enum(["pending", "accepted", "failed"]);

export type PlatformRole = z.infer<typeof platformRoleSchema>;
export type PlatformUserStatus = z.infer<typeof platformUserStatusSchema>;
export type InvitationStatus = z.infer<typeof invitationStatusSchema>;

export type PlatformUserDocument = {
  _id: ObjectId;
  activatedAt: Date | null;
  clerkSyncStatus: "synced" | "pending_deactivation" | "pending_reactivation";
  clerkUserId: string | null;
  createdAt: Date;
  deactivatedAt: Date | null;
  displayName: string;
  invitation: {
    clerkInvitationId: string | null;
    expiresAt: Date | null;
    lastSentAt: Date | null;
    status: InvitationStatus;
  };
  normalizedEmail: string;
  role: PlatformRole;
  status: PlatformUserStatus;
  updatedAt: Date;
};

export type PlatformUser = Omit<PlatformUserDocument, "_id"> & {
  id: string;
};

export const invitePlatformUserSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  role: platformRoleSchema,
});

export const platformUserIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("en-US");
}

export function requiresMfa(role: PlatformRole) {
  return role === "administrator" || role === "supervisor";
}

export function toPlatformUser(document: PlatformUserDocument): PlatformUser {
  const { _id, ...user } = document;

  return {
    ...user,
    id: _id.toHexString(),
  };
}
