"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import type { ButtonVariant } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import type { CalendarEventTargetOptions } from "@/features/calendar/view-models/calendar-event-view";

type CalendarCreateEventTriggerProps = {
  className?: string | undefined;
  fullWidth?: boolean;
  label?: string;
  options: CalendarEventTargetOptions;
  variant?: ButtonVariant;
};

export function CalendarCreateEventTrigger({
  className,
  fullWidth = false,
  label,
  options,
  variant = "primary",
}: CalendarCreateEventTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <>
      <Button
        aria-label="Nuevo evento"
        className={className}
        fullWidth={fullWidth}
        onClick={handleOpen}
        size="small"
        title="Nuevo evento"
        variant={variant}
      >
        <CalendarPlus aria-hidden="true" size={20} />
        {label && <span>{label}</span>}
      </Button>
      {isOpen && (
        <Modal onClose={handleClose} title="Nuevo evento">
          <CalendarEventForm
            cancelBehavior="callback"
            cancelHref="/calendario"
            mode="create"
            onCancel={handleClose}
            options={options}
            presentation="modal"
          />
        </Modal>
      )}
    </>
  );
}
