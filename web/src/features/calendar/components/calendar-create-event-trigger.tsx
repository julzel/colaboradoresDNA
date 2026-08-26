"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import type { CalendarEventTargetOptions } from "@/features/calendar/view-models/calendar-event-view";

type CalendarCreateEventTriggerProps = {
  className?: string | undefined;
  options: CalendarEventTargetOptions;
};

export function CalendarCreateEventTrigger({
  className,
  options,
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
        onClick={handleOpen}
        size="small"
        title="Nuevo evento"
      >
        <CalendarPlus aria-hidden="true" size={20} />
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
