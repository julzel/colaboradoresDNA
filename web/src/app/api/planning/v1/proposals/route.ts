import { planningHttp, readJson } from "@/features/planning/http/handler";
import { getPlanningService } from "@/features/planning/server/planning-service";

export const runtime = "nodejs";
export const maxDuration = 150;
export async function POST(request: Request) {
  return planningHttp(request, async (actor) =>
    getPlanningService().generate(actor, await readJson(request)),
  );
}
