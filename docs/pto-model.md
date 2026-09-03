# Leave request categories and vacation balance

The absence module stores a stable category code on every `pto_requests`
document and presents the corresponding Spanish label in the UI.

| Stored code    | UI label                  | Changes vacation balance when approved |
| -------------- | ------------------------- | -------------------------------------- |
| `vacation`     | Vacaciones                | Yes                                    |
| `incapacity`   | Incapacidad               | No                                     |
| `maternity`    | Maternidad                | No                                     |
| `paternity`    | Paternidad                | No                                     |
| `unpaid_leave` | Permiso sin goce salarial | No                                     |
| `bereavement`  | Duelo                     | No                                     |
| `other`        | Otro                      | No                                     |

## Category visuals

Category identity never relies on color alone. Every color is paired with a
Lucide icon in request forms, lists, details, administration, and calendar
quick details.

| Category       | Icon               | Color              |
| -------------- | ------------------ | ------------------ |
| `vacation`     | Tree palm          | Green / success    |
| `incapacity`   | Heart pulse        | Red / danger       |
| `maternity`    | Baby               | Purple             |
| `paternity`    | Hand holding heart | Blue / information |
| `unpaid_leave` | Wallet cards       | Amber / warning    |
| `bereavement`  | Flower             | Slate / neutral    |
| `other`        | Circle ellipsis    | Cyan / brand       |

The semantic variables are declared in `src/styles/tokens.css`, including dark
theme values through their existing semantic aliases. Icon selection is
centralized in `pto-category-badge.tsx`.

The policy is defined by `ptoCategoryConsumesBalance` in the PTO domain. Both
warning projections and approval transactions use that mapping. Non-vacation
requests can be submitted and approved without an initialized vacation balance;
their request balance snapshots remain `null` and no ledger entry is created.

## Schedule-derived duration

Requested duration is calculated on the server from the collaborator's
effective schedule. PTO owns the narrow contract in
`src/features/pto/integrations/pto-scheduling-port.ts`; the Scheduling slice
provides its adapter. PTO does not import a Scheduling repository or MongoDB
document type.

The current full-day policy is:

- every scheduled working date in the inclusive request range counts as one
  full leave day;
- one full leave day equals two PTO balance units, even when the scheduled shift
  is shorter or longer than eight hours;
- the calculation retains total scheduled minutes and source schedule IDs, but
  does not divide minutes by eight to produce fractional days;
- national holidays are not implicitly removed from the range;
- missing or overlapping effective schedule coverage fails closed instead of
  silently producing a smaller request.

Scheduling returns neutral work facts. PTO owns this day/unit conversion and any
future rules for exact hour-based partial leave, category-specific calendar
days, balance rounding, or holiday exclusion. The existing explicit half-day
choice remains supported for a request containing one scheduled work date. In
particular, the national-holiday feed used by Calendar is not an implicit PTO
policy dependency.

The external draft command cannot supply calculation metadata or a duration
total. It carries only an explicit `requestedPortion` (`full` or `half`) beside
the dates and category. A half-day intent is valid only when resolution finds
one scheduled work date. PTO derives `durationUnits`, stamps the policy version,
and builds the persistence snapshot, so a client or Scheduling adapter cannot
change the total or version independently of PTO's conversion rule.

Existing PTO documents without `requestedPortion` remain readable. A legacy
single-date, one-unit request normalizes to `half`; every other legacy request
normalizes to `full`. The next draft edit persists the explicit value.

An editable draft can be recalculated from current effective schedule data. At
submission, the server freezes the calculated duration and policy/source
snapshot. A later schedule edit or historical correction does not retroactively
change a pending, approved, denied, or cancelled request; approval and vacation
balance accounting use the frozen request duration.

Legacy v1 schedules still identify working dates, so they can support the
full-day count. Their exact start and end times remain unknown. Any nominal
four- or eight-hour compatibility total must not be presented as a recovered
clock interval. See [Collaborator scheduling](./scheduling.md) for the v1/v2
reader and migration policy.

## New request UI

Collaborators create leave requests from `/ausencias` with the **Nueva
solicitud** action. It opens the shared accessible modal as a mobile bottom
sheet and as a centered dialog on larger screens. The form is rendered in place;
there is no standalone `/ausencias/nueva` route. Saving a draft still redirects
to the created request detail, while **Cancelar**, the close button, Escape, and
the backdrop dismiss the modal without navigation.

## Database bootstrap and migration

Run `pnpm bootstrap:pto-model` from `web` with the deployment environment
configured. The bootstrap is idempotent and performs these category migrations:

- `sick` becomes `incapacity`.
- `personal` becomes `other`, the safest non-specific replacement for the old
  personal-permission category.

It then applies a strict MongoDB validator to `pto_requests.category` using the
seven supported codes. Historical balance ledger entries and balance snapshots
are intentionally not rewritten: they remain an audit record of policy applied
when those requests were approved.
