"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { CalendarEventForm } from "@/features/calendar/components/calendar-event-form";
import type { CalendarEventTargetOptions } from "@/features/calendar/server/calendar-event-repository";

type CalendarCreateEventTriggerProps = {
  options: CalendarEventTargetOptions;
};

export function CalendarCreateEventTrigger({
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
      <Button onClick={handleOpen}>
        <CalendarPlus aria-hidden="true" size={18} />
        Nuevo evento
      </Button>
      {isOpen && (
        <Modal
          description="Definí la fecha y quién podrá consultar el evento."
          onClose={handleClose}
          title="Nuevo evento"
        >
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
