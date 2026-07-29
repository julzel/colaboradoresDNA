import { Button, ButtonLink } from "@/components/ui/button/button";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { SelectField, TextField } from "@/components/ui/form-field/form-field";
import type {
  PlatformRole,
  PlatformUserStatus,
} from "@/features/auth/domain/platform-user";
import type { Department } from "@/features/employees/domain/department";
import type { EmployeeDirectoryQuery } from "@/features/employees/domain/employee-directory-query";
import type { EmploymentStatus } from "@/features/employees/domain/employee";

import styles from "./employee-management.module.css";

type EmployeeDirectoryFiltersProps = {
  departments: Department[];
  query: EmployeeDirectoryQuery;
};

export function EmployeeDirectoryFilters({
  departments,
  query,
}: EmployeeDirectoryFiltersProps) {
  return (
    <ElevatedSurface as="form" className={styles.toolbar} method="get" role="search">
      <TextField
        defaultValue={query.search}
        id="search"
        label="Buscar por nombre"
        name="search"
        placeholder="Nombre o apellido"
        type="search"
      />
      <SelectField
        defaultValue={query.department}
        id="department"
        label="Departamento"
        name="department"
      >
        <option value="">Todos</option>
        {departments.map((department) => (
          <option key={department.id} value={department.id}>
            {department.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        defaultValue={query.employment satisfies EmploymentStatus | undefined}
        id="employment"
        label="Estado laboral"
        name="employment"
      >
        <option value="">Todos</option>
        <option value="active">Activo</option>
        <option value="inactive">Inactivo</option>
      </SelectField>
      <SelectField
        defaultValue={query.access satisfies PlatformUserStatus | undefined}
        id="access"
        label="Estado de acceso"
        name="access"
      >
        <option value="">Todos</option>
        <option value="active">Activo</option>
        <option value="invited">Invitado</option>
        <option value="deactivated">Desactivado</option>
      </SelectField>
      <SelectField
        defaultValue={query.role satisfies PlatformRole | undefined}
        id="role"
        label="Rol"
        name="role"
      >
        <option value="">Todos</option>
        <option value="administrator">Administrador</option>
        <option value="supervisor">Supervisor</option>
        <option value="collaborator">Colaborador</option>
      </SelectField>
      <SelectField defaultValue={query.sort} id="sort" label="Ordenar" name="sort">
        <option value="name_asc">Nombre A–Z</option>
        <option value="name_desc">Nombre Z–A</option>
        <option value="start_desc">Ingreso más reciente</option>
        <option value="start_asc">Ingreso más antiguo</option>
      </SelectField>
      <div className={styles.toolbarActions}>
        <Button type="submit">Aplicar</Button>
        <ButtonLink href="/admin/colaboradores" variant="quiet">
          Limpiar
        </ButtonLink>
      </div>
    </ElevatedSurface>
  );
}
