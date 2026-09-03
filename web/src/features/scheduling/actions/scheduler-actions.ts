"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { SchedulerActionState } from "@/features/scheduling/domain/scheduler-action-state";
import {
  COSTA_RICA_TIMEZONE,
  scheduleDateSchema,
  scheduleDayOfWeekOrder,
  scheduleV2InputSchema,
  SchedulingDomainError,
} from "@/features/scheduling/domain/schedule";
import { replaceEmployeeScheduleAsAdministrator } from "@/features/scheduling/server/scheduler-service";

const employeeIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const cycleSchema = z.enum(["weekly", "alternating"]);

function previousMonday(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function readWeek(formData: FormData, index: number) {
  return {
    shifts: scheduleDayOfWeekOrder.flatMap((dayOfWeek) => {
      if (formData.get(`week${index}.${dayOfWeek}.enabled`) !== "on") return [];

      return [
        {
          dayOfWeek,
          endTime: formData.get(`week${index}.${dayOfWeek}.endTime`),
          startTime: formData.get(`week${index}.${dayOfWeek}.startTime`),
        },
      ];
    }),
  };
}

function zodState(error: z.ZodError): SchedulerActionState {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".");
    if (!errors[field]) errors[field] = issue.message;
  }

  return {
    errors,
    message: "Revisá los días, las horas y la vigencia antes de guardar.",
    status: "error",
  };
}

function domainState(error: unknown): SchedulerActionState {
  if (error instanceof SchedulingDomainError) {
    const messages = {
      coverage_gap: "El historial tiene un período sin cobertura.",
      employee_not_found: "No encontramos un colaborador activo con ese identificador.",
      invalid_range: "La vigencia seleccionada no es válida.",
      overlapping_schedule_coverage: "El historial contiene horarios traslapados.",
      schedule_overlap: "La fecha se traslapa con otro horario vigente o futuro.",
    } as const;

    return { message: messages[error.code], status: "error" };
  }

  return {
    message: "No fue posible guardar el horario. Intentá nuevamente.",
    status: "error",
  };
}

export async function saveEmployeeScheduleAction(
  _state: SchedulerActionState,
  formData: FormData,
): Promise<SchedulerActionState> {
  const employeeId = employeeIdSchema.safeParse(formData.get("employeeId"));
  const effectiveFrom = scheduleDateSchema.safeParse(formData.get("effectiveFrom"));
  const cycle = cycleSchema.safeParse(formData.get("cycle"));
  const failure =
    (!employeeId.success && employeeId.error) ||
    (!effectiveFrom.success && effectiveFrom.error) ||
    (!cycle.success && cycle.error);
  if (failure) return zodState(failure);

  const requestedAnchor = formData.get("anchorDate");
  const anchorDate =
    cycle.data === "weekly" ? previousMonday(effectiveFrom.data) : requestedAnchor;
  const weeks =
    cycle.data === "weekly"
      ? [readWeek(formData, 0)]
      : [readWeek(formData, 0), readWeek(formData, 1)];
  const schedule = scheduleV2InputSchema.safeParse({
    anchorDate,
    effectiveFrom: effectiveFrom.data,
    effectiveTo: null,
    timezone: COSTA_RICA_TIMEZONE,
    version: 2,
    weeks,
  });
  if (!schedule.success) return zodState(schedule.error);

  try {
    await replaceEmployeeScheduleAsAdministrator({
      ...schedule.data,
      employeeId: employeeId.data,
    });
  } catch (error) {
    return domainState(error);
  }

  revalidatePath("/admin/horarios");
  revalidatePath(`/admin/horarios/${employeeId.data}`);
  redirect(`/admin/horarios/${employeeId.data}?guardado=1`);
}
