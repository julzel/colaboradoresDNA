export const feedbackMessages = {
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
  const params = new URLSearchParams({ [kind]: messageKey });
  return `${pathname}?${params.toString()}`;
}
