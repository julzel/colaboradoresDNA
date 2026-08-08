"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { platformRoleSchema } from "@/features/auth/domain/platform-user";
import { recordAuthAudit } from "@/features/auth/server/auth-audit-repository";
import {
  AdminEmailUpdateError,
  updateEmployeeEmailAsAdministrator,
} from "@/features/auth/server/admin-email-service";
import {
  safelySendPlatformInvitation,
  sendPlatformInvitation,
} from "@/features/auth/server/invitation-service";
import {
  findPlatformUserById,
  markPlatformUserInvitationFailed,
  setPlatformUserClerkSyncStatus,
  updatePlatformUserRole,
} from "@/features/auth/server/platform-user-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { employeeAssignmentInputSchema } from "@/features/employees/domain/assignment";
import { employeeInputSchema } from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import type {
  EmployeeActionState,
  IdentificationRevealState,
} from "@/features/employees/domain/employee-action-state";
import {
  dayOfWeekOrder,
  employeeScheduleInputSchema,
  type HalfDayPeriod,
  type ScheduledDay,
  type WorkFraction,
} from "@/features/employees/domain/schedule";
import {
  isoCalendarDateSchema,
  objectIdStringSchema,
} from "@/features/employees/domain/shared";
import {
  createEmployeeWithAccess,
  replaceEmployeeAssignmentAsAdministrator,
  replaceEmployeeScheduleAsAdministrator,
  updateEmployeePersonalInformationAsAdministrator,
} from "@/features/employees/server/employee-service";
import {
  endEmployeeEmployment,
  findEmployeeById,
} from "@/features/employees/server/employee-repository";
import { revealEmployeeIdentificationValue } from "@/features/employees/server/employee-read-repository";
import { createFeedbackUrl } from "@/lib/actions/feedback-messages";
import { PtoDomainError, ptoOpeningBalanceDaysSchema } from "@/features/pto/domain/pto";

function booleanValue(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function nullableString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value : null;
}

function zodState(error: z.ZodError): EmployeeActionState {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const name = issue.path.join(".");
    if (!errors[name]) errors[name] = issue.message;
  }

  return {
    errors,
    message: "Revisá los campos señalados antes de continuar.",
    status: "error",
  };
}

function domainState(error: unknown): EmployeeActionState {
  if (error instanceof PtoDomainError) {
    return {
      message:
        error.code === "balance_exists"
          ? "El colaborador ya tiene un saldo de ausencias."
          : "No fue posible registrar el saldo inicial de ausencias.",
      status: "error",
    };
  }

  if (error instanceof EmployeeDomainError) {
    const messages: Record<string, string> = {
      assignment_overlap:
        "La fecha se traslapa con otra asignación. Elegí una vigencia posterior.",
      department_inactive: "El departamento seleccionado ya no está activo.",
      employee_exists: "Ya existe un colaborador con esa cuenta o identificación.",
      employee_not_found: "No encontramos el colaborador solicitado.",
      employment_date_invalid:
        "La fecha de salida no puede ser anterior a la fecha de ingreso.",
      manager_cycle: "Esta jefatura crearía un ciclo de reporte.",
      manager_ineligible:
        "La jefatura debe ser una persona activa con rol de supervisión o administración.",
      platform_user_missing: "No encontramos la cuenta de acceso asociada.",
      schedule_overlap:
        "La fecha se traslapa con otro horario. Elegí una vigencia posterior.",
    };

    return {
      message: messages[error.code] ?? "No fue posible guardar los cambios.",
      status: "error",
    };
  }

  return {
    message: "Ocurrió un error inesperado. Intentá nuevamente.",
    status: "error",
  };
}

function readSchedule(formData: FormData): ScheduledDay[] {
  return dayOfWeekOrder.map((dayOfWeek) => {
    const workFraction = Number(
      formData.get(`${dayOfWeek}.workFraction`),
    ) as WorkFraction;
    const period = formData.get(`${dayOfWeek}.halfDayPeriod`);

    return {
      dayOfWeek,
      halfDayPeriod:
        workFraction === 0.5 && (period === "morning" || period === "afternoon")
          ? (period as HalfDayPeriod)
          : null,
      workFraction,
    };
  });
}

export async function createEmployeeAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const employeeInput = {
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    employmentEndedOn: null,
    employmentStartedOn: formData.get("employmentStartedOn"),
    employmentStatus: "active",
    firstSurname: formData.get("firstSurname"),
    givenNames: formData.get("givenNames"),
    identification: {
      type: formData.get("identificationType"),
      value: formData.get("identificationValue"),
    },
    phoneNumber: nullableString(formData, "phoneNumber"),
    secondSurname: nullableString(formData, "secondSurname"),
    shareBirthdayOnCalendar: booleanValue(formData, "shareBirthdayOnCalendar"),
  } as const;
  const parsedEmployee = employeeInputSchema.safeParse({
    ...employeeInput,
    platformUserId: "000000000000000000000001",
  });
  const parsedAccess = z
    .object({ email: z.email(), role: platformRoleSchema })
    .safeParse({ email: formData.get("email"), role: formData.get("role") });
  const parsedAssignment = employeeAssignmentInputSchema.safeParse({
    createdByPlatformUserId: "000000000000000000000001",
    departmentId: formData.get("departmentId"),
    effectiveFrom: formData.get("employmentStartedOn"),
    effectiveTo: null,
    employeeId: "000000000000000000000002",
    managerEmployeeId: nullableString(formData, "managerEmployeeId"),
    positionTitle: formData.get("positionTitle"),
  });
  const parsedSchedule = employeeScheduleInputSchema.safeParse({
    createdByPlatformUserId: "000000000000000000000001",
    days: readSchedule(formData),
    effectiveFrom: formData.get("employmentStartedOn"),
    effectiveTo: null,
    employeeId: "000000000000000000000002",
    timezone: "America/Costa_Rica",
  });
  const parsedOpeningPtoBalance = ptoOpeningBalanceDaysSchema.safeParse(
    formData.get("initialPtoBalanceDays"),
  );

  const failure =
    (!parsedEmployee.success && parsedEmployee.error) ||
    (!parsedAccess.success && parsedAccess.error) ||
    (!parsedAssignment.success && parsedAssignment.error) ||
    (!parsedSchedule.success && parsedSchedule.error) ||
    (!parsedOpeningPtoBalance.success && parsedOpeningPtoBalance.error);
  if (failure) return zodState(failure);

  let result;
  try {
    const employee = parsedEmployee.data;
    result = await createEmployeeWithAccess({
      access: parsedAccess.data,
      assignment: parsedAssignment.data,
      employee: {
        birthDay: employee.birthDay,
        birthMonth: employee.birthMonth,
        employmentEndedOn: employee.employmentEndedOn,
        employmentStartedOn: employee.employmentStartedOn,
        employmentStatus: employee.employmentStatus,
        firstSurname: employee.firstSurname,
        givenNames: employee.givenNames,
        identification: {
          type: employee.identification.type,
          value: employee.identification.value,
        },
        phoneNumber: employee.phoneNumber?.displayValue ?? null,
        secondSurname: employee.secondSurname,
        shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
      },
      openingPtoBalanceUnits: parsedOpeningPtoBalance.data,
      schedule: parsedSchedule.data,
    });
  } catch (error) {
    return domainState(error);
  }

  const invitationSent = await safelySendPlatformInvitation({
    email: result.platformUser.normalizedEmail,
    platformUserId: result.platformUser.id,
  });
  await recordAuthAudit({
    action: invitationSent ? "invitation_created" : "invitation_failed",
    actorClerkUserId: result.actor.clerkUserId ?? "system",
    actorPlatformUserId: result.actor.id,
    metadata: { role: result.platformUser.role },
    targetPlatformUserId: result.platformUser.id,
  });
  revalidatePath("/admin/colaboradores");
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${result.employee.id}`,
      invitationSent ? "notice" : "error",
      invitationSent ? "employee_created" : "employee_created_invitation_pending",
    ),
  );
}

export async function updateEmployeePersonalAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  await requirePlatformUser({ roles: ["administrator"] });
  const employeeId = String(formData.get("employeeId"));
  const existing = await findEmployeeById(employeeId);
  if (!existing) return domainState(new EmployeeDomainError("employee_not_found"));
  const input = {
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    employmentEndedOn: existing.employmentEndedOn,
    employmentStartedOn: existing.employmentStartedOn,
    employmentStatus: existing.employmentStatus,
    firstSurname: formData.get("firstSurname"),
    givenNames: formData.get("givenNames"),
    identification: {
      type: formData.get("identificationType"),
      value: formData.get("identificationValue"),
    },
    phoneNumber: nullableString(formData, "phoneNumber"),
    platformUserId: existing.platformUserId,
    secondSurname: nullableString(formData, "secondSurname"),
    shareBirthdayOnCalendar: booleanValue(formData, "shareBirthdayOnCalendar"),
  };
  const parsed = employeeInputSchema.safeParse(input);
  if (!parsed.success) return zodState(parsed.error);

  try {
    const employee = parsed.data;
    await updateEmployeePersonalInformationAsAdministrator(employeeId, {
      birthDay: employee.birthDay,
      birthMonth: employee.birthMonth,
      employmentEndedOn: employee.employmentEndedOn,
      employmentStartedOn: employee.employmentStartedOn,
      employmentStatus: employee.employmentStatus,
      firstSurname: employee.firstSurname,
      givenNames: employee.givenNames,
      identification: {
        type: employee.identification.type,
        value: employee.identification.value,
      },
      phoneNumber: employee.phoneNumber?.displayValue ?? null,
      platformUserId: employee.platformUserId,
      secondSurname: employee.secondSurname,
      shareBirthdayOnCalendar: employee.shareBirthdayOnCalendar,
    });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath(`/admin/colaboradores/${employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}`,
      "notice",
      "employee_personal_updated",
    ),
  );
}

export async function updateEmployeeAssignmentAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const parsed = employeeAssignmentInputSchema.safeParse({
    createdByPlatformUserId: "000000000000000000000001",
    departmentId: formData.get("departmentId"),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: null,
    employeeId: formData.get("employeeId"),
    managerEmployeeId: nullableString(formData, "managerEmployeeId"),
    positionTitle: formData.get("positionTitle"),
  });
  if (!parsed.success) return zodState(parsed.error);

  try {
    await replaceEmployeeAssignmentAsAdministrator(parsed.data);
  } catch (error) {
    return domainState(error);
  }
  revalidatePath(`/admin/colaboradores/${parsed.data.employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${parsed.data.employeeId}`,
      "notice",
      "employee_assignment_updated",
    ),
  );
}

export async function updateEmployeeScheduleAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const parsed = employeeScheduleInputSchema.safeParse({
    createdByPlatformUserId: "000000000000000000000001",
    days: readSchedule(formData),
    effectiveFrom: formData.get("effectiveFrom"),
    effectiveTo: null,
    employeeId: formData.get("employeeId"),
    timezone: "America/Costa_Rica",
  });
  if (!parsed.success) return zodState(parsed.error);

  try {
    await replaceEmployeeScheduleAsAdministrator(parsed.data);
  } catch (error) {
    return domainState(error);
  }
  revalidatePath(`/admin/colaboradores/${parsed.data.employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${parsed.data.employeeId}`,
      "notice",
      "employee_schedule_updated",
    ),
  );
}

export async function updateEmployeeAccessAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsed = z
    .object({ employeeId: objectIdStringSchema, role: platformRoleSchema })
    .safeParse({
      employeeId: formData.get("employeeId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return zodState(parsed.error);
  const employee = await findEmployeeById(parsed.data.employeeId);
  if (!employee) return domainState(new EmployeeDomainError("employee_not_found"));
  const updated = await updatePlatformUserRole({
    id: employee.platformUserId,
    role: parsed.data.role,
  });
  if (!updated) return { message: "No fue posible cambiar el rol.", status: "error" };
  await recordAuthAudit({
    action: "role_updated",
    actorClerkUserId: actor.clerkUserId,
    actorPlatformUserId: actor.platformUser.id,
    metadata: { role: updated.role },
    targetPlatformUserId: updated.id,
  });
  const employeeId = parsed.data.employeeId;
  revalidatePath(`/admin/colaboradores/${employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}`,
      "notice",
      "employee_access_updated",
    ),
  );
}

export async function updateEmployeeEmailAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const parsed = z
    .object({
      email: z.email().max(254),
      employeeId: objectIdStringSchema,
    })
    .safeParse({
      email: formData.get("email"),
      employeeId: formData.get("employeeId"),
    });
  if (!parsed.success) return zodState(parsed.error);

  let result;
  try {
    result = await updateEmployeeEmailAsAdministrator(parsed.data);
  } catch (error) {
    if (error instanceof AdminEmailUpdateError) {
      const messages: Record<AdminEmailUpdateError["code"], string> = {
        account_not_editable:
          "El correo no se puede cambiar mientras la cuenta está desactivada.",
        email_exists: "Ese correo ya está asignado a otra cuenta.",
        employee_not_found: "No encontramos el colaborador solicitado.",
        identity_sync_failed:
          "No fue posible sincronizar el correo con el proveedor de acceso.",
      };
      const message = messages[error.code];
      return {
        ...(error.code === "email_exists" && { errors: { email: message } }),
        message,
        status: "error",
      };
    }

    return {
      message: "No fue posible actualizar el correo. Intentá nuevamente.",
      status: "error",
    };
  }

  const employeeId = parsed.data.employeeId;
  revalidatePath(`/admin/colaboradores/${employeeId}`);

  if (!result.changed) {
    redirect(`/admin/colaboradores/${employeeId}`);
  }

  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}`,
      "notice",
      result.invitationSent
        ? "employee_email_updated"
        : "employee_email_updated_invitation_pending",
    ),
  );
}

export async function resendEmployeeInvitation(formData: FormData) {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const employeeId = objectIdStringSchema.parse(formData.get("employeeId"));
  const employee = await findEmployeeById(employeeId);
  const target = employee ? await findPlatformUserById(employee.platformUserId) : null;
  if (!target || target.status !== "invited") {
    redirect(
      createFeedbackUrl(
        `/admin/colaboradores/${employeeId}`,
        "error",
        "invitation_not_pending",
      ),
    );
  }

  try {
    if (target.invitation.clerkInvitationId) {
      try {
        const client = await clerkClient();
        await client.invitations.revokeInvitation(target.invitation.clerkInvitationId);
      } catch {
        // An expired or previously revoked invitation is safe to replace.
      }
    }
    await sendPlatformInvitation({
      email: target.normalizedEmail,
      platformUserId: target.id,
    });
    await recordAuthAudit({
      action: "invitation_resent",
      actorClerkUserId: actor.clerkUserId,
      actorPlatformUserId: actor.platformUser.id,
      targetPlatformUserId: target.id,
    });
  } catch {
    await markPlatformUserInvitationFailed(target.id);
    redirect(
      createFeedbackUrl(
        `/admin/colaboradores/${employeeId}`,
        "error",
        "invitation_failed",
      ),
    );
  }
  revalidatePath(`/admin/colaboradores/${employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId}`,
      "notice",
      "invitation_resent",
    ),
  );
}

export async function endEmployeeEmploymentAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const actor = await requirePlatformUser({ roles: ["administrator"] });
  const parsed = z
    .object({
      employeeId: objectIdStringSchema,
      endedOn: isoCalendarDateSchema,
      confirmation: z.literal("on"),
    })
    .safeParse({
      confirmation: formData.get("confirmation"),
      employeeId: formData.get("employeeId"),
      endedOn: formData.get("endedOn"),
    });
  if (!parsed.success) return zodState(parsed.error);

  const employee = await findEmployeeById(parsed.data.employeeId);
  if (!employee) return domainState(new EmployeeDomainError("employee_not_found"));
  if (employee.platformUserId === actor.platformUser.id) {
    return {
      message: "No podés finalizar tu propia relación laboral.",
      status: "error",
    };
  }

  let platformUserId;
  try {
    platformUserId = await endEmployeeEmployment({
      actorPlatformUserId: actor.platformUser.id,
      employeeId: parsed.data.employeeId,
      endedOn: parsed.data.endedOn,
    });
  } catch (error) {
    return domainState(error);
  }

  let syncFailed = false;
  if (platformUserId) {
    const target = await findPlatformUserById(platformUserId);
    if (target?.clerkUserId) {
      try {
        const client = await clerkClient();
        await client.users.banUser(target.clerkUserId);
        await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
      } catch {
        syncFailed = true;
      }
    } else if (target) {
      await setPlatformUserClerkSyncStatus({ id: target.id, status: "synced" });
    }
    await recordAuthAudit({
      action: "account_deactivated",
      actorClerkUserId: actor.clerkUserId,
      actorPlatformUserId: actor.platformUser.id,
      metadata: { clerkSyncFailed: syncFailed, operation: "employment_end" },
      targetPlatformUserId: platformUserId,
    });
  }

  revalidatePath(`/admin/colaboradores/${parsed.data.employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${parsed.data.employeeId}`,
      syncFailed ? "error" : "notice",
      syncFailed ? "employee_ended_sync_pending" : "employee_ended",
    ),
  );
}

export async function revealEmployeeIdentificationAction(
  _state: IdentificationRevealState,
  formData: FormData,
): Promise<IdentificationRevealState> {
  await requirePlatformUser({ roles: ["administrator"] });
  const parsed = objectIdStringSchema.safeParse(formData.get("employeeId"));
  if (!parsed.success) return { status: "error" };
  const value = await revealEmployeeIdentificationValue(parsed.data);
  return value ? { status: "success", value } : { status: "error" };
}
