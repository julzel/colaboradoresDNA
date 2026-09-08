# Personal planning prototype

The prototype is available at `/admin/prioridades` and from the administration navigation. It requires an active administrator account with MFA, using the same account policy as the rest of Colaboradores DNA.

## First use

1. Open **Mis prioridades** and expand **Contexto de DNAture**.
2. Add reviewed company objectives, challenges, constraints, or process references. Provide their owner and review date, then save. This context is shared among administrators; the app does not import HR records or assume company objectives.
3. Enter your backlog, planning period, availability, and commitments. Select **Priorizar**.
4. Review the explanations, questions, assumptions, and source references. Adjust task titles, next actions, outcomes, or ordering. Use the conversation to request a revised proposal. Accept manual edits before asking the model to revise them.
5. Select **Aceptar plan**. Record progress through each task’s details. Reprioritization preserves accepted task IDs and progress.

Proposals remain separate from the working plan. Editing company context requires a fresh proposal before acceptance. Recording progress invalidates a pending proposal so stale recommendations cannot overwrite that progress. A failed generation leaves accepted work intact and retains the submitted backlog.

Without approved objectives in the context editor, the tool still works but explicitly marks recommendations as provisional. Only active references are sent to the model. References older than 90 days are flagged for review; this is a prototype review reminder, not a company policy.

## Configuration

Set these server-side values in `web/.env.local`:

```dotenv
OPENAI_API_KEY=your_server_side_key
OPENAI_PLANNING_MODEL=gpt-5.6-sol
APP_BASE_URL=http://localhost:3000
```

The existing Clerk and MongoDB configuration is also required. Never use `NEXT_PUBLIC_` for the OpenAI key. The default model is GPT-5.6 Sol, with medium reasoning effort, the Responses API, Structured Outputs, `store: false`, a 120-second timeout, no automatic retries, and a 12,000 output-token cap. The output budget includes model reasoning and is a maximum, not expected usage.

`store: false` disables stored Response objects; it is not a statement that all provider retention is disabled. Review the provider’s data policies before adding sensitive company information. No prompts, task content, or raw provider errors are logged by the feature.

The initial implementation supplies the small reviewed context collection directly with each request. It does not implement file upload, embeddings, File Search, or fine-tuning. These remain optional retrieval adapters as the knowledge collection grows.

References: [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol).

## Architecture

```text
React UI
  -> typed HTTP client
  -> versioned Next.js Route Handlers
  -> authentication and HTTP validation adapter
  -> framework-independent planning service
       -> PlanningRepository port -> MongoDB adapter
       -> PlanningModel port      -> OpenAI adapter
```

The frontend imports transport-neutral schemas and the HTTP client. It never imports a backend service, database, model SDK, or Server Action. The application service depends on interfaces and domain contracts rather than Next.js or provider clients. Route Handlers are thin transport adapters. A future UI can use the same API, and a future HTTP server can compose the application service with its own authentication adapter.

Key files under `web/src/features/planning/`:

- `domain/contracts.ts`: input and response schemas, domain types, readiness and dependency validation.
- `application/planning-service.ts`: proposal generation, acceptance, context revision, progress, and concurrency rules.
- `application/ports.ts`: persistence and model interfaces.
- `server/`: MongoDB persistence, OpenAI integration, and composition.
- `http/`: authentication, bounded JSON input, error mapping, and generated OpenAPI contract.
- `client/planning-api.ts`: the UI’s only data-access interface.
- `components/`: Spanish interface using existing design-system primitives.

## HTTP API

Base path: `/api/planning/v1`. The authenticated OpenAPI 3.1 document is served as raw JSON at `/api/planning/v1/openapi`; it is derived from the same Zod schemas used for validation.

| Method | Path              | Purpose                                                                      |
| ------ | ----------------- | ---------------------------------------------------------------------------- |
| GET    | `/workspace`      | Load the authenticated user’s plan, shared context, and configuration status |
| PUT    | `/context`        | Save reviewed company references                                             |
| POST   | `/proposals`      | Generate a first proposal or revise it with feedback                         |
| PUT    | `/plan`           | Accept a proposal, including reviewed edits or order                         |
| PATCH  | `/tasks/{taskId}` | Save status, blocker, and completion note                                    |

Success responses use `{ "data": ... }`. Errors use `{ "error": { "code": "...", "message": "..." } }`. The JSON contract does not expose database identifiers for ownership or allow callers to select another workspace owner. Error messages are currently localized in Spanish; codes are stable for other clients.

All endpoints require the existing Clerk session and server-side administrator authorization. Every mutation requires JSON and an `Origin` matching `APP_BASE_URL`. A replacement frontend on the same origin can use this contract unchanged. A separately hosted frontend needs an explicitly designed authentication and allowed-origin policy; this prototype does not enable permissive CORS.

Mutations carry an expected `version`. Stale versions return HTTP 409. The generated proposal has its own ID and context version, both checked during acceptance. Generation reserves a workspace version before the provider call, so reload `/workspace` after a failed request before retrying. API responses and the page are private and non-cacheable.

## Persistence and limits

MongoDB collections are initialized on first access:

- `planning_workspaces`: one record per platform user, keyed by its internal user ID. Includes submitted text, a pending proposal, accepted plan, bounded conversation, generation counters, and version.
- `planning_context`: one company record keyed by `dnature`, containing current reviewed references and a version. Proposals retain the source snapshot that informed them.

The built-in unique `_id` indexes are sufficient for the prototype’s direct lookups; no existing collections or records need migration. Writes use atomic version checks. Generation has a 150-second reservation that expires if a process dies; a late response cannot overwrite a newer version.

Limits are 40 tasks per plan, 20 company references, 24,000 total context-content characters, 12,000 backlog characters, 3,000 personal-context characters, 3,000 feedback characters, 20 retained conversation messages, and 256,000 actual request-body bytes. Every generation attempt counts toward 50 attempts per user per UTC day, with at least 10 seconds between attempts. These limit accidental usage but do not replace provider project spending limits.

## Verification

Standard checks run with `pnpm verify` from `web/`. Planning tests cover proposal/acceptance separation, edits, progress, user isolation, dependency validation, fabricated references, context changes, concurrency, quota, error recovery, HTTP access, and UI interaction.

The live integration test is opt-in and uses only a synthetic backlog. It creates a uniquely named test workspace, calls the configured model, reloads and accepts the plan, records completion, and deletes only that test workspace. It does not change company context:

```sh
RUN_PLANNING_LIVE=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration/planning-openai.test.ts
```

## Prototype boundaries

The interface supports one retained personal plan with a bounded conversation, not a full project portfolio or immutable audit archive. Current context versions and proposal source snapshots support explanations, but the prototype does not retain every discarded proposal or every past context edit.

Task identity and dependency validity are checked in application code. Grounding quality, completeness of extraction from prose, priority quality, and factual claims in explanations still require human review and evaluation. A source ID being valid does not prove that its content supports a claim.

Generation is synchronous. Before deploying, verify that the host permits the configured duration; Next.js `maxDuration` alone does not change the hosting provider’s limits. Move generation behind a durable job API if production hosting or usage requires it. This prototype does not automatically delegate tasks, make commitments, or execute work.
