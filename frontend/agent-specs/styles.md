# Frontend Style Guide

## Visual Direction

Customer Churn Rescue should feel like an operational retention tool: clear, calm, dense enough for repeated use, and easy to scan. Avoid marketing-page composition, decorative sections, and oversized hero treatments.

## Theme

The app supports light and dark mode through `ThemeContext` and Tailwind dark classes.

Primary surfaces:

- Page background: light gray in light mode, slate in dark mode.
- Panels: `panel` utility from `src/index.css`.
- Inputs: `field` utility from `src/index.css`.
- Tables: `table-head` utility from `src/index.css`.

## Color Usage

Use the current cyan accent for agent actions and selected controls.

```text
Accent cyan: #0891b2
Success: emerald
Warning: yellow/orange
Critical: red
Neutral text: slate
```

Risk colors are centralized in `src/utils/risk.ts`:

- Low: emerald
- Moderate: yellow
- High: orange
- Critical: red

## Typography

- Use the existing system font stack from `src/index.css`.
- Keep page titles around `text-2xl`.
- Keep panel headings compact: `text-base` or `text-lg`.
- Use `tracking-normal`; avoid negative letter spacing.
- Body text should generally be `text-sm` in dense operational panels.

## Layout

- Use full-width page sections with constrained internal spacing.
- Use `panel` for dashboards, forms, tables, result sections, and repeated record groups.
- Avoid putting cards inside other cards.
- Use responsive grids for page layout, especially `xl:` splits for form/result or main/sidebar views.
- Keep fixed-format controls stable with explicit sizes where needed.

## Buttons

Use the shared button classes:

- `btn-primary` for the main action.
- `btn-secondary` for supporting actions.

Buttons should include a `lucide-react` icon when the action benefits from quick recognition.

## Inputs

Use `field` for text inputs, textareas, selects, and numeric inputs.

For native checkboxes outside custom list controls:

- `accent-color` is globally set to cyan.
- `color-scheme` is forced to light so unchecked boxes do not render as black.

## Customer Scope Checkboxes

The customer-scope checklist in `AgentPage.tsx` uses a custom checkbox because native browser checkboxes rendered as dark squares in some themes.

Required behavior:

- Unchecked: white background, slate border.
- Checked: cyan background, cyan border, white check icon.
- Native input should remain accessible with `peer sr-only`.
- Visible custom box should be `aria-hidden="true"`.

## Tables

- Use compact rows and left-aligned headings.
- Keep long recommendation/root-cause columns constrained with `max-w-*`.
- Preserve horizontal overflow for dense customer data instead of squeezing text into unreadable cells.

## Charts

Use Recharts with restrained palette choices:

- Cyan for primary chart data.
- Yellow/orange/red for risk-oriented values.
- Slate/emerald as secondary accents.

## Empty And Loading States

Use shared components:

- `LoadingState`
- `EmptyState`

Keep copy short and specific.

## Accessibility

- Keep visible focus states on interactive controls.
- Do not rely on color alone for risk; pair labels with color.
- Inputs and selects should have labels.
- Preserve semantic buttons, links, tables, and form controls.
- Custom checkboxes must keep the real input in the DOM.

## Mobile

- Avoid text overlap by letting controls wrap.
- Use responsive grids instead of fixed multi-column layouts on small screens.
- Keep table overflow horizontal when the data is too dense to collapse cleanly.

## Do Not

- Do not use pink as a primary UI color.
- Do not add decorative gradient orbs or bokeh backgrounds.
- Do not create a landing page for this app.
- Do not use visible instructions to explain obvious controls.
- Do not use native checkbox styling for customer-scope rows.
