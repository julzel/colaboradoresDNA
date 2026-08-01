import "server-only";

import type { IndexDescription } from "mongodb";

import { getDatabase } from "@/lib/server/mongodb";

const ptoIndexes: Readonly<Record<string, readonly IndexDescription[]>> = {
  pto_audit: [
    {
      key: { targetRequestId: 1, createdAt: -1 },
      name: "pto_audit_request_timeline",
      partialFilterExpression: { targetRequestId: { $type: "objectId" } },
    },
    {
      key: { targetEmployeeId: 1, createdAt: -1 },
      name: "pto_audit_employee_timeline",
      partialFilterExpression: { targetEmployeeId: { $type: "objectId" } },
    },
    {
      key: { actorPlatformUserId: 1, createdAt: -1 },
      name: "pto_audit_actor_timeline",
    },
  ],
  pto_balance_ledger: [
    {
      key: { employeeId: 1, createdAt: -1 },
      name: "pto_ledger_employee_timeline",
    },
    {
      key: { requestId: 1, kind: 1 },
      name: "pto_ledger_approved_request_unique",
      partialFilterExpression: { kind: "approved_request" },
      unique: true,
    },
  ],
  pto_balances: [
    {
      key: { employeeId: 1 },
      name: "pto_balances_employee_unique",
      unique: true,
    },
  ],
  pto_requests: [
    {
      key: { requesterEmployeeId: 1, createdAt: -1 },
      name: "pto_requests_requester_timeline",
    },
    {
      key: { requesterEmployeeId: 1, status: 1, startDate: 1, endDate: 1 },
      name: "pto_requests_requester_range",
    },
    {
      key: { assignedApproverPlatformUserId: 1, status: 1, submittedAt: 1 },
      name: "pto_requests_approver_queue",
      partialFilterExpression: {
        assignedApproverPlatformUserId: { $type: "objectId" },
      },
    },
    {
      key: { status: 1, startDate: 1, endDate: 1 },
      name: "pto_requests_calendar_range",
    },
    {
      key: { status: 1, submittedAt: 1, requesterPlatformUserId: 1 },
      name: "pto_requests_administrator_queue",
    },
    {
      key: { status: 1, updatedAt: -1 },
      name: "pto_requests_administrator_history",
    },
  ],
};

declare global {
  var ptoIndexesPromise: Promise<void> | undefined;
}

export async function ensurePtoIndexes() {
  if (!globalThis.ptoIndexesPromise) {
    globalThis.ptoIndexesPromise = (async () => {
      const database = await getDatabase();
      await Promise.all(
        Object.entries(ptoIndexes).flatMap(([collectionName, indexes]) => {
          const collection = database.collection(collectionName);
          return indexes.map((index) => collection.createIndex(index.key, index));
        }),
      );
    })();
  }

  return globalThis.ptoIndexesPromise;
}
