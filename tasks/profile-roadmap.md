# Employee self-service profile roadmap

## Document status

**Status:** Implemented. The Clerk Dashboard email-change restriction remains an
environment configuration step documented in `docs/authentication.md`.

**Date:** 2026-07-31

**Scope:** A profile page for an activated employee to view their own employee
record, edit the small set of employee-owned fields, choose a preferred display
name, and upload or remove a profile picture. This document also refines the
existing Clerk `/account` experience so profile data and account security have
clear, non-overlapping responsibilities.

## Implementation outcome

The roadmap is implemented across the employee, authentication, calendar, and
workspace modules:

- `/perfil` is an authenticated workspace route with preferred-name, phone,
  birthday-sharing, profile-image, personal, employment, schedule, and access
  sections.
- Self-service reads and writes derive the employee and Clerk targets from the
  authenticated platform user and never accept a target ID from the browser.
- `employees.preferredName` is normalized, nullable, employee-owned, audited
  without its value, and kept separate from canonical names and
  `platform_users.displayName`.
- Forbidden self-service keys are rejected by a strict Zod schema.
- Profile images are client-compressed, server-decoded and re-encoded with
  `sharp`, limited to 1,000,000 bytes, stripped of metadata, stored only in
  Clerk, and removable.
- Preferred names appear in the workspace identity, birthdays, and calendar
  people labels. Administrator employee records retain the canonical name and
  show the preferred name only as read-only context.
- `/account` remains the Clerk security/MFA route, while the user menu now
  exposes `Mi perfil` separately.
- The employee bootstrap performs the repeatable `preferredName: null`
  backfill, and `sharp` is a production dependency for Netlify functions.
- Unit coverage includes strict profile validation, preferred-name behavior,
  actor-bound service composition, image normalization, and Clerk target
  binding.

## Executive recommendation

Add an authenticated `/perfil` route inside the workspace for the employee
profile. Keep `/account` as the Clerk-owned account-security route because the
application already relies on it for MFA enrollment, access methods, and active
sessions.

Use these sources of truth:

- `employees` owns canonical personal and employment information, the employee's
  `preferredName`, phone number, and birthday-sharing preference.
- Clerk owns the authentication identity, account security, and profile image.
- `platform_users` continues to own application access, personal login email,
  platform role, Clerk linkage, invitation state, and access status.
- `platform_users.displayName` remains a denormalized canonical name. Do not put
  `preferredName` into this field because administrator legal-name updates
  currently overwrite it.

The employee can edit only:

- Preferred name (`preferredName`), including clearing it.
- Phone number.
- Birthday visibility in the shared calendar.
- Profile picture, including replacing or removing it.
- Account-security settings exposed by Clerk under `/account`.

All canonical identity, employment, authorization, and schedule data remains
read-only to the employee.

## Current-state findings

### A self-service domain boundary already exists

The employee module already has a partial self-service implementation:

- `web/src/features/employees/domain/employee.ts` defines
  `employeeSelfServiceProfileInputSchema`, currently limited to `phoneNumber`
  and `shareBirthdayOnCalendar`.
- `web/src/features/employees/server/employee-service.ts` exposes
  `getOwnEmployeeProfile()` and `updateOwnEmployeeProfile()`.
- Both operations derive the employee from the authenticated platform user. The
  browser does not provide an employee ID.
- `web/src/features/employees/server/employee-repository.ts` updates the employee
  found by `platformUserId` in a transaction and records value-safe audit events
  for phone and birthday-sharing changes.
- Unit coverage confirms that self-service writes are bound to the authenticated
  actor.

This is the correct security boundary and should be extended rather than
replaced.

### The existing implementation is not reachable from the UI

There is currently no employee profile route, component, Server Action, or form
using the self-service service functions. The only employee detail UI is the
administrator route at `/admin/colaboradores/[employeeId]`.

### `/account` is account security, not the employee record

`web/src/app/account/[[...account]]/page.tsx` renders Clerk's prebuilt
`<UserProfile>` and describes the page as `Seguridad de la cuenta`. It is also
the route used by `requirePlatformUser()` when an administrator or supervisor
must enroll in MFA.

`web/src/components/auth/auth-controls.tsx` sends the Clerk user button directly
to `/account`. Replacing this route with employee-profile UI would break the
current separation and complicate MFA enrollment. The two destinations should
remain distinct:

- `Mi perfil` → `/perfil`
- `Seguridad de la cuenta` → `/account`

### Clerk and MongoDB can currently drift

The prebuilt Clerk `<UserProfile>` can expose name, email, profile-image, and
security controls depending on the Clerk Dashboard configuration. The
application, however, uses:

- Canonical names from `employees`.
- Login/access email from `platform_users.normalizedEmail`.
- Clerk ID for the stable authentication link after activation.

Allowing unrestricted Clerk name or email changes can therefore create two
different values for the same concept. The implementation must either customize
the Clerk page or configure Clerk so `/account` focuses on security and does not
present Clerk first/last name as the employee's business identity.

For the first profile release, keep self-service login-email changes disabled.
A later email-change flow must verify the new address and synchronize
`platform_users.normalizedEmail` through an authenticated action or verified
Clerk webhook before it is enabled.

### The current self-service schema should be stricter

Zod objects strip unknown keys by default. The current unit test demonstrates
that a submitted `firstSurname` is silently removed while the permitted update
continues. The server remains protected, but a malicious or broken client can
receive an apparent success for a forbidden change.

Change the self-service schema to `.strict()` and test that canonical name,
identification, role, employment, assignment, and schedule fields are rejected.
The UI must never render these as editable inputs.

### Profile-image infrastructure is partly available

The approved employee model already assigns profile-picture ownership to Clerk
and requires initials as fallback. `sharp` is installed, but currently under
`devDependencies`. If it is imported by production server code, move it to
runtime `dependencies` so the Netlify function can reliably use it.

## Data ownership and editability

### Employee-facing matrix

| Information                        | Source of truth                            | Employee can view | Employee can edit  | Recommendation                                                                   |
| ---------------------------------- | ------------------------------------------ | :---------------: | :----------------: | -------------------------------------------------------------------------------- |
| Preferred name                     | `employees.preferredName`                  |        Yes        |        Yes         | New optional, display-only field; employee-owned.                                |
| Profile picture                    | Clerk user image                           |        Yes        |        Yes         | Upload, replace, and remove through the app's validated image flow.              |
| Phone number                       | `employees.phoneNumber`                    |        Yes        |        Yes         | Preserve the current normalization and safe audit behavior.                      |
| Share birthday on calendar         | `employees.shareBirthdayOnCalendar`        |        Yes        |        Yes         | Keep as an explicit preference.                                                  |
| Canonical given names              | `employees.givenNames`                     |        Yes        |         No         | Administrator-managed identity data.                                             |
| Canonical surnames                 | `employees.firstSurname`, `secondSurname`  |        Yes        |         No         | Administrator-managed identity data.                                             |
| Birthday day/month                 | `employees.birthDay`, `birthMonth`         |        Yes        |         No         | Employee may control visibility, not the recorded date.                          |
| Identification                     | `employees.identification`                 |    Masked only    |         No         | Never return the full value in the self-service read model.                      |
| Personal login email               | `platform_users.normalizedEmail` and Clerk |        Yes        |   Not initially    | Requires a verified two-system synchronization flow before self-service editing. |
| Position                           | Active employee assignment                 |        Yes        |         No         | Employment data managed by administrators.                                       |
| Department                         | Active employee assignment                 |        Yes        |         No         | Employment data managed by administrators.                                       |
| Direct manager                     | Active employee assignment                 |        Yes        |         No         | Employment data managed by administrators.                                       |
| Work schedule                      | Active employee schedule                   |        Yes        |         No         | Effective-dated administrator-managed data.                                      |
| Employment start/end and status    | `employees`                                |        Yes        |         No         | Employment lifecycle data.                                                       |
| Platform role                      | `platform_users.role`                      |        Yes        |         No         | Authorization data; never self-service.                                          |
| Access/invitation status           | `platform_users`                           |        Yes        |         No         | Platform lifecycle data.                                                         |
| MFA, sessions, sign-in methods     | Clerk                                      |        Yes        | Yes, in `/account` | Account-security concern, separate from `/perfil`.                               |
| Internal IDs and normalized values | MongoDB internals                          |        No         |         No         | Do not expose in the profile read model or forms.                                |

### Administrator behavior after activation

- The employee becomes the primary editor of `preferredName`, profile picture,
  phone, and birthday-sharing preference.
- Administrators may retain phone and birthday-sharing edits for corrections or
  pre-activation setup, with existing audit behavior.
- Administrators must not edit `preferredName` or the employee's profile
  picture. They may remove a picture only through a separately approved safety
  or support workflow, not the normal employee edit form.
- Administrator detail should continue to show the canonical name prominently.
  It may show `Prefiere: {preferredName}` as read-only context.
- Administrator directories, audits, and exports must not replace the canonical
  name with the preferred name because those surfaces identify employment
  records.

## Preferred-name design

Use the Spanish label `Nombre preferido`, not `Alias`, because it explains the
purpose without implying a username or legal-name change.

Add this field to `EmployeeDocument`:

```ts
preferredName: string | null;
```

Rules:

- Optional; blank input normalizes to `null`.
- Normalize Unicode and human whitespace with the existing
  `normalizeHumanText` helper.
- Allow 1–60 characters after normalization.
- Support accented characters, spaces, apostrophes, and hyphens.
- Reject control characters. React escaping remains required when rendering.
- Do not require uniqueness.
- Do not use it for login, authorization, invitations, legal records, audits,
  payroll-like exports, or employee lookup by ID.
- Do not store it in Clerk metadata. MongoDB already owns employee profile data,
  and Clerk metadata would introduce a second source of truth and additional
  rate-limited reads.

Keep `formatEmployeeDisplayName()` as the canonical formatter. Add a separate
helper such as:

```ts
formatEmployeePreferredDisplayName(employee) {
  return employee.preferredName ?? formatEmployeeDisplayName(employee);
}
```

Use the preferred formatter only on social/personal surfaces:

- `/perfil` heading and workspace user identity.
- Birthday calendar labels.
- Calendar invitee labels and similar people-facing selectors, once each
  surface has been reviewed.
- Initials fallback for the employee's own avatar.

Use canonical names on administrator record pages and exports. Search in the
administrator directory may include `preferredName`, but results must still show
the canonical name as the primary label.

Do not synchronize `preferredName` into `platform_users.displayName`. If a
future global read path cannot join the employee record efficiently, add an
explicitly named cache only after measuring the need and document how it is
kept synchronized.

Existing documents without `preferredName` can be read as `null`. Add a
repeatable migration/backfill to make the shape consistent; no new index is
needed.

## Profile-picture design

### Storage decision

Keep Clerk as the single source of truth for the profile image. Do not store the
binary, a duplicate URL, or Clerk's image ID in MongoDB. The employee/platform
link already provides the Clerk user ID, and Clerk's `User.imageUrl` is the
current image reference.

This avoids adding Netlify Blobs or another storage service for this milestone.

### Why use a custom upload flow

The raw prebuilt Clerk image editor cannot enforce the product's final-file
limit throughout the application's own validation flow. Build a custom
app-native uploader on `/perfil`, then send the validated image to Clerk.

Clerk supports both frontend `user.setProfileImage()` and backend
`clerkClient.users.updateUserProfileImage()`. Use the backend method for this
flow so the server can enforce the final MIME, dimensions, and one-megabyte
limit and so the target Clerk user always comes from the authenticated session.
Account for Clerk backend rate limiting with a pending state, single submission,
and friendly retry behavior.

### Required compression and validation pipeline

Interpret `1 MB` as **1,000,000 bytes**. Target at most **900 KB** on the client
to leave room for multipart/Server Action overhead, while enforcing an absolute
final-image limit of 1,000,000 bytes on the server.

1. Accept JPEG, PNG, and WebP initially. Do not claim HEIC support until it is
   explicitly tested in the deployed runtime.
2. Reject an original input above a defensive cap such as 10 MB before decoding.
3. Decode on the client, honor orientation, and offer a square crop/preview.
4. Resize to a maximum of 512 × 512 pixels.
5. Re-encode to WebP around quality 82, then reduce quality and, if required,
   dimensions until the result is at most 900 KB.
6. Revoke preview object URLs when replaced or when the component unmounts.
7. Submit only the compressed image.
8. Re-authenticate on the server with `requirePlatformUser()`. Derive
   `clerkUserId` from the authenticated platform record; never accept a user ID
   or employee ID from the browser.
9. Decode and re-encode with `sharp` on the server. Apply orientation, strip
   EXIF/metadata, crop to 512 × 512, and emit WebP.
10. Validate the decoded image, MIME, dimensions, and final byte count. Reject
    corrupt or non-image payloads and any final output over 1,000,000 bytes.
11. Send a `File` or `Blob` to Clerk's backend profile-image update API.
12. Provide a separate remove action using Clerk's profile-image delete API.
13. Revalidate `/perfil` and any shell surface that renders the current user.
14. Record safe audit events such as `profile_image_updated` and
    `profile_image_removed`; never store image bytes or signed/image URLs in the
    audit payload.

Next.js Server Actions default to a 1 MB request body. Because multipart
overhead can exceed that even when the image is just below 1 MB, configure
`experimental.serverActions.bodySizeLimit` to a narrow value such as `2mb`, or
use a dedicated authenticated Route Handler with an equivalent infrastructure
limit. The application-level server check remains 1,000,000 bytes either way.

When rendering the image, use Clerk's `imageUrl` optimization parameters for
the displayed dimensions and quality. Always provide preferred-name initials,
falling back to canonical-name initials, when no uploaded image is available.

### Image UX and accessibility

- Show current image or initials, with `Cambiar foto` and `Eliminar foto`.
- The picture is optional; removal restores initials.
- Explain accepted formats and `Máximo 1 MB` before selection.
- Show crop/preview before saving and expose compression/upload progress.
- Preserve keyboard operation and a visible focus state.
- Use a useful alt such as `Foto de perfil de {displayName}`; decorative
  duplicates use empty alt text.
- Return specific Spanish errors for unsupported type, invalid image, oversized
  source, compression failure, upload failure, and rate limiting.

## Recommended `/perfil` experience

Place the route at `web/src/app/(workspace)/perfil/page.tsx` so it shares the
authenticated shell and role-aware navigation.

### Page structure

1. **Profile header**
   - Clerk image or initials.
   - Preferred name, falling back to canonical full name.
   - Position and department.
   - `Cambiar foto` action.
2. **Cómo quiero aparecer**
   - Editable `Nombre preferido`.
   - Helper text: `Este nombre se usa para mostrarte en espacios sociales de la aplicación. No cambia tu nombre legal.`
3. **Contacto y preferencias**
   - Editable phone number.
   - Editable birthday-calendar toggle.
4. **Información personal**
   - Canonical full name.
   - Birthday in `dd/MM`.
   - Masked identification only.
5. **Información laboral**
   - Current department, position, direct manager, schedule, employment status,
     and start date.
6. **Seguridad y acceso**
   - Read-only personal login email, platform role, and access status.
   - Link to `Administrar seguridad de la cuenta` at `/account`.

Use explicit edit/save/cancel states for each small section rather than making
the entire page permanently editable. A failed write keeps the user's input and
shows an inline message; a successful write shows feedback and refreshes the
server-owned view.

### Entry points

Refine `AuthControls` so the user menu exposes two named actions instead of
treating Clerk's profile as the whole product profile:

- `Mi perfil` → `/perfil`
- `Seguridad de la cuenta` → `/account`
- `Cerrar sesión`

Add `/perfil` breadcrumbs. A permanent side-navigation item is optional; the
user menu is the recommended primary entry point because the profile is
personal rather than a core operational module.

### Missing employee linkage

`requirePlatformUser()` may admit a bootstrap administrator without an employee
record. `/perfil` must not crash or leak lookup details in that case. Show a
safe state such as `Tu cuenta todavía no está vinculada a un perfil de colaborador`
with an appropriate support/admin next step. Never accept a query-string
employee ID as a workaround.

## Recommended application architecture

### Read model

Create a dedicated self-service read model rather than returning the raw
`Employee` document. It should join by the authenticated
`platformUser.id` and return only:

- Preferred and canonical display values.
- Clerk image URL/has-image state obtained for the authenticated Clerk user.
- Phone display value and birthday-sharing preference.
- Formatted birthday and masked identification.
- Current assignment and schedule summary.
- Read-only role, access status, and login email.
- Employment summary.

Do not return normalized phone/identification values, full identification,
MongoDB IDs that the UI does not need, invitation provider IDs, or another
employee's data.

### Mutations

Use three narrow mutations rather than one broad profile payload:

1. `updateOwnProfilePreferences({ preferredName, phoneNumber, shareBirthdayOnCalendar })`
2. `updateOwnProfileImage(file)`
3. `removeOwnProfileImage()`

Each public Server Action must call an authorized service. Each service must
authenticate independently; no repository should be called directly from a
route. Preserve actor-bound lookups and field-level patch semantics so an edit
does not overwrite unrelated concurrent administrator changes.

Add safe audit actions:

- `preferred_name_updated`
- `phone_number_updated` (existing)
- `birthday_sharing_updated` (existing)
- `profile_image_updated`
- `profile_image_removed`

Audit changed field names, actor, target, and timestamp only. A preferred name
is personal data and does not need to be copied into the audit event.

### Authorization

- Any active, linked platform user with an employee record can view and update
  their own profile, regardless of platform role.
- Deactivated platform users remain blocked by the existing access boundary.
- No client-provided employee or Clerk user ID is accepted for self-service
  reads or writes.
- Administrator access to another employee continues through
  `/admin/colaboradores/[employeeId]`, not `/perfil?employeeId=...`.
- Account security and privileged-role MFA behavior at `/account` must remain
  intact.

## Implementation phases

### Phase 0 — Confirm product decisions

- [ ] Confirm the public route label `/perfil` and UI term `Nombre preferido`.
- [ ] Confirm that 1 MB means 1,000,000 bytes.
- [ ] Confirm which coworker-facing surfaces should show preferred name and
      profile image in the first release.
- [ ] Keep self-service login-email changes disabled for the first release.
- [ ] Confirm whether administrators retain correction access to phone and
      birthday sharing after activation.

### Phase 1 — Domain and persistence

- [ ] Add `preferredName: string | null` to the employee domain.
- [ ] Add normalization/validation and make the self-service schema strict.
- [ ] Extend the actor-bound repository update and audit actions.
- [ ] Add a repeatable null backfill for existing employees.
- [ ] Add canonical and preferred display-name helpers without changing the
      meaning of `platform_users.displayName`.
- [ ] Build a minimal self-service read model with current assignment and
      schedule summaries.

### Phase 2 — Profile route and text-field preferences

- [ ] Add `/perfil` inside the workspace route group.
- [ ] Add the read-only personal, employment, and access sections.
- [ ] Add the preferred-name, phone, and birthday-sharing form/action.
- [ ] Add pending, success, validation, domain-error, and missing-linkage states.
- [ ] Add breadcrumbs and the `Mi perfil` user-menu entry.
- [ ] Link to `/account` for security and preserve MFA setup behavior.

### Phase 3 — Profile-picture handling

- [ ] Move `sharp` to production dependencies.
- [ ] Implement accessible client preview/crop/resize/compression.
- [ ] Set a narrow upload transport limit compatible with the compressed file.
- [ ] Implement server-side decode/re-encode/validation and authenticated Clerk
      update/delete operations.
- [ ] Add initials fallback, optimized Clerk image rendering, and cache/UI
      refresh.
- [ ] Add upload/removal audit events and rate-limit/error feedback.

### Phase 4 — Account refinement

- [ ] Review Clerk Dashboard settings and `<UserProfile>` sections.
- [ ] Prevent Clerk first/last name from being presented as the employee's
      canonical business profile.
- [ ] Keep email self-service disabled until verified MongoDB synchronization
      exists.
- [ ] Rename navigation and copy so `/account` is clearly security-focused.
- [ ] Verify administrator/supervisor MFA setup still redirects and completes
      through `/account`.

### Phase 5 — Preferred-name propagation

- [ ] Use preferred name on the employee's own workspace identity.
- [ ] Review birthday calendar and calendar invitee labels.
- [ ] Keep administrator record names canonical and optionally show the
      preferred name secondarily.
- [ ] Ensure exports, audits, invitations, and access management remain
      canonical.

### Phase 6 — Verification and rollout

- [ ] Add unit, integration, component, accessibility, and end-to-end tests.
- [ ] Verify the image flow in Netlify, including `sharp` packaging and Clerk
      rate-limit/error behavior.
- [ ] Document Clerk Dashboard settings and environment dependencies.
- [ ] Roll out behind a feature flag if existing accounts require a gradual
      Clerk configuration change.

## Test plan

### Domain and repository tests

- Preferred name normalizes whitespace/Unicode and blank becomes `null`.
- The 60-character limit and control-character rejection work.
- The self-service schema rejects, rather than strips, canonical names,
  birthday, identification, role, status, assignment, and schedule fields.
- Updates always target the employee associated with the authenticated
  `platformUserId`.
- A client-provided employee/Clerk ID cannot redirect the write.
- Audit events record changed field names without personal values.
- A missing employee linkage returns the expected domain state.

### Image tests

- JPEG, PNG, and WebP sources produce a valid WebP at or below 1,000,000 bytes.
- Oversized, corrupt, spoofed-MIME, animated, and unsupported images are
  rejected safely.
- EXIF is removed and orientation is correct.
- Extremely large pixel dimensions are rejected before excessive memory use.
- Removal restores initials.
- Clerk API failure/rate limiting does not change MongoDB data or report false
  success.
- Preview object URLs are cleaned up.

### UI and end-to-end tests

- An activated collaborator, supervisor, and administrator can open their own
  profile.
- A deactivated user cannot access it.
- No user can load or mutate another employee through the self-service flow.
- Read-only canonical, employment, access, and schedule data has no editable
  control.
- Preferred name appears on approved social surfaces but not as canonical admin
  identity.
- Forms preserve input on failure and announce errors/success accessibly.
- Upload, crop, replace, and remove work with keyboard and touch.
- Mobile/light/dark layouts are verified.
- `/account?requirement=mfa` continues to work after the menu/account changes.

## Acceptance criteria

1. An active linked user can open `/perfil` and see their own canonical personal,
   employment, access, and schedule summary.
2. The employee can change only preferred name, phone number, birthday-calendar
   visibility, and profile picture from this page.
3. Forbidden fields are absent from editable forms and are rejected if submitted
   directly.
4. Preferred name is optional, employee-owned, and never changes canonical name,
   login, authorization, invitations, or administrator-managed employment data.
5. An uploaded image is decoded and re-encoded by the server and is no larger
   than 1,000,000 bytes before Clerk receives it.
6. Profile-image replacement and removal work, with initials as fallback.
7. MongoDB does not store image bytes or a duplicate Clerk image URL.
8. Self-service operations derive employee and Clerk IDs from the authenticated
   session and cannot target another user.
9. Identification is masked and raw normalized/sensitive fields are not returned
   to the browser.
10. `/account` remains available for security, sessions, sign-in methods, and
    privileged-role MFA enrollment.
11. Clerk name/email settings cannot silently create a conflicting employee
    profile or stale application email.
12. Changes are safely audited without copying sensitive values.

## Risks and decisions to keep visible

- **Clerk profile controls:** Leaving unrestricted name/email controls in the
  prebuilt `<UserProfile>` creates competing sources of truth.
- **Upload transport:** A one-megabyte image plus request framing can exceed
  Next.js's default 1 MB Server Action body limit.
- **Image decompression:** Small files can have dangerous pixel dimensions;
  validate decoded dimensions and resource usage, not only bytes and MIME.
- **Netlify packaging:** `sharp` must be a runtime dependency and verified in a
  deployed function.
- **Rate limiting:** Server-side Clerk image updates are rate limited; prevent
  repeated concurrent submissions and report retryable failures clearly.
- **Name ambiguity:** Preferred name must never overwrite canonical names in HR,
  access, invitation, or audit contexts.
- **Cross-system email:** Do not enable email editing until a verified Clerk ↔
  `platform_users` synchronization policy is implemented and tested.
- **Privacy:** Decide explicitly where coworker avatars and preferred names are
  visible. Profile photos should remain optional and removable.

## Out of scope for this milestone

- Public employee profiles or an organization-wide employee directory for
  collaborators.
- Employee edits to canonical identity, birthday value, identification,
  employment, assignment, schedule, platform role, or access status.
- A new image-storage provider, image gallery, or historical avatar archive.
- Profile-photo moderation or administrator photo editing beyond a separately
  approved safety/support process.
- Login-email self-service before verified cross-system synchronization exists.
- Using preferred name as a username, unique handle, or authorization identity.

## External references

- [Clerk `<UserProfile>` component](https://clerk.com/docs/react/reference/components/user/user-profile)
- [Clerk backend `updateUserProfileImage()`](https://clerk.com/docs/reference/backend/user/update-user-profile-image)
- [Clerk frontend `user.setProfileImage()`](https://clerk.com/docs/reference/clerkjs/user)
- [Clerk image optimization](https://clerk.com/docs/guides/development/image-optimization)
- [Next.js Server Action body-size configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions)
