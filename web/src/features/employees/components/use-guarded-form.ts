"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

type CancelBehavior = "back" | "callback" | "push";

export function useGuardedForm(
  cancelHref: string,
  cancelBehavior: CancelBehavior = "push",
  onCancel?: () => void,
) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);

  const handleChange = useCallback(() => {
    setDirty(true);
  }, []);

  const handleCancel = useCallback(() => {
    if (
      !dirty ||
      window.confirm("¿Querés descartar los cambios que todavía no guardaste?")
    ) {
      if (cancelBehavior === "back") {
        router.back();
        return;
      }

      if (cancelBehavior === "callback") {
        onCancel?.();
        return;
      }

      router.push(cancelHref);
    }
  }, [cancelBehavior, cancelHref, dirty, onCancel, router]);

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    const confirmation = event.currentTarget.dataset.confirmation;
    if (confirmation && !window.confirm(confirmation)) {
      event.preventDefault();
      return;
    }

    setDirty(false);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  return { dirty, formRef, handleCancel, handleChange, handleSubmit };
}
