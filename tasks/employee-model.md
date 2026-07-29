# Employee model foundation

## Document status

**Status:** Product decisions incorporated; ready for CRUD implementation
planning.

**Source reviewed:** `tasks/done/platform-description.md`, the current
authentication model, and the authentication lifecycle documentation.

This document refines the product concept of **Colaborador** into an employee
domain model. It defines the MVP data boundary, recommended entities,
validation, authorization, history, and approved product decisions. It does not
implement the CRUD.

## Main finding

The employee profile should not be the authentication record.

- Clerk owns authentication identities and sessions.
- `platform_users` owns application access, platform role, invitation state,
  active access status, normalized personal login email, and the stable Clerk
  user ID.
- `employees` owns personal and employment information.
- Every employee has a linked platform user and personal email. A corporate
  email is not required or expected. The access record may remain in an invited
  state until registration is completed.
- Deactivating access or ending employment must preserve the employee and all
  historical business records.

This boundary avoids storing HR data in Clerk, prevents Clerk metadata from
becoming an authorization source, and allows an employee profile to remain
available while its invitation is pending or after access is deactivated.

## Terminology

| Code concept      | Spanish interface text |
| ----------------- | ---------------------- |
| Employee          | Colaborador            |
| Department        | Departamento           |
| Position          | Puesto                 |
| Reporting manager | Jefatura directa       |
| Work schedule     | Horario                |
| Employment status | Estado laboral         |
| Platform role     | Rol de plataforma      |
| Platform access   | Acceso a la plataforma |
| National ID       | Cédula física          |
| Residence ID      | DIMEX                  |
| Other ID          | Otro                   |

**Department replaces Team** throughout the product and technical model.
Existing roadmap references to teams should be interpreted as departments and
implemented with `departmentId`. The application must not maintain duplicate
`teamId` and `departmentId` fields.

## Data required for the MVP

### Personal information

| UI field               | Suggested code field      | Required | Notes                                                                                           |
| ---------------------- | ------------------------- | :------: | ----------------------------------------------------------------------------------------------- |
| Nombre                 | `givenNames`              |   Yes    | Supports one or multiple given names without splitting them incorrectly.                        |
| Primer apellido        | `firstSurname`            |   Yes    | Stored independently for directory sorting and display.                                         |
| Segundo apellido       | `secondSurname`           |    No    | Optional for people who do not use a second surname.                                            |
| Cumpleaños             | `birthMonth`, `birthDay`  |   Yes    | Store only month and day for `dd/MM`; do not store or invent a year.                            |
| Compartir cumpleaños   | `shareBirthdayOnCalendar` |   Yes    | Defaults to `true`; the employee can toggle calendar visibility.                                |
| Tipo de identificación | `identification.type`     |   Yes    | Enum: `national_id`, `residence_id`, or `other`.                                                |
| Identificación         | `identification.value`    |   Yes    | Sensitive value; normalized for validation and uniqueness without changing the displayed value. |
| Número de teléfono     | `phoneNumber`             |    No    | Self-service contact field; it is not an authentication factor.                                 |
| Foto de perfil         | Clerk user image          |    No    | Self-service identity image managed through Clerk for the MVP.                                  |

Derived display values such as `displayName`, initials, and formatted birthday
must be computed from the canonical name and birthday fields. They should not
be independent editable sources of truth.

### Employment information

The platform description adds the following relevant fields:

| UI field                   | Suggested code field            |    Required     | Source or purpose                                                                         |
| -------------------------- | ------------------------------- | :-------------: | ----------------------------------------------------------------------------------------- |
| Correo personal            | Access record `normalizedEmail` |       Yes       | Required for the Clerk invitation and login; no corporate domain is required.             |
| Puesto                     | Assignment `positionTitle`      |       Yes       | Explicitly required by organization administration.                                       |
| Departamento               | Assignment `departmentId`       |       Yes       | Required for directory, scoped calendars, reporting, and authorization.                   |
| Jefatura directa           | Assignment `managerEmployeeId`  |       No        | Required for reporting relationships and PTO approval routing.                            |
| Rol de plataforma          | Access record `role`            |       Yes       | `administrator`, `supervisor`, or `collaborator`; not inferred from job title.            |
| Estado laboral             | `employmentStatus`              |       Yes       | Separate from invitation/session status.                                                  |
| Acceso a plataforma        | `platformUserId`                |       Yes       | Stable one-to-one link; the access record may still be invited.                           |
| Fecha de ingreso           | `employmentStartedOn`           |       Yes       | Required; future-dated hires are allowed.                                                 |
| Fecha de salida            | `employmentEndedOn`             |       No        | Set when employment ends; never used to delete history.                                   |
| Horario vigente            | Related schedule record         |       Yes       | Effective-dated weekly schedule described below.                                          |
| Saldo inicial de ausencias | Separate PTO balance            | Later milestone | Required by the platform description, but should not be embedded in the employee profile. |

The platform may create a future-dated employee. Access remains governed by the
platform access record, while employment-effective queries use
`employmentStartedOn`.

## Recommended entity model

### Employee

Suggested MongoDB collection: `employees`.

```ts
type Employee = {
  _id: ObjectId;
  platformUserId: ObjectId;

  givenNames: string;
  firstSurname: string;
  secondSurname: string | null;

  birthMonth: number;
  birthDay: number;
  shareBirthdayOnCalendar: boolean;

  phoneNumber: {
    displayValue: string;
    normalizedValue: string;
  } | null;

  identification: {
    type: "national_id" | "residence_id" | "other";
    value: string;
    normalizedValue: string;
  };

  employmentStatus: "active" | "inactive";
  employmentStartedOn: string;
  employmentEndedOn: string | null;

  createdAt: Date;
  updatedAt: Date;
};
```

Dates that represent a business calendar day, such as an employment start
date, should use an ISO calendar date (`YYYY-MM-DD`) rather than a UTC timestamp.
Audit timestamps continue to use UTC `Date` values.

The birthday uses only `birthMonth` and `birthDay`. The model must not store a
birth year or derive an age.

For the MVP, Clerk owns the editable profile picture. The employee document
does not duplicate the image URL as an independent source of truth. Interfaces
must provide initials as a fallback if the Clerk image is unavailable.

### Employee assignment

Suggested MongoDB collection: `employee_assignments`.

```ts
type EmployeeAssignment = {
  _id: ObjectId;
  employeeId: ObjectId;
  departmentId: ObjectId;
  positionTitle: string;
  managerEmployeeId: ObjectId | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
};
```

Position, department, and manager should be effective-dated instead of
overwriting the previous values. This directly supports the platform rule that
employees can move between teams without rewriting historical records.

Only one assignment may be active for an employee at a time in the MVP, so an
employee belongs to exactly one department at a time. `positionTitle` is free
text. A reporting manager, when present, must be an active employee whose
platform role is `supervisor` or `administrator`.

### Department

Suggested MongoDB collection: `departments`.

```ts
type Department = {
  _id: ObjectId;
  name: string;
  normalizedName: string;
  description: string | null;
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
};
```

Departments are records, not enums. The current organization includes
Management, Customer Service, Production, and Nutrition, and must remain
editable without code changes.

Supervision and reporting should not be inferred from the department name or
the employee's position.

### Work schedule

Suggested MongoDB collection: `employee_schedules`.

```ts
type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

type ScheduledDay = {
  dayOfWeek: DayOfWeek;
  workFraction: 0 | 0.5 | 1;
  halfDayPeriod: "morning" | "afternoon" | null;
};

type EmployeeSchedule = {
  _id: ObjectId;
  employeeId: ObjectId;
  timezone: "America/Costa_Rica";
  days: ScheduledDay[];
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: Date;
  createdByPlatformUserId: ObjectId;
};
```

Schedule calculations:

```text
weeklyScheduledDays = sum(day.workFraction)
weeklyScheduledHours = weeklyScheduledDays × 8
```

Examples:

```text
3.5 scheduled days = 28 hours per week
5 scheduled days   = 40 hours per week
0.5 scheduled day  = 4 hours
```

`weeklyScheduledDays` and `weeklyScheduledHours` are derived values and should
not be separately editable. This prevents inconsistent combinations such as a
five-day pattern with a stored total of 28 hours.

Schedules should be effective-dated. PTO duration and calendar behavior must
resolve the schedule that applies to the relevant date, not necessarily the
employee's current schedule. Administrators may create future-dated schedules
and correct historical schedules. Every correction must be audited, and
effective periods must remain non-overlapping.

The initial model assumes every full workday equals eight hours, as requested.
It intentionally does not infer lunch periods, exact start/end times,
overtime, rotating shifts, or public-holiday behavior.

The weekly totals of 3.5 and 5 days are examples, not an allowlist. Any valid
weekly total produced by seven `0`, `0.5`, or `1` fractions is permitted.

For the initial PTO workflow, administrators manually manage requested
duration and balance adjustments. The platform does not automatically infer
PTO duration from schedules, weekends, or Costa Rican public holidays yet.
Effective-dated schedules are still retained so this calculation can be added
later without losing history.

## Relationship with the current access model

The current `platform_users` document already contains `displayName`,
`normalizedEmail`, role, access status, invitation state, and Clerk linkage.
The employee CRUD should gradually make the employee profile canonical for the
person's name while preserving the following access boundary:

| Concern                                       | Authoritative entity       |
| --------------------------------------------- | -------------------------- |
| Sign-in identity and sessions                 | Clerk                      |
| Profile picture                               | Clerk                      |
| Personal login email and invitation lifecycle | Clerk and `platform_users` |
| Platform role and access status               | `platform_users`           |
| Legal/personal name and phone                 | `employees`                |
| Birthday, sharing preference, and ID          | `employees`                |
| Position, department, and manager             | `employee_assignments`     |
| Weekly work pattern                           | `employee_schedules`       |
| PTO balance                                   | PTO domain                 |

During the transition, `platform_users.displayName` may remain as a denormalized
access-directory label, but employee CRUD writes should update it from the
canonical employee name rather than allowing both values to drift.

The personal email is used to send and claim the invitation. After the account
is linked, the stable Clerk user ID—not the mutable email—is the identity key.
Clerk remains authoritative for verified login email changes, while
`platform_users.normalizedEmail` keeps the last synchronized personal email for
administrative account management.

The personal email is sensitive account-contact data. It is visible to the
employee and administrators, but not to supervisors or other collaborators by
default.

## Validation rules

### Names

- Trim outer whitespace and collapse repeated internal whitespace.
- Preserve accents, apostrophes, hyphens, and the person's chosen
  capitalization.
- `givenNames` and `firstSurname` are required.
- `secondSurname` is optional and stored as `null` when absent.
- Do not use names as identifiers or uniqueness constraints.

### Birthday

- Render as `dd/MM` in the Spanish interface.
- Validate the day against the month, including `29/02`.
- Store no birth year and do not calculate or display age.
- Do not store a placeholder year such as `1900`.
- Default `shareBirthdayOnCalendar` to `true`.
- An authenticated user can see another employee's birthday in the calendar
  only when that employee has enabled sharing.
- Administrators can see every birthday regardless of the sharing preference.
- Birthday visibility means authenticated in-app visibility, never public
  internet exposure.

### Identification

- `type` must use the internal English enum.
- Preserve an administrator-entered display value while maintaining a
  normalized value for comparison.
- For `national_id`, accept the display form `X-XXXX-XXXX` or nine digits,
  remove hyphens for normalization, and require
  `/^[1-9]\d{8}$/` on the normalized value.
- Format a normalized Cédula física as `X-XXXX-XXXX` for display.
- For `residence_id`, remove allowed presentation whitespace, store the usual
  unformatted display, and require `/^[1-9]\d{10,11}$/` on the normalized
  value.
- `other` allows an exceptional identifier without applying the Cédula or
  DIMEX regex.
- Enforce uniqueness on the compound key of identification type and normalized
  value.
- Never include the identification value in URLs, logs, analytics, audit
  metadata, error messages, or client-side cache keys.
- Directory tables should mask the value by default.
- Application-level encryption is not required for the initial implementation.
  The value remains sensitive and restricted by server-side field
  authorization.

Approved formats:

| Document      | Display format      | Normalized format | Regex                |
| ------------- | ------------------- | ----------------- | -------------------- |
| Cédula física | `X-XXXX-XXXX`       | 9 digits          | `/^[1-9]\d{8}$/`     |
| DIMEX         | Usually unformatted | 11 or 12 digits   | `/^[1-9]\d{10,11}$/` |

### Phone number

- The phone number is optional and editable by the employee or an
  administrator.
- Store both a display value and a normalized value.
- Prefer E.164 normalization when the country code is known.
- The phone number is application profile data and must not enable Clerk phone
  authentication.
- Supervisors and other collaborators cannot view it unless a later product
  requirement grants that access.

### Organizational assignment

- `departmentId` must reference an active department for a new assignment.
- `managerEmployeeId` cannot equal `employeeId`.
- A manager must be active and have the platform role `supervisor` or
  `administrator`.
- A reporting relationship must not create a cycle.
- Changing a manager, position, or department closes the current assignment
  and creates a new one.
- Platform role is selected explicitly and is never inferred from position,
  department, or manager status.

### Schedule

- Include all seven weekdays exactly once.
- Each day uses `0`, `0.5`, or `1`.
- A half-day requires a defined `halfDayPeriod`.
- A non-half-day must use `halfDayPeriod: null`.
- At least one scheduled work fraction must be greater than zero for an active
  employee unless an administrator explicitly records an approved exception.
- Schedule effective periods cannot overlap for the same employee.
- Future-dated schedules are allowed.
- Historical corrections are allowed, must be audited, and must revalidate
  surrounding effective periods.
- Any derived weekly total is valid; 3.5 and 5 days are examples.
- The CRUD must display the derived weekly days and hours before saving.

### Lifecycle

- `employmentEndedOn` is required when the employee becomes inactive.
- `employmentStartedOn` is required and may be future-dated.
- An end date cannot precede the start date.
- Every employee must have a linked platform user and personal email.
- Ending employment always deactivates platform access and revokes sessions
  through the existing fail-closed account lifecycle.
- There are no post-employment access exceptions in the MVP.
- Reactivating platform access must not silently reactivate employment.
- Employees and historical assignments or schedules must never be hard
  deleted through the normal CRUD.

## Authorization and field visibility

### Administrators

Administrators can create and edit the employee profile, assignment, schedule,
employment status, access linkage, and later the opening PTO balance.

Sensitive writes must require server-side administrator authorization.
Hiding controls in the interface is not sufficient.

Administrators can always view birthdays and phone numbers, even when birthday
calendar sharing is disabled. Identification remains masked by default in
directory views.

### Supervisors

The platform description permits supervisors to view direct-report schedules
and operational data. It does not grant access to identification values or the
full private profile.

Recommended supervisor visibility:

- Name, position, department, and reporting relationship.
- Work schedule for authorized direct reports.
- No identification number.
- No phone number.
- Birthdays for employees who enabled calendar sharing.

### Collaborators

Collaborators may view and maintain only explicitly permitted fields in their
own profile. For the MVP:

- View their own personal and employment information.
- Edit their Clerk profile picture.
- Edit their own phone number.
- Toggle `shareBirthdayOnCalendar`.
- View other employees' `dd/MM` birthday in the authenticated calendar when
  sharing is enabled for that employee.
- Do not allow self-service changes to identification, department, position,
  manager, role, employment status, schedule, names, or birthday value.

## Administrator CRUD workflow

### Create

Recommended steps:

1. Capture personal information.
2. Capture phone number and the birthday-sharing preference, defaulting sharing
   to enabled.
3. Capture the required employment start date, including a future date when
   applicable, and active status.
4. Select or create the single department.
5. Enter the free-text position and an optional eligible reporting manager.
6. Define the weekly schedule and confirm derived weekly days/hours.
7. Select platform role and the required personal email.
8. Create the access record, employee, assignment, and schedule.
9. Send the Clerk invitation.
10. Record a safe audit entry.

The operation should behave as a controlled multi-step workflow. If Clerk
invitation delivery fails, preserve the employee and access records in a
recoverable pending state so an administrator can resend safely.

### Read

The administrator detail page should show:

- Personal information.
- Phone number and birthday-sharing preference.
- Masked identification with an administrator-only reveal action.
- Current employment status.
- Current assignment and assignment history.
- Current schedule and schedule history.
- Platform role, invitation/access status, and personal email.
- Later: PTO balance and audited adjustments.
- Safe audit timeline.

The directory should support search or filters by name, department, position,
platform role, employment status, and access status. Identification should not
be a general directory search field unless there is an approved operational
need.

### Update

- Simple personal-field changes update the employee document.
- Position, department, manager, and schedule changes create new
  effective-dated records.
- Future-dated changes and audited historical corrections are supported.
- Role and access changes use the existing platform-account lifecycle.
- Every sensitive change records actor, target, changed field names, and
  timestamp without copying sensitive before/after values into audit metadata.

### Deactivate

Normal CRUD should use deactivation, not deletion:

1. Set employment status to inactive and record the end date.
2. Close active assignment and schedule periods.
3. Deactivate the linked platform account.
4. Revoke Clerk sessions.
5. Preserve employee, PTO, calendar, and audit history.

The operation must be fail-closed for access. If Clerk is unavailable, MongoDB
must still deny application access and record synchronization as pending.

## Required indexes and constraints

Recommended indexes:

- Unique index on `employees.platformUserId`.
- Unique compound index on `identification.type` and
  `identification.normalizedValue`.
- Directory index on `employmentStatus`, canonical surname fields, and given
  names.
- Unique normalized department name.
- Assignment indexes on `employeeId` plus effective period,
  `departmentId` plus effective period, and `managerEmployeeId` plus effective
  period.
- Schedule index on `employeeId` plus effective period.

MongoDB cannot express every temporal-overlap or reporting-cycle rule with a
simple unique index. Those rules require validated server-side transactions or
carefully ordered writes plus automated tests.

## Audit requirements

Audit these actions:

- Employee created.
- Personal profile updated.
- Phone number updated, without recording its value.
- Birthday calendar sharing enabled or disabled.
- Profile picture updated through Clerk, without recording the image payload.
- Identification updated, without recording its value.
- Employment activated or deactivated.
- Assignment created or closed.
- Department, position, or manager changed.
- Schedule created or replaced.
- Platform role or access linkage changed.
- Invitation sent or resent.
- PTO opening balance created or adjusted in its own domain.

Audit metadata may contain field names, record identifiers, status values, and
safe operational outcomes. It must not contain identification numbers,
birthdays, invitation URLs, authentication codes, tokens, or unnecessary
personal notes.

## Data intentionally excluded from the MVP employee model

The platform description does not currently require:

- Home address.
- Emergency contacts.
- Gender, marital status, nationality, or dependents.
- Salary, bank, payroll, tax, insurance, or medical information.
- Performance evaluations.
- Documents or attachments.
- Exact daily start/end times.
- Automated PTO accrual policy.

These fields should not be collected merely because they are common in HR
systems. Each requires a defined product purpose, access policy, retention
rule, and validation before being added.

## Approved product decisions

1. Store only birthday day and month. Calendar sharing defaults to enabled;
   employees can disable it for other users, while administrators retain
   visibility.
2. Normalize Cédula física to nine digits and DIMEX to 11 or 12 digits using
   the approved regex rules above.
3. Application-level identification encryption is deferred.
4. Department replaces Team.
5. An employee belongs to one department at a time.
6. Position is free text for the MVP.
7. Only active supervisors and administrators can be reporting managers.
8. Employment start date is required and may be future-dated.
9. Half-days are classified as morning or afternoon; exact times are not
   required.
10. Weekly totals such as 3.5 and 5 days are examples, not an allowlist.
11. Schedule changes may be future-dated and historical corrections are
    allowed with audit history.
12. Every employee requires a platform access record and personal email; no
    corporate email is required.
13. Employees can edit their Clerk profile picture, phone number, and birthday
    calendar-sharing preference.
14. Ending employment always deactivates access; there are no MVP exceptions.
15. PTO duration and balance effects are manually managed by administrators for
    now; no automatic schedule, weekend, or public-holiday calculation is
    inferred.

## Recommended MVP acceptance criteria

1. An administrator can create an employee with valid personal, assignment,
   department, schedule, role, and access information.
2. A 3.5-day schedule derives 28 weekly hours and a 5-day schedule derives 40.
3. A half-day contributes 0.5 day and 4 hours.
4. A non-administrator cannot create or mutate employee records through direct
   server requests.
5. An administrator can change department, position, manager, or schedule
   without erasing the previous effective record.
6. Platform role is never inferred from position or department.
7. Cédula física accepts and displays `X-XXXX-XXXX`, persists nine normalized
   digits, and rejects values that fail `/^[1-9]\d{8}$/`.
8. DIMEX persists 11 or 12 normalized digits and rejects values that fail
   `/^[1-9]\d{10,11}$/`.
9. Identification and birthday data are absent from logs, URLs, audit metadata,
   and unauthorized responses.
10. Identification uniqueness and schedule overlap rules are enforced under
    concurrent writes.
11. An employee can edit only their profile picture, phone number, and birthday
    sharing preference; the server rejects self-service writes to restricted
    employee fields.
12. Shared calendar queries show `dd/MM` birthdays to all authenticated users
    when sharing is enabled and always show them to administrators.
13. Only an active supervisor or administrator can be assigned as a reporting
    manager.
14. Future-dated employment and schedule changes work, and audited historical
    corrections do not create overlapping effective periods.
15. Deactivation preserves history and denies access even if Clerk session
    revocation is temporarily unavailable.
16. PTO duration remains an explicit administrator-managed value and is not
    automatically inferred from schedules or holidays.
17. Directory and detail interfaces render all labels, validation, empty
    states, and errors in Spanish.
18. CRUD forms meet WCAG 2.2 AA and support keyboard use on mobile and desktop.
19. Validation and authorization rules have unit and integration coverage.

## Suggested implementation order

1. Define Zod schemas and pure validation/calculation functions from the
   approved decisions.
2. Implement Department CRUD and seed the initial departments.
3. Implement the Employee model and required access-record linkage.
4. Implement effective-dated assignment and schedule repositories.
5. Implement administrator create and directory views.
6. Implement employee detail and administrator edit workflows.
7. Implement self-service phone, Clerk profile-picture, and birthday-sharing
   controls.
8. Integrate invitation, deactivation, and safe resend.
9. Add birthday calendar visibility with administrator override.
10. Add audit entries and authorization tests.
11. Keep PTO duration manually administered while exposing effective schedules
    to authorized calendar and employee views.
