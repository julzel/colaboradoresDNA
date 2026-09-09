import { getPrivateProfileImage } from "@/features/auth/server/profile-image-query";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const image = await getPrivateProfileImage(userId);
  if (!image) return new Response(null, { status: 404 });
  return new Response(image, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
