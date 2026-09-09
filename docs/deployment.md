# Deployment guide

## Production release

Use the reviewed release branch and configure Netlify with base directory `web`,
publish directory `.next`, Node 24 and build command `pnpm build`.
Select the production branch in Netlify's build settings; changing Git branches
locally does not change the deployed branch. Keep branch deploys disabled unless
their isolation is explicitly configured.

Set these variables in the Production context, available to Builds and Functions:

| Variable                                    | Value                                                            |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `APP_ENVIRONMENT`                           | `production`                                                     |
| `APP_BASE_URL`                              | `https://colaboradores.dnaturefood.com`                          |
| `BETTER_AUTH_SECRET`                        | Unique random secret, at least 32 characters                     |
| `MONGODB_URI`                               | Dedicated production Atlas connection                            |
| `MONGODB_DB`                                | Dedicated production database name                               |
| `SMTP_HOST`, `SMTP_PORT`                    | Verified SMTP provider; 587 STARTTLS or 465 TLS                  |
| `SMTP_USER`, `SMTP_PASSWORD`                | Mail-provider credentials, configured together                   |
| `AUTH_EMAIL_FROM`                           | Verified sender, e.g. `Colaboradores DNA <auth@dnaturefood.com>` |
| `DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION` | HR feature encryption key version, when using narratives         |
| `DEVELOPMENT_ENCRYPTION_KEY_V1`             | Independent 32-byte base64 key when v1 is active                 |

Clerk keys and dashboard settings are no longer used. See the
[Better Auth cutover guide](./better-auth-migration.md) before deploying over an
existing Clerk environment. Keep secrets server-only; do not expose them in
untrusted Deploy Previews. DNS for the application and SPF/DKIM/DMARC for email
delivery are separate setup steps.

`DEVELOPMENT_ENCRYPTION_*` names refer to the employee-development feature, not
the deployment environment. Preserve old key versions and back them up separately.
Do not reuse development encryption/authentication keys in production.

The build guard rejects production mode in previews, missing auth/email/database
settings, short/placeholder secrets, invalid SMTP ports, development database
names, non-HTTPS canonical origins and leftover one-time bootstrap/migration
variables. These checks do not prove credential validity, SMTP deliverability,
database isolation or security certification.

### Release checklist

1. Run `pnpm install --frozen-lockfile`, `pnpm verify`, `pnpm test:e2e` and
   `pnpm audit` in `web`. Run the opt-in auth and PTO MongoDB suites with dedicated
   test credentials. Do not run tests against live employee accounts.
2. Configure and test TLS SMTP delivery, sender verification and spam-folder
   behavior. Exercise real invitation, email-verification and reset links on
   the canonical origin.
3. Configure Atlas access, backups and restore testing. Transactions require a
   replica set/Atlas. Use separate migration credentials. Note that existing
   platform/audit repositories still create their own indexes at runtime.
4. Choose fresh production data or the explicit legacy-account migration. Do
   not clear the development database. Run auth and business model bootstraps
   against the verified target. Bootstrap the first administrator, verify email,
   enroll MFA, save recovery codes and establish a second administrator.
5. Complete collaborator → administrator leave acceptance on staging: submit,
   approve/deny, refresh, cancel, duplicate submit and balance checks. Integration
   tests supplement but do not replace two-user browser acceptance.
6. Select the reviewed release branch in Netlify, deploy, verify HTTPS redirects,
   auth/session cookies, sign-in/out, account email changes, deactivation, mobile
   views, private no-store responses and PWA behavior.
7. Record the released commit, deploy, database snapshot and secret backup.
   Configure availability/error alerts, email failure monitoring and an operator
   recovery process. Use the documented coordinated rollback if necessary.

Scripts read `web/.env.local`; use a protected workstation and inspect the exact
target name before a bootstrap/migration. Remove `BOOTSTRAP_ADMIN_IDENTITIES`,
`ALLOW_PRODUCTION_ADMIN_BOOTSTRAP` and `ALLOW_PRODUCTION_AUTH_MIGRATION` after use.

The planning route remains an optional hidden prototype. Its navigation state is
not an access toggle. If used, configure its server-only OpenAI key/model and
complete the approved-data/cost review first.

## Development and Deploy Previews

The existing stable development site may use `APP_ENVIRONMENT=development` even
though Netlify labels its stable branch context `production`. Set an independent
auth secret, a non-production database and a test SMTP provider. Never reuse
production credentials or send test messages to real employees without approval.

Only Netlify `production` and `deploy-preview` contexts are currently allowed.
For an enabled preview, set `APP_BASE_URL` to that preview's exact trusted HTTPS
origin through its build configuration before building. There is deliberately
no arbitrary request-host fallback or wildcard trusted-origin list. If per-preview
configuration and isolated credentials are unavailable, disable previews instead.

The checked-in Netlify Next.js runtime handles server rendering, Route Handlers
and Server Actions; do not publish the app as a static export. SMTP work is
awaited before a serverless invocation returns.

## PWA behavior and verification

The root `PwaInstallProvider` captures installation events on public pages and
retains them during client navigation into the workspace. Its header button uses
that shared state; iOS users receive home-screen installation instructions.

The worker registers only in production builds. Use `pnpm build` followed by
`pnpm start` (or the HTTPS Netlify deployment) for browser verification.
`pnpm dev` intentionally does not register it.

Cache policy is implemented in `web/public/sw.js`:

- Content-hashed Next.js chunks use cache-first reads.
- Icons, images and the offline page use cached reads with background HTTP
  revalidation, so asset updates do not require changing the worker version.
- Online document navigations refresh the offline fallback. Private pages,
  API responses and mutations are not stored in the worker cache.
- Cache schema changes use a new `colaboradores-dna-` version. Activation removes
  only older caches with that prefix, preserving other same-origin caches.

Netlify serves `/sw.js` as a public asset, so `web/netlify.toml` declares its
JavaScript content type, `nosniff`, no-store cache policy and worker CSP directly.
The Next.js header configuration supplies the equivalent worker CSP/cache policy
when self-hosting. After deployment, verify the actual `/sw.js` response headers,
worker activation, offline fallback and Retry, then test installation and
standalone authentication on the target phones. A local build does not verify
Netlify's deployed headers.

## References

- [Authentication implementation](./authentication.md)
- [Migration, first-user enrollment and rollback](./better-auth-migration.md)
- [Netlify function environment scopes](https://docs.netlify.com/build/functions/environment-variables/)
