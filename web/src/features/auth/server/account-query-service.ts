import "server-only";

import { listPlatformUsers } from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export async function getAccountAdministrationActor() {
  const { platformUser } = await requirePlatformUser({
    roles: ["administrator"],
  });

  return platformUser;
}

export async function listAccountsForAdministration() {
  await requirePlatformUser({ roles: ["administrator"] });
  return listPlatformUsers();
}
