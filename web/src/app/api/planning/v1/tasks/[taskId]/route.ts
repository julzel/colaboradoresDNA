import { planningHttp, readJson } from "@/features/planning/http/handler";
import { getPlanningService } from "@/features/planning/server/planning-service";

export const runtime = "nodejs";
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  return planningHttp(request, async (actor) =>
    getPlanningService().updateTask(
      actor,
      (await params).taskId,
      await readJson(request),
    ),
  );
}
