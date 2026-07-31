"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  employeeSelfServiceProfileInputSchema,
  type EmployeeSelfServiceProfileInput,
} from "@/features/employees/domain/employee";
import { EmployeeDomainError } from "@/features/employees/domain/errors";
import type { ProfileActionState } from "@/features/employees/domain/profile-action-state";
import { updateOwnEmployeeProfile } from "@/features/employees/server/employee-service";
import {
  ProfileImageError,
  removeOwnEmployeeProfileImage,
  updateOwnEmployeeProfileImage,
} from "@/features/employees/server/profile-image-service";

function nullableString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() ? value : null;
}

function zodState(error: z.ZodError): ProfileActionState {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const name = issue.path.join(".");
    if (name && !errors[name]) errors[name] = issue.message;
  }

  return {
    errors,
    message: "Revisá los campos señalados antes de guardar.",
    status: "error",
  };
}

function profileErrorState(error: unknown): ProfileActionState {
  if (error instanceof EmployeeDomainError) {
    return {
      message: "Tu cuenta todavía no está vinculada a un perfil de colaborador.",
      status: "error",
    };
  }

  if (error instanceof ProfileImageError) {
    const messages: Record<ProfileImageError["code"], string> = {
      empty_image: "Seleccioná una imagen antes de continuar.",
      image_too_large: "No fue posible reducir la imagen a menos de 1 MB.",
      invalid_image: "El archivo no contiene una imagen válida.",
      unsupported_image: "Usá una imagen JPEG, PNG o WebP.",
    };
    return { message: messages[error.code], status: "error" };
  }

  return {
    message: "No fue posible guardar el cambio. Intentá nuevamente.",
    status: "error",
  };
}

export async function updateOwnProfileAction(
  _state: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const input: EmployeeSelfServiceProfileInput = {
    phoneNumber: nullableString(formData, "phoneNumber"),
    preferredName: nullableString(formData, "preferredName"),
    shareBirthdayOnCalendar: formData.get("shareBirthdayOnCalendar") === "on",
  };
  const parsed = employeeSelfServiceProfileInputSchema.safeParse(input);
  if (!parsed.success) return zodState(parsed.error);

  try {
    await updateOwnEmployeeProfile(input);
  } catch (error) {
    return profileErrorState(error);
  }

  revalidatePath("/perfil");
  revalidatePath("/calendario");
  return { message: "Tu perfil fue actualizado.", status: "success" };
}

export async function updateOwnProfileImageAction(
  formData: FormData,
): Promise<ProfileActionState> {
  const file = formData.get("profileImage");
  if (!(file instanceof File)) {
    return { message: "Seleccioná una imagen válida.", status: "error" };
  }

  try {
    await updateOwnEmployeeProfileImage(file);
  } catch (error) {
    return profileErrorState(error);
  }

  revalidatePath("/perfil");
  return { message: "La foto de perfil fue actualizada.", status: "success" };
}

export async function removeOwnProfileImageAction(): Promise<ProfileActionState> {
  try {
    await removeOwnEmployeeProfileImage();
  } catch (error) {
    return profileErrorState(error);
  }

  revalidatePath("/perfil");
  return { message: "La foto fue eliminada.", status: "success" };
}
