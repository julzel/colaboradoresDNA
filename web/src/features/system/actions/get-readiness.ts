"use server";

import { getSystemReadiness } from "@/features/system/server/readiness-service";

export async function getReadiness() {
  return getSystemReadiness();
}
