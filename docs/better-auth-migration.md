# Clerk → Better Auth migration

Implemented 2026-09-08. This is an application migration, **not** an automatic
production cutover or a database reset.

## Scope

Clerk runtime dependencies, provider widgets and proxy were replaced by a
feature-owned Better Auth integration, Spanish forms, SMTP delivery, MFA,
recovery and session management. Authorization retains the existing
`requirePlatformUser` boundary, platform roles and business services.
Provider-specific `clerkUserId` references in current code became `authUserId`.
Old audit documents are not rewritten.

New users register with email/password. Existing users must re-enroll from a new
invitation; their Clerk passwords, Google sign-ins, sessions, MFA secrets and
avatars are not imported. This is intentional for the pre-production MVP.
Legacy configuration files under `web/config/clerk` are archival only and are not
loaded by the application. Clerk may still retain its old data until an operator
decommissions it; this implementation makes no Clerk API calls.

## Environment prerequisites

Merge these into the existing local environment or set them in Netlify:

```dotenv
APP_ENVIRONMENT=production
APP_BASE_URL=https://colaboradores.dnaturefood.com
BETTER_AUTH_SECRET=<independently generated random secret>
MONGODB_URI=<production Atlas connection>
MONGODB_DB=colaboradores_dna
SMTP_HOST=<verified mail provider>
SMTP_PORT=587
SMTP_USER=<provider username>
SMTP_PASSWORD=<provider secret>
AUTH_EMAIL_FROM=Colaboradores DNA <auth@dnaturefood.com>
```

Port 465 uses implicit TLS; other ports use STARTTLS, required in production.
A local capture inbox can use port 1025 without authentication in development.
The SMTP user/password must be configured together. Test actual delivery,
spam-folder handling and reset links before sending real invitations.

No `NEXT_PUBLIC_CLERK_*` or `CLERK_SECRET_KEY` is required. Remove obsolete keys
from deployed environment settings after validating the new release. Never expose
the new auth secret, database URI or SMTP password with a `NEXT_PUBLIC_` prefix.
This change does not overwrite `.env.local` or provision SMTP/DNS for you.

## Fresh production database (preferred for the pre-launch MVP)

1. Create a separate empty production database; keep development data intact.
2. Configure environment, backups and migration credentials.
3. Run `pnpm bootstrap:auth <exact-database-name>` and the employee/scheduling/PTO
   model bootstraps documented in the main README.
4. Bootstrap the explicitly chosen first administrator with
   `pnpm bootstrap:admins <exact-database-name>`.
5. Verify their email and enroll MFA, save recovery codes, then invite reviewed
   employees. Establish opening leave balances explicitly.

Do not run the legacy conversion against a fresh database; it has nothing to do.

## Preserve an existing database

Schedule a maintenance window; stop traffic/background writers to the old app.
Back up Atlas and export configuration, record the old commit/deploy, and test
restoring the snapshot in isolation first. Review the user directory and remove
no records as part of authentication migration.

With `web/.env.local` securely pointed at the intended database:

```bash
cd web
pnpm migrate:auth colaboradores_dna_dev --dry-run
# Review target name and candidate/deactivated counts before proceeding.
pnpm migrate:auth colaboradores_dna_dev --apply
pnpm bootstrap:auth colaboradores_dna_dev
pnpm bootstrap:admins colaboradores_dna_dev
```

Use the real exact database name. Production `--apply` additionally requires
`ALLOW_PRODUCTION_AUTH_MIGRATION=true`; production admin bootstrap separately
requires `ALLOW_PRODUCTION_ADMIN_BOOTSTRAP=true`. These are one-operation settings,
not permanent deployment variables.

The migration defaults to read-only dry-run and sends **no emails**. Apply uses a
transaction and only changes legacy `platform_users` records without an
`authUserId` field. It:

- Preserves platform/employee ObjectIds, roles, old Clerk identifiers and audit
  history; leaves PTO, ledger, schedules and assignments untouched.
- Sets `authUserId=null`, resets invitation state and moves previously usable
  accounts to `invited` pending verified re-enrollment.
- Keeps deactivated accounts deactivated.
- Appends a count-only `auth_migrations` record; it is idempotent on rerun.

The first administrator bootstrap sends the new administrator invitation.
After enrollment, review and resend other invitations through administration.
All users sign in afresh and privileged users enroll a new authenticator.
Check record counts and business IDs against the backup after migration.

The script deliberately does not delete legacy Clerk fields or old indexes;
new auth/invitation indexes use distinct names. Do not rename an old Clerk user ID
into `authUserId`: these are unrelated identity namespaces.

## Verification

Default suite: `pnpm verify`. Browser smoke: `pnpm test:e2e`.

Opt-in MongoDB suites are documented in the main README. They use randomly named
disposable databases, real transactions and captured emails:

- Auth: invitation-only signup, expiry, verified-email requirement, cross-origin
  rejection, MFA enrollment/challenge, session MFA flags, backup-code single use,
  recovery/session revocation, deactivation, rate limiting and legacy migration
  dry-run/idempotency/data preservation.
- Leave: collaborator draft/edit/submit/approval, denial, cancellation, immediate
  admin half-day requests, self-approval rejection, competing approvals, role
  demotion, all categories, and missing balance/schedule safeguards.
  This suite substitutes the identity boundary; it does not represent a complete
  two-user browser acceptance test through the new login.

Before production, separately complete real SMTP and mobile/browser acceptance:
invite collaborator and admin → signup → verification → admin MFA → collaborator
submits leave → admin approves/denies → collaborator sees outcome and correct
balance → cancellation/duplicate submission checks → deactivate collaborator →
existing session denied. Check password reset plus lost-authenticator recovery
with a backup code, session revocation and administrator email corrections.

## Implementation verification — 2026-09-08

- Default suite: 418 tests passed; live tests remain opt-in (9 skipped by default).
- Live MongoDB suites: 8 tests passed (3 auth/migration, 5 PTO), using disposable
  databases and captured auth emails.
- Built-app Chromium checks: 4 passed, including 320px mobile recovery UI and
  WCAG checks in light/dark themes. The shared primary-button text token was
  corrected to provide sufficient contrast on the cyan background.
- Formatting, ESLint, Stylelint, TypeScript and production build checked.
- Full dependency audit: no known vulnerabilities after upgrading Next.js and
  eslint-config-next to 16.3.3, Vitest/coverage to 4.1.11, and patching js-yaml
  and colord overrides. See the [Next.js advisory](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4)
  and [Vitest advisory](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- Operator commands were checked to reject a mismatched target database before
  connecting. They are explicit ESM scripts (`.mts`).

For a clean built-app smoke test, start `pnpm start --port 3101` after building,
then run `E2E_BASE_URL=http://127.0.0.1:3101 pnpm test:e2e`. Setting
`E2E_BASE_URL` tests that already-running server; it does not start another one.
Do not build over an actively running dev server and treat its old client chunks
as a valid production test.

No existing database, Clerk instance, SMTP provider or production deployment was
changed during implementation. Real email delivery, first-admin onboarding and
the two-user authenticated browser leave acceptance remain cutover gates.

## Rollback and operations

Keep the old Netlify deploy and a pre-cutover DB snapshot. If smoke checks fail,
keep traffic paused. Restore the matched database snapshot and old application/
environment together, or fix forward. Rolling back code alone after re-enrollment
can leave users locked out or restore unintended access.

Do not blindly run a reverse migration, delete Better Auth collections, or restore
a stale snapshot after real work has resumed: that could lose new business data.
Reconcile changes under an approved recovery plan instead. Clerk-side sessions
are not revoked by this offline conversion; prevent access to old deployments
and retire the old instance only after the rollback window.

Back up the auth secret separately from MongoDB, protect SMTP credentials,
monitor mail failures/auth abuse, apply dependency security updates, and define
an identity-verified operator recovery process. Better Auth removes the Clerk
production-plan dependency; it does not remove operational security work.
