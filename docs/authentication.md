# Authentication and account lifecycle

## Decision and trust boundary

Clerk owns authentication identity, verification methods, invitations, and
session lifecycle. MongoDB Atlas owns platform authorization: role, active
status, team membership, reporting relationships, and business history.

Every protected resource calls `requirePlatformUser()` on the server. A valid
Clerk session is necessary but not sufficient:

1. Clerk must report an authenticated, completed session.
2. The stable Clerk user ID must resolve to a platform user in MongoDB.
3. The platform user must be `active`.
4. Administrators and supervisors must have Clerk two-factor authentication
   enabled.
5. The platform role must satisfy the resource-specific role requirement.

Clerk public metadata is not used as an authorization source.

`ClerkProvider` defines `/sign-in` as the explicit post-sign-out destination.
This avoids navigating through the protected home route while Clerk invalidates
its client and server session caches.

## Requirement audit

| Requirement                                       | Enforcement                                                                                                                                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Invitation-only registration                      | Clerk restricted sign-up mode plus a pre-created `platform_users` record.                                                                                                                        |
| Google or email verification codes                | Google OAuth and email codes are enabled; password and phone authentication are disabled.                                                                                                        |
| MFA for administrators and supervisors            | Clerk TOTP and backup codes are enabled. The server checks `twoFactorEnabled` for privileged MongoDB roles before granting access.                                                               |
| Only invited, active users                        | An authenticated identity is linked atomically by verified email to an invited MongoDB record, then all private resources require `status: active`.                                              |
| User sign-out and own-session revocation          | Clerk `UserButton` supports sign-out. `/account` embeds `UserProfile`, including active-device and session controls.                                                                             |
| Deactivation preserves history                    | MongoDB changes the platform status to `deactivated`; the document and historical foreign-key targets remain intact.                                                                             |
| Expired invitation resend                         | The previous Clerk invitation is revoked when possible, then a new 14-day invitation is issued and its ID replaces the old one.                                                                  |
| Administrator deactivation and session revocation | `/admin/accounts` marks MongoDB inactive first, then calls Clerk `banUser()`, which blocks sign-in and revokes sessions. A failed Clerk sync remains denied by MongoDB and is audited for retry. |
| Account recovery                                  | Password authentication is disabled. Recovery remains with the connected Google identity or verified email-code identity.                                                                        |
| Secret safety                                     | Secrets remain server-only and ignored by Git. Actions and bootstrap code return generic failures and never log credentials, codes, tokens, invitation URLs, or provider errors.                 |
| Spanish authentication UI and emails              | Clerk components use `es-CR`; six reachable authentication and security email templates are versioned in `web/config/clerk/email-templates/` and applied in Spanish.                             |

Relevant implementation:

- `web/src/features/auth/server/require-platform-user.ts`
- `web/src/features/auth/server/platform-user-repository.ts`
- `web/src/features/auth/actions/admin-account-actions.ts`
- `web/src/app/account/[[...account]]/`
- `web/src/app/admin/accounts/`
- `web/config/clerk/`

## Clerk instance configuration

The desired non-secret configuration is versioned at
`web/config/clerk/instance.json`. Apply it to development with:

```bash
cd web
clerk config patch \
  --app app_3H9dgW0N38YwjuOrBRUcLfe2mzL \
  --instance dev \
  --file config/clerk/instance.json \
  --dry-run

clerk config patch \
  --app app_3H9dgW0N38YwjuOrBRUcLfe2mzL \
  --instance dev \
  --file config/clerk/instance.json \
  --yes
```

Apply each Spanish email template with the Clerk Backend API:

```bash
clerk api /templates/email/<slug> \
  --app app_3H9dgW0N38YwjuOrBRUcLfe2mzL \
  --instance dev \
  --method PUT \
  --file config/clerk/email-templates/<slug>.json \
  --yes
```

Configured slugs:

- `account_locked`
- `invitation`
- `mfa_enabled`
- `new_device_sign_in`
- `primary_email_address_changed`
- `verification_code`

The same desired state must be applied explicitly to the production instance.
Production Google OAuth also requires production Google credentials and
authorized Netlify domains; Clerk's shared development credentials must not be
used in production.

Official references:

- [Clerk restricted mode](https://clerk.com/docs/guides/secure/restricting-access)
- [Clerk invitations](https://clerk.com/docs/guides/users/inviting)
- [Protecting Next.js resources](https://clerk.com/docs/nextjs/guides/secure/protect-content)
- [Clerk session tasks and MFA](https://clerk.com/docs/guides/configure/session-tasks)
- [Clerk UserProfile](https://clerk.com/components/user-profile)

## Initial administrator bootstrap

The bootstrap is explicit, repeatable, and idempotent. It reads identities from
environment configuration, never from source code:

```dotenv
BOOTSTRAP_ENVIRONMENT=development
BOOTSTRAP_ADMIN_IDENTITIES=[{"email":"admin@example.com","displayName":"Nombre Administrador"}]
```

Run:

```bash
cd web
pnpm bootstrap:admins
```

Behavior:

- If a matching Clerk identity exists, it is linked by stable Clerk user ID.
- Otherwise, a 14-day Clerk invitation is created.
- A still-valid pending invitation is not resent.
- An existing non-administrator is never silently promoted.
- A deactivated account is never silently reactivated.
- Production execution is rejected unless
  `ALLOW_PRODUCTION_ADMIN_BOOTSTRAP=true` is present for that one operation.
- The operation records a safe audit entry without emails, credentials, codes,
  tokens, invitation URLs, or provider responses.

Remove the bootstrap identity and production-approval variables immediately
after use.

## Lifecycle operations

### Invitation acceptance

Clerk validates the invitation and verifies the email. On the first protected
request, the application atomically claims the invited MongoDB record using a
verified email, stores the stable Clerk user ID, and changes the platform status
to `active`.

### MFA enrollment

An active administrator or supervisor without Clerk two-factor authentication
is redirected to `/account`. Only that account-management route is available
until the user enables an authenticator application. Backup codes are enabled
as a recovery factor.

### Deactivation

The administrator action performs a fail-closed sequence:

1. Mark the MongoDB platform user `deactivated`.
2. Ban the linked Clerk user, blocking sign-in and revoking sessions.
3. Mark Clerk synchronization complete.
4. Record the actor, target, action, time, and safe status metadata.

If Clerk is temporarily unavailable after step 1, access remains denied by
MongoDB. The record is marked `pending_deactivation` and the administrator sees
a safe retry message.

### Reactivation

Clerk is unbanned before MongoDB becomes active. If the identity was never
created, the platform user returns to `invited` instead of becoming active
without authentication.

## Audit status on 2026-07-28

Confirmed in the development Clerk instance:

- Restricted sign-up mode is enabled.
- Google OAuth and email verification codes are enabled.
- Password and phone authentication are disabled.
- TOTP and backup-code MFA methods are enabled.
- Application paths point to `/sign-in` and `/sign-up`.
- The six reachable authentication/security emails above are customized in
  Spanish.
- Clerk Doctor reaches the linked development instance.

Still required before production release:

- Create and configure the Clerk production instance.
- Add production Google OAuth credentials and Netlify domains.
- Apply the versioned instance configuration and Spanish templates to
  production.
- Configure Atlas and run the administrator bootstrap with approved identities.
- Exercise invitation, Google, email-code, MFA, session-revocation,
  deactivation, resend, and recovery journeys in a Netlify Deploy Preview.
- Remove bootstrap variables after the one-time launch operation.
