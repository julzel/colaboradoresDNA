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

- All active administrators and the assigned approver receive submission notifications.
- The requester receives approval, denial and admin cancellation notifications, including administrator-created approved leave.
- Notifications derive from transactionally committed status history. Each transition has its own read key, so reading an approval does not hide a later cancellation.
- The bell and dashboard refresh every 60 seconds while the page is visible and when the tab becomes visible again. This is in-app delivery, not email or browser push.
- The feed is bounded to the latest 100 relevant requests/events. Leave transitions are shown newest-first ahead of upcoming calendar events. Open a notification for full request details and cancellation reason.

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
