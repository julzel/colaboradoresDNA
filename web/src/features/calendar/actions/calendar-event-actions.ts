"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import type { CalendarActionState } from "@/features/calendar/domain/calendar-action-state";
import {
  CalendarDomainError,
  calendarEventInputSchema,
} from "@/features/calendar/domain/calendar-event";
import {
  createCalendarUrl,
  parseCalendarQuery,
} from "@/features/calendar/domain/calendar-query";
import {
  createCalendarEventForActor,
  deleteCalendarEventForActor,
  updateCalendarEventForActor,
} from "@/features/calendar/server/calendar-service";
import { createFeedbackUrl } from "@/lib/actions/feedback-messages";

function optionalString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readEventInput(formData: FormData) {
  return {
    allDay: formData.get("allDay") === "on",
    departmentId: optionalString(formData, "departmentId") || null,
    description: optionalString(formData, "description"),
    endDate: optionalString(formData, "endDate"),
    endDateTime: optionalString(formData, "endDateTime"),
    eventType: optionalString(formData, "eventType"),
    inviteePlatformUserIds: formData
      .getAll("inviteePlatformUserIds")
      .filter((value): value is string => typeof value === "string"),
    location: optionalString(formData, "location"),
    meetingUrl: optionalString(formData, "meetingUrl"),
    startDate: optionalString(formData, "startDate"),
    startDateTime: optionalString(formData, "startDateTime"),
    title: optionalString(formData, "title"),
    visibility: optionalString(formData, "visibility"),
  };
}

function zodState(error: z.ZodError): CalendarActionState {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const name = issue.path.join(".");
    if (!errors[name]) errors[name] = issue.message;
  }

  return {
    errors,
    message: "Revisá los campos señalados antes de guardar.",
    status: "error",
  };
}

function domainState(error: unknown): CalendarActionState {
  if (error instanceof CalendarDomainError) {
    const messages: Record<CalendarDomainError["code"], string> = {
      department_forbidden:
        "Solo podés dirigir eventos al departamento que supervisás.",
      department_not_found: "El departamento seleccionado no está disponible.",
      event_forbidden: "No tenés permiso para modificar este evento.",
      event_not_found: "No encontramos el evento solicitado.",
      invitee_not_found: "Una de las personas seleccionadas ya no está disponible.",
    };

    return { message: messages[error.code], status: "error" };
  }

  return {
    message: "Ocurrió un error inesperado. Intentá nuevamente.",
    status: "error",
  };
}

export async function createCalendarEventAction(
  _state: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  await requirePlatformUser({ roles: ["administrator", "supervisor"] });
  const parsed = calendarEventInputSchema.safeParse(readEventInput(formData));
  if (!parsed.success) return zodState(parsed.error);

  let event;
  try {
    event = await createCalendarEventForActor(parsed.data);
  } catch (error) {
    return domainState(error);
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  redirect(
    createFeedbackUrl(
      `/calendario/eventos/${event.id}`,
      "notice",
      "calendar_event_created",
    ),
  );
}

export async function updateCalendarEventAction(
  _state: CalendarActionState,
  formData: FormData,
): Promise<CalendarActionState> {
  await requirePlatformUser({ roles: ["administrator", "supervisor"] });
  const eventId = optionalString(formData, "eventId");
  const parsed = calendarEventInputSchema.safeParse(readEventInput(formData));
  if (!parsed.success) return zodState(parsed.error);

  try {
    await updateCalendarEventForActor({ eventId, input: parsed.data });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  revalidatePath(`/calendario/eventos/${eventId}`);
  redirect(
    createFeedbackUrl(
      `/calendario/eventos/${eventId}`,
      "notice",
      "calendar_event_updated",
    ),
  );
}

export async function deleteCalendarEventAction(formData: FormData) {
  await requirePlatformUser({ roles: ["administrator", "supervisor"] });
  const eventId = optionalString(formData, "eventId");
  const query = parseCalendarQuery({
    mes: optionalString(formData, "month"),
    vista: optionalString(formData, "view"),
  });

  try {
    await deleteCalendarEventForActor(eventId);
  } catch (error) {
    if (!(error instanceof CalendarDomainError)) throw error;
    redirect(
      createFeedbackUrl(
        `/calendario/eventos/${eventId}`,
        "error",
        "calendar_event_delete_failed",
      ),
    );
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  redirect(
    createFeedbackUrl(
      createCalendarUrl({ month: query.month, view: query.view }),
      "notice",
      "calendar_event_deleted",
    ),
  );
}
