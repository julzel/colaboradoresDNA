import "server-only";

import { getStackStatus } from "@/features/system/lib/get-stack-status";

export function getSystemReadiness() {
  return {
    ...getStackStatus(process.env.NODE_ENV, process.env.MONGODB_URI),
    checkedAt: new Date().toISOString(),
  };
}
