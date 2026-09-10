"use client";

import { useState } from "react";

import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import type { IdentificationType } from "@/features/employees/domain/employee";

const fieldConfiguration = {
  national_id: {
    description: "Usá 9 dígitos, con o sin guiones: 1-2345-6789.",
    inputMode: "numeric",
    maxLength: 11,
    pattern: "[1-9][0-9]{8}|[1-9]-[0-9]{4}-[0-9]{4}",
    placeholder: "1-2345-6789",
  },
  residence_id: {
    description: "Usá 11 o 12 dígitos, sin espacios ni guiones.",
    inputMode: "numeric",
    maxLength: 12,
    pattern: "[1-9][0-9]{10,11}",
    placeholder: "12345678901",
  },
  other: {
    description: "Ingresá el número tal como aparece en el documento.",
    inputMode: "text",
    maxLength: 120,
    pattern: undefined,
    placeholder: "Número de identificación",
  },
} as const;

type IdentificationFieldsProps = {
  defaultType?: IdentificationType;
  defaultValue?: string;
  identificationError?: string | undefined;
  typeError?: string | undefined;
};

export function IdentificationFields({
  defaultType = "national_id",
  defaultValue = "",
  identificationError,
  typeError,
}: IdentificationFieldsProps) {
  const [type, setType] = useState<IdentificationType>(defaultType);
  const configuration = fieldConfiguration[type];

  return (
    <>
      <SelectField
        error={typeError}
        id="identificationType"
        label="Tipo de identificación"
        name="identificationType"
        onChange={(event) => setType(event.currentTarget.value as IdentificationType)}
        value={type}
        required
      >
        <option value="national_id">Cédula</option>
        <option value="residence_id">DIMEX</option>
        <option value="other">Otro</option>
      </SelectField>
      <TextField
        autoComplete="off"
        defaultValue={defaultValue}
        description={configuration.description}
        error={identificationError}
        id="identificationValue"
        inputMode={configuration.inputMode}
        label="Identificación"
        maxLength={configuration.maxLength}
        name="identificationValue"
        pattern={configuration.pattern}
        placeholder={configuration.placeholder}
        required
        title={configuration.description}
      />
    </>
  );
}
