# Design system

## Purpose

The Colaboradores DNA design system supports an internal operations dashboard.
It prioritises clear status, efficient data entry, predictable navigation, and
accessible workflows over decorative complexity.

The system is implemented with native CSS and reusable React components under
`web/src/components/ui/`.

## Core principles

### 1. Accessible by default

Accessibility is a component requirement, not a final review step.

- Target WCAG 2.2 AA.
- Use native semantic elements before adding ARIA.
- Every control has a programmatically associated label.
- Keyboard focus is always visible and follows the visual order.
- Color never communicates status by itself; pair it with text.
- Interactive targets are at least 44 CSS pixels in their primary size.
- Respect reduced-motion preferences.
- Test automated accessibility with axe and complete keyboard and screen-reader
  checks for critical workflows.

### 2. Useful before decorative

Team members use the dashboard repeatedly, often while handling several cases.

- Put the primary task and current status first.
- Prefer direct, familiar language and specific action labels.
- Keep forms short and reveal additional fields only when needed.
- Use tables for comparable operational records and cards for summaries.
- Preserve enough information density for desktop work without making touch and
  mobile layouts difficult to use.
- Make destructive and irreversible actions visually distinct and confirm them
  at the point of action.

### 3. Consistent, not rigid

Consistency reduces learning time, but components must still fit their content.

- Use semantic tokens instead of hard-coded color, spacing, or radius values.
- Use the four-pixel spacing scale.
- Reuse standard component variants before creating local alternatives.
- Keep the same label, status, and action wording for the same concept.
- Extend a shared component when the behaviour is common across products; keep
  domain-specific compositions inside their feature.

## Foundations

### Typography

The system uses the operating system sans-serif stack for speed, familiarity,
and reliable rendering. The monospace stack is reserved for compact identifiers
and technical values.

| Token        | Use                                      |
| ------------ | ---------------------------------------- |
| `--text-xs`  | Metadata, table labels, helper text      |
| `--text-sm`  | Controls, navigation, dense body content |
| `--text-md`  | Standard body content and card titles    |
| `--text-lg`  | Emphasised supporting text               |
| `--text-xl`  | Section headings                         |
| `--text-2xl` | Page titles                              |

Keep body text at a minimum of `--text-sm` in dense dashboard views. Use sentence
case for headings, labels, buttons, and navigation.

### Color

Components consume semantic color tokens such as `--color-text`,
`--color-surface`, `--color-border`, and `--color-success`. Primitive palette
values are defined centrally but should not be referenced from feature CSS.

The two brand colors are:

| Token            | Value     | Role                                               |
| ---------------- | --------- | -------------------------------------------------- |
| `--brand-cyan`   | `#07bbc7` | Primary actions, selected controls, brand presence |
| `--brand-orange` | `#ff6f00` | Secondary accent, focus, and key visual markers    |

Both colors require a dark foreground when used as a background. Components
must consume `--color-brand-contrast` or `--color-accent-contrast` rather than
assuming white text.

Status meanings are fixed:

| Meaning     | Token family       | Examples                            |
| ----------- | ------------------ | ----------------------------------- |
| Success     | `--color-success*` | Complete, healthy, on target        |
| Warning     | `--color-warning*` | Needs review, approaching deadline  |
| Danger      | `--color-danger*`  | Blocked, failed, destructive action |
| Information | `--color-info*`    | In progress, informational state    |
| Neutral     | Neutral tokens     | Draft, inactive, unavailable        |

### Light and dark themes

The interface follows the operating-system color preference on the first visit.
The Light and Dark control in the workspace header saves an explicit preference
on the current device.

- Theme styles are selected with `data-theme="light"` or `data-theme="dark"` on
  the root HTML element.
- Components must use semantic tokens so they adapt without theme-specific
  component rules.
- Both themes retain the exact brand colors while changing canvas, surface,
  text, border, status, and elevation tokens for legibility.
- Any new component must pass the automated WCAG checks in both themes.

### Spacing

Use `--space-1` through `--space-16`. The scale is based on four pixels. Avoid
one-off spacing values unless required for a precise accessible control or
border.

### Shape and elevation

- `--radius-sm`: compact markers and small elements.
- `--radius-md`: buttons, form controls, and navigation items.
- `--radius-lg`: panels and cards.
- `--radius-full`: badges and avatars.
- `--shadow-sm`: default surface separation.
- `--shadow-md`: temporary elevated surfaces such as menus.

## Components

### Button and ButtonLink

Location: `web/src/components/ui/button/`

Variants:

- `primary`: one principal action per region.
- `secondary`: supporting or reversible action.
- `quiet`: low-emphasis table and toolbar action.
- `danger`: destructive action with clear surrounding context.

Sizes are `small`, `medium`, and `large`. Use `Button` for actions and
`ButtonLink` for navigation; do not style a link as a button without preserving
link semantics.

### Form fields

Location: `web/src/components/ui/form-field/`

The initial set includes `TextField`, `SelectField`, `TextAreaField`, and
`CheckboxField`.

- Labels are required in the component API.
- Optional fields are marked explicitly; required fields are the default.
- Helper text explains format or consequence, not the label again.
- Error text is linked to the field with `aria-describedby`.
- Validate on submission and after correction; avoid showing errors before the
  user has interacted with a field.

### Navigation

Location: `web/src/components/ui/navigation/`

`SideNavigation` is the primary dashboard navigation. It marks the active
destination with `aria-current="page"`. `Breadcrumbs` communicate hierarchy
within nested product areas.

Use nouns for destinations and verbs for actions. Keep the primary navigation
stable across sessions, and do not use badges for decorative counts.

### Card

Location: `web/src/components/ui/card/`

Cards group one related piece of operational information. Use `CardHeader` for a
title, optional description, and one compact action. Do not nest cards.

### StatusBadge

Location: `web/src/components/ui/status-badge/`

Badges pair color, text, and a marker so status is not color-only. Use the same
tone for the same status across every product.

### Asynchronous feedback

Location: `web/src/components/ui/feedback/`

- Use `Skeleton` inside `LoadingRegion` for structural route or region loading.
- Use `Spinner` for a contained operation; a standalone spinner requires a
  Spanish accessible label.
- Use `SubmitButton` inside Server Action forms and provide a specific Spanish
  `pendingLabel`.
- Use `ProgressBar` only when progress is meaningfully determinate or a
  contained long-running task needs an indeterminate indicator.
- Trigger notifications through the project feedback API, never by importing
  Sonner in a feature. Server code returns or redirects with an allow-listed
  English key, and the shared catalog supplies safe Spanish text.

Success and informational notifications dismiss automatically. Warnings remain
longer, and actionable errors remain until dismissed. Notifications never
replace inline validation, destructive confirmation, or permanent critical
information.

## Contribution rules

Before adding or changing a shared component:

1. Confirm the pattern appears in more than one feature or product.
2. Define the semantic API before visual variants.
3. Include keyboard, disabled, error, loading, and responsive states when they
   apply.
4. Add unit or component tests for accessibility-critical semantics.
5. Update this document and the dashboard reference implementation.
6. Run `pnpm verify` and `pnpm test:e2e`.
