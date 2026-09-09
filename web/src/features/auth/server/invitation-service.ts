import "server-only";
import { randomBytes } from "node:crypto";
import { invitationDigest } from "./auth-factory";
import { sendAuthMail } from "./auth-email";
import {
  markPlatformUserInvitationFailed,
  setPlatformUserInvitation,
} from "./platform-user-repository";

export async function sendPlatformInvitation({
  email,
  platformUserId,
}: {
  email: string;
  platformUserId: string;
}) {
  if (!process.env.APP_BASE_URL) throw new Error("APP_BASE_URL is required.");
  const token = randomBytes(32).toString("base64url");
  const url = new URL("/sign-up", process.env.APP_BASE_URL);
  url.searchParams.set("invitation", token);
  url.searchParams.set("email", email);
  const id = invitationDigest(token);
  await setPlatformUserInvitation({
    invitationId: id,
    expiresAt: new Date(Date.now() + 14 * 86400000),
    id: platformUserId,
  });
  await sendAuthMail({
    to: email,
    subject: "Tu invitación · Colaboradores DNA",
    text: `Te invitaron al espacio de Colaboradores DNA. Este enlace vence en 14 días:\n${url}\nDespués de registrarte, verificá tu correo para activar tu acceso.`,
  });
  return { id };
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
