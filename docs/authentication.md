# Authentication and account lifecycle

## Decision and boundaries

Better Auth 1.7.3 owns credentials, email verification, MFA and server-side
sessions in MongoDB. The application owns invitations, roles, employment,
deactivation and business history. This replaces the previous Clerk integration.

The browser uses `features/auth/client/auth-client.ts` and same-origin
`/api/auth/*` endpoints. The Node Route Handler delegates to
`auth-provider.ts`; `auth-factory.ts` configures the provider without importing
Next.js or React. Business services use `requirePlatformUser()`, not provider
SDKs. Profile-image and administrator identity changes use separate server adapters.

Every private page, action and API must enforce server-side authorization.
A layout, hidden navigation link, or signed cookie alone is not authorization:

1. Resolve the database-backed Better Auth session.
2. Require a verified email.
3. Resolve `platform_users.authUserId`; on first access only, atomically claim
   an unexpired pending invitation matching the verified email.
4. Require the managed email to match and the platform status to be active.
5. For administrators/supervisors require both `twoFactorEnabled` and the
   server-controlled session field `mfaVerified`.
6. Enforce the resource's roles and business ownership rules.

`authUserId` is the Better Auth user ID string. Existing platform and employee
ObjectIds remain stable; PTO, schedules, assignments and audit references do not
depend on the authentication provider. Historical Clerk IDs remain historical,
not valid Better Auth IDs.

## Registration and invitations

There is no open signup, Google OAuth, or passwordless email-code login in this MVP.
Administrators create invitations from the existing account/employee workflows.

An invitation has 32 random bytes; only its SHA-256 digest is stored. The emailed
link targets the configured canonical origin and expires after 14 days. Resending
replaces the digest and invalidates the previous signup link. Sign-up validates
the digest, email, pending status, expiry and absence of an existing identity on
the server, including before the provider's account creation hook. User-supplied
names or avatars cannot replace the managed invitation name.

The invitee chooses a 12–128-character password, verifies the email link, then
signs in. Password hashing uses Better Auth's built-in scrypt implementation.
Email verification expires after one hour. Unverified sign-in attempts request
another verification email, subject to rate limiting. If an account was already
created, sign in instead of repeatedly submitting the signup form.

Invitation acceptance occurs on first protected access, not on email delivery.
The email must still match an unexpired invitation then. The application never
promotes the first public signup to administrator.

## First administrator

Use a protected operator workstation, verify the database, and set temporarily:

```dotenv
BOOTSTRAP_ADMIN_IDENTITIES=[{"email":"admin@example.com","displayName":"Nombre Administrador"}]
```

Run from `web/`, substituting the exact `MONGODB_DB`:

```bash
pnpm bootstrap:auth colaboradores_dna_dev
pnpm bootstrap:admins colaboradores_dna_dev
```

For production the one-time administrator operation additionally requires
`ALLOW_PRODUCTION_ADMIN_BOOTSTRAP=true`. Remove both variables afterward;
the production build rejects leftover bootstrap/migration approval settings.

The bootstrap creates an invited administrator, or resends an existing pending
administrator invitation. It skips an active administrator and rejects
non-administrator or deactivated accounts instead of elevating/reactivating them.
SMTP failures abort visibly. Complete email verification and MFA enrollment before
workspace access. Existing Clerk accounts need the migration step first.

## MFA, recovery and sessions

- Administrators and supervisors cannot enter the workspace until they verify
  an authenticator code. `/account?requirement=mfa` permits enrollment only.
- Collaborators may opt into the same authenticator and backup-code flow.
- TOTP enrollment verifies a real code before enabling MFA. QR codes are generated
  locally in the browser; the secret is never sent to a third-party QR service.
- Successful TOTP or backup-code verification marks the current database session
  as MFA-verified. Enrollment alone does not. Trusted-device bypass is disabled.
- Recovery codes are shown at creation, used once, and can be regenerated from
  account security using the password and an MFA-verified session.
- Self-service MFA disabling is blocked. Lost authenticator plus lost backup
  codes needs an operator-assisted, identity-verified recovery procedure; no
  public or administrator UI bypass exists. Establish this support procedure
  and keep a second enrolled administrator before production.
- Password-reset links are single-use and expire using Better Auth's one-hour
  default. Resets revoke all sessions and **do not remove MFA**.
- Sessions last 24 hours and refresh after one hour. Cookie session caching is
  disabled, so authorization sees current database state. Session cookies are
  HttpOnly, SameSite=Lax and Secure on HTTPS.
- Password changes revoke other sessions; users can list/revoke their sessions.
  Sign-out uses a full navigation to avoid stale protected client state.

## Administrator controls and profile images

Deactivation marks the platform account inactive first, then deletes its auth
sessions. Even if revocation fails, application authorization denies access.
The pending synchronization status is retained for operational retry. Reactivation
preserves the identity/history and clears stale sessions before restoring access.

Active-account email changes transactionally update the managed email and
`auth_users`, reset verification, revoke sessions and invalidate outstanding
password-reset records. The user signs in with the new email and existing password,
then verifies the new mailbox. The UI never grants verified status to an unverified
new address. Pending invitations move to the corrected address and are replaced.

Self-service account deletion, email changes and generic provider profile updates
are disabled. Canonical employee details remain in `employees`.
Normalized profile images are stored privately in `auth_profile_images` and served
through an authenticated, no-store endpoint; directory lookups are batched.
Legacy Clerk avatars are not copied; initials remain until the user uploads again.

## Collections and indexes

`pnpm bootstrap:auth <database>` installs the reviewed indexes:

- `auth_users`: unique email.
- `auth_accounts`: credential records, user index, unique provider/account pair.
- `auth_sessions`: unique token, user index, expiry TTL.
- `auth_verifications`: unique identifier and expiry TTL.
- `auth_two_factors`: unique user; provider-encrypted secrets and backup codes.
- `auth_rate_limits`: unique request key; shared across serverless instances.
- `platform_users`: unique normalized email, partial unique auth ID and
  invitation digest, directory index.

`auth_profile_images` uses the identity ObjectId as its primary key.
MongoDB/Atlas transactions are required. The rate limiter persists its counters;
review collection growth and retention as usage expands (no TTL on numeric
`lastRequest` is assumed). Runtime platform/audit repositories currently also
ensure their own indexes, so runtime credentials need those existing create-index
permissions; do not claim schema management is entirely absent at runtime.

## Security configuration

- Explicit canonical trusted origin; provider CSRF/origin checks enabled, even in
  integration tests. Do not trust arbitrary forwarded hosts or preview origins.
- Shared database rate limit: 60 requests/minute; sign-in 5/minute, signup,
  password-reset requests and verification resend 3/minute per provider IP/path
  key, plus provider-specific two-factor limits.
- SMTP sends are awaited in serverless requests. Use TLS, a verified sender and
  SPF/DKIM/DMARC. Production requires TLS; there is no console-token fallback.
- `BETTER_AUTH_SECRET` is independent per environment, at least 32 characters.
  Back it up securely; loss breaks encrypted MFA data. Do not rotate blindly.
- Auth responses, private avatars and sensitive auth pages are no-store. Auth
  pages use a no-referrer policy. The PWA worker does not cache private API data.
- Configure Netlify/proxy rate limiting as defense in depth and verify the
  platform's forwarded client-IP behavior. Application limits alone are not
  protection against distributed abuse.
- Do not log passwords, mail links, cookies, recovery codes or raw provider
  errors in application audits. Lock down access to infrastructure request logs.

See [migration and verification](./better-auth-migration.md) and
[production checklist](./deployment.md).
Official references: [Next.js](https://better-auth.com/docs/integrations/next),
[MongoDB](https://better-auth.com/docs/adapters/mongo),
[email/password](https://better-auth.com/docs/authentication/email-password),
[two-factor authentication](https://better-auth.com/docs/plugins/2fa).
