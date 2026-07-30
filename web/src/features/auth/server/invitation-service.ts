import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { z } from "zod";

import {
  markPlatformUserInvitationFailed,
  setPlatformUserInvitation,
} from "@/features/auth/server/platform-user-repository";

const invitationExpirationDays = 14;

async function getApplicationBaseUrl() {
  const configuredUrl = process.env.APP_BASE_URL;

  if (configuredUrl) {
    return z.string().url().parse(configuredUrl);
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  const requestHeaders = await headers();
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const host = forwardedHost?.split(",")[0]?.trim();
  const protocol = forwardedProtocol?.split(",")[0]?.trim();

  if (host && protocol === "https") {
    const requestOrigin = new URL(`${protocol}://${host}`);

    if (requestOrigin.hostname.endsWith(".netlify.app")) {
      return requestOrigin.origin;
    }
  }

  throw new Error("APP_BASE_URL is required outside an HTTPS Netlify Deploy Preview.");
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
    redirectUrl: new URL("/sign-up", await getApplicationBaseUrl()).toString(),
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
