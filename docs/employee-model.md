# Employee model implementation

The approved employee-domain decisions and implementation status are maintained
in [`tasks/done/employee-model.md`](../tasks/done/employee-model.md). Its original
fixed-fraction schedule proposal is retained as historical context and is
superseded by the implemented [Scheduling slice](./scheduling.md).

## Runtime boundary

Application routes and Server Actions use
`web/src/features/employees/server/employee-service.ts`. That service
authenticates and authorizes each operation before calling the server-only
repositories.

Canonical schedule reads, writes, and calculations use the dedicated
`web/src/features/scheduling/` service boundary. Employment termination reaches
that boundary through an explicit integration port. Collaborator creation does
not accept or persist a schedule; initial setup and later changes belong only to
the Scheduling module. Legacy v1 records remain readable for compatibility.

Do not import repositories directly into Client Components or treat hidden
controls as authorization. Identification, phone, birthday, and personal email
visibility must be enforced by server projections.

## Collections

| Collection                | Authority                                           |
| ------------------------- | --------------------------------------------------- |
| `employees`               | Personal profile and employment lifecycle           |
| `departments`             | Editable departments                                |
| `employee_assignments`    | Effective department, position, and manager history |
| `employee_schedules`      | Scheduling-owned effective work-pattern history     |
| `employee_audit`          | Safe employee-domain audit events                   |
| `employee_timeline_locks` | Transaction serialization for temporal rules        |

`platform_users` remains authoritative for platform role, personal login email,
invitation state, access status, and the stable Clerk identifier.

The employee record is the canonical source for legal and preferred names.
Updating a preferred name also synchronizes the derived display name into
`platform_users` in the same MongoDB transaction so legacy notification and
audit views use the same name. Clerk is the canonical profile-image store;
`/perfil` is the only application UI that writes it, and all application avatar
surfaces read the same Clerk image.

Every employee also has an immutable operational code such as `DNA-0042`.
Employee creation reserves the next code from an atomic sequence, and the
bootstrap assigns codes to legacy records in creation order. Codes are never
derived from personal data and are never reused. They are safe for authenticated
assignment workflows and spreadsheet imports, while internal relationships
continue to store the employee ObjectId.

## Creation, access, and deferred setup

`/admin/colaboradores/nuevo` creates the employee, current assignment, opening
vacation balance, and an internal platform-access record in one transaction. It
does not create a schedule. After creation, the collaborator detail checks the
Scheduling-owned setup status through the Employees/Scheduling integration port.
While no schedule record exists, administrators see a persistent notice linking
directly to `/admin/horarios/[employeeId]`.

Sending the external access invitation is optional and is disabled by default in
the creation form. When deferred, no Clerk invitation call is made; the detail
page displays `Sin invitación` and offers `Enviar invitación`. Once an invitation
has previously been sent, the same action is labeled `Reenviar invitación`.
Changing the email of a deferred account updates only the internal access record
and does not implicitly send an invitation.

## Scheduling boundary

The employee model links a schedule to the stable employee ID, but it does not
define the work-pattern format. Scheduling v2 stores exact same-day `HH:mm`
shifts and an anchored one- or two-week cycle. It preserves effective-dated
history and provides the neutral range calculation used by PTO.

Existing unversioned fraction-based schedules remain readable as v1. Their
working days and nominal four- or eight-hour duration remain available, but
their actual start and end times are unknown. No bootstrap or service may invent
clock times for those records. See [Collaborator scheduling](./scheduling.md)
for the complete model and migration policy.

## Initial database setup

Run against a non-production Atlas database:

```bash
cd web
pnpm bootstrap:employee-model
pnpm bootstrap:scheduling-model
```

The employee bootstrap creates employee-domain indexes and initial department
records. The scheduling bootstrap creates the reviewed schedule timeline
indexes and dual-read validator without rewriting legacy schedule data. Both
commands are repeatable.

Production execution should be part of a reviewed deployment or migration
procedure and use migration-capable credentials.

## Safety rules

- Business dates use `YYYY-MM-DD`; audit timestamps use UTC `Date` values.
- Birthday stores day and month only.
- Identification values never belong in URLs, logs, analytics, feedback, or
  audit metadata.
- Normal CRUD never hard-deletes employees, assignments, or schedules. Schedule
  changes close effective periods and preserve history.
- Role, department, and position never imply one another.
- Employment deactivation must use the existing fail-closed access lifecycle
  when the CRUD workflow is implemented.
- Self-service profile writes derive their employee and Clerk targets from the
  authenticated server identity; clients never submit a target user ID.
- Login-email updates require the administrator role and synchronize Clerk with
  `platform_users`; employees cannot change their own login email in `/perfil`.
