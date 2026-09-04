import "server-only";

import { ObjectId } from "mongodb";

import type { ProductionImportPreviewDocument } from "@/features/production-tasks/domain/production-task-import";
import {
  ProductionTaskDomainError,
  productionObjectIdSchema,
} from "@/features/production-tasks/domain/shared";
import { ensureProductionTaskIndexes } from "@/features/production-tasks/server/production-task-indexes";
import { getDatabase } from "@/lib/server/mongodb";

export async function createImportPreview(
  document: Omit<ProductionImportPreviewDocument, "_id">,
) {
  await ensureProductionTaskIndexes();
  const database = await getDatabase();
  const preview: ProductionImportPreviewDocument = {
    ...document,
    _id: new ObjectId(),
  };
  await database
    .collection<ProductionImportPreviewDocument>("production_task_import_previews")
    .insertOne(preview);
  return preview;
}

export async function findImportPreviewForActor({
  actorPlatformUserId,
  previewId,
}: {
  actorPlatformUserId: string;
  previewId: string;
}) {
  productionObjectIdSchema.parse(previewId);
  const database = await getDatabase();
  return database
    .collection<ProductionImportPreviewDocument>("production_task_import_previews")
    .findOne({
      _id: new ObjectId(previewId),
      actorPlatformUserId: new ObjectId(actorPlatformUserId),
      expiresAt: { $gt: new Date() },
    });
}

export async function updateImportPreviewConfiguration({
  actorPlatformUserId,
  expectedVersion,
  previewId,
  sheets,
}: Pick<ProductionImportPreviewDocument, "sheets"> & {
  actorPlatformUserId: string;
  expectedVersion: number;
  previewId: string;
}) {
  const database = await getDatabase();
  const result = await database
    .collection<ProductionImportPreviewDocument>("production_task_import_previews")
    .findOneAndUpdate(
      {
        _id: new ObjectId(previewId),
        actorPlatformUserId: new ObjectId(actorPlatformUserId),
        expiresAt: { $gt: new Date() },
        status: "preview",
        version: expectedVersion,
      },
      { $inc: { version: 1 }, $set: { sheets } },
      { returnDocument: "after" },
    );
  if (!result) throw new ProductionTaskDomainError("stale_version");
  return result;
}
