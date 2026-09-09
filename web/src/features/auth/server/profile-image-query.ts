import "server-only";
import { ObjectId, type Binary } from "mongodb";
import { getDatabase } from "@/lib/server/mongodb";
import { requirePlatformUser } from "./require-platform-user";

export async function getPrivateProfileImage(userId: string) {
  await requirePlatformUser();
  if (!/^[a-f0-9]{24}$/i.test(userId)) return null;
  const image = await (await getDatabase())
    .collection<{ _id: ObjectId; bytes: Binary }>("auth_profile_images")
    .findOne({ _id: new ObjectId(userId) });
  return image ? new Uint8Array(image.bytes.value()) : null;
}
