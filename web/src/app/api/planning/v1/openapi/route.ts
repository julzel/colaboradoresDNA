import { planningHttp } from "@/features/planning/http/handler";
import { planningOpenApi } from "@/features/planning/http/openapi";

export const runtime = "nodejs";
export async function GET(request: Request) {
  return planningHttp(request, async () => Response.json(planningOpenApi));
}
