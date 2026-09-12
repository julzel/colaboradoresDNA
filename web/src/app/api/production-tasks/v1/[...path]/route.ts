import { productionTaskHttp } from "@/features/production-tasks/http/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
export async function GET(request: Request, context: Context) {
  return productionTaskHttp(request, (await context.params).path);
}
export async function POST(request: Request, context: Context) {
  return productionTaskHttp(request, (await context.params).path);
}
