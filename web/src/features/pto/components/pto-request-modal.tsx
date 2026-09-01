"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import { PtoRequestForm } from "@/features/pto/components/pto-request-form";

import styles from "./pto-request-modal.module.css";

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
      <Button
        aria-label="Nueva solicitud"
        className={styles.trigger}
        onClick={handleOpen}
        size="small"
        title="Nueva solicitud"
      >
        <CalendarPlus aria-hidden="true" size={17} />
        <span className={styles.label}>Nueva solicitud</span>
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
