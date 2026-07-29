import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import {
  markPlatformUserInvitationFailed,
  setPlatformUserInvitation,
} from "@/features/auth/server/platform-user-repository";

const invitationExpirationDays = 14;

function getApplicationBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL;

  if (configuredUrl) {
    return z.string().url().parse(configuredUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error("APP_BASE_URL is required in production.");
}

export async function sendPlatformInvitation({
  email,
  platformUserId,
}: {
  email: string;
  platformUserId: string;
}) {
  const client = await clerkClient();
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    expiresInDays: invitationExpirationDays,
    ignoreExisting: true,
    redirectUrl: new URL("/sign-up", getApplicationBaseUrl()).toString(),
  });

  await setPlatformUserInvitation({
    clerkInvitationId: invitation.id,
    expiresAt: new Date(Date.now() + invitationExpirationDays * 24 * 60 * 60 * 1000),
    id: platformUserId,
  });

  return invitation;
}

export async function safelySendPlatformInvitation(
  input: Parameters<typeof sendPlatformInvitation>[0],
) {
  try {
    await sendPlatformInvitation(input);
    return true;
  } catch {
    await markPlatformUserInvitationFailed(input.platformUserId);
    return false;
  }
}
