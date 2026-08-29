"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";

export function PtoRequestModal() {
  const [isOpen, setIsOpen] = useState(false);

  function handleOpen() {
    setIsOpen(true);
  }

  function handleClose() {
    setIsOpen(false);
  }

  return (
    <>
      <Button onClick={handleOpen} size="small">
        <CalendarPlus aria-hidden="true" size={17} />
        Nueva solicitud
      </Button>
      {isOpen && (
        <Modal
          icon={<CalendarPlus aria-hidden="true" size={21} strokeWidth={1.9} />}
          onClose={handleClose}
          title="Nueva solicitud"
        >
          <PtoRequestForm onCancel={handleClose} presentation="modal" />
        </Modal>
      )}
    </>
  );
}
