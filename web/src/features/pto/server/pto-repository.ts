import "server-only";

import { MongoServerError, ObjectId, type ClientSession, type Filter } from "mongodb";

import type { PlatformUserDocument } from "@/features/auth/domain/platform-user";
import type { EmployeeDocument } from "@/features/employees/domain/employee";
import { objectIdStringSchema } from "@/features/employees/domain/shared";
import {
  normalizePtoCategory,
  PtoDomainError,
  ptoBalanceAdjustmentInputSchema,
  ptoCategoryConsumesBalance,
  ptoDecisionInputSchema,
  ptoDraftInputSchema,
  ptoUnitsSchema,
  type PtoBalanceDocument,
  type PtoBalanceLedgerDocument,
  type PtoDraftInput,
  type PtoRequest,
  type PtoRequestDocument,
} from "@/features/pto/domain/pto";
import { recordPtoAudit } from "@/features/pto/server/pto-audit-repository";
import { ensurePtoIndexes } from "@/features/pto/server/pto-indexes";
import { getDatabase, getMongoClient } from "@/lib/server/mongodb";

async function getPtoCollections() {
  const database = await getDatabase();
  return {
    balances: database.collection<PtoBalanceDocument>("pto_balances"),
    employees: database.collection<EmployeeDocument>("employees"),
    ledger: database.collection<PtoBalanceLedgerDocument>("pto_balance_ledger"),
    platformUsers: database.collection<PlatformUserDocument>("platform_users"),
    requests: database.collection<PtoRequestDocument>("pto_requests"),
  };
}

function toPtoRequest(document: PtoRequestDocument): PtoRequest {
  const {
    _id,
    assignedApproverPlatformUserId,
    createdByPlatformUserId,
    requesterEmployeeId,
    requesterPlatformUserId,
    statusHistory,
    ...request
  } = document;
  return {
    ...request,
    category: normalizePtoCategory(request.category),
    assignedApproverPlatformUserId:
      assignedApproverPlatformUserId?.toHexString() ?? null,
    createdByPlatformUserId: (
      createdByPlatformUserId ?? requesterPlatformUserId
    ).toHexString(),
    id: _id.toHexString(),
    requesterEmployeeId: requesterEmployeeId.toHexString(),
    requesterPlatformUserId: requesterPlatformUserId.toHexString(),
    statusHistory: statusHistory.map((entry) => ({
      ...entry,
      actorPlatformUserId: entry.actorPlatformUserId.toHexString(),
    })),
  };
}

export async function createOpeningPtoBalanceInSession({
  actorPlatformUserId,
  employeeId,
  openingBalanceUnits,
  session,
}: {
  actorPlatformUserId: string;
  employeeId: string;
  openingBalanceUnits: number;
  session: ClientSession;
}) {
  objectIdStringSchema.parse(actorPlatformUserId);
  objectIdStringSchema.parse(employeeId);
  const normalizedOpeningBalanceUnits = ptoUnitsSchema.parse(openingBalanceUnits);
  const { balances, ledger } = await getPtoCollections();
  const now = new Date();
  const employeeObjectId = new ObjectId(employeeId);
  const document: PtoBalanceDocument = {
    _id: new ObjectId(),
    createdAt: now,
    currentBalanceUnits: normalizedOpeningBalanceUnits,
    employeeId: employeeObjectId,
    openingBalanceUnits: normalizedOpeningBalanceUnits,
    updatedAt: now,
    version: 0,
  };

  try {
    await balances.insertOne(document, { session });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      throw new PtoDomainError("balance_exists");
    }
    throw error;
  }

  await ledger.insertOne(
    {
      _id: new ObjectId(),
      actorPlatformUserId: new ObjectId(actorPlatformUserId),
      balanceAfterUnits: normalizedOpeningBalanceUnits,
      balanceBeforeUnits: 0,
      createdAt: now,
      deltaUnits: normalizedOpeningBalanceUnits,
      employeeId: employeeObjectId,
      kind: "opening",
      reason: "Saldo inicial",
      requestId: null,
    },
    { session },
  );
  await recordPtoAudit({
    action: "balance_opened",
    actorPlatformUserId,
    changedFields: ["openingBalanceUnits", "currentBalanceUnits"],
    session,
    targetEmployeeId: employeeId,
  });
  return document;
}

export async function createOpeningPtoBalance(input: {
  actorPlatformUserId: string;
  employeeId: string;
  openingBalanceUnits: number;
}) {
  await ensurePtoIndexes();
  const client = await getMongoClient();
  return client.withSession(async (session) => {
    let result: PtoBalanceDocument | null = null;
    await session.withTransaction(async () => {
      result = await createOpeningPtoBalanceInSession({ ...input, session });
    });
    if (!result) throw new PtoDomainError("employee_missing");
    return result;
  });
}

export async function adjustPtoBalance(input: {
  actorPlatformUserId: string;
  deltaUnits: number;
  employeeId: string;
  reason: string;
}) {
  const parsed = ptoBalanceAdjustmentInputSchema.parse(input);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { balances, ledger } = await getPtoCollections();

  return client.withSession(async (session) => {
    let after: number | null = null;
    await session.withTransaction(async () => {
      const employeeId = new ObjectId(parsed.employeeId);
      const balance = await balances.findOne({ employeeId }, { session });
      if (!balance) throw new PtoDomainError("balance_missing");
      after = balance.currentBalanceUnits + parsed.deltaUnits;
      const updated = await balances.updateOne(
        { _id: balance._id, version: balance.version },
        {
          $inc: { version: 1 },
          $set: { currentBalanceUnits: after, updatedAt: new Date() },
        },
        { session },
      );
      if (updated.modifiedCount !== 1) throw new PtoDomainError("stale_status");
      await ledger.insertOne(
        {
          _id: new ObjectId(),
          actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
          balanceAfterUnits: after,
          balanceBeforeUnits: balance.currentBalanceUnits,
          createdAt: new Date(),
          deltaUnits: parsed.deltaUnits,
          employeeId,
          kind: "adjustment",
          reason: parsed.reason,
          requestId: null,
        },
        { session },
      );
      await recordPtoAudit({
        action: "balance_adjusted",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: ["currentBalanceUnits"],
        session,
        targetEmployeeId: parsed.employeeId,
      });
    });
    return after;
  });
}

export async function createPtoDraft(input: {
  actorPlatformUserId: string;
  employeeId: string;
  request: PtoDraftInput;
  requesterPlatformUserId?: string;
}) {
  const request = ptoDraftInputSchema.parse(input.request);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let created: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      const now = new Date();
      created = {
        _id: new ObjectId(),
        assignedApproverPlatformUserId: null,
        balanceAfterUnits: null,
        balanceBeforeUnits: null,
        balanceDeltaUnits: null,
        cancelledAt: null,
        category: request.category,
        collaboratorNote: request.collaboratorNote,
        createdAt: now,
        createdByPlatformUserId: new ObjectId(input.actorPlatformUserId),
        decidedAt: null,
        decisionNote: null,
        durationUnits: request.durationUnits,
        endDate: request.endDate,
        requesterEmployeeId: new ObjectId(input.employeeId),
        requesterPlatformUserId: new ObjectId(
          input.requesterPlatformUserId ?? input.actorPlatformUserId,
        ),
        startDate: request.startDate,
        status: "draft",
        statusHistory: [
          {
            actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
            from: null,
            occurredAt: now,
            to: "draft",
          },
        ],
        submittedAt: null,
        updatedAt: now,
      };
      await requests.insertOne(created, { session });
      await recordPtoAudit({
        action: "request_created",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: ["startDate", "endDate", "durationUnits", "category"],
        session,
        targetEmployeeId: input.employeeId,
        targetRequestId: created._id.toHexString(),
      });
    });
    if (!created) throw new PtoDomainError("request_missing");
    return toPtoRequest(created);
  });
}

export async function updatePtoDraft(input: {
  actorPlatformUserId: string;
  administratorOverride?: boolean;
  request: PtoDraftInput;
  requestId: string;
}) {
  const request = ptoDraftInputSchema.parse(input.request);
  objectIdStringSchema.parse(input.requestId);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let updated: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      updated = await requests.findOneAndUpdate(
        {
          _id: new ObjectId(input.requestId),
          ...(!input.administratorOverride && {
            requesterPlatformUserId: new ObjectId(input.actorPlatformUserId),
          }),
          status: "draft",
        },
        {
          $set: {
            ...request,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new PtoDomainError("stale_status");
      await recordPtoAudit({
        action: "request_updated",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: [
          "startDate",
          "endDate",
          "durationUnits",
          "category",
          "collaboratorNote",
        ],
        session,
        targetEmployeeId: updated.requesterEmployeeId.toHexString(),
        targetRequestId: input.requestId,
      });
    });
    return toPtoRequest(updated!);
  });
}

export async function submitPtoDraft(input: {
  actorPlatformUserId: string;
  administratorOverride?: boolean;
  approverPlatformUserId: string | null;
  requestId: string;
}) {
  objectIdStringSchema.parse(input.requestId);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let updated: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      const existing = await requests.findOne(
        {
          _id: new ObjectId(input.requestId),
          ...(!input.administratorOverride && {
            requesterPlatformUserId: new ObjectId(input.actorPlatformUserId),
          }),
          status: "draft",
        },
        { session },
      );
      if (!existing) throw new PtoDomainError("stale_status");
      if (
        input.approverPlatformUserId &&
        existing.requesterPlatformUserId.equals(input.approverPlatformUserId)
      ) {
        throw new PtoDomainError("self_approval");
      }
      const now = new Date();
      updated = await requests.findOneAndUpdate(
        { _id: existing._id, status: "draft" },
        {
          $set: {
            assignedApproverPlatformUserId: input.approverPlatformUserId
              ? new ObjectId(input.approverPlatformUserId)
              : null,
            status: "pending",
            submittedAt: now,
            updatedAt: now,
            statusHistory: [
              ...existing.statusHistory,
              {
                actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
                from: "draft",
                occurredAt: now,
                to: "pending",
              },
            ],
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new PtoDomainError("stale_status");
      await recordPtoAudit({
        action: "request_submitted",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: ["status", "assignedApproverPlatformUserId", "submittedAt"],
        session,
        targetEmployeeId: existing.requesterEmployeeId.toHexString(),
        targetRequestId: input.requestId,
      });
    });
    return toPtoRequest(updated!);
  });
}

export async function cancelPtoRequest(input: {
  actorPlatformUserId: string;
  administratorOverride?: boolean;
  requestId: string;
}) {
  objectIdStringSchema.parse(input.requestId);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let updated: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      const existing = await requests.findOne(
        {
          _id: new ObjectId(input.requestId),
          ...(!input.administratorOverride && {
            requesterPlatformUserId: new ObjectId(input.actorPlatformUserId),
          }),
          status: { $in: ["draft", "pending"] },
        },
        { session },
      );
      if (!existing) throw new PtoDomainError("stale_status");
      const now = new Date();
      updated = await requests.findOneAndUpdate(
        { _id: existing._id, status: existing.status },
        {
          $set: {
            cancelledAt: now,
            status: "cancelled",
            statusHistory: [
              ...existing.statusHistory,
              {
                actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
                from: existing.status,
                occurredAt: now,
                to: "cancelled",
              },
            ],
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new PtoDomainError("stale_status");
      await recordPtoAudit({
        action: "request_cancelled",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: ["status", "cancelledAt"],
        session,
        targetEmployeeId: existing.requesterEmployeeId.toHexString(),
        targetRequestId: input.requestId,
      });
    });
    return toPtoRequest(updated!);
  });
}

export async function decidePtoRequest(input: {
  actorPlatformUserId: string;
  administratorOverride: boolean;
  decision: "approved" | "denied";
  decisionNote: string | null;
  requestId: string;
}) {
  const decision = ptoDecisionInputSchema.parse(input);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { balances, ledger, requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let updated: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      const existing = await requests.findOne(
        {
          _id: new ObjectId(decision.requestId),
          ...(input.administratorOverride
            ? {}
            : {
                assignedApproverPlatformUserId: new ObjectId(input.actorPlatformUserId),
              }),
          status: "pending",
        },
        { session },
      );
      if (!existing) throw new PtoDomainError("stale_status");
      if (existing.requesterPlatformUserId.equals(input.actorPlatformUserId)) {
        throw new PtoDomainError("self_approval");
      }

      let balanceBeforeUnits: number | null = null;
      let balanceAfterUnits: number | null = null;
      let balanceDeltaUnits: number | null = null;
      const now = new Date();

      if (
        decision.decision === "approved" &&
        ptoCategoryConsumesBalance[existing.category]
      ) {
        const balance = await balances.findOne(
          { employeeId: existing.requesterEmployeeId },
          { session },
        );
        if (!balance) throw new PtoDomainError("balance_missing");
        balanceBeforeUnits = balance.currentBalanceUnits;
        balanceDeltaUnits = -existing.durationUnits;
        balanceAfterUnits = balanceBeforeUnits + balanceDeltaUnits;
        const balanceUpdate = await balances.updateOne(
          { _id: balance._id, version: balance.version },
          {
            $inc: { version: 1 },
            $set: { currentBalanceUnits: balanceAfterUnits, updatedAt: now },
          },
          { session },
        );
        if (balanceUpdate.modifiedCount !== 1) {
          throw new PtoDomainError("stale_status");
        }
        await ledger.insertOne(
          {
            _id: new ObjectId(),
            actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
            balanceAfterUnits,
            balanceBeforeUnits,
            createdAt: now,
            deltaUnits: balanceDeltaUnits,
            employeeId: existing.requesterEmployeeId,
            kind: "approved_request",
            reason: null,
            requestId: existing._id,
          },
          { session },
        );
      }

      updated = await requests.findOneAndUpdate(
        { _id: existing._id, status: "pending" },
        {
          $set: {
            assignedApproverPlatformUserId:
              existing.assignedApproverPlatformUserId ??
              (input.administratorOverride
                ? new ObjectId(input.actorPlatformUserId)
                : null),
            balanceAfterUnits,
            balanceBeforeUnits,
            balanceDeltaUnits,
            decidedAt: now,
            decisionNote: decision.decisionNote,
            status: decision.decision,
            statusHistory: [
              ...existing.statusHistory,
              {
                actorPlatformUserId: new ObjectId(input.actorPlatformUserId),
                from: "pending",
                occurredAt: now,
                to: decision.decision,
              },
            ],
            updatedAt: now,
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new PtoDomainError("stale_status");
      await recordPtoAudit({
        action:
          decision.decision === "approved" ? "request_approved" : "request_denied",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: [
          "status",
          "decisionNote",
          "decidedAt",
          ...(existing.assignedApproverPlatformUserId === null
            ? ["assignedApproverPlatformUserId"]
            : []),
          ...(balanceDeltaUnits === null ? [] : ["balanceDeltaUnits"]),
        ],
        session,
        targetEmployeeId: existing.requesterEmployeeId.toHexString(),
        targetRequestId: decision.requestId,
      });
    });
    return toPtoRequest(updated!);
  });
}

export async function reassignPtoRequestApprover(input: {
  actorPlatformUserId: string;
  approverPlatformUserId: string;
  requestId: string;
}) {
  objectIdStringSchema.parse(input.requestId);
  objectIdStringSchema.parse(input.approverPlatformUserId);
  await ensurePtoIndexes();
  const client = await getMongoClient();
  const { platformUsers, requests } = await getPtoCollections();
  return client.withSession(async (session) => {
    let updated: PtoRequestDocument | null = null;
    await session.withTransaction(async () => {
      const existing = await requests.findOne(
        { _id: new ObjectId(input.requestId), status: "pending" },
        { session },
      );
      if (!existing?.assignedApproverPlatformUserId) {
        throw new PtoDomainError("stale_status");
      }
      const currentApprover = await platformUsers.findOne(
        { _id: existing.assignedApproverPlatformUserId },
        { session },
      );
      if (currentApprover?.status === "active") {
        throw new PtoDomainError("forbidden");
      }
      if (existing.requesterPlatformUserId.equals(input.approverPlatformUserId)) {
        throw new PtoDomainError("self_approval");
      }
      const replacement = await platformUsers.findOne(
        {
          _id: new ObjectId(input.approverPlatformUserId),
          status: "active",
        },
        { session },
      );
      if (!replacement) throw new PtoDomainError("approver_ineligible");
      updated = await requests.findOneAndUpdate(
        {
          _id: existing._id,
          assignedApproverPlatformUserId: existing.assignedApproverPlatformUserId,
          status: "pending",
        },
        {
          $set: {
            assignedApproverPlatformUserId: replacement._id,
            updatedAt: new Date(),
          },
        },
        { returnDocument: "after", session },
      );
      if (!updated) throw new PtoDomainError("stale_status");
      await recordPtoAudit({
        action: "request_approver_reassigned",
        actorPlatformUserId: input.actorPlatformUserId,
        changedFields: ["assignedApproverPlatformUserId"],
        session,
        targetEmployeeId: existing.requesterEmployeeId.toHexString(),
        targetRequestId: input.requestId,
      });
    });
    return toPtoRequest(updated!);
  });
}

export async function findPtoRequestById(requestId: string) {
  objectIdStringSchema.parse(requestId);
  await ensurePtoIndexes();
  const { requests } = await getPtoCollections();
  const document = await requests.findOne({ _id: new ObjectId(requestId) });
  return document ? toPtoRequest(document) : null;
}

export async function listPtoRequestsForRequester(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  await ensurePtoIndexes();
  const { requests } = await getPtoCollections();
  const documents = await requests
    .find({ requesterEmployeeId: new ObjectId(employeeId) })
    .sort({ startDate: -1, createdAt: -1 })
    .toArray();
  return documents.map(toPtoRequest);
}

export async function listUpcomingApprovedProxyPtoRequests({
  limit = 5,
  platformUserId,
  today,
}: {
  limit?: number;
  platformUserId: string;
  today: string;
}) {
  objectIdStringSchema.parse(platformUserId);
  await ensurePtoIndexes();
  const { requests } = await getPtoCollections();
  const requesterPlatformUserId = new ObjectId(platformUserId);
  const documents = await requests
    .find({
      createdByPlatformUserId: {
        $exists: true,
        $ne: requesterPlatformUserId,
      },
      endDate: { $gte: today },
      requesterPlatformUserId,
      status: "approved",
    })
    .sort({ startDate: 1, createdAt: 1 })
    .limit(limit)
    .toArray();
  return documents.map(toPtoRequest);
}

export async function listPtoRequestsForAdministration() {
  await ensurePtoIndexes();
  const { requests } = await getPtoCollections();
  const documents = await requests
    .find({ status: { $ne: "draft" } })
    .sort({ updatedAt: -1 })
    .toArray();
  return documents.map(toPtoRequest);
}

export async function listPendingPtoApprovals(
  platformUserId: string,
  includeAdministratorPool = false,
) {
  objectIdStringSchema.parse(platformUserId);
  await ensurePtoIndexes();
  const { requests } = await getPtoCollections();
  const documents = await requests
    .find({
      ...(includeAdministratorPool
        ? { requesterPlatformUserId: { $ne: new ObjectId(platformUserId) } }
        : { assignedApproverPlatformUserId: new ObjectId(platformUserId) }),
      status: "pending",
    })
    .sort({ submittedAt: 1 })
    .toArray();
  return documents.map(toPtoRequest);
}

export async function findPtoBalance(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  await ensurePtoIndexes();
  const { balances } = await getPtoCollections();
  return balances.findOne({ employeeId: new ObjectId(employeeId) });
}

export async function listPtoBalanceLedger(employeeId: string) {
  objectIdStringSchema.parse(employeeId);
  await ensurePtoIndexes();
  const { ledger } = await getPtoCollections();
  return ledger
    .find({ employeeId: new ObjectId(employeeId) })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function getPtoRequestWarnings(request: PtoRequest) {
  await ensurePtoIndexes();
  const { balances, requests } = await getPtoCollections();
  const filter: Filter<PtoRequestDocument> = {
    _id: { $ne: new ObjectId(request.id) },
    requesterEmployeeId: new ObjectId(request.requesterEmployeeId),
    status: { $in: ["pending", "approved"] },
    startDate: { $lte: request.endDate },
    endDate: { $gte: request.startDate },
  };
  const [overlap, balance] = await Promise.all([
    requests.findOne(filter),
    balances.findOne({ employeeId: new ObjectId(request.requesterEmployeeId) }),
  ]);
  const projectedBalanceUnits =
    balance && ptoCategoryConsumesBalance[request.category]
      ? balance.currentBalanceUnits - request.durationUnits
      : null;
  return {
    hasOverlap: Boolean(overlap),
    projectedBalanceUnits,
    wouldBeNegative: projectedBalanceUnits !== null && projectedBalanceUnits < 0,
  };
}

export async function getPtoSupportingCollections() {
  return getPtoCollections();
}
