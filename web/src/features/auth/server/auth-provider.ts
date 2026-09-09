import "server-only";
import { headers } from "next/headers";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import { createAuthentication } from "./auth-factory";
import { sendAuthMail } from "./auth-email";

let instance: Promise<ReturnType<typeof createAuthentication>> | undefined;
export function getAuthentication() {
  instance ??= (async () => {
    const baseURL = process.env.APP_BASE_URL;
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!baseURL || !secret)
      throw new Error("Configure APP_BASE_URL and BETTER_AUTH_SECRET.");
    return createAuthentication({
      database: await getDatabase(),
      client: await getMongoClient(),
      baseURL,
      secret,
      sendMail: sendAuthMail,
    });
  })().catch((error: unknown) => {
    instance = undefined;
    throw error;
  });
  return instance;
}

export async function getIdentitySession() {
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")) return null;
  return (await getAuthentication()).api.getSession({ headers: requestHeaders });
}

export async function revokeIdentitySessions(userId: string) {
  const context = await (await getAuthentication()).$context;
  await context.internalAdapter.deleteUserSessions(userId);
}
