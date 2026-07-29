# Employee model implementation

The approved employee-domain decisions and implementation status are maintained
in [`tasks/employee-model.md`](../tasks/employee-model.md).

## Runtime boundary

Application routes and Server Actions use
`web/src/features/employees/server/employee-service.ts`. That service
authenticates and authorizes each operation before calling the server-only
repositories.

Do not import repositories directly into Client Components or treat hidden
controls as authorization. Identification, phone, birthday, and personal email
visibility must be enforced by server projections.

## Collections

| Collection                | Authority                                           |
| ------------------------- | --------------------------------------------------- |
| `employees`               | Personal profile and employment lifecycle           |
| `departments`             | Editable departments                                |
| `employee_assignments`    | Effective department, position, and manager history |
| `employee_schedules`      | Effective weekly schedule history                   |
| `employee_audit`          | Safe employee-domain audit events                   |
| `employee_timeline_locks` | Transaction serialization for temporal rules        |

`platform_users` remains authoritative for platform role, personal login email,
invitation state, access status, and the stable Clerk identifier.

## Initial database setup

Run against a non-production Atlas database:

```bash
cd web
pnpm bootstrap:employee-model
```

This repeatable command creates the required indexes and initial department
records. Production execution should be part of a reviewed deployment or
migration procedure.

## Safety rules

- Business dates use `YYYY-MM-DD`; audit timestamps use UTC `Date` values.
- Birthday stores day and month only.
- Identification values never belong in URLs, logs, analytics, feedback, or
  audit metadata.
- Normal CRUD never hard-deletes employees, assignments, or schedules.
- Role, department, and position never imply one another.
- Employment deactivation must use the existing fail-closed access lifecycle
  when the CRUD workflow is implemented.
