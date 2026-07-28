"use server";

import { getStackStatus } from "@/features/system/lib/get-stack-status";

export async function getReadiness() {
  return {
    ...getStackStatus(process.env.NODE_ENV, process.env.MONGODB_URI),
    checkedAt: new Date().toISOString(),
  };
}
