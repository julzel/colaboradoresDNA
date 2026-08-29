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
