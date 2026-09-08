"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button/button";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
} from "@/components/ui/form-field/form-field";
import {
  planningDate,
  type CompanyContext,
  type KnowledgeRecord,
} from "../domain/contracts";
import styles from "./planning.module.css";

const kinds: Record<KnowledgeRecord["kind"], string> = {
  overview: "Empresa y productos",
  objective: "Objetivo",
  challenge: "Desafío",
  constraint: "Restricción",
  principle: "Criterio de prioridad",
  process: "Proceso",
};

export function ContextEditor({
  context,
  busy,
  onSave,
}: {
  context: CompanyContext;
  busy: boolean;
  onSave: (records: KnowledgeRecord[]) => Promise<void>;
}) {
  const [records, setRecords] = useState(context.records);
  const [expanded, setExpanded] = useState(context.records.length === 0);
  function update(id: string, changes: Partial<KnowledgeRecord>) {
    setRecords((current) =>
      current.map((record) => (record.id === id ? { ...record, ...changes } : record)),
    );
  }
  return (
    <details
      className={styles.context}
      open={expanded}
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary>
        Contexto de DNAture{" "}
        <span className={styles.muted}>
          {context.records.filter((record) => record.active).length} referencias activas
        </span>
      </summary>
      <p className={styles.muted}>
        Compartido entre administradores. Registrá información vigente y revisada; sólo
        las referencias activas se usan al priorizar. No incluyás notas privadas de
        colaboradores.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void onSave(records);
        }}
      >
        <fieldset disabled={busy} className={styles.fields}>
          {records.map((record, index) => (
            <section
              className={styles.contextRecord}
              key={record.id}
              aria-label={`Referencia ${index + 1}`}
            >
              <div className={styles.twoColumns}>
                <SelectField
                  id={`kind-${record.id}`}
                  label="Tipo de referencia"
                  value={record.kind}
                  onChange={(event) =>
                    update(record.id, {
                      kind: event.target.value as KnowledgeRecord["kind"],
                    })
                  }
                >
                  {Object.entries(kinds).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectField>
                <TextField
                  id={`title-${record.id}`}
                  label="Título"
                  value={record.title}
                  maxLength={160}
                  required
                  onChange={(event) => update(record.id, { title: event.target.value })}
                />
              </div>
              <TextAreaField
                id={`content-${record.id}`}
                label="Información y evidencia"
                value={record.content}
                maxLength={4000}
                rows={3}
                required
                placeholder="Describí el objetivo, su importancia, plazo y evidencia disponible."
                onChange={(event) => update(record.id, { content: event.target.value })}
              />
              <div className={styles.twoColumns}>
                <TextField
                  id={`owner-${record.id}`}
                  label="Responsable de la información"
                  value={record.owner}
                  maxLength={120}
                  required
                  onChange={(event) => update(record.id, { owner: event.target.value })}
                />
                <TextField
                  id={`date-${record.id}`}
                  label="Última revisión"
                  type="date"
                  value={record.reviewedOn}
                  max={planningDate()}
                  required
                  onChange={(event) =>
                    update(record.id, { reviewedOn: event.target.value })
                  }
                />
              </div>
              <CheckboxField
                id={`active-${record.id}`}
                label="Referencia activa"
                checked={record.active}
                onChange={(event) =>
                  update(record.id, { active: event.target.checked })
                }
              />
            </section>
          ))}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy}>
              Guardar contexto
            </Button>
            <Button
              variant="secondary"
              disabled={records.length >= 20}
              onClick={() =>
                setRecords((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    kind: "objective",
                    title: "",
                    content: "",
                    owner: "",
                    reviewedOn: planningDate(),
                    active: true,
                  },
                ])
              }
            >
              <Plus size={16} aria-hidden="true" /> Agregar referencia
            </Button>
          </div>
        </fieldset>
      </form>
    </details>
  );
}
