# Colaboradores DNA UI design guide

## Status and scope

This document is the target specification for the Colaboradores DNA UI refresh.
It translates the approved visual concept into reusable rules for the Next.js
application. It governs new UI work and the gradual migration of existing
components.

The product is mobile-first. On a phone it should feel like a focused native app;
on desktop it should become a compact, efficient operations workspace for
administrators. Light and dark themes are equally supported products, not a
primary theme and a secondary skin.

## Product character

The interface has four attributes:

- **Minimal:** every surface has a clear purpose and only one dominant action.
- **Clean:** strong hierarchy, generous space, short labels, and restrained
  elevation make information easy to scan.
- **Playful:** rounded geometry, friendly color, and occasional botanical line
  art give the product warmth without reducing its credibility.
- **Native on mobile:** persistent bottom navigation, large touch targets,
  bottom drawers, safe-area spacing, and immediate feedback make common tasks
  feel app-like.

Playfulness follows a “one moment per screen” rule. A screen may use one small
illustration, one colorful summary area, or one expressive empty state. Do not
combine all three. Decorative artwork never sits behind forms, tables, or
critical status information.

## Core rules

1. Target WCAG 2.2 AA in both themes.
2. Use semantic tokens; feature CSS must not use raw hex values.
3. Design mobile first, then increase information density at larger widths.
4. Use native HTML semantics before ARIA.
5. Keep every primary touch target at least 44 by 44 CSS pixels.
6. Never rely on color alone for meaning. Add a label, icon, or pattern.
7. Keep one primary action per page, modal, drawer, or card region.
8. Reuse a shared component before introducing a feature-local variation.
9. Use sentence case in Spanish for titles, labels, buttons, and navigation.
10. Use Costa Rican voseo consistently in instructional and feedback copy:
    “Ingresá”, “Revisá”, “Guardá”, and “¿Querés…?”.

## Theme color palette

### Brand colors

| Token                | Value     | Purpose                                                          |
| -------------------- | --------- | ---------------------------------------------------------------- |
| `--brand-aqua`       | `#31C7CF` | Primary actions, selection, active navigation, and brand moments |
| `--brand-aqua-hover` | `#1FB4BD` | Hover/pressed support for aqua controls                          |
| `--brand-coral`      | `#FF8066` | Warm emphasis, celebrations, and occasional secondary highlights |
| `--brand-yellow`     | `#F5C95A` | Birthdays, friendly reminders, and warm visual markers           |
| `--brand-ink`        | `#102F2B` | Primary light-theme text and dark brand structure                |

The aqua action color always uses a dark foreground (`#062D2F`), not white.
This pairing has sufficient contrast and is more distinctive. Coral and yellow
are accents, not alternate primary-action colors.

### Semantic theme tokens

| Semantic role            | Light theme          | Dark theme         | Usage                                    |
| ------------------------ | -------------------- | ------------------ | ---------------------------------------- |
| `--color-canvas`         | `#F7F5EF`            | `#061614`          | App background                           |
| `--color-surface`        | `#FFFFFF`            | `#102522`          | Cards, dialogs, controls                 |
| `--color-surface-subtle` | `#FBFAF6`            | `#142D29`          | Alternating or nested neutral region     |
| `--color-surface-muted`  | `#EEF3EF`            | `#1B3833`          | Disabled controls, hover fills           |
| `--color-surface-raised` | `#FFFFFF`            | `#17312D`          | Menus and temporary elevated surfaces    |
| `--color-text`           | `#102F2B`            | `#F4F7F5`          | Primary text                             |
| `--color-text-muted`     | `#58706C`            | `#B5C7C2`          | Supporting text and metadata             |
| `--color-text-subtle`    | `#738984`            | `#91AAA4`          | Placeholders and low-emphasis metadata   |
| `--color-border`         | `#DDE7E2`            | `#2B4943`          | Default borders and dividers             |
| `--color-border-strong`  | `#AFC4BD`            | `#55746C`          | Hovered controls and strong separation   |
| `--color-brand`          | `#31C7CF`            | `#31C7CF`          | Primary interactive color                |
| `--color-brand-hover`    | `#1FB4BD`            | `#4BD4DB`          | Hover/pressed brand state                |
| `--color-brand-soft`     | `#DDF7F6`            | `#123D3D`          | Selected rows, icon tiles, soft emphasis |
| `--color-brand-contrast` | `#062D2F`            | `#062D2F`          | Text/icons over aqua                     |
| `--color-focus`          | `#FF8066`            | `#FF9A84`          | Keyboard focus ring                      |
| `--color-overlay`        | `rgb(6 22 20 / 58%)` | `rgb(0 0 0 / 68%)` | Modal/drawer backdrop                    |

Primary text and muted text meet AA contrast against their theme canvases and
surfaces. When adding tokens, test normal text at 4.5:1 and large or bold text
at 3:1. Borders are not a substitute for readable labels.

### Status colors

Status colors are fixed across features. Each status component includes text
and, when useful, a small icon or dot.

| Meaning     | Light foreground / soft background | Dark foreground / soft background |
| ----------- | ---------------------------------- | --------------------------------- |
| Success     | `#247A4B` / `#E6F6EC`              | `#70D99A` / `#153524`             |
| Warning     | `#805400` / `#FFF4D7`              | `#FFD27A` / `#3B2D12`             |
| Danger      | `#B74237` / `#FDEBE8`              | `#FF9A91` / `#401D1C`             |
| Information | `#2868A9` / `#EAF3FF`              | `#8CC7FF` / `#17334E`             |
| Neutral     | `#58706C` / `#EEF3EF`              | `#B5C7C2` / `#1B3833`             |

Recommended calendar mappings are aqua for leave, violet for 1:1 meetings,
blue for training, yellow for birthdays, and coral for custom celebrations.
These mappings remain identical in every calendar and notification view.

| Calendar meaning   | Light foreground / soft background | Dark foreground / soft background |
| ------------------ | ---------------------------------- | --------------------------------- |
| Leave              | `#08777D` / `#DDF7F6`              | `#63DEE3` / `#123D3D`             |
| 1:1 meeting        | `#7651A8` / `#F2ECFA`              | `#D1B6F5` / `#38274C`             |
| Training           | `#2868A9` / `#EAF3FF`              | `#8CC7FF` / `#17334E`             |
| Birthday           | `#805400` / `#FFF4D7`              | `#FFD27A` / `#3B2D12`             |
| Celebration/custom | `#A83F2D` / `#FDECE8`              | `#FFAA98` / `#45221C`             |

### Color usage limits

- Neutral canvas and surfaces should occupy roughly 80–90% of a screen.
- Aqua identifies interaction; do not use it as decorative body text.
- Coral occupies no more than one small emphasis region per screen.
- Yellow is not used for long text or primary actions.
- Danger red is reserved for errors and destructive actions. Do not use coral
  for errors.
- Never place text over botanical illustrations or textured backgrounds.
- Do not use gradients on buttons. A subtle brand gradient is allowed only in
  large non-critical brand regions such as an authentication background.

## Typography

Use Inter Variable when available, followed by the native system sans-serif
stack. The system stack keeps controls familiar and performs well in an
installed PWA. Use the monospace stack only for technical identifiers.

| Style                | Mobile    | Desktop  | Weight | Line height | Usage                                |
| -------------------- | --------- | -------- | ------ | ----------- | ------------------------------------ |
| Display              | 2rem      | 2.25rem  | 750    | 1.1         | Rare welcome or empty-state headline |
| Page title / `h1`    | 1.75rem   | 2rem     | 750    | 1.15        | One per page                         |
| Section title / `h2` | 1.375rem  | 1.5rem   | 725    | 1.2         | Major page section                   |
| Card title / `h3`    | 1.0625rem | 1.125rem | 700    | 1.3         | Card and grouped content title       |
| Body                 | 1rem      | 1rem     | 400    | 1.55        | Standard content                     |
| Body small           | 0.875rem  | 0.875rem | 400    | 1.45        | Dense content and tables             |
| Label                | 0.875rem  | 0.875rem | 650    | 1.4         | Form and control labels              |
| Caption              | 0.75rem   | 0.75rem  | 500    | 1.4         | Metadata and helper text             |
| Eyebrow              | 0.75rem   | 0.75rem  | 750    | 1.3         | Rare category label                  |

Titles use `--color-text`, a slight negative letter spacing between `-0.015em`
and `-0.035em`, and no more than two lines. Page headers contain the title,
optional eyebrow, and actions only; do not add descriptive subtitles below a
page title. Supporting context belongs in the relevant card or form section.

Top-level module and self-service page headers use the shared
`PageSectionHeader` primitive. Its calendar-derived treatment is canonical: a
44px brand-soft icon container, a 24px icon at `1.8` stroke width, a
`--text-2xl` title, and a 12px icon-to-title gap. Loading states render the same
primitive so icon and title geometry cannot shift when content resolves. New
feature styles must not recreate these values locally.

Do not use title case, full-uppercase headings, or multiple display-sized
headings on one screen. Eyebrows may be uppercase with `0.08em` tracking, but
are optional and should not repeat the page title.

## Spacing, shape, elevation, and motion

### Spacing

Use a four-pixel base scale:

`4, 8, 12, 16, 20, 24, 32, 40, 48, and 64px`.

- 4–8px: icon/label and title/subtitle relationships.
- 12–16px: control internals and compact component gaps.
- 20–24px: card padding and section internals.
- 32–48px: separation between major page sections.
- 64px: rare page-level separation.

### Radius

| Radius      | Value | Usage                                       |
| ----------- | ----- | ------------------------------------------- |
| Small       | 8px   | Compact tags, tooltips, small menu items    |
| Medium      | 12px  | Inputs, buttons, navigation items           |
| Large       | 16px  | Cards, dialogs, drawers                     |
| Extra large | 24px  | Hero/empty-state surfaces only              |
| Full        | 999px | Avatars, badges, icon-only circular buttons |

Do not mix more than two radius sizes inside one component. Avoid nested rounded
rectangles that create a “card inside card” appearance.

### Elevation

- Level 0: canvas regions and tables; no shadow.
- Level 1: standard card; border plus a nearly invisible shadow.
- Level 2: sticky navigation, floating action button, menu, and popover.
- Level 3: modal and drawer.

Dark-theme elevation relies more on lighter surfaces and borders than shadows.
Never add a shadow to every container.

### Motion

Motion explains a state change, preserves spatial context, or confirms an
action. It must never delay access to content or run only for decoration.

| Token               | Value                          | Usage                                      |
| ------------------- | ------------------------------ | ------------------------------------------ |
| `--duration-fast`   | `120ms`                        | Hover, focus, press, and color feedback    |
| `--duration-base`   | `180ms`                        | Tabs, labels, toggles, and local state     |
| `--duration-slow`   | `260ms`                        | Drawers, modals, and shell transformations |
| `--duration-shell`  | `320ms`                        | Desktop navigation width changes           |
| `--ease-standard`   | `cubic-bezier(0.2, 0, 0, 1)`   | Reversible interaction feedback            |
| `--ease-enter`      | `cubic-bezier(0, 0, 0.2, 1)`   | Content entering or becoming visible       |
| `--ease-exit`       | `cubic-bezier(0.4, 0, 1, 1)`   | Content leaving or becoming hidden         |
| `--ease-emphasized` | `cubic-bezier(0.4, 0, 0.2, 1)` | Large spatial changes                      |

- Prefer opacity and transform because they remain smooth and do not reflow
  surrounding content. Width or position may animate only when preserving
  spatial context is the point of the interaction, such as the desktop sidebar.
- Keep hover and focus feedback at 120ms, local component changes at 180ms,
  overlays at 260ms, and desktop shell resizing at 320ms. Do not introduce
  one-off durations.
- Entering content uses `--ease-enter`; exiting content uses `--ease-exit`.
  Reversible movement uses `--ease-standard` or `--ease-emphasized`.
- Animate related properties together. A label may fade and translate while its
  container expands, but it must not begin after the container has finished.
- Do not animate validation messages, destructive confirmations, keyboard focus
  placement, or data users need to act on immediately.
- Every animated component must implement `prefers-reduced-motion: reduce` by
  removing the transition or reducing it to a non-spatial opacity change.
- Animations do not autoplay repeatedly. Celebration motion may run once after
  an explicit success and must not block the next action.

## Responsive layout system

### Breakpoints and grid

| Range            | Grid                   | Outer gutter | Column gap | Typical use              |
| ---------------- | ---------------------- | ------------ | ---------- | ------------------------ |
| 320–639px        | 4 columns              | 16px         | 12px       | Phones                   |
| 640–1023px       | 8 columns              | 24px         | 20px       | Large phones and tablets |
| 1024–1439px      | 12 columns             | 32px         | 24px       | Desktop admin            |
| 1440px and wider | 12 columns, max 1440px | 32px+        | 24px       | Wide desktop             |

The grid describes page composition, not every component’s internal layout.
Use CSS Grid for page regions and Flexbox for one-dimensional control groups.

### App shell

- Mobile content is single-column and fills the viewport width.
- Apply `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` to the app
  bar, drawers, and bottom navigation.
- Leave bottom content padding equal to the bottom tab bar plus 16px so controls
  are never hidden behind navigation.
- Desktop uses a persistent left navigation region and a flexible content area.
- Desktop navigation defaults to an 88px icon rail with accessible names and
  hover/focus tooltips. A user-controlled toggle expands it to 256px so labels
  can be read, and the preference persists for that browser.
- The main content area is capped at 1440px. Tables may use the full content
  width; forms should normally cap at 720px and prose at 680px.

### Page composition

A standard page contains, in order:

1. Optional breadcrumb or mobile back action.
2. Page title and primary action.
3. Optional summary/filters.
4. Main content.
5. Secondary or destructive actions at the end of the relevant region.

Use 24px between page regions on mobile and 32px on desktop. A page may use a
split 8/4-column desktop layout for main content and contextual activity. That
split collapses into a single meaningful reading order below 1024px.

## Navigation system

### Mobile navigation

Use a persistent bottom tab bar for three or four high-frequency destinations
plus **Más**. Recommended primary destinations are Inicio, Calendario, Equipo
or Ausencias according to role, and Perfil. Administrator-only destinations can
live in the Más drawer when they do not fit.

- Height: 64px plus the device safe-area inset.
- Each tab contains a 22–24px icon and an 11–12px label.
- Active state uses aqua icon/text and a subtle aqua marker or soft background.
- Inactive state uses muted text; never reduce opacity below readable contrast.
- Badge counts are reserved for actionable unread items.
- Preserve tab state when users return to a root destination.
- Do not use a hamburger menu for primary destinations.

The mobile top app bar is 56px plus safe-area inset. Root screens show the page
title or personal greeting, notification action, and optional avatar. Deep
screens show a back button, concise title, and at most one trailing action.

### Desktop navigation

Desktop uses a persistent left sidebar and a 64px top bar.

- Preserve destination grouping through spacing, without visible group labels.
- Use a 20px icon. Keep the text label available to assistive technology and as
  a tooltip; visually hide it in the rail and reveal it in the expanded state.
- Place the expand/collapse control on the sidebar edge. Give it an accessible
  name, `aria-expanded`, `aria-controls`, and a tooltip. Rotate its chevron while
  the rail width and labels animate together over `--duration-shell`.
- Keep every navigation icon on the same fixed horizontal axis and at the same
  size in both states. Only the label region and item background may expand.
- The current destination uses aqua emphasis plus `aria-current="page"`.
- Keep settings, theme, and account controls anchored consistently at the
  bottom or top-right; do not mix them into feature navigation.
- Use breadcrumbs only for depth beyond a section landing page.
- Keep sidebar order stable across sessions. Role-based removal is allowed;
  arbitrary personalization is not.

## Components

### Cards

Cards group one meaningful unit of content. They use `--color-surface`, a 1px
border, 16px radius, level-1 elevation, and 16px padding on phones or 20–24px on
desktop.

Variants:

- **Standard card:** title, optional subtitle, body, and at most one header
  action.
- **Metric card:** small label, one large value, optional comparison, and a
  colored icon tile. Use two per mobile row only when both remain readable.
- **Record card:** mobile replacement for a table row; identity and status come
  first, metadata second, actions last.
- **Interactive card:** the entire card is one link. It receives clear
  hover/focus treatment and must not contain nested buttons or links.
- **Empty-state card:** concise illustration, title, one sentence, and optional
  action.

Do not nest cards. Use a divider, section heading, or surface-subtle region
inside a card instead. Do not make non-interactive cards lift on hover.

### Icons

Use Lucide icons throughout the product.

- 16px: inline metadata and compact table actions.
- 20px: inputs, buttons, menus, and desktop navigation.
- 24px: mobile navigation and primary icon buttons.
- 32px: summary or empty-state icon tiles.
- Default stroke: 1.75; active/selected icons may use 2.

Every icon is either decorative (`aria-hidden="true"`) or has an accessible
name through its icon-only button. Do not repeat a visible label as an icon
accessible name. Use familiar metaphors consistently and never mix emoji,
filled icon sets, and Lucide outline icons in the same workflow.

Decorative botanical line art uses low-contrast green strokes, never functions
as an icon, and is limited to welcome, authentication, and empty-state regions.

### Text inputs and text areas

Default input height is 48px, with 12px radius, 14–16px input text, 12–16px
horizontal padding, surface background, and a 1px border. Dense 44px controls
are allowed only in desktop tables and toolbars.

Each field contains:

1. A visible label.
2. Optional marker when applicable; required is the default.
3. Control.
4. Helper text or error text.

Placeholder text is an example, never the only label. Focus uses the brand
border and a 2px coral focus ring. Error state uses danger border, text, and an
error message connected with `aria-describedby`. Disabled fields use a muted
surface and remain readable; readonly fields should look distinct from disabled
fields and allow selection.

Use prefix/suffix icons only when they clarify format or perform an action.
Password reveal, clear, and search actions retain a 44px target. Text areas
start at 112px high, resize vertically, and show character limits only when a
real limit exists.

### Date, time, and date-range inputs

Store and submit dates in ISO format (`YYYY-MM-DD`) while displaying dates in
the Spanish Costa Rican locale. Never infer timezone from a date-only value.

- On mobile, prefer the platform-native date/time picker where it provides a
  reliable experience.
- On desktop, a calendar popover may supplement direct input.
- Use a calendar icon as a trailing trigger, not as the field label.
- A selected date remains visible as text after the picker closes.
- Date ranges use explicit Inicio and Fin fields. Do not hide two values in one
  ambiguous control.
- Validate impossible dates, ordering, and business constraints inline.
- The calendar picker supports arrow keys, Page Up/Down month movement, Enter
  selection, Escape close, and a visible Today action.

On mobile, a complex date-range calendar opens in a bottom drawer. On desktop,
it opens as a popover unless the workflow needs additional fields, in which case
use a modal.

### Selects

#### Simple select

Use a native select for a short, stable list—normally ten options or fewer—when
search is unnecessary. Include a visible label and an initial prompt such as
“Seleccioná un departamento” when there is no valid default.

#### Autocomplete / combobox

Use an autocomplete for people, departments at scale, remote results, or lists
longer than ten items.

- Follow the WAI-ARIA combobox pattern.
- Search is case- and accent-insensitive where appropriate.
- Show loading, no-results, error, and clear states.
- Keep typed text distinct from the committed selection.
- Support Arrow keys, Enter, Escape, and type-ahead.
- For multi-select, selections become removable chips below or inside the
  control without reducing the typing area below a useful width.
- On phones, long result lists may open in a full-width bottom drawer with a
  sticky search field instead of a small floating popover.

Do not use autocomplete when a radio group would expose a short choice more
clearly.

### Checkboxes, radio groups, and switches

- Checkbox: independent yes/no selection or multi-select list.
- Radio group: one choice from two to six visible options.
- Switch: an immediate preference that takes effect when toggled, such as theme
  or notifications. Do not use switches for form values that require Save.

The visible control may be 20–24px, but its label and hit area combine to at
least 44px high. Place explanatory text under the label, not inside it.

### Buttons

Variants:

- **Primary:** the single principal action in a region; aqua fill and dark text.
- **Secondary:** supporting/reversible action; surface fill and strong border.
- **Quiet:** low-emphasis toolbar, inline, or dismiss action.
- **Danger:** destructive action; danger fill for final confirmation or danger
  text/soft background before confirmation.
- **Icon button:** familiar compact action with an accessible label and tooltip
  on desktop.
- **Floating action button:** mobile-only shortcut for the screen’s primary
  creation action; use only when it does not cover content or navigation.

| Size   | Height | Use                                       |
| ------ | ------ | ----------------------------------------- |
| Small  | 36px   | Desktop table/toolbars only               |
| Medium | 44px   | Default desktop action                    |
| Large  | 52px   | Primary mobile and authentication actions |

Buttons use 12px radius, 700 weight, and verb-first labels such as “Guardar
cambios”. Use an icon only when it improves recognition; leading icons describe
the action and trailing icons indicate direction or expansion. Pending buttons
retain their width, show progress, and use a specific label such as “Guardando…”.

#### Button groups

- Desktop action groups align to the end with 8–12px gaps.
- Mobile action groups use full-width buttons stacked vertically when space is
  limited. Keep the primary action first in the visual and DOM order.
- Keep destructive actions spatially separated from routine actions.
- A segmented button group is only for mutually exclusive views or modes; it is
  not a container for unrelated actions.
- Never show more than three adjacent buttons. Move low-frequency actions into
  an overflow menu.

### Links

Inline links use brand-text color, medium weight, and an underline on hover and
focus. Links embedded in paragraphs are underlined by default so color is not
the only cue. Navigation links and button links may omit the underline because
their shape and location provide context.

Use a button for an action and a link for navigation. External links include an
external-link icon and accessible context when opening a new tab. Avoid “Aquí”
and “Leer más”; name the destination or result.

### Tables and mobile record lists

Use tables on desktop when users compare the same fields across records. Use a
real `<table>` with caption or accessible name, column headers, and correct
scope.

- Header height: 44px; body rows: at least 52px.
- Left-align text; right-align numeric values and totals.
- Keep identity/name first and row actions last.
- Use subtle dividers instead of boxing every cell.
- Sorting controls live in headers and expose direction with `aria-sort`.
- Selected, hovered, and keyboard-focused rows have distinct states.
- A sticky header is allowed when the scroll container is clearly bounded.
- Pagination follows the table and announces result range.
- Bulk actions appear only after selection and include the selected count.

Below 768px, transform operational tables into record cards or a semantic list.
Show the record identity, status, two or three essential fields, and a clear
details affordance. Do not simply hide critical columns. Horizontal scrolling
is reserved for true comparison matrices that cannot be represented as cards.

### Tabs and segmented controls

Tabs switch between two to five sibling views within the same context. Use an
underline or soft selected background with visible text; never use color alone.

- Tabs are 44px high and support keyboard arrow navigation.
- The tab list may scroll horizontally on mobile without wrapping labels.
- Preserve the selected tab in the URL when users may bookmark or share it.
- Use link semantics for route-backed tabs and tab semantics for in-page panels.
- Do not use tabs as a substitute for the primary navigation or a multi-step
  wizard.

A segmented control is appropriate for two or three compact display modes, such
as Mes/Agenda. It is not used for filtering large datasets or triggering
commands.

### Modal, drawer, alert dialog, and sheet

Use one responsive dialog API that renders as:

- **Bottom drawer below 640px:** full width, 16px top radius, maximum height
  `92dvh`, optional decorative drag handle, and safe-area bottom padding.
- **Centered modal at 640px and wider:** 480px small, 640px medium, or 860px
  large; maximum height `90dvh`; 16px radius.

Headers and action footers remain sticky when content scrolls. Mobile drawer
actions are full-width; desktop modal actions align to the end. Use a side sheet
on desktop only for contextual inspection that benefits from keeping the
underlying table visible.

Dialogs must:

- Use `role="dialog"` or `alertdialog` as appropriate.
- Have a visible title and optional description.
- Move focus inside, trap focus, close with Escape when safe, and restore focus
  to the trigger.
- Prevent background scroll.
- Confirm before discarding unsaved changes.
- Avoid backdrop-click dismissal for destructive confirmations or irreversible
  in-progress operations.
- Never stack one modal over another.

Use an alert dialog only for a consequential confirmation. Routine forms use a
modal/drawer, and brief feedback uses a toast rather than a dialog.

### Menus, popovers, and tooltips

- Menus contain commands or navigation, not arbitrary form layouts.
- Popovers contain lightweight contextual controls such as a date picker or
  filters and close when focus leaves or Escape is pressed.
- Tooltips explain unfamiliar icon-only controls on hover and keyboard focus.
  They never contain essential instructions or interactive content.
- On touch devices, do not depend on hover-only tooltips; provide an accessible
  label or visible supporting text.

### Status badges, tags, and filter chips

Status badges communicate a system state using fixed semantic colors and text.
Tags classify content. Filter chips are interactive and visibly toggle state.
These are different components and should not share ambiguous behavior.

Keep labels short, use full-pill radius, and avoid more than two badges in a
single table cell or card header. A removable chip has a dedicated 44px-capable
remove target on touch layouts.

### Search, filters, and pagination

Search uses a labeled search field with a leading icon and an explicit clear
action. Debounce remote search, but update local filtering immediately. Keep
active filters visible as chips and provide “Limpiar filtros” when more than one
can be active.

On mobile, complex filters open in a bottom drawer and show the result count on
the “Aplicar filtros” button. On desktop, filters may appear in a toolbar or
popover.
Pagination preserves search/filter state and uses Previous/Next plus a compact
page range; infinite scroll is not used for administrative records.

### Avatars

Use 32px avatars in tables, 40px in navigation/list cards, and 64–96px in
profiles. When no photo exists, show initials on a deterministic soft-color
background. Always pair small avatars with a visible name; the image alone is
not identification.

### File and image uploads

Use a labeled upload control with a standard file button rather than a
drag-and-drop area alone. On mobile, allow the platform photo library or camera
when appropriate. State accepted formats, maximum size, and privacy consequence
before selection.

After selection, show filename or image preview, upload progress, Replace, and
Remove actions. Validate type and size before upload and preserve a previously
saved asset when a replacement fails. A drop zone must also work by keyboard and
must not make drag-and-drop the only input method.

### Disclosure and dividers

Use a divider to separate sibling regions inside one surface. Do not use empty
cards as separators. Use a native `details` disclosure or accessible accordion
for optional supporting information, not for primary form fields or validation
errors. Accordions allow one or many panels only when that behavior is clear and
consistent within the page.

### Feedback and validation

- Inline field error: local correction required.
- Form error summary: submission contains one or more errors; link to fields.
- Alert/banner: persistent page-level status or consequence.
- Toast: brief confirmation or non-blocking failure.
- Progress indicator: operation state.

Success toasts dismiss automatically. Actionable errors remain until dismissed
or corrected. Toasts do not replace inline validation, confirmation, or durable
status. Use skeletons for predictable page structure and spinners for contained
indeterminate operations; never leave a blank region while loading.

### Empty, loading, and error states

Every data region defines all three states.

- Empty states explain why the region is empty and offer one relevant action.
- Loading skeletons match the final geometry and avoid layout shift.
- Errors state what failed, preserve entered data, and offer Retry when useful.
- Small botanical illustrations are allowed in empty states, with low visual
  priority and no embedded text.

## Responsive transformation rules

| Desktop pattern            | Mobile pattern                          |
| -------------------------- | --------------------------------------- |
| Persistent labeled sidebar | Bottom tabs plus Más drawer             |
| Centered modal             | Bottom drawer                           |
| Data table                 | Record-card list                        |
| Toolbar filters            | Filter button plus drawer               |
| Side-by-side form columns  | Single-column form                      |
| Main/context 8+4 layout    | Main content followed by context        |
| Hover tooltip              | Accessible label or visible helper text |
| Small inline buttons       | 44–52px touch actions                   |
| Calendar popover           | Native picker or bottom drawer          |

Responsive changes must preserve task order, content, validation, and available
actions. Mobile is not a reduced-permission version of desktop.

## Content rules

- Prefer specific verbs: “Aprobar ausencia”, not “Aceptar”.
- Write labels as nouns and buttons as actions.
- Keep success messages in past tense: “Los cambios se guardaron.”
- Explain errors in plain language and state the next step.
- Dates are human-readable in display contexts and ISO in machine contracts.
- Numbers and dates use the `es-CR` locale.
- Avoid internal terms such as repository, document ID, or platform user.
- Never put sensitive employee or development content in toast messages,
  analytics labels, URLs, or decorative previews.

## Accessibility and interaction checklist

Every shared component and critical workflow must be verified for:

- Light and dark theme contrast.
- Keyboard-only operation and logical focus order.
- Visible `:focus-visible` treatment.
- Screen-reader name, role, value, and status announcements.
- 200% browser zoom and 320px viewport reflow.
- Touch targets of at least 44px.
- Reduced motion.
- Loading, empty, error, disabled, readonly, pending, and success states.
- Spanish labels and error messages that remain understandable out of context.

## Implementation rules

The shared implementation lives under `web/src/components/ui/`; feature-owned
compositions remain under `web/src/features/<feature>/components/`.

Before adding or changing a shared component:

1. Confirm that the pattern is used by more than one feature or is a foundational
   control.
2. Define semantic behavior and responsive transformation before appearance.
3. Consume tokens from `web/src/styles/tokens.css`; do not hard-code theme
   colors in component modules.
4. Include all applicable states in the component API.
5. Use native elements and test keyboard behavior before adding ARIA.
6. Add component tests for accessibility-critical semantics and interaction.
7. Test the component in light/dark and mobile/desktop contexts.
8. Update this guide when introducing a genuinely reusable pattern.
9. Run `pnpm verify` and the relevant end-to-end accessibility tests.

When the visual refresh is implemented, update `tokens.css` first, then shared
primitives, the application shell, and finally feature compositions. Do not
recreate the same new style independently inside each feature.
