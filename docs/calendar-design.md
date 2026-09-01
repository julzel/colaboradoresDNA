# Calendar Desktop Design Specification

## 1. Purpose

Implement the desktop calendar view shown in the reference image as a clean, lightweight ERP calendar interface.

This document is the implementation-oriented design context for Codex. It describes visual hierarchy, layout, spacing, behavior, and component structure.

### Important constraints

- **Do not change the application's existing main background color.** The calendar must render on top of the background already defined by the application theme/layout.
- **Use the application's existing brand colors and theme tokens.** Do not create duplicate brand hex values inside the calendar feature.
- **Ignore all decorative botanical/leaf elements from the reference image.** They are not part of the required UI.
- The event categories shown in the reference image are **examples only**. Actual event types may differ.
- Event colors must be implemented as **semantic/configurable event tokens**, not as assumptions about the domain model.
- This specification is **desktop-first**. Mobile calendar UX should be designed separately.
- Prefer existing shared application components before creating calendar-specific versions of buttons, cards, typography, icons, etc.

---

## 2. Visual Direction

The design should feel:

- minimal
- calm
- spacious
- lightweight
- professional, but not corporate-heavy
- modern SaaS/ERP
- easy to scan quickly

The screen uses a large calendar as the primary surface and a narrow contextual sidebar for the selected date.

Avoid:

- strong shadows
- dense borders
- saturated backgrounds
- oversized typography
- unnecessary decorative graphics
- excessive use of the brand color
- heavy card nesting

The visual hierarchy should come primarily from:

1. spacing
2. subtle borders
3. typography weight
4. soft semantic event colors
5. restrained use of the primary brand color for active/selected states

---

## 3. Overall Desktop Layout

### Recommended page structure

```text
CalendarPage
├── CalendarToolbar
├── CalendarContent
│   ├── MainCalendarColumn
│   │   ├── MonthGridCard
│   │   └── EventLegend
│   └── CalendarSidebar
│       ├── SelectedDayAgendaCard
│       └── MiniCalendarCard
└── AnnualHolidayDisclosure
```

### Main layout

Use CSS Grid for the primary content area.

Recommended desktop proportions:

```css
grid-template-columns: minmax(0, 1fr) 216px;
column-gap: 20px;
```

The reference image uses approximately:

- Main calendar: ~76–78% of available content width
- Sidebar: ~20–21%
- Gap: ~20 px

For larger desktop screens, the sidebar can grow slightly:

```css
grid-template-columns: minmax(0, 1fr) clamp(216px, 20vw, 280px);
```

Recommended maximum content width if the application already uses one:

```text
1400–1500 px
```

Do not introduce a new global max-width if the application already defines its page container.

### Vertical structure

```text
Toolbar
  ↓ 16px
Calendar content
```

Recommended spacing between toolbar and calendar:

```text
16px
```

The legend sits directly below the month grid:

```text
Month grid
  ↓ 16–18px
Legend
```

---

# 4. Calendar Toolbar

The toolbar is intentionally simple and should not be placed inside a heavy card.

## Layout

Use:

```css
display: flex;
align-items: center;
justify-content: space-between;
gap: 16px;
```

It contains two logical groups.

### Left group

```text
[ Hoy ] [ ‹ ][ › ] [ Mayo 2026 ▾ ]
```

Recommended spacing:

- between `Hoy` and navigation arrows: 12px
- arrow buttons are visually grouped
- between arrows and month selector: 16–20px

### Right group

```text
[ Mes | Semana | Día ]   [ Filter icon  Filtrar ]
```

Recommended spacing:

```text
16–18px
```

## Control dimensions

Target height:

```text
34–36px
```

Buttons should use the existing application radius.

If no shared radius exists, use approximately:

```text
8px
```

### Today button

Visual style:

- outlined/subtle
- neutral border
- normal text weight
- no primary fill

### Previous / next controls

Two adjacent square buttons.

Recommended dimensions:

```text
34–36px × 34–36px
```

Use chevron icons rather than text characters.

### Month/year selector

Example:

```text
Mayo 2026  ▾
```

Typography:

```text
font-size: 15–16px
font-weight: 600
```

The dropdown indicator should be visually secondary.

### View switcher

Segmented control:

```text
Mes | Semana | Día
```

Selected segment:

- use a **soft tint derived from the existing primary brand color**
- selected text uses primary/strong foreground
- avoid a saturated filled button

Inactive segments:

- transparent/neutral
- muted foreground

Do not hard-code the selected color. Use theme-derived values.

### Filter button

Outlined neutral button containing:

```text
filter icon + "Filtrar"
```

When filters are active, it may optionally show:

```text
Filtrar (2)
```

or a small count badge.

---

# 5. Month Grid Card

## Container

The month grid is the dominant UI surface.

Recommended styling:

```text
border: 1px solid subtle theme divider
border-radius: 10–12px
background: existing theme surface/card color
overflow: hidden
box-shadow: none or extremely subtle
```

If the design system already defines cards, use the existing card surface rather than creating new values.

Suggested optional shadow only if required by the existing design language:

```text
0 2px 8px rgba(0, 0, 0, 0.03–0.05)
```

Do not use a pronounced shadow.

---

# 6. Calendar Grid Geometry

The desktop month view contains:

```text
7 columns
6 calendar rows
```

Use CSS Grid.

```css
grid-template-columns: repeat(7, minmax(0, 1fr));
```

## Weekday header

Approximate height:

```text
36–38px
```

Weekday labels:

```text
Lun
Mar
Mié
Jue
Vie
Sáb
Dom
```

Alignment:

```text
center
```

Typography:

```text
font-size: 12–13px
font-weight: 600
```

Use the normal strong text color, not muted gray.

A subtle bottom divider separates the weekday header from the month body.

---

# 7. Day Cells

Each cell should have enough vertical space to comfortably show 1–3 compact events.

For the reference layout, target approximately:

```text
min-height: 84–88px
```

On larger screens this can scale to:

```text
90–110px
```

Do not let cells become excessively tall merely because the viewport is tall.

## Cell borders

Use subtle grid separators.

Recommended:

```text
border-right: 1px solid divider
border-bottom: 1px solid divider
```

Avoid doubled borders.

The last column and final row should not create unnecessary outer borders because the parent card already provides the outer border.

## Cell padding

Recommended:

```text
8px
```

The day number should sit near the upper-left corner.

---

# 8. Day Number States

## Normal date

Typography:

```text
font-size: 11–12px
font-weight: 500
```

Foreground:

```text
secondary/muted text
```

## Date outside current month

Example:

```text
27, 28, 29, 30
```

Use reduced emphasis:

```text
muted foreground
opacity approximately 0.55–0.7
```

Events from adjacent months may either:

1. remain visible with reduced emphasis, or
2. be omitted

Use the application's product requirement.

## Today

Today and selected date are separate concepts.

Today should have a subtle indication when it is not selected. Examples:

- small brand-colored dot
- thin outline
- slightly stronger date text

Do not use the same strong filled treatment as the selected date.

## Selected date

The reference uses a compact circular primary badge.

Recommended:

```text
20–22px diameter
border-radius: 50%
background: theme primary
foreground: theme contrast text
font-size: 11px
font-weight: 600
```

The selected cell itself should remain mostly neutral.

Optional selected-cell treatment:

```text
very subtle primary tint
```

Keep this extremely light.

---

# 9. Event Chips

Events are displayed as compact semantic cards/chips inside day cells.

## Event chip structure

```text
┌────────────────────────┐
│ icon  Event title      │
│       secondary detail │
└────────────────────────┘
```

Possible secondary detail:

- employee name
- start time
- location
- count
- short status

Do not assume all events have the same metadata.

## Dimensions

Recommended:

```text
width: 100% of available cell width
max-width: calc(100% - cell padding)
min-height: 36–38px
padding: 6px 8px
border-radius: 6–8px
```

Between multiple events:

```text
4px vertical gap
```

## Title

```text
font-size: 10–11px
font-weight: 500–600
line-height: 1.2–1.3
```

Prefer one line where possible.

Long titles:

```text
ellipsis after 1 line
```

or at most 2 lines if the calendar product requirements favor readability over density.

## Secondary text

```text
font-size: 9–10px
font-weight: 400
opacity/emphasis lower than title
```

## Icon

Recommended:

```text
12–14px
```

The icon should use the semantic foreground color of the event.

---

# 10. Event Type Color Strategy

The reference image shows example semantic categories:

| Reference event | Example visual family |
|---|---|
| Reuniones | light blue / blue |
| Cumpleaños | light amber / orange |
| Ausencias | light coral / red |
| Vacaciones | light mint / green |
| Otros eventos | neutral gray |

These are **reference examples only**.

Do not encode the application around these specific event names.

Use a generic visual configuration model such as:

```ts
type CalendarEventVisual = {
  icon: ReactNode;
  backgroundColor: string;
  foregroundColor: string;
  borderColor?: string;
};
```

and map the actual domain event type to a visual configuration.

Prefer semantic theme tokens such as:

```text
calendar.event.<type>.background
calendar.event.<type>.foreground
calendar.event.<type>.border
```

If these tokens do not exist, define calendar semantic tokens once at the theme/design-system level rather than scattering values through components.

### Brand-color rule

The primary brand color should primarily communicate:

- current selection
- primary action
- active view
- interactive focus

Do not make every event use the brand color.

---

# 11. Event Overflow

The design must handle dates with more events than can fit vertically.

Recommended behavior:

```text
Event 1
Event 2
+3 más
```

Do not allow a busy date to increase the height of the entire calendar row.

Suggested threshold:

```text
2–3 visible events depending on available cell height
```

`+N más` should be a lightweight text action.

Selecting it can:

- open a popover, or
- select the day and show the full list in the right sidebar

The second option fits this design particularly well.

---

# 12. Event Interaction States

## Hover

On hover:

- slightly strengthen the event background or border
- cursor: pointer
- optional very subtle elevation

Do not significantly change the chip size.

## Focus

Keyboard focus must be clearly visible.

Use the application's existing focus ring.

## Click

Selecting an event should not necessarily change the selected date if the product behavior opens the event immediately.

If event details are shown in the sidebar/modal, update the corresponding context.

---

# 13. Calendar Sidebar

The right sidebar provides contextual information without competing with the month grid.

Recommended width:

```text
216–280px
```

Use:

```css
display: flex;
flex-direction: column;
gap: 14px;
```

Reference structure:

```text
Selected Day Agenda
Mini Month Calendar
```

Cards should match the month grid surface:

```text
subtle border
10–12px radius
little or no shadow
```

---

# 14. Selected Day Agenda Card

## Card padding

Recommended:

```text
14–16px
```

## Header

Example:

```text
Jueves, 14 de mayo
3 eventos
```

Heading:

```text
font-size: 13–14px
font-weight: 600
```

Count:

```text
font-size: 11–12px
muted text
margin-top: 4px
```

Then add:

```text
16px spacing
subtle divider
14–16px spacing
```

before agenda items.

---

# 15. Agenda Item

Recommended structure:

```text
[ icon circle ]  09:00 – 10:00
                 Reunión de equipo
                 Sala de juntas A
```

## Layout

```css
display: grid;
grid-template-columns: 38px minmax(0, 1fr);
column-gap: 10–12px;
```

Vertical spacing between agenda items:

```text
18–22px
```

## Icon container

Recommended:

```text
36–38px diameter
border-radius: 50%
```

Use the same semantic color family as the related event chip, but slightly more visible.

The icon itself:

```text
16–18px
```

## Time

```text
font-size: 11–12px
font-weight: 400–500
muted
```

## Event name

```text
font-size: 12–13px
font-weight: 600
```

## Metadata

Examples:

```text
Sala de juntas A
María Gómez
Todo el día
```

Style:

```text
font-size: 11px
muted
```

---

# 16. New Event Button

Position:

```text
bottom of selected-day agenda card
```

Use a full-width outlined button.

Example:

```text
+  Nuevo evento
```

Recommended:

```text
height: 32–36px
border radius: existing button radius
border: primary brand color
text/icon: primary brand color
background: transparent
```

Hover:

```text
very light primary tint
```

Do not use a fully saturated primary button here unless the existing product's design system treats "Nuevo evento" as the dominant page CTA.

---

# 17. Mini Calendar Card

Purpose:

- quick date navigation
- retain month context
- allow selecting another date without moving the large calendar manually

## Header

```text
Mayo 2026                      ‹  ›
```

Heading:

```text
font-size: 13–14px
font-weight: 600
```

Arrow buttons should be compact icon buttons.

## Mini weekday labels

```text
L M M J V S D
```

Typography:

```text
font-size: 9–10px
muted
```

## Mini dates

Target:

```text
20–24px clickable area
```

Text:

```text
font-size: 10px
```

Selected date:

```text
20–22px brand-filled circle
contrast text
```

Dates outside current month:

```text
reduced emphasis
```

Optional event indicators:

- small dots below the date
- only if useful and not visually noisy

Do not attempt to reproduce full event chips inside the mini calendar.

---

# 18. Legend

The legend appears under the main month grid, aligned horizontally.

Reference:

```text
● Reuniones   ● Cumpleaños   ● Ausencias   ● Vacaciones   ● Otros eventos
```

Again, these categories are only illustrative.

## Styling

Container:

```text
display: flex
align-items: center
flex-wrap: wrap
gap: 20–24px
```

Each item:

```text
display: inline-flex
align-items: center
gap: 6px
```

Color dot:

```text
8–10px
border-radius: 50%
```

Label:

```text
font-size: 10–11px
muted/secondary foreground
```

Only render the legend when multiple event categories use color as meaningful information.

Color must **not be the only way** event type is communicated. Icons and/or text labels must remain available.

---

# 19. Spacing Scale

Prefer the existing application's spacing scale.

When exact values are needed, use this reference:

```text
4px   micro gap
6px   icon/text gap
8px   day cell padding / compact control spacing
12px  compact component gap
16px  standard component gap
20px  column gap / larger control spacing
24px  section spacing
```

Avoid arbitrary values unless required by existing shared components.

---

# 20. Typography Hierarchy

Use the application's existing font family.

Do not introduce a new font.

Recommended hierarchy:

| Element | Size | Weight |
|---|---:|---:|
| Toolbar month/year | 15–16px | 600 |
| Weekday | 12–13px | 600 |
| Day number | 11–12px | 500 |
| Event title | 10–11px | 500–600 |
| Event metadata | 9–10px | 400 |
| Sidebar heading | 13–14px | 600 |
| Agenda event name | 12–13px | 600 |
| Agenda time/meta | 11–12px | 400–500 |
| Legend | 10–11px | 400–500 |

The calendar should stay visually compact. Avoid normal application body sizes such as 16px inside calendar cells.

---

# 21. Border and Surface Rules

Use existing theme values wherever possible.

Preferred hierarchy:

```text
Page background
  ↓
Surface/card
  ↓
Subtle dividers
  ↓
Semantic event background
```

Do not use a unique background for every calendar region.

Recommended border behavior:

```text
card border → theme divider
grid lines → same divider, possibly lower opacity
control borders → existing input/button border
```

---

# 22. Hover and Selection Behavior

## Day hover

For clickable day cells:

```text
very subtle neutral or primary tint
```

Do not use a strong outline.

## Selected day

Primary visual emphasis belongs to the date circle, not the entire cell.

## Empty days

Keep fully usable and clickable.

Cursor can become pointer if clicking creates/selects events.

---

# 23. Loading State

Do not show a large page spinner.

Recommended skeleton layout:

```text
toolbar controls remain visible if possible
calendar grid remains structurally visible
event chips become small skeleton rectangles
sidebar agenda uses 2–3 skeleton rows
```

Avoid layout shifts after events load.

---

# 24. Empty States

## Month has no events

Still render the full month grid.

Do not replace the calendar with an empty-state card.

The sidebar can say:

```text
No hay eventos para este día.
```

and retain:

```text
Nuevo evento
```

## Selected day has no events

Keep date header visible.

Example layout:

```text
Jueves, 14 de mayo
0 eventos

No hay eventos programados.

[ + Nuevo evento ]
```

---

# 25. Error State

If calendar events cannot load:

- preserve toolbar and month structure where possible
- show a compact inline error
- provide retry action
- do not replace the entire feature with a generic application error page unless navigation itself failed

---

# 26. Accessibility

Required:

- all toolbar buttons must have accessible names
- arrow-only controls require `aria-label`
- selected view must expose selected/pressed state
- selected date must expose selection semantically
- calendar navigation must be keyboard accessible
- event chips must be keyboard focusable when interactive
- icon-only meaning is insufficient
- event type cannot be represented by color alone
- ensure semantic event foreground/background combinations meet contrast requirements
- focus rings must remain visible
- do not remove outlines without an accessible replacement

Recommended labels:

```text
Ir al mes anterior
Ir al mes siguiente
Ir a hoy
Cambiar vista a mes
Cambiar vista a semana
Cambiar vista a día
Filtrar eventos
Crear nuevo evento
```

---

# 27. Responsive Desktop Behavior

This design targets desktop.

## ≥ 1200px

Use full layout:

```text
calendar + sidebar
```

## ~1024–1199px

Preserve two columns if usable.

Possible adjustments:

- sidebar remains ~216px
- event metadata may truncate sooner
- toolbar gaps reduce slightly

Do not shrink day cells to unusable widths.

## Below approximately 1024px

Do not simply compress this desktop design indefinitely.

A separate tablet/mobile behavior should be used, for example:

```text
calendar full width
selected-day sidebar → drawer / below-calendar panel
mini calendar hidden or moved
```

The exact mobile UX is outside this document.

---

# 28. Recommended React/MUI Component Structure

```text
CalendarPage
│
├── CalendarToolbar
│   ├── TodayButton
│   ├── MonthNavigation
│   ├── MonthSelector
│   ├── CalendarViewSwitcher
│   └── CalendarFilterButton
│
├── CalendarDesktopLayout
│   │
│   ├── CalendarMain
│   │   ├── CalendarMonthGrid
│   │   │   ├── CalendarWeekdayHeader
│   │   │   └── CalendarDayCell[]
│   │   │       └── CalendarEventChip[]
│   │   └── CalendarEventLegend
│   │
│   └── CalendarSidebar
│       ├── CalendarDayAgenda
│       │   └── CalendarAgendaItem[]
│       └── CalendarMiniMonth
```

Do not create a component for every tiny wrapper. Extract components around:

- reusable behavior
- state boundaries
- semantic responsibility
- repeated rendering

---

# 29. Suggested MUI Building Blocks

Prefer existing project wrappers first.

Otherwise likely primitives:

```text
Box
Stack
Grid / CSS Grid via Box
Paper or Card
Button
IconButton
ToggleButtonGroup or custom segmented control
Typography
Divider
Popover / Menu
Tooltip
Skeleton
```

Avoid using MUI `Table` for the month layout. CSS Grid is better suited to the visual calendar.

---

# 30. State Model

Recommended UI state:

```ts
selectedDate
visibleMonth
calendarView // month | week | day
activeFilters
selectedEvent
```

Derived state:

```text
eventsForVisibleMonth
eventsForSelectedDate
calendarWeeks
eventTypeVisualConfig
```

Do not store duplicated derived calendar data in component state unless required for performance.

---

# 31. Event Visual Configuration

Actual event types are product/domain driven.

Do not write switch statements throughout the UI such as:

```text
if birthday → orange
if vacation → green
```

Centralize mapping.

Conceptual API:

```ts
type CalendarEventVisualConfig = {
  label?: string;
  icon: React.ElementType;
  background: string;
  foreground: string;
  border?: string;
};
```

Example reference configuration:

```text
meeting  → blue family
birthday → amber/orange family
absence  → coral/red family
vacation → mint/green family
other    → neutral family
```

These names are examples from the design only.

---

# 32. Date and Locale Rules

The UI shown is Spanish.

Use locale-aware date formatting.

Examples:

```text
Mayo 2026
Jueves, 14 de mayo
09:00 – 10:00
Todo el día
```

Do not manually concatenate localized month/day names.

Use the date library already adopted by the application.

---

# 33. Visual Density Rules

The calendar should optimize for scanning.

Target:

- no more than 2–3 visible event cards per day before overflow
- compact event typography
- generous empty space on low-activity days
- no redundant labels
- selected-day details live in sidebar, not inside the cell
- avoid showing full descriptions inside month cells

Month cells provide summary context.

Sidebar provides details.

---

# 34. Reference Screenshot Proportions

The supplied screenshot is approximately:

```text
1070 × 669 px
```

Approximate measured proportions from the reference:

```text
outer horizontal margin: ~8px
main calendar column: ~816px
column gap: ~20px
right sidebar: ~216px

toolbar height: ~36px
toolbar → grid gap: ~16px

month grid top: ~61px
month grid height: ~556px
weekday header: ~37px
calendar body rows: ~86px each
```

These values are reference targets, not hard requirements.

Scale using the application's real content container.

Do not hard-code the entire page to 1070px.

---

# 35. Design Decisions to Preserve

Codex should preserve these characteristics when implementing:

1. **Calendar is the primary surface.**
2. **Sidebar is contextual, not another navigation area.**
3. **Grid is airy and low-noise.**
4. **Grid lines are subtle.**
5. **Events use soft semantic backgrounds.**
6. **Primary brand color is reserved for meaningful interaction states.**
7. **Selected date is shown with a small filled circle.**
8. **Event metadata is subordinate to the event title.**
9. **Toolbar controls are compact.**
10. **Month / Week / Day control behaves as one segmented control.**
11. **Agenda items use larger circular semantic icons than month-grid events.**
12. **New event button is visually clear but not oversized.**
13. **Legend is lightweight and outside the calendar card.**
14. **No decorative botanical elements are required.**
15. **The feature must inherit the application's existing background and brand system.**

---

# 36. Things Codex Must Not Do

Do **not**:

- introduce a new page background
- hard-code the application's existing brand colors again
- copy botanical artwork from the reference
- assume the example event categories are the final domain model
- use saturated event cards
- add strong box shadows
- put every section inside nested cards
- make the calendar grid overly dense
- show full event descriptions in month cells
- make each date cell independently variable in height
- encode event meaning by color only
- replace the calendar with an empty-state panel when there are no events
- create a mobile layout by simply squeezing the desktop grid
- add new libraries when the existing stack already solves the problem
- bypass existing shared MUI/theme components

---

# 37. Suggested Implementation Order for Codex

1. Inspect the existing application theme and shared layout components.
2. Identify existing:
   - page container
   - buttons
   - segmented controls
   - card/surface styles
   - typography
   - icons
   - spacing tokens
   - border radius tokens
3. Implement the two-column desktop layout.
4. Implement the toolbar.
5. Implement the static month grid geometry.
6. Implement date states.
7. Implement configurable event chips.
8. Add event overflow behavior.
9. Implement selected-day agenda.
10. Implement mini calendar.
11. Implement event legend.
12. Connect real domain event data.
13. Add keyboard/accessibility behavior.
14. Add loading, empty, and error states.
15. Compare rendered UI against the reference screenshot.
16. Adjust spacing, density, and typography before changing component architecture.

---

# 38. Visual QA Checklist

Before considering the implementation complete, verify:

- [ ] Existing application background remains unchanged.
- [ ] Existing brand/theme tokens are reused.
- [ ] No botanical/decorative graphics were added.
- [ ] Main calendar visually dominates the page.
- [ ] Sidebar remains narrow and contextual.
- [ ] Seven calendar columns have equal width.
- [ ] All week rows have consistent height.
- [ ] Weekday labels are centered.
- [ ] Grid lines are subtle.
- [ ] Adjacent-month dates are visibly de-emphasized.
- [ ] Selected date uses the existing primary brand color.
- [ ] Events have soft backgrounds and readable semantic foregrounds.
- [ ] Event types are configurable rather than hard-coded to the reference examples.
- [ ] Event chips remain compact.
- [ ] Busy dates use overflow behavior instead of expanding the row.
- [ ] Sidebar agenda matches the currently selected date.
- [ ] Agenda icon circles correspond semantically to event visuals.
- [ ] Mini calendar selection stays synchronized with the main calendar.
- [ ] Month/week/day control clearly indicates the active view.
- [ ] Toolbar remains visually lightweight.
- [ ] New-event action is easy to find.
- [ ] Legend reflects actual configured event categories.
- [ ] Keyboard focus is visible.
- [ ] Color is not the only event-type cue.
- [ ] No unnecessary new dependencies were introduced.
- [ ] Final rendering has been visually compared with the supplied reference image.

---

# 39. Reference Asset

Use the supplied calendar screenshot as the visual reference during implementation.

Codex should use this document for **structure and design intent**, and the screenshot for **visual QA**.

When there is a conflict:

1. existing application design system / brand tokens
2. product requirements and actual event domain
3. this specification
4. reference screenshot

in that priority order.

---

# 40. Annual Holiday Disclosure

The implemented calendar includes a collapsed `AnnualHolidayDisclosure` below
the active month or agenda view. Its summary shows the selected year and the
number of nationwide Costa Rican holidays. Expanding it reveals a chronological
list containing each holiday's localized name and formatted date.

The disclosure uses native `details` and `summary` elements so it remains
keyboard accessible without client-side state. It receives the same complete
year response used to populate holiday entries in the active month, so opening
the disclosure does not make another HTTP request.

Holiday data comes from the server-only Nager.Date adapter. Responses are
validated before use and cached by year for 30 days. The year is part of the
provider URL and cache key, so navigating to another year loads and caches that
year independently. No holiday data is written to the deployment filesystem.
