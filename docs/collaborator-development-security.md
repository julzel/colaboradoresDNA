# Collaborator development — security boundary

**Status:** Foundation implemented for synthetic data only  
**Date:** 2026-08-07  
**Related:** [PRD](./collaborator-development-prd.md) · [Roadmap](./collaborator-development-roadmap.md)

## Scope

The Desarrollo module will contain confidential HR narratives. This document
defines the minimum boundary that later 1:1, skill-evidence, and development-goal
work must use. The current Netlify environment is not approved for real HR data.

Protected narrative includes meeting notes, observable evidence, success
criteria, support commitments, progress updates, amendments, and void reasons.
Dates, lifecycle states, opaque IDs, versions, and due-state fields remain
queryable so directory views never need to decrypt narrative content.

## Threat model

| Risk                                                                            | Boundary or control                                                                                                                                                                                   |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A database reader, database backup, or accidental database export exposes notes | Narrative is encrypted before persistence with AES-256-GCM and a fresh 96-bit nonce. Keys remain outside MongoDB.                                                                                     |
| Ciphertext or rotation metadata is copied or relabeled                          | Authenticated associated data binds the ciphertext to its resource type, canonical lowercase ObjectId, and canonical key version.                                                                     |
| A client forges actor, role, employee, author, or visibility fields             | Server services derive identity and role from `requirePlatformUser`; these fields are never trusted from client input.                                                                                |
| A collaborator or supervisor probes another employee's record                   | Services enforce an explicit operation policy and return generic unavailable outcomes without confirming record existence. Supervisor access is out of scope for MVP.                                 |
| A privileged account is compromised                                             | Existing active-account, verified-email, and MFA gates run before development authorization. Audit records identify the authenticated platform actor.                                                 |
| Sensitive text leaks through lists, logs, URLs, analytics, or audit             | List repositories use allowlisted projections. Audit stores IDs, action, outcome, and changed field names only. Narrative must never enter redirects, errors, logs, or telemetry.                     |
| A stale browser overwrites a newer record                                       | Mutable records carry a version; writes match the expected version and allowed lifecycle state.                                                                                                       |
| A write succeeds but its audit record fails                                     | Mutations and audit inserts share a MongoDB transaction; audit repository calls require a session.                                                                                                    |
| A browser or service worker caches authenticated content                        | Desarrollo routes return `private, no-store`; the service worker caches public static assets only and uses network-only navigation with an offline fallback.                                          |
| A key is lost, leaked, or rotated incorrectly                                   | Ciphertext stores its key version. Rotation must decrypt with the old key and re-encrypt with the active key in a tested, resumable migration. Backups and recovery must be proven before production. |
| Deploy Preview secrets are exposed to untrusted code                            | Development encryption keys are not configured for untrusted previews. The route shell does not need a key; cryptographic operations fail closed.                                                     |

Application-layer encryption does not protect plaintext after an authorized
server process decrypts it, nor does it compensate for a compromised
application runtime. Least-privilege infrastructure, secure logs, dependency
maintenance, session protection, and operational response remain required.

## Key contract

The initial keyring uses server-only environment variables:

```text
DEVELOPMENT_ENCRYPTION_ACTIVE_KEY_VERSION=v1
DEVELOPMENT_ENCRYPTION_KEY_V1=<base64-encoded random 32-byte key>
```

Key versions are canonical lowercase identifiers containing letters, digits,
and underscores, matching the authenticated version stored with each
ciphertext. Decryption selects the stored version; encryption always selects
the active version. Unknown, missing, malformed, or wrong-length keys are hard
errors with content-free messages.

Never reuse development keys in production. Never place a key in a
`NEXT_PUBLIC_` variable, MongoDB, source control, client storage, build output,
or an issue tracker.

## Production gates

Before enabling any real data, administration and the technical owner must:

1. Confirm which administrators are HR-authorized and whether finalized records
   are visible to the affected collaborator.
2. Approve retention, legal hold, correction, deletion, and incident-response
   ownership.
3. Provision separate production Clerk, MongoDB, and key-management boundaries
   with least-privilege runtime and migration credentials.
4. Test key backup, recovery, rotation, and tamper detection with synthetic
   records; retain an offline recovery runbook.
5. Decide and test whether an unavailable read-audit sink fails closed.
6. Pass authorization, cross-employee, encryption, transaction, cache,
   accessibility, and authenticated browser tests.
7. Complete a synthetic pilot and explicitly approve the production rollout.

Until every gate is complete, the UI must not offer forms that imply it is safe
to enter confidential employee information.
