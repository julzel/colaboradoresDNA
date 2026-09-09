import { getAuthentication } from "@/features/auth/server/auth-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handler(request: Request) {
  const response = await (await getAuthentication()).handler(request);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export { handler as GET, handler as POST };
