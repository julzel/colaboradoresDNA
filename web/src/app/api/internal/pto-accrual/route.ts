import { timingSafeEqual } from "node:crypto";
import { accrueMonthlyPto } from "@/features/pto/server/pto-accrual";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (
    !secret ||
    secret.length < 32 ||
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return new Response(null, { status: 401 });
  }
  const result = await accrueMonthlyPto();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
