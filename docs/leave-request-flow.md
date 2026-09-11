# Leave requests: rules and operations

## Cancellation

- Calendar dates use `America/Costa_Rica`, not UTC or elapsed hours.
- A collaborator can cancel their draft, pending, or approved request through the date two calendar days before its start, inclusive. Example: leave starts Monday; Saturday is the last cancellation date.
- An administrator can cancel any collaborator's draft, pending, or approved leave, in every category, until the day before its start. A trimmed reason of 3–1000 characters is mandatory. Administrators cancelling their own requests use the collaborator cutoff.
- Started/past leave and denied/already-cancelled requests cannot be cancelled.
- Cancellation of approved vacation restores the exact original debit. Request state, refund ledger and audit are committed in one MongoDB transaction. Unique indexes prevent duplicate refunds. Other leave categories do not change PTO balances.
- The cancellation reason is retained and visible in request details.

## Duration

### Conflicting requests

For the same employee, draft, pending and approved leave of any category block overlapping inclusive date ranges. Cancelled and denied requests do not block. Half-day requests also reserve their calendar date because the form does not distinguish morning from afternoon. Editing excludes the request itself. This checks other leave requests, not unrelated calendar meetings.

The live preview lists conflicting categories, dates, statuses and links and disables creation while a conflict is present. The server repeats the check for draft creation/editing, submission, direct admin creation and approval; warnings cannot override a collision. A transaction writes an employee-scoped revision before checking overlaps so simultaneous submissions cannot both succeed. Rejected creations do not deduct balances.

The form requests a debounced, authorized server preview whenever dates, employee, category or portion change. Saving and submitting independently recalculate on the server; the client cannot provide trusted totals.

Schedule coverage, regular days off, alternating schedules and Costa Rican national holidays determine valid working dates. Each full working date costs one day; half-day requests require exactly one valid working date. Holiday data comes from the same cached Nager.Date integration used by the calendar. Provider failures and incomplete schedule coverage block calculation rather than silently counting incorrectly. The maximum request range is 366 calendar days.

New calculations carry policy version 2. Previously approved requests retain their original stored debit; cancellation refunds that debit, not a recalculated amount. Existing pending snapshots are not retroactively rewritten.

## In-app notifications

Approved leave appears on every authenticated collaborator's calendar, across departments and reporting lines. Calendar details expose the absence dates, category, duration and collaborator name. Private notes, comments and the full request remain restricted to the requester, assigned manager and admins. Draft, pending, denied and cancelled requests are excluded from the calendar.

- All active administrators and the assigned manager receive submission notifications.
- The requester and assigned manager receive approval, denial and cancellation updates when another person makes the transition. The requester also receives administrator-created approved leave updates.
- Notifications derive from transactionally committed status history. Each transition has its own read key, so reading an approval does not hide a later cancellation.
- The bell and dashboard refresh every 60 seconds while the page is visible and when the tab becomes visible again. This is in-app delivery, not email or browser push.
- Notifications are shown only in the bell's responsive drawer, not as a home-page section. Each unread entry offers a mark-as-read button; successful reads animate out and remain excluded on subsequent loads. Opening an entry persists its read state before navigating to its authorized detail page. Failed writes leave the entry available to retry.
- The feed is bounded to the latest 100 relevant requests/events. Leave transitions are shown newest-first ahead of upcoming calendar events. Open a notification for full request details and cancellation reason.

## Manager review and comments

Only active administrators can approve or deny leave, including requests assigned to a supervisor. Self-approval remains prohibited. The UI, service and repository enforce this rule.

Submission snapshots the effective direct manager in the existing `assignedApproverPlatformUserId` field. It is also used for manager visibility and notifications; the historical field name no longer grants approval permission. An active supervisor or administrator manager is eligible. Collaborators require an eligible manager; supervisors/admins without one use the administrator pool. Changing an employee's assignment does not silently move existing requests to a new manager.

The requester, assigned supervisor/administrator and administrators can read submitted requests and add comments. Unrelated supervisors cannot access the thread, and managers cannot access drafts. Supervisors see their pending requests under **Solicitudes de mi equipo**.

Comments are append-only, stored atomically within the request, and contain server-assigned IDs, author account IDs, author names at posting, timestamps and plain text (1–2000 trimmed characters). All participants see the same thread, including after approval or denial. Existing requests with no comments need no migration. Comments do not change status or PTO balance; comment email/push notifications are not sent.

## Monthly PTO accrual deployment

Set these server-only Netlify environment variables (available to Functions):

- `APP_BASE_URL`: production HTTPS origin.
- `CRON_SECRET`: a separate random secret, at least 32 characters. Generate locally with `openssl rand -hex 32`; never use a `NEXT_PUBLIC_` variable.
- `PTO_ACCRUAL_START_MONTH`: explicitly choose the first credited month, e.g. `2026-10`. Choosing the current month enables its credit on the next scheduled run.

`web/netlify/functions/pto-accrual.mjs` runs daily at 06:00 UTC (midnight Costa Rica), production context only. The first run on the 1st adds one day (two half-day units) per active employee whose employment began on or before that month's 1st. Daily retries recover an interrupted run within the same month; the unique employee/month ledger index prevents double credits. Missing balance records are initialized to zero before crediting. Manual adjustments remain separate ledger entries and are never overwritten.

The scheduled function calls `POST /api/internal/pto-accrual` with a constant-time-checked bearer secret. Missing/invalid secrets are rejected. Monitor the Netlify function logs for failed runs. There is no automatic historical-month backfill: a complete missed month requires an audited manual adjustment. Future hires and inactive employees are excluded.

Runtime indexes are created automatically; `pnpm bootstrap:pto-model` contains the same indexes. Deploy the application and scheduled function together. Merely adding environment settings locally does not activate a production schedule. See [Netlify scheduled functions](https://docs.netlify.com/build/functions/scheduled-functions/).

## Verification

Run `pnpm test` for unit/component/domain checks. The opt-in MongoDB workflow uses a uniquely allocated `dna_audit_*` database, synthetic identities and mocked holiday responses; it removes only that database afterwards:

```sh
RUN_PTO_LIVE=1 node --env-file=.env.local ./node_modules/vitest/vitest.mjs run tests/integration/pto-mongodb.test.ts
```

This validates real request/balance transactions without sending emails or altering employee data. The authentication boundary is mocked; it is not a substitute for a signed-in production browser check or confirmation that Netlify's deployed scheduler has run successfully.
