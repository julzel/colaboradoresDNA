# Asynchronous UI and feedback foundation

## Document status

**Status:** Implemented foundation (phases 1–3). Phase 4 applies when the
employee CRUD is introduced.

**Scope:** Suspense and streaming, skeletons, pending indicators, progress,
toasts, expected errors, and optimistic feedback for Colaboradores DNA.

This document defines the frontend conventions to establish before building
the employee CRUD. It is aligned with Next.js App Router, React Server
Components, Server Actions, native CSS, the existing design tokens, Spanish
interface text, WCAG 2.2 AA, and the project's light and dark themes.

## Implementation outcome

The shared foundation is available in `web/src/components/ui/feedback/` and
`web/src/lib/actions/`. It includes:

- Skeleton and accessible loading-region primitives.
- Standalone and button-level spinners.
- Determinate and indeterminate progress bars.
- A `useFormStatus` submit button that prevents duplicate submissions.
- A project-owned Sonner wrapper with safe Spanish messages, responsive
  placement, dismissal rules, and light/dark theme tokens.
- Safe redirect feedback keys with one-time URL cleanup.
- An authenticated `(workspace)` layout that preserves navigation during route
  loading.
- Route loading and error boundaries plus a streamed account directory.

The existing account invitation, resend, deactivation, and reactivation forms
use the pending and feedback conventions. Employee-specific skeletons, action
results, validation, and optional optimistic preferences belong to phase 4.

## Recommendation summary

Use the smallest feedback mechanism that accurately describes the work:

| Situation                                          | Recommended feedback                                   |
| -------------------------------------------------- | ------------------------------------------------------ |
| A route or large server-rendered region is loading | Route `loading.tsx` or a local Suspense skeleton       |
| A form is submitting                               | Pending button label plus inline spinner               |
| A single control is updating                       | Disable that control and show local pending text       |
| Work has measurable completion                     | Determinate progress bar                               |
| Work is active but has no measurable completion    | Spinner or indeterminate region progress               |
| A meaningful mutation succeeded                    | Toast plus updated page state                          |
| A field or business validation failed              | Inline form error; toast only when a summary is useful |
| An unexpected route failure occurred               | Route `error.tsx` boundary                             |
| A safe, reversible change is pending               | Optional optimistic update                             |

Do not use one global loading boolean. Independent operations must not block or
overwrite each other's state.

## Core decisions

### Use framework-native asynchronous state

- Use `loading.tsx` for route-segment loading and React `<Suspense>` for
  independently streamed Server Components.
- Use `useActionState` for Server Action result state.
- Use `useFormStatus` inside forms for submit-button pending state.
- Use `useTransition` for non-form client transitions when a pending signal is
  needed.
- Use `useOptimistic` only for low-risk, reversible changes.
- Keep data fetching in Server Components and repositories. Do not add a
  client-side request library or global state library solely for loading
  indicators.

### Add Sonner behind a project-owned toast API

Installed dependency:

```bash
cd web
pnpm add sonner
```

Sonner supports React 19 and provides the difficult behavioral parts of a toast
system: stacking, timers, dismissal, promise replacement, and viewport
management. The application should not import Sonner directly from feature
code. Wrap it with local components and functions so product rules, Spanish
messages, tokens, and a future library replacement remain under project
control.

The wrapper must still receive project-specific accessibility, motion, theme,
and automated testing. A library does not replace that review.

### Do not add a global route progress package

Next.js App Router does not expose the previous `router.events` API. Avoid
patching browser history, monkey-patching every link, or adding an NProgress
integration that can become stuck when navigation is interrupted.

Prefer:

1. A persistent workspace layout.
2. Route-level `loading.tsx`.
3. Local Suspense boundaries for slower content.
4. Pending state on the control that initiated an action.

A top progress bar can be reconsidered only if later usability testing shows
that route skeletons are insufficient.

## Recommended project structure

```text
web/src/
├── app/
│   ├── (workspace)/
│   │   ├── layout.tsx
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── colaboradores/
│   │   │   ├── loading.tsx
│   │   │   └── error.tsx
│   │   ├── calendario/
│   │   └── admin/
│   └── global-error.tsx
├── components/
│   └── ui/
│       └── feedback/
│           ├── progress-bar/
│           ├── skeleton/
│           ├── spinner/
│           └── toast/
├── features/
│   └── <feature>/
│       ├── actions/
│       ├── components/
│       └── feedback/
└── lib/
    └── actions/
        ├── action-result.ts
        └── feedback-messages.ts
```

Route groups do not change public URLs. Moving authenticated pages under
`app/(workspace)/` would let a shared layout preserve the sidebar and header
while only the page content streams or changes. Authorization must still run
inside every protected page and mutation; a shared layout is not the only
authorization boundary.

The current `WorkspaceShell` can become the workspace layout gradually. Do not
couple this refactor to the employee data model if it makes the first CRUD
change too large.

## Async action contract

Expected outcomes from Server Actions should be serializable return values,
not thrown exceptions.

Recommended shared type:

```ts
type FeedbackMessageKey =
  | "employee.created"
  | "employee.updated"
  | "employee.deactivated"
  | "invitation.sent"
  | "invitation.resent"
  | "operation.failed";

type ActionResult<TData = undefined> =
  | {
      status: "idle";
    }
  | {
      status: "success";
      messageKey: FeedbackMessageKey;
      data: TData;
    }
  | {
      status: "error";
      messageKey: FeedbackMessageKey;
      fieldErrors?: Record<string, string[]>;
    };
```

Rules:

- Return stable English codes or keys from server code.
- Map keys to Spanish interface text in a centralized message catalog.
- Never return database errors, provider responses, stack traces, tokens,
  invitation URLs, identification values, birthdays, phone numbers, or other
  sensitive information as feedback.
- Use inline field errors for validation.
- Throw only for unexpected programming or infrastructure failures that should
  reach the nearest `error.tsx`.
- Call `revalidatePath`, `revalidateTag`, `refresh`, or `redirect` only after
  the mutation succeeds.
- Make retry-sensitive operations idempotent where possible.

Example Spanish catalog:

```ts
const feedbackMessages = {
  "employee.created": "El colaborador fue creado.",
  "employee.updated": "Los cambios fueron guardados.",
  "employee.deactivated": "El colaborador fue desactivado.",
  "invitation.sent": "La invitación fue enviada.",
  "invitation.resent": "La invitación fue enviada nuevamente.",
  "operation.failed": "No pudimos completar la acción. Intentá de nuevo.",
} satisfies Record<FeedbackMessageKey, string>;
```

## Suspense and skeleton guidance

### Route-level loading

Use `loading.tsx` when most of a route depends on uncached server data.
Examples:

- Employee directory initial load.
- Employee detail initial load.
- Administration summaries.
- Calendar initial event range.

The loading file should render the content skeleton only. When the workspace
shell becomes a shared layout, do not redraw fake sidebars or headers inside
every route fallback.

### Component-level Suspense

Use a local `<Suspense>` boundary when a slow region can load independently,
for example:

- Employee profile details.
- Assignment and schedule history.
- PTO balance summary.
- Calendar events and birthday list.
- Audit timeline.

Move the asynchronous data access into the Server Component inside the
boundary. Wrapping already-awaited data in Suspense does not create useful
streaming.

Avoid excessive boundaries. A boundary should represent a meaningful region
that can appear independently without confusing the page.

### Skeleton design

Skeletons must:

- Approximate the final component's dimensions to avoid layout shift.
- Use semantic design tokens in both light and dark themes.
- Be decorative with `aria-hidden="true"`.
- Mark the containing content region with `aria-busy="true"` when practical.
- Include one visually hidden Spanish status such as `Cargando colaboradores…`
  when the loading state otherwise has no accessible name.
- Avoid rendering fake names, dates, counts, or rows that could be mistaken for
  real employee data.
- Respect `prefers-reduced-motion`.
- Use a subtle pulse or shimmer; no rapid movement or flashing.
- Render only enough placeholder rows to communicate structure.

Recommended primitive API:

```tsx
<Skeleton width="60%" height="1rem" />
<Skeleton variant="circle" width="2.5rem" height="2.5rem" />
<SkeletonText lines={3} />
```

Feature-specific skeletons should compose primitives:

```tsx
<EmployeeDirectorySkeleton rows={6} />
<EmployeeProfileSkeleton />
<CalendarSkeleton />
```

Do not build a single universal page skeleton.

## Spinners and pending controls

### Spinner primitive

Use the installed Lucide `LoaderCircle` icon with native CSS animation.

Recommended API:

```tsx
<Spinner size="small" label="Guardando…" />
```

Rules:

- A standalone spinner requires a Spanish accessible label.
- A spinner inside a button is `aria-hidden`; the button's visible pending
  label communicates the state.
- Respect `prefers-reduced-motion` by replacing rotation with a static icon or
  reduced animation.
- Avoid full-page centered spinners when a structural skeleton is possible.
- Consider a short visual delay before showing an indicator to reduce flicker
  for very fast operations, but disable duplicate submission immediately.

### Pending submit button

Create a reusable Client Component rendered inside the relevant `<form>`:

```tsx
function SubmitButton({
  children,
  pendingLabel,
}: {
  children: ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <Spinner aria-hidden size="small" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
```

Examples:

| Action                 | Pending label             |
| ---------------------- | ------------------------- |
| Crear colaborador      | Creando colaborador…      |
| Guardar cambios        | Guardando cambios…        |
| Enviar invitación      | Enviando invitación…      |
| Desactivar colaborador | Desactivando colaborador… |
| Guardar horario        | Guardando horario…        |

Disable the submitting control immediately. Disable other fields only when
editing them during submission would make the result ambiguous. Keep safe
navigation and cancel actions available when possible.

## Progress bars

Provide two explicit variants.

### Determinate progress

Use when the application knows `value` and `max`, such as:

- A multi-step employee onboarding form.
- A future import or upload.
- A known batch operation.

Use native `<progress>` when its styling meets the design requirement, or a
custom element with `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and
`aria-valuemax`.

Always pair the bar with text:

```text
Paso 2 de 4
50 % completado
```

### Indeterminate progress

Use only for a contained operation that takes longer than an inline spinner
and has no measurable percentage. Omit `aria-valuenow`; provide an accessible
label such as `Cargando historial…`.

Do not show fake percentages or automatically advance a determinate bar without
real completion data.

## Toast feature

### Local wrapper

Recommended files:

```text
components/ui/feedback/toast/
├── toast-provider.tsx
├── toast.module.css
├── toast.ts
└── toast.types.ts
```

Feature code should call project functions:

```ts
appToast.success("employee.updated");
appToast.error("operation.failed");
appToast.info("invitation.sent");
```

The wrapper maps message keys to Spanish copy and configures Sonner. Do not
allow arbitrary provider error messages to be displayed.

Place the toast viewport once inside `ClerkProvider` in the root layout so it
survives client navigation and works on authenticated and account pages.

### When to use a toast

Use toasts for outcomes that are meaningful but do not require a permanent
page region:

- Employee created or updated.
- Invitation sent or resent.
- Schedule saved.
- Birthday visibility preference updated.
- Profile contact information updated.
- Account deactivated or reactivated.
- A background refresh failed while existing content remains usable.

Do not use a toast for:

- Routine route navigation.
- Initial page loading.
- Every keystroke or selection.
- Field-level validation that belongs next to the field.
- Destructive confirmation; use a confirmation dialog before the action.
- Critical information that the user must retain or act on; render it inline.
- Authentication or authorization decisions that require a dedicated page.

### Toast behavior

- Show at most three visible toasts; queue additional messages.
- Deduplicate repeated messages from the same operation.
- Success: dismiss automatically after approximately four seconds.
- Information: dismiss after approximately five seconds.
- Warning: remain longer and include a close button.
- Error: remain until dismissed when user action may be required.
- Pause dismissal while hovered, focused, or when the browser tab is hidden.
- Provide a Spanish close label: `Cerrar notificación`.
- Never move keyboard focus to a routine toast.
- Keep the trigger's focus stable after the operation.
- Use an icon and text; never use color alone.
- Desktop placement: top-right within the safe viewport.
- Mobile placement: bottom-center above safe-area insets and important fixed
  controls.
- Use semantic color tokens for success, warning, danger, and information.
- Respect reduced motion; remove sliding or spring effects when requested.

### Accessible announcements

- Success and informational feedback use `role="status"` or
  `aria-live="polite"`.
- Urgent errors may use `role="alert"` or `aria-live="assertive"`.
- Do not mark every error assertive; repeated interruptions are disorienting.
- Keep live regions mounted and update their content when possible.
- Use `aria-atomic="true"` so the complete message is announced.
- Visual disappearance must not occur before assistive technology has a
  reasonable opportunity to announce the message.

## Feedback across redirects

The current administrative actions use safe query-string codes such as
`?notice=invitation_sent`. Standardize these as `FeedbackMessageKey` values.

Recommended transition path:

1. Server Action validates, authorizes, and mutates.
2. It redirects with a safe message key only.
3. A small client feedback bridge reads the key.
4. The bridge shows the mapped Spanish toast.
5. It removes the feedback parameter with `router.replace`.

Rules:

- Never put message text, emails, names, IDs, or provider errors in the URL.
- Unknown message keys are ignored.
- Refreshing the clean URL must not repeat the toast.
- When JavaScript is unavailable, the server-rendered page should still show a
  safe inline notice.

For forms that stay on the same page, prefer `useActionState` and trigger the
toast from the returned success state instead of redirecting.

## Form validation and errors

- Field errors remain next to their inputs and are connected with
  `aria-describedby` or `aria-errormessage`.
- On failed submission, focus the first invalid field or an error summary that
  links to invalid fields.
- Preserve entered values after expected validation failures.
- A toast may summarize `Revisá los campos indicados`, but cannot replace the
  inline errors.
- Expected conflicts such as duplicate identification or overlapping schedule
  periods return typed action errors.
- Unexpected failures reach the nearest route `error.tsx`, with safe Spanish
  copy and a retry action.
- Add domain-level `error.tsx` files for employee administration and calendar
  routes. Keep `global-error.tsx` as the final fallback.
- Log unexpected server failures safely with a correlation identifier; show
  only the safe identifier if support needs it.

## Optimistic updates

Use `useOptimistic` only when:

- The outcome is very likely to succeed.
- The change is easy to reverse visually.
- Temporary inconsistency cannot grant access or cause business harm.

Reasonable candidates:

- Birthday calendar-sharing toggle.
- Non-sensitive display preferences.
- Adding a draft-only local schedule row before submission.

Do not optimistically apply:

- Employee creation or deactivation.
- Role or reporting-manager changes.
- Identification changes.
- Invitation delivery.
- PTO balance changes or approvals.
- Session revocation.

Security and business decisions always wait for the server response.

## Concurrency and duplicate submissions

- Pending UI prevents accidental repeated clicks but is not a consistency
  boundary.
- Server Actions must tolerate retries and duplicate requests.
- Use database uniqueness, effective-period validation, transactions, and
  idempotency keys for sensitive multi-record operations.
- A toast should describe the final server result, not the button click.
- If a second update conflicts with newer data, return a safe conflict state
  and ask the user to review refreshed information.

## Design tokens to add

Add semantic tokens instead of feature-specific colors:

```css
--color-skeleton: var(--color-surface-muted);
--color-skeleton-highlight: var(--color-surface-subtle);
--color-progress-track: var(--color-surface-muted);
--color-progress-value: var(--color-brand);
--toast-max-width: 24rem;
--motion-fast: 150ms;
--motion-standard: 220ms;
```

Define appropriate dark-theme values where existing semantic tokens are not

## Testing requirements

### Unit and component tests

- Action result type guards and message-key mapping.
- Submit button becomes disabled and renders the Spanish pending label.
- Spinner accessible label behavior.
- Progress ARIA values for determinate and indeterminate variants.
- Toast variant, close control, queue, deduplication, and timeout behavior.
- Reduced-motion behavior.
- Inline validation remains associated with its field.
- Unknown feedback keys do not render.
- Sensitive values never appear in feedback.

Use fake timers for toast duration tests. Restore timers after each test.

### End-to-end tests

- Route skeleton appears under an intentionally delayed test data source and
  is replaced by real content.
- Workspace navigation remains usable during segment loading.
- A successful employee mutation shows one Spanish toast.
- A validation failure shows inline errors and preserves values.
- A failed mutation does not show a success toast.
- Redirect feedback is shown once and its query parameter is removed.
- Repeated submission does not create duplicate records.
- Toasts are keyboard dismissible and do not steal focus.
- Light and dark themes have no automated accessibility violations.
- Reduced-motion mode removes nonessential animation.

### Manual accessibility checks

- Verify announcements with VoiceOver on macOS/iOS and at least one additional
  screen reader before MVP release.
- Confirm that rapid operations do not create overlapping announcements.
- Confirm that persistent errors can be reached and dismissed by keyboard.
- Confirm that zoom and mobile safe areas do not hide toasts or progress.

## Implementation phases

### Phase 1: Feedback primitives

1. Add the semantic tokens.
2. Add Skeleton, Spinner, and ProgressBar primitives with native CSS.
3. Add Sonner and the project-owned toast wrapper.
4. Extend Button with an explicit pending composition or add SubmitButton.
5. Add component and accessibility tests.

### Phase 2: Server Action contract

1. Add `ActionResult` and `FeedbackMessageKey`.
2. Add the centralized Spanish message catalog.
3. Convert existing invitation/account actions from ad hoc query codes to the
   shared contract without weakening redirects or authorization.
4. Add the redirect feedback bridge and one-time cleanup.
5. Verify that no provider or sensitive data reaches feedback.

### Phase 3: Route streaming and errors

1. Introduce the authenticated workspace route group or equivalent shared
   layout.
2. Add content-only route skeletons.
3. Add local Suspense boundaries around independently slow Server Components.
4. Add feature-level error boundaries.
5. Test interrupted navigation and slow server responses.

### Phase 4: Employee CRUD integration

1. Apply pending labels and inline validation to every form.
2. Add success/error toasts for meaningful mutations.
3. Add employee directory and detail skeletons.
4. Add determinate progress only if the create flow becomes multi-step.
5. Use optimistic state only for the approved low-risk profile preferences.

## Acceptance criteria

1. Every asynchronous user action has a visible and accessible pending state.
2. Route loading preserves the authenticated shell and avoids layout shift.
3. Skeletons contain no fake employee information.
4. Forms prevent accidental duplicate submission without relying on the client
   for data consistency.
5. Expected validation errors are inline, Spanish, and focusable.
6. Meaningful mutation outcomes produce one safe Spanish toast.
7. Toasts never expose sensitive or provider data.
8. Toasts do not steal focus and are announced with the appropriate live-region
   priority.
9. Determinate progress is based on real completion data.
10. Destructive and authorization-sensitive actions are never optimistic.
11. Unexpected failures render a safe feature-level error state.
12. All feedback components support light/dark themes, keyboard use, zoom,
    mobile safe areas, and reduced motion.
13. Unit, component, end-to-end, and accessibility tests cover the critical
    feedback paths.
14. The production build remains compatible with Netlify.

## Official references

- [Next.js `loading.tsx` and route streaming](https://nextjs.org/docs/app/api-reference/file-conventions/loading)
- [Next.js data fetching and Suspense placement](https://nextjs.org/docs/app/getting-started/fetching-data)
- [Next.js expected and unexpected error handling](https://nextjs.org/docs/app/getting-started/error-handling)
- [React `useActionState`](https://react.dev/reference/react/useActionState)
- [React `useFormStatus`](https://react.dev/reference/react-dom/hooks/useFormStatus)
- [React `useOptimistic`](https://react.dev/reference/react/useOptimistic)
- [WAI-ARIA live regions](https://www.w3.org/TR/wai-aria/#aria-live)
- [WAI guidance for live validation errors](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA19)
- [Sonner source and usage](https://github.com/emilkowalski/sonner)
