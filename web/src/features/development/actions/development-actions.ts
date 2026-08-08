"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { DevelopmentActionState } from "@/features/development/domain/development-action-state";
import {
  oneOnOneEditorInputSchema,
  oneOnOneFinalizationInputSchema,
} from "@/features/development/domain/one-on-one";
import { DevelopmentDomainError } from "@/features/development/domain/shared";
import {
  createOneOnOneForAdministration,
  updateOneOnOneActionForAdministration,
  updateOneOnOneForAdministration,
} from "@/features/development/server/development-service";
import { createFeedbackUrl } from "@/lib/actions/feedback-messages";

function stringValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readEditorInput(formData: FormData) {
  const descriptions = formData
    .getAll("actionDescription")
    .map((value) => (typeof value === "string" ? value : ""));
  const owners = formData
    .getAll("actionOwner")
    .map((value) => (typeof value === "string" ? value : ""));
  const dueDates = formData
    .getAll("actionDueOn")
    .map((value) => (typeof value === "string" ? value : ""));

  return {
    achievements: stringValue(formData, "achievements"),
    agreedActions: descriptions.map((description, index) => ({
      description,
      dueOn: dueDates[index] ?? "",
      owner: owners[index] ?? "",
    })),
    blockers: stringValue(formData, "blockers"),
    calendarEndDateTime: stringValue(formData, "calendarEndDateTime"),
    calendarStartDateTime: stringValue(formData, "calendarStartDateTime"),
    feedback: stringValue(formData, "feedback"),
    occurredOn: stringValue(formData, "occurredOn"),
    organizationSupport: stringValue(formData, "organizationSupport"),
    scheduleCalendarEvent: formData.get("scheduleCalendarEvent") === "on",
    sharedSummary: stringValue(formData, "sharedSummary"),
  };
}

function zodState(error: z.ZodError): DevelopmentActionState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (!errors[field]) errors[field] = issue.message;
  }
  return {
    errors,
    message: "Revisá los campos señalados antes de guardar.",
    status: "error",
  };
}

function domainState(error: unknown): DevelopmentActionState {
  if (error instanceof DevelopmentDomainError) {
    const messages: Record<DevelopmentDomainError["code"], string> = {
      conflict:
        "Este 1:1 cambió mientras lo editabas. Recargá la página y revisá la versión más reciente.",
      employee_not_found: "El colaborador ya no está disponible para seguimiento.",
      forbidden: "No tenés permiso para realizar esta acción.",
      invalid_transition: "Este 1:1 ya no se puede editar.",
      record_not_found: "No encontramos el 1:1 solicitado.",
    };
    return { message: messages[error.code], status: "error" };
  }

  return {
    message:
      "No pudimos guardar el 1:1. Verificá la configuración segura e intentá nuevamente.",
    status: "error",
  };
}

function parseEditor(formData: FormData) {
  const intent =
    stringValue(formData, "intent") === "finalized" ? "finalized" : "draft";
  const parsed = oneOnOneEditorInputSchema.safeParse(readEditorInput(formData));
  if (!parsed.success) return { state: zodState(parsed.error) } as const;
  if (intent === "finalized") {
    const finalized = oneOnOneFinalizationInputSchema.safeParse(parsed.data.record);
    if (!finalized.success) {
      const state = zodState(finalized.error);
      if (state.errors?.["narrative.sharedSummary"]) {
        state.errors.sharedSummary = state.errors["narrative.sharedSummary"];
      }
      return { state } as const;
    }
  }
  return { input: parsed.data, intent } as const;
}

export async function createOneOnOneAction(
  employeeId: string,
  _state: DevelopmentActionState,
  formData: FormData,
): Promise<DevelopmentActionState> {
  const parsed = parseEditor(formData);
  if ("state" in parsed) return parsed.state;

  let result;
  try {
    result = await createOneOnOneForAdministration({ employeeId, ...parsed });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath("/admin/desarrollo");
  revalidatePath(`/admin/colaboradores/${employeeId}/desarrollo`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}/desarrollo/1-a-1/${result.id}`,
      "notice",
      result.status === "finalized"
        ? "development_one_on_one_finalized"
        : "development_one_on_one_draft_saved",
    ),
  );
}

export async function updateOneOnOneAction(
  employeeId: string,
  meetingId: string,
  _state: DevelopmentActionState,
  formData: FormData,
): Promise<DevelopmentActionState> {
  const parsed = parseEditor(formData);
  if ("state" in parsed) return parsed.state;
  const version = z.coerce.number().int().min(1).safeParse(formData.get("version"));
  if (!version.success) return domainState(new DevelopmentDomainError("conflict"));

  let result;
  try {
    result = await updateOneOnOneForAdministration({
      employeeId,
      expectedVersion: version.data,
      meetingId,
      ...parsed,
    });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath("/admin/desarrollo");
  revalidatePath(`/admin/colaboradores/${employeeId}/desarrollo`);
  revalidatePath(`/admin/colaboradores/${employeeId}/desarrollo/1-a-1/${meetingId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}/desarrollo/1-a-1/${meetingId}`,
      "notice",
      result.status === "finalized"
        ? "development_one_on_one_finalized"
        : "development_one_on_one_draft_saved",
    ),
  );
}

export async function updateOneOnOneActionStatusAction(formData: FormData) {
  const input = z
    .object({
      actionId: z.uuid(),
      employeeId: z.string().regex(/^[a-f\d]{24}$/i),
      meetingId: z.string().regex(/^[a-f\d]{24}$/i),
      status: z.enum(["completed", "open"]),
      version: z.coerce.number().int().min(1),
    })
    .safeParse({
      actionId: stringValue(formData, "actionId"),
      employeeId: stringValue(formData, "employeeId"),
      meetingId: stringValue(formData, "meetingId"),
      status: stringValue(formData, "status"),
      version: formData.get("version"),
    });
  if (!input.success) redirect("/admin/desarrollo");

  try {
    await updateOneOnOneActionForAdministration({
      actionId: input.data.actionId,
      employeeId: input.data.employeeId,
      expectedVersion: input.data.version,
      meetingId: input.data.meetingId,
      status: input.data.status,
    });
  } catch (error) {
    if (!(error instanceof DevelopmentDomainError)) throw error;
    redirect(
      createFeedbackUrl(
        `/admin/colaboradores/${input.data.employeeId}/desarrollo/1-a-1/${input.data.meetingId}`,
        "error",
        "development_one_on_one_action_failed",
      ),
    );
  }

  revalidatePath("/admin/desarrollo");
  revalidatePath(
    `/admin/colaboradores/${input.data.employeeId}/desarrollo/1-a-1/${input.data.meetingId}`,
  );
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${input.data.employeeId}/desarrollo/1-a-1/${input.data.meetingId}`,
      "notice",
      "development_one_on_one_action_updated",
    ),
  );
}
