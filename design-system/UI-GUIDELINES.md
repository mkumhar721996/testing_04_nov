# UI Guidelines

## Navigation and information architecture
- Top bar plus left sidebar on desktop; the sidebar collapses behind a menu button below 768px. Reason: a few stable sections suit a persistent sidebar, and phones need the width.
- Main sections, in order: Dashboard, Items, Activity, Settings (keys `dashboard`, `items`, `activity`, `settings`). Account lives in the top bar (`account`). Reason: daily-use areas come first, configuration last.
- Detail and edit screens open inside their parent section, not as new top-level items. Reason: keeps the sidebar to four entries.

## Layout and density
- Work-focused and moderately dense: content is capped at `content-max-width`, with `space-3` between related blocks and `space-4` between sections. Reason: users scan and act repeatedly, not browse.
- Single column below 768px; multi-column only through `.grid`, which reflows by itself. Reason: no per-breakpoint rules to maintain.

## Component usage
- Lists of comparable records with several attributes: a table. Collections of few, richer items: `.card` in a `.grid`. Short, single-attribute lists: `.menu`. Reason: tables compare, cards summarise, menus select.
- One `.btn-primary` per view; `.btn-secondary` for alternatives, `.btn-ghost` for low-emphasis actions, `.btn-danger` only for destructive actions behind a `.modal` confirmation. Reason: a single clear main action.
- Forms: wrap each control in `.field` with a hint, and show validation with `.is-invalid` plus an error message. Use `.switch` for settings that apply instantly and `.checkbox` for choices submitted with a form. Reason: the control signals when a change takes effect.
- Use `.drawer` for viewing or editing a record while keeping its list visible; `.modal` only for confirmations and short blocking decisions. Reason: modals interrupt, drawers keep context.
- Use `.toast` for confirmation of completed actions, `.alert` for problems that stay until fixed, `.empty-state` with one `.btn-primary` for empty collections, `.skeleton` for loading content and `.spinner` for loading actions. Reason: each matches how long the message must stay visible.
- Use `.badge` for status and `.chip` for filters. Reason: status is read-only, filters are interactive.
- Use `.stack`, `.cluster` and `.grid` for spacing; do not add custom margins. Reason: spacing stays on the token scale.

## Theme
- Light theme only, with `color-bg` as the page and `color-surface` for raised areas. Reason: one theme halves the review and test surface; dark mode can be added later by overriding tokens.

## Voice and tone
- Plain, direct and calm; sentence case; verbs on buttons ("Save changes", "Delete item"). Reason: users want to finish a task, not read.
- Errors say what happened and what to do next, without blame or exclamation marks. Reason: keeps users moving.
- Empty states explain what belongs there and offer the first step. Reason: an empty screen is the best moment to teach.
