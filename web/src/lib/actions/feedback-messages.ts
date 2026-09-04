export const feedbackMessages = {
  development_one_on_one_action_failed: {
    message: "No fue posible actualizar la acción acordada.",
    tone: "error",
  },
  development_one_on_one_action_updated: {
    message: "La acción acordada fue actualizada.",
    tone: "success",
  },
  development_one_on_one_draft_saved: {
    message: "El borrador del 1:1 fue guardado.",
    tone: "success",
  },
  development_one_on_one_finalized: {
    message: "El 1:1 fue finalizado.",
    tone: "success",
  },
  calendar_event_created: {
    message: "El evento fue creado.",
    tone: "success",
  },
  calendar_event_delete_failed: {
    message: "No fue posible eliminar el evento.",
    tone: "error",
  },
  calendar_event_deleted: {
    message: "El evento fue eliminado.",
    tone: "success",
  },
  calendar_event_updated: {
    message: "Los cambios del evento fueron guardados.",
    tone: "success",
  },
  employee_access_updated: {
    message: "El rol de plataforma fue actualizado.",
    tone: "success",
  },
  employee_email_updated: {
    message: "El correo de acceso fue actualizado.",
    tone: "success",
  },
  employee_email_updated_invitation_pending: {
    message:
      "El correo fue actualizado, pero la nueva invitación quedó pendiente para reenviar.",
    tone: "warning",
  },
  employee_assignment_updated: {
    message: "La nueva asignación fue guardada.",
    tone: "success",
  },
  employee_created: {
    message: "El colaborador fue creado y la invitación fue enviada.",
    tone: "success",
  },
  employee_created_invitation_deferred: {
    message:
      "El colaborador fue creado. Podés enviar la invitación de acceso y configurar su horario cuando estés listo.",
    tone: "success",
  },
  employee_created_invitation_pending: {
    message:
      "El colaborador fue creado, pero la invitación quedó pendiente para reenviar.",
    tone: "warning",
  },
  employee_ended: {
    message: "La relación laboral finalizó y el acceso fue revocado.",
    tone: "success",
  },
  employee_ended_sync_pending: {
    message:
      "La persona ya no puede entrar. La revocación en Clerk quedó pendiente para reintentar.",
    tone: "warning",
  },
  employee_personal_updated: {
    message: "La información personal fue actualizada.",
    tone: "success",
  },
  employee_schedule_updated: {
    message: "El nuevo horario fue guardado.",
    tone: "success",
  },
  account_deactivated: {
    message: "La cuenta fue desactivada y sus sesiones se revocaron.",
    tone: "success",
  },
  account_exists: {
    message: "Ya existe una cuenta con ese correo.",
    tone: "error",
  },
  account_reactivated: {
    message: "La cuenta fue reactivada.",
    tone: "success",
  },
  deactivated_sync_pending: {
    message:
      "La cuenta ya no puede entrar, pero la revocación en Clerk debe reintentarse.",
    tone: "error",
  },
  deactivation_failed: {
    message: "No fue posible desactivar la cuenta.",
    tone: "error",
  },
  invalid_account: {
    message: "La cuenta seleccionada no es válida.",
    tone: "error",
  },
  invalid_deactivation: {
    message: "No podés desactivar tu propia cuenta.",
    tone: "error",
  },
  invalid_invitation: {
    message: "Revisá el nombre, correo y rol de la invitación.",
    tone: "error",
  },
  invitation_failed: {
    message:
      "No fue posible enviar la invitación. El registro quedó pendiente para reintentar.",
    tone: "error",
  },
  invitation_not_pending: {
    message: "Esta cuenta ya no tiene una invitación pendiente.",
    tone: "error",
  },
  invitation_resent: {
    message: "La invitación fue revocada y enviada nuevamente.",
    tone: "success",
  },
  invitation_sent: {
    message: "La invitación fue enviada.",
    tone: "success",
  },
  reactivation_failed: {
    message: "No fue posible reactivar la cuenta.",
    tone: "error",
  },
  reactivation_sync_failed: {
    message: "Clerk no pudo desbloquear la identidad. La cuenta permanece desactivada.",
    tone: "error",
  },
} as const satisfies Record<
  string,
  { message: string; tone: "error" | "info" | "success" | "warning" }
>;

export type FeedbackMessageKey = keyof typeof feedbackMessages;
export type FeedbackTone = (typeof feedbackMessages)[FeedbackMessageKey]["tone"];

export function isFeedbackMessageKey(value: string): value is FeedbackMessageKey {
  return Object.hasOwn(feedbackMessages, value);
}

export function createFeedbackUrl(
  pathname: string,
  kind: "error" | "notice",
  messageKey: FeedbackMessageKey,
) {
  const [path = pathname, query = ""] = pathname.split("?");
  const params = new URLSearchParams(query);
  params.set(kind, messageKey);
  return `${path}?${params.toString()}`;
}
