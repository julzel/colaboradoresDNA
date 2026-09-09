"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  readAllDashboardNotifications,
  readDashboardNotification,
  getCalendarDashboardNotifications,
} from "@/features/calendar/server/calendar-service";

const notificationKeySchema = z
  .string()
  .max(120)
  .regex(
    /^(?:(event|pto):[a-f\d]{24}|leave:[a-f\d]{24}:\d+:(pending|approved|denied|cancelled))$/i,
  );

export async function getUnreadNotificationsAction() {
  return (await getCalendarDashboardNotifications()).notifications;
}

export async function markNotificationReadAction(key: string) {
  const parsed = notificationKeySchema.parse(key);
  const href = await readDashboardNotification(parsed);
  if (!href) throw new Error("Notification unavailable");
  revalidatePath("/", "layout");
  return { href };
}

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
