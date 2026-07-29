"use client";

import { WorkspaceError } from "@/components/layout/workspace-error/workspace-error";

export default function EmployeeManagementError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <WorkspaceError reset={reset} />;
}
