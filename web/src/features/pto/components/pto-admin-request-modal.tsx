"use client";

import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button/button";
import { Modal } from "@/components/ui/modal/modal";
import {
  PtoRequestForm,
  type PtoCollaboratorOption,
} from "@/features/pto/components/pto-request-form";

import styles from "./pto-request-modal.module.css";

export function PtoAdminRequestModal({
  collaborators,
}: {
  collaborators: PtoCollaboratorOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        aria-label="Nueva ausencia"
        className={styles.trigger}
        disabled={collaborators.length === 0}
        onClick={() => setIsOpen(true)}
        size="small"
        title={
          collaborators.length === 0 ? "No hay colaboradores activos" : "Nueva ausencia"
        }
      >
        <CalendarPlus aria-hidden="true" size={17} />
        <span className={styles.label}>Nueva ausencia</span>
      </Button>

      {isOpen && (
        <Modal
          description="Seleccioná al colaborador y registrá la ausencia. La solicitud se aprobará al confirmar."
          icon={<CalendarPlus aria-hidden="true" size={21} strokeWidth={1.9} />}
          onClose={() => setIsOpen(false)}
          title="Nueva ausencia"
        >
          <PtoRequestForm
            collaborators={collaborators}
            onCancel={() => setIsOpen(false)}
            presentation="modal"
          />
        </Modal>
      )}
    </>
  );
}
