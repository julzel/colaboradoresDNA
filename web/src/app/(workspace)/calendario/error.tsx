"use client";

import { WorkspaceError } from "@/components/layout/workspace-error/workspace-error";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <WorkspaceError reset={reset} />;
}
