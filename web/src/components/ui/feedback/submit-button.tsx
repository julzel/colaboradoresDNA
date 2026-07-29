"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button/button";
import { Spinner } from "@/components/ui/feedback/spinner";

type SubmitButtonProps = Omit<ButtonProps, "disabled" | "type"> & {
  disabled?: boolean;
  pendingLabel: string;
};

export function SubmitButton({
  children,
  disabled = false,
  pendingLabel,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      aria-disabled={disabled || pending}
      disabled={disabled || pending}
      type="submit"
      {...props}
    >
      {pending && <Spinner size="small" />}
      {pending ? pendingLabel : children}
    </Button>
  );
}
