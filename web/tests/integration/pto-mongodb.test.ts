// @vitest-environment node
import { randomUUID } from "node:crypto";
import { ObjectId, type Db } from "mongodb";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import type { EmployeeDocument } from "@/features/employees/domain/employee";

const identity = vi.hoisted(() => ({ id: "" }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
// Only the application identity boundary is replaced. Services, validation, schedule
// resolution, transactions, ledger, audit and all MongoDB reads/writes are real.
vi.mock("@/features/auth/server/require-platform-user", () => ({
  requirePlatformUser: async ({ roles }: { roles?: string[] } = {}) => {
    const { findPlatformUserById } = await import(
      "@/features/auth/server/platform-user-repository"
    );
    const user = await findPlatformUserById(identity.id);
    if (!user || user.status !== "active" || (roles && !roles.includes(user.role)))
      throw new Error("Forbidden test identity");
    return { platformUser: user };
  },
}));

import { getDatabase, getMongoClient } from "@/lib/server/mongodb";
import { ptoCategories, type PtoCategory } from "@/features/pto/domain/pto";
import { initialPtoActionState } from "@/features/pto/domain/pto-action-state";
import {
  savePtoDraftAction,
  submitPtoRequestAction,
  decidePtoRequestAction,
  saveEmployeePtoDraftAction,
} from "@/features/pto/actions/pto-actions";
import {
  cancelOwnPtoRequest,
  createOwnPtoDraft,
  getPtoRequestDetail,
  openEmployeePtoBalance,
  submitOwnPtoDraft,
} from "@/features/pto/server/pto-service";
import {
  findPtoBalance,
  findPtoRequestById,
  listPtoBalanceLedger,
  listApprovedPtoInRange,
} from "@/features/pto/server/pto-repository";

const runLive = process.env.RUN_PTO_LIVE === "1";
const databaseName = `dna_audit_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
const users = {
  collaborator: new ObjectId(),
  supervisor: new ObjectId(),
  administrator: new ObjectId(),
  outsider: new ObjectId(),
};
const employees = {
  collaborator: new ObjectId(),
  supervisor: new ObjectId(),
  administrator: new ObjectId(),
  outsider: new ObjectId(),
};
let database: Db;
let createdDatabase = false;

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const draftFields = {
  category: "vacation",
  collaboratorNote: "Synthetic audit request",
  startDate: "2026-10-05",
  endDate: "2026-10-05",
  requestedPortion: "full",
};

async function redirectedRequestId(action: Promise<unknown>) {
  try {
    await action;
  } catch (error) {
    const match =
      error instanceof Error &&
      /^REDIRECT:\/ausencias\/([a-f0-9]{24})$/.exec(error.message);
    if (match) return match[1]!;
    throw error;
  }
  throw new Error("Expected successful action redirect");
}

describe.skipIf(!runLive)(
  "PTO real MongoDB workflow in an isolated disposable database",
  () => {
    beforeAll(async () => {
      if (!process.env.MONGODB_URI)
        throw new Error("Configure MONGODB_URI for the opt-in integration test");
      vi.stubEnv("MONGODB_DB", databaseName);
      database = await getDatabase();
      if ((await database.listCollections().toArray()).length !== 0)
        throw new Error("Refusing to reuse an existing database");
      createdDatabase = true;
      const now = new Date();
      for (const key of Object.keys(users) as Array<keyof typeof users>) {
        await database.collection<PlatformUserDocument>("platform_users").insertOne({
          _id: users[key],
          activatedAt: now,
          authSyncStatus: "synced",
          authUserId: `audit-${key}`,
          createdAt: now,
          deactivatedAt: null,
          displayName: `Audit ${key}`,
          invitation: {
            invitationId: null,
            expiresAt: null,
            lastSentAt: null,
            status: "accepted",
          },
          normalizedEmail: `${key}@audit.invalid`,
          role: key === "outsider" ? "collaborator" : key,
          status: "active",
          updatedAt: now,
        });
        await database.collection<EmployeeDocument>("employees").insertOne({
          _id: employees[key],
          birthDay: 1,
          birthMonth: 1,
          createdAt: now,
          employmentEndedOn: null,
          employmentStartedOn: "2020-01-01",
          employmentStatus: "active",
          firstSurname: key,
          givenNames: "Audit",
          identification: {
            normalizedValue: `audit-${key}`,
            type: "other",
            value: `audit-${key}`,
          },
          phoneNumber: null,
          platformUserId: users[key],
          preferredName: null,
          secondSurname: null,
          shareBirthdayOnCalendar: false,
          updatedAt: now,
        });
        await database.collection("employee_schedules").insertOne({
          _id: new ObjectId(),
          employeeId: employees[key],
          createdAt: now,
          createdByPlatformUserId: users.administrator,
          effectiveFrom: "2020-01-01",
          effectiveTo: null,
          anchorDate: "2026-10-05",
          timezone: "America/Costa_Rica",
          version: 2,
          weeks: [
            {
              shifts: ["monday", "tuesday", "wednesday", "thursday", "friday"].map(
                (dayOfWeek) => ({ dayOfWeek, startTime: "08:00", endTime: "16:00" }),
              ),
            },
          ],
        });
      }
      await database.collection("employee_assignments").insertOne({
        employeeId: employees.collaborator,
        departmentId: new ObjectId(),
        managerEmployeeId: employees.supervisor,
        effectiveFrom: "2020-01-01",
        effectiveTo: null,
        positionTitle: "Synthetic audit role",
        createdAt: now,
        createdByPlatformUserId: users.administrator,
      });
      identity.id = users.administrator.toHexString();
      await openEmployeePtoBalance(employees.collaborator.toHexString(), 20);
    }, 60000);

    afterAll(async () => {
      try {
        // This exact database was uniquely allocated and checked empty by this test.
        if (
          createdDatabase &&
          database.databaseName === databaseName &&
          /^dna_audit_[a-f0-9]{24}$/.test(databaseName)
        )
          await database.dropDatabase();
      } finally {
        if (globalThis.mongoClientPromise) await (await getMongoClient()).close();
        globalThis.mongoClientPromise = undefined;
        vi.unstubAllEnvs();
      }
    }, 30000);

    it("saves, edits, submits and approves a collaborator request with a blank note exactly once", async () => {
      identity.id = users.collaborator.toHexString();
      const requestId = await redirectedRequestId(
        savePtoDraftAction(initialPtoActionState, form(draftFields)),
      );
      await redirectedRequestId(
        savePtoDraftAction(
          initialPtoActionState,
          form({ ...draftFields, requestId, endDate: "2026-10-06" }),
        ),
      );
      expect((await findPtoRequestById(requestId))?.durationUnits).toBe(4);
      await redirectedRequestId(
        submitPtoRequestAction(initialPtoActionState, form({ requestId })),
      );
      expect(
        (await findPtoRequestById(requestId))?.assignedApproverPlatformUserId,
      ).toBe(users.supervisor.toHexString());
      expect(
        (await findPtoBalance(employees.collaborator.toHexString()))
          ?.currentBalanceUnits,
      ).toBe(20);
      identity.id = users.outsider.toHexString();
      await expect(getPtoRequestDetail(requestId)).rejects.toMatchObject({
        code: "forbidden",
      });
      identity.id = users.supervisor.toHexString();
      const decision = form({ requestId, decision: "approved", decisionNote: "" });
      await redirectedRequestId(
        decidePtoRequestAction(initialPtoActionState, decision),
      );
      expect(
        (await decidePtoRequestAction(initialPtoActionState, decision)).status,
      ).toBe("error");
      expect(
        (await findPtoBalance(employees.collaborator.toHexString()))
          ?.currentBalanceUnits,
      ).toBe(16);
      expect(
        (await listPtoBalanceLedger(employees.collaborator.toHexString())).filter(
          (entry) => entry.requestId?.toHexString() === requestId,
        ),
      ).toHaveLength(1);
      identity.id = users.collaborator.toHexString();
      expect((await getPtoRequestDetail(requestId))?.request.status).toBe("approved");
      expect(
        await database.collection("pto_audit").countDocuments({
          targetRequestId: new ObjectId(requestId),
          action: "request_approved",
        }),
      ).toBe(1);
    }, 60000);

    it("denies without a note and cancels pending work without changing balance", async () => {
      identity.id = users.collaborator.toHexString();
      const deniedId = await redirectedRequestId(
        savePtoDraftAction(initialPtoActionState, form(draftFields)),
      );
      await submitOwnPtoDraft({ requestId: deniedId });
      identity.id = users.administrator.toHexString();
      await redirectedRequestId(
        decidePtoRequestAction(
          initialPtoActionState,
          form({ requestId: deniedId, decision: "denied", decisionNote: "" }),
        ),
      );
      expect((await findPtoRequestById(deniedId))?.status).toBe("denied");
      identity.id = users.collaborator.toHexString();
      const cancelledId = await redirectedRequestId(
        savePtoDraftAction(initialPtoActionState, form(draftFields)),
      );
      await submitOwnPtoDraft({ requestId: cancelledId });
      await cancelOwnPtoRequest(cancelledId);
      expect((await findPtoRequestById(cancelledId))?.status).toBe("cancelled");
      expect(
        (await findPtoBalance(employees.collaborator.toHexString()))
          ?.currentBalanceUnits,
      ).toBe(16);
    }, 60000);

    it("creates an administrator-approved half day atomically and rejects self approval", async () => {
      identity.id = users.administrator.toHexString();
      const requestId = await redirectedRequestId(
        saveEmployeePtoDraftAction(
          initialPtoActionState,
          form({
            ...draftFields,
            requestedPortion: "half",
            employeeId: employees.collaborator.toHexString(),
            confirmImmediateApproval: "true",
          }),
        ),
      );
      expect(await findPtoRequestById(requestId)).toMatchObject({
        status: "approved",
        durationUnits: 1,
        balanceDeltaUnits: -1,
      });
      expect(
        (await findPtoBalance(employees.collaborator.toHexString()))
          ?.currentBalanceUnits,
      ).toBe(15);
      const self = await saveEmployeePtoDraftAction(
        initialPtoActionState,
        form({
          ...draftFields,
          employeeId: employees.administrator.toHexString(),
          confirmImmediateApproval: "true",
        }),
      );
      expect(self.status).toBe("error");
      expect(self.message).toMatch(/propia solicitud/);
    }, 60000);

    it("serializes competing approvals and revokes a demoted supervisor's calendar access", async () => {
      identity.id = users.collaborator.toHexString();
      const draft = await createOwnPtoDraft({
        ...draftFields,
        startDate: "2026-10-07",
        endDate: "2026-10-07",
        category: "vacation",
        requestedPortion: "full",
      });
      await submitOwnPtoDraft({ requestId: draft.id });
      identity.id = users.administrator.toHexString();
      const decide = () =>
        decidePtoRequestAction(
          initialPtoActionState,
          form({ requestId: draft.id, decision: "approved", decisionNote: "" }),
        );
      const results = await Promise.allSettled([decide(), decide()]);
      expect(
        results.filter(
          (result) =>
            result.status === "rejected" &&
            result.reason instanceof Error &&
            result.reason.message === `REDIRECT:/ausencias/${draft.id}`,
        ),
      ).toHaveLength(1);
      expect(
        results.filter(
          (result) => result.status === "fulfilled" && result.value.status === "error",
        ),
      ).toHaveLength(1);
      expect(
        await database.collection("pto_balance_ledger").countDocuments({
          requestId: new ObjectId(draft.id),
          kind: "approved_request",
        }),
      ).toBe(1);
      expect(
        (await findPtoBalance(employees.collaborator.toHexString()))
          ?.currentBalanceUnits,
      ).toBe(13);
      const range = {
        startDate: "2026-10-01",
        endDate: "2026-10-31",
        platformUserId: users.supervisor.toHexString(),
      };
      expect(
        (await listApprovedPtoInRange({ ...range, role: "supervisor" })).some(
          (request) => request.id === draft.id,
        ),
      ).toBe(true);
      await database
        .collection("platform_users")
        .updateOne({ _id: users.supervisor }, { $set: { role: "collaborator" } });
      identity.id = users.supervisor.toHexString();
      await expect(getPtoRequestDetail(draft.id)).rejects.toMatchObject({
        code: "forbidden",
      });
      expect(
        await listApprovedPtoInRange({ ...range, role: "collaborator" }),
      ).toHaveLength(0);
      await database
        .collection("platform_users")
        .updateOne({ _id: users.supervisor }, { $set: { role: "supervisor" } });
    }, 60000);

    it("supports every non-vacation category without a balance; fails closed for missing balance or schedule", async () => {
      identity.id = users.administrator.toHexString();
      for (const category of ptoCategories.filter(
        (category) => category !== "vacation",
      )) {
        const requestId = await redirectedRequestId(
          saveEmployeePtoDraftAction(
            initialPtoActionState,
            form({
              ...draftFields,
              category,
              employeeId: employees.outsider.toHexString(),
              confirmImmediateApproval: "true",
            }),
          ),
        );
        expect(await findPtoRequestById(requestId)).toMatchObject({
          status: "approved",
          balanceDeltaUnits: null,
          category,
        });
      }
      expect(await listPtoBalanceLedger(employees.outsider.toHexString())).toHaveLength(
        0,
      );
      identity.id = users.outsider.toHexString();
      const request = await createOwnPtoDraft({
        ...draftFields,
        category: "vacation" as PtoCategory,
        requestedPortion: "full",
      });
      await expect(submitOwnPtoDraft({ requestId: request.id })).rejects.toMatchObject({
        code: "balance_missing",
      });
      await expect(
        createOwnPtoDraft({
          ...draftFields,
          category: "other",
          requestedPortion: "full",
          startDate: "2019-01-01",
          endDate: "2019-01-01",
        }),
      ).rejects.toMatchObject({ code: "schedule_incomplete" });
    }, 60000);
  },
);
