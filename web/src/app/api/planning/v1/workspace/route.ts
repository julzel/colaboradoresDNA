import { planningHttp } from "@/features/planning/http/handler";
import { getPlanningService } from "@/features/planning/server/planning-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return planningHttp(request, (actor) => getPlanningService().load(actor));
}
