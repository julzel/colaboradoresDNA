"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  readAllDashboardNotifications,
  readDashboardNotification,
} from "@/features/calendar/server/calendar-service";

const notificationKeySchema = z
  .string()
  .max(80)
  .regex(/^(event|pto):[a-f\d]{24}$/i);

export async function openDashboardNotificationAction(formData: FormData) {
  const parsedKey = notificationKeySchema.safeParse(formData.get("notificationKey"));
  if (!parsedKey.success) redirect("/");
  const href = await readDashboardNotification(parsedKey.data);
  revalidatePath("/", "layout");
  redirect(href ?? "/");
}

export async function readAllDashboardNotificationsAction() {
  await readAllDashboardNotifications();
  revalidatePath("/", "layout");
  redirect("/");
}
