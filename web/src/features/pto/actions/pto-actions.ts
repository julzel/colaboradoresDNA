"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { objectIdStringSchema } from "@/features/employees/domain/shared";
import {
  PtoDomainError,
  ptoAdjustmentDaysSchema,
  ptoDecisionInputSchema,
  ptoDraftInputSchema,
  ptoDurationDaysSchema,
  ptoOpeningBalanceDaysSchema,
} from "@/features/pto/domain/pto";
import type { PtoActionState } from "@/features/pto/domain/pto-action-state";
import {
  adjustEmployeePtoBalance,
  cancelOwnPtoRequest,
  createOwnPtoDraft,
  decideAssignedPtoRequest,
  getPtoRequestDetail,
  openEmployeePtoBalance,
  reassignOrphanedPtoApprover,
  submitOwnPtoDraft,
  updateOwnPtoDraft,
  updatePtoAdministrationSettings,
} from "@/features/pto/server/pto-service";

function getText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function zodState(error: z.ZodError): PtoActionState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join(".").replace("durationUnits", "durationDays");
    if (!errors[field]) errors[field] = issue.message;
  }
  return {
    errors,
    message: "Revisá los campos señalados.",
    status: "error",
  };
}

function ptoErrorState(error: unknown): PtoActionState {
  if (error instanceof z.ZodError) return zodState(error);
  if (error instanceof PtoDomainError) {
    const messages: Record<PtoDomainError["code"], string> = {
      approver_ineligible:
        "No hay una persona aprobadora elegible. Revisá la jefatura o la configuración de ausencias.",
      balance_exists: "Este colaborador ya tiene un saldo de ausencias.",
      balance_missing:
        "No hay un saldo inicial registrado. Administración debe configurarlo primero.",
      employee_missing: "No encontramos un colaborador activo asociado a esta cuenta.",
      forbidden: "No tenés permiso para realizar esta acción.",
      request_missing: "No encontramos la solicitud.",
      self_approval: "No podés aprobar tu propia solicitud.",
      stale_status:
        "La solicitud cambió mientras la estabas revisando. Actualizá la página.",
    };
    return { message: messages[error.code], status: "error" };
  }
  return { message: "Ocurrió un error inesperado. Intentá de nuevo.", status: "error" };
}

function parseDraft(formData: FormData) {
  const duration = ptoDurationDaysSchema.safeParse(getText(formData, "durationDays"));
  if (!duration.success) throw duration.error;
  return ptoDraftInputSchema.parse({
    category: getText(formData, "category"),
    collaboratorNote: getText(formData, "collaboratorNote"),
    durationUnits: duration.data,
    endDate: getText(formData, "endDate"),
    startDate: getText(formData, "startDate"),
  });
}

export async function savePtoDraftAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  let request;
  try {
    const input = parseDraft(formData);
    const requestId = getText(formData, "requestId");
    request = requestId
      ? await updateOwnPtoDraft(requestId, input)
      : await createOwnPtoDraft(input);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/ausencias");
  redirect(`/ausencias/${request.id}`);
}

export async function submitPtoRequestAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const parsedId = objectIdStringSchema.safeParse(getText(formData, "requestId"));
  if (!parsedId.success) return zodState(parsedId.error);
  try {
    const detail = await getPtoRequestDetail(parsedId.data);
    if (!detail) throw new PtoDomainError("request_missing");
    const hasWarnings = detail.warnings.hasOverlap || detail.warnings.wouldBeNegative;
    if (hasWarnings && getText(formData, "confirmWarnings") !== "true") {
      return {
        message:
          "Hay advertencias que no bloquean la solicitud. Revisalas y confirmá para enviar de todos modos.",
        requiresConfirmation: true,
        status: "warning",
      };
    }
    await submitOwnPtoDraft({
      requestId: parsedId.data,
      selectedAdministratorId: getText(formData, "administratorApproverId") || null,
    });
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/ausencias");
  revalidatePath(`/ausencias/${parsedId.data}`);
  redirect(`/ausencias/${parsedId.data}`);
}

export async function cancelPtoRequestAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const requestId = getText(formData, "requestId");
  try {
    await cancelOwnPtoRequest(requestId);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/ausencias");
  revalidatePath(`/ausencias/${requestId}`);
  redirect(`/ausencias/${requestId}`);
}

export async function decidePtoRequestAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const parsed = ptoDecisionInputSchema.safeParse({
    decision: getText(formData, "decision"),
    decisionNote: getText(formData, "decisionNote"),
    requestId: getText(formData, "requestId"),
  });
  if (!parsed.success) return zodState(parsed.error);
  try {
    const detail = await getPtoRequestDetail(parsed.data.requestId);
    if (!detail) throw new PtoDomainError("request_missing");
    const hasWarnings = detail.warnings.hasOverlap || detail.warnings.wouldBeNegative;
    if (
      parsed.data.decision === "approved" &&
      hasWarnings &&
      getText(formData, "confirmWarnings") !== "true"
    ) {
      return {
        message:
          "La solicitud tiene advertencias. Confirmá si querés aprobarla de todos modos.",
        requiresConfirmation: true,
        status: "warning",
      };
    }
    await decideAssignedPtoRequest(parsed.data);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/ausencias");
  revalidatePath(`/ausencias/${parsed.data.requestId}`);
  revalidatePath("/calendario");
  redirect(`/ausencias/${parsed.data.requestId}`);
}

export async function reassignPtoApproverAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const parsed = z
    .object({
      approverPlatformUserId: objectIdStringSchema,
      requestId: objectIdStringSchema,
    })
    .safeParse({
      approverPlatformUserId: getText(formData, "approverPlatformUserId"),
      requestId: getText(formData, "requestId"),
    });
  if (!parsed.success) return zodState(parsed.error);
  try {
    await reassignOrphanedPtoApprover(parsed.data);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/ausencias");
  revalidatePath(`/ausencias/${parsed.data.requestId}`);
  redirect(`/ausencias/${parsed.data.requestId}`);
}

export async function openPtoBalanceAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const employeeId = objectIdStringSchema.safeParse(getText(formData, "employeeId"));
  const balance = ptoOpeningBalanceDaysSchema.safeParse(
    getText(formData, "openingBalanceDays"),
  );
  const failure =
    (!employeeId.success && employeeId.error) || (!balance.success && balance.error);
  if (failure) return zodState(failure);
  try {
    await openEmployeePtoBalance(employeeId.data, balance.data);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath(`/admin/colaboradores/${employeeId.data}/ausencias`);
  redirect(`/admin/colaboradores/${employeeId.data}/ausencias`);
}

export async function adjustPtoBalanceAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const parsed = z
    .object({
      deltaUnits: ptoAdjustmentDaysSchema,
      employeeId: objectIdStringSchema,
      reason: z.string().trim().min(3, "Indicá el motivo del ajuste.").max(500),
    })
    .safeParse({
      deltaUnits: getText(formData, "adjustmentDays"),
      employeeId: getText(formData, "employeeId"),
      reason: getText(formData, "reason"),
    });
  if (!parsed.success) return zodState(parsed.error);
  if (getText(formData, "confirmAdjustment") !== "true") {
    return {
      message: "Confirmá el resultado del ajuste antes de aplicarlo.",
      status: "error",
    };
  }
  try {
    await adjustEmployeePtoBalance(parsed.data);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath(`/admin/colaboradores/${parsed.data.employeeId}/ausencias`);
  redirect(`/admin/colaboradores/${parsed.data.employeeId}/ausencias`);
}

export async function updatePtoSettingsAction(
  _state: PtoActionState,
  formData: FormData,
): Promise<PtoActionState> {
  const approverId = objectIdStringSchema.safeParse(
    getText(formData, "supervisorApproverPlatformUserId"),
  );
  if (!approverId.success) return zodState(approverId.error);
  try {
    await updatePtoAdministrationSettings(approverId.data);
  } catch (error) {
    return ptoErrorState(error);
  }
  revalidatePath("/admin/ausencias");
  revalidatePath("/ausencias");
  redirect("/admin/ausencias");
}
