"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { platformRoleSchema } from "@/features/auth/domain/platform-user";
import {
  AdminEmailUpdateError,
  updateEmployeeEmailAsAdministrator,
} from "@/features/auth/server/admin-email-service";
import { employeeAssignmentInputSchema } from "@/features/employees/domain/assignment";
import {
  employeeInputSchema,
  employeePersonalInformationInputSchema,
} from "@/features/employees/domain/employee";
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
  EmployeeAdministrationError,
  createEmployeeForAdministration,
  endEmployeeEmploymentForAdministration,
  resendEmployeeInvitationForAdministration,
  revealEmployeeIdentificationForAdministration,
  updateEmployeePersonalInformationForAdministration,
  updateEmployeeRoleForAdministration,
} from "@/features/employees/server/employee-administration-service";
import {
  replaceEmployeeAssignmentAsAdministrator,
  replaceEmployeeScheduleAsAdministrator,
} from "@/features/employees/server/employee-service";
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

  if (error instanceof EmployeeAdministrationError) {
    const messages: Record<EmployeeAdministrationError["code"], string> = {
      invitation_failed: "No fue posible enviar la invitación.",
      invitation_not_pending: "La cuenta ya no tiene una invitación pendiente.",
      own_employment_end: "No podés finalizar tu propia relación laboral.",
      role_update_failed: "No fue posible cambiar el rol.",
    };

    return { message: messages[error.code], status: "error" };
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
    result = await createEmployeeForAdministration({
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

  revalidatePath("/admin/colaboradores");
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${result.employeeId}`,
      result.invitationSent ? "notice" : "error",
      result.invitationSent
        ? "employee_created"
        : "employee_created_invitation_pending",
    ),
  );
}

export async function updateEmployeePersonalAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  const employeeId = objectIdStringSchema.safeParse(formData.get("employeeId"));
  const parsed = employeePersonalInformationInputSchema.safeParse({
    birthDay: formData.get("birthDay"),
    birthMonth: formData.get("birthMonth"),
    firstSurname: formData.get("firstSurname"),
    givenNames: formData.get("givenNames"),
    identification: {
      type: formData.get("identificationType"),
      value: formData.get("identificationValue"),
    },
    phoneNumber: nullableString(formData, "phoneNumber"),
    secondSurname: nullableString(formData, "secondSurname"),
    shareBirthdayOnCalendar: booleanValue(formData, "shareBirthdayOnCalendar"),
  });
  const failure =
    (!employeeId.success && employeeId.error) || (!parsed.success && parsed.error);
  if (failure) return zodState(failure);

  try {
    await updateEmployeePersonalInformationForAdministration({
      employeeId: employeeId.data,
      input: parsed.data,
    });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath(`/admin/colaboradores/${employeeId.data}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${employeeId.data}`,
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
  const parsed = z
    .object({ employeeId: objectIdStringSchema, role: platformRoleSchema })
    .safeParse({
      employeeId: formData.get("employeeId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return zodState(parsed.error);

  try {
    await updateEmployeeRoleForAdministration(parsed.data);
  } catch (error) {
    return domainState(error);
  }

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
  const employeeId = objectIdStringSchema.parse(formData.get("employeeId"));

  try {
    await resendEmployeeInvitationForAdministration(employeeId);
  } catch (error) {
    const key =
      error instanceof EmployeeAdministrationError &&
      (error.code === "invitation_failed" || error.code === "invitation_not_pending")
        ? error.code
        : "invitation_failed";
    redirect(createFeedbackUrl(`/admin/colaboradores/${employeeId}`, "error", key));
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

  let result;
  try {
    result = await endEmployeeEmploymentForAdministration({
      employeeId: parsed.data.employeeId,
      endedOn: parsed.data.endedOn,
    });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath(`/admin/colaboradores/${parsed.data.employeeId}`);
  redirect(
    createFeedbackUrl(
      `/admin/colaboradores/${parsed.data.employeeId}`,
      result.clerkSyncFailed ? "error" : "notice",
      result.clerkSyncFailed ? "employee_ended_sync_pending" : "employee_ended",
    ),
  );
}

export async function revealEmployeeIdentificationAction(
  _state: IdentificationRevealState,
  formData: FormData,
): Promise<IdentificationRevealState> {
  const parsed = objectIdStringSchema.safeParse(formData.get("employeeId"));
  if (!parsed.success) return { status: "error" };
  const value = await revealEmployeeIdentificationForAdministration(parsed.data);
  return value ? { status: "success", value } : { status: "error" };
}
