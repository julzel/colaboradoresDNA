import { planningHttp, readJson } from "@/features/planning/http/handler";
import { getPlanningService } from "@/features/planning/server/planning-service";

export const runtime = "nodejs";
export async function PUT(request: Request) {
  return planningHttp(request, async (actor) =>
    getPlanningService().accept(actor, await readJson(request)),
  );
}
