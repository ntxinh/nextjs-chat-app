# DESIGN.md

Visual contract for the chat app. Tasks 5 (shadcn primitives), 19 (chat UI), 20 (message list), and 23 (settings) implement against this document. Token values below are the exact values in `src/app/globals.css` — if one changes, the other must too.

## Goals

- Read like a messaging app, not a dashboard: dense but calm, text-first.
- Light, dark, and system themes with no hydration flash (`next-themes`, `attribute="class"`, `suppressHydrationWarning` on `<html>`).
- Every color comes from a token. No raw hex in components, no `bg-white`/`text-black`.

## Color tokens

CSS custom properties on `:root` (light) and `.dark`, exposed to Tailwind 4 via `@theme inline` as `--color-*` (so `bg-background`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `text-success`, `text-warning`, `text-error` all work).

| Token | Light | Dark | Usage |
|---|---|---|---|
| `background` | `#ffffff` | `#020617` | Page/app shell background |
| `foreground` | `#0f172a` | `#f8fafc` | Primary text |
| `muted` | `#f1f5f9` | `#1e293b` | Subtle surfaces (hover rows, secondary bubbles) |
| `muted-foreground` | `#64748b` | `#94a3b8` | Secondary text (timestamps, placeholders, captions) |
| `border` | `#e2e8f0` | `#1e293b` | Dividers, hairlines, input borders |
| `accent` | `#f1f5f9` | `#1e293b` | Interactive hover/active surface |
| `accent-foreground` | `#0f172a` | `#f8fafc` | Text on `accent` |
| `primary` | `#2563eb` | `#3b82f6` | Primary actions, own message bubbles, links |
| `primary-foreground` | `#ffffff` | `#ffffff` | Text on `primary` |
| `success` | `#16a34a` | `#22c55e` | Online presence, delivery/success states |
| `warning` | `#d97706` | `#f59e0b` | Pending/degraded states |
| `error` | `#dc2626` | `#ef4444` | Destructive actions, send-failure, form errors |

`color-scheme: light|dark` is set on the corresponding root so scrollbars and native controls follow the theme.

## Typography

- Family: Tailwind default `font-sans` (system stack). No webfont.
- Scale (Tailwind defaults): `text-xs` 12px, `text-sm` 14px (body default for chat), `text-base` 16px, `text-lg` 18px (screen titles), `text-xl` 20px+ (rare).
- Weights: `font-normal` body, `font-medium` names/emphasis, `font-semibold` titles only.
- Timestamps, previews, and metadata: `text-xs text-muted-foreground`.
- Message text: `text-sm`, `leading-relaxed`, `whitespace-pre-wrap`, `break-words`.

## Spacing

Tailwind default scale (4px base). Conventions:

- Chat list rows / contact rows: `p-3`, `gap-3` between avatar and text.
- Message bubbles: `px-3 py-2`, `rounded-2xl`, `gap-2` between stacked bubbles.
- Composer: `p-3`, `border-t border-border`.
- Screen padding: `p-4`; section gaps `gap-4`.

## Layout & breakpoints

Three-pane shell. Collapse rules:

- `sm` (<640px): single pane — chat list OR active conversation; a details pane slides over, never shares space.
- `md` (≥768px): two-pane — list + conversation.
- `lg` (≥1024px): three-pane — nav/list + conversation + details sidebar.

List column width: `w-80` on `md`, `w-96` on `lg`. Details column: `w-80` on `lg` only.

## Interaction states

- Hover: `hover:bg-accent hover:text-accent-foreground` on interactive rows/buttons.
- Selected/active item in lists: `bg-accent`.
- Focus: visible `focus-visible:ring-2 focus-visible:ring-ring` (Tailwind ring, offset via `ring-offset-background`) — never remove outline without a visible replacement.
- Disabled: `opacity-50 pointer-events-none` (or `aria-disabled` styling for non-button elements).
- Active/pressed: `active:bg-accent` or `aria-pressed`/`data-state` driven styles.
- Theme switching is instant — `disableTransitionOnChange` is set on the provider; do not add global `transition-*` to `body`/`*`.

## Accessibility rules

- All user-facing strings come from `messages/*.json` via `useTranslations` — including `aria-label`s and `title`s.
- Icon-only controls must have an `aria-label`.
- Color is never the only signal: `success`/`error` states pair color with an icon or text.
- Contrast: text/background pairs must meet WCAG AA (4.5:1 for body text). The pairs above are chosen to satisfy this.
- Interactive targets ≥ 40×40px touch area (`p-2` on icon buttons minimum).
- `prefers-reduced-motion`: avoid non-essential animation; skeletons pulse via Tailwind's `animate-pulse` only.

## Message bubbles & scroll

- Own messages: `bg-primary text-primary-foreground`, aligned end (`justify-end`), `rounded-2xl rounded-br-sm`.
- Others' messages: `bg-muted`, aligned start, `rounded-2xl rounded-bl-sm`, sender name in `text-xs text-muted-foreground` above the bubble (group chats only).
- Consecutive messages from the same sender within a short window collapse the avatar/name — show only on the first of a run.
- Timestamp: on hover/focus per bubble (`text-xs text-muted-foreground`), plus day separators between date groups.
- **Scroll anchoring:** the message list stays anchored to the bottom (newest message) unless the user has scrolled up. When the user is within ~1 viewport of the bottom, new messages auto-scroll; otherwise show a "new messages" pill that jumps to bottom on click. Restore scroll position on locale/theme change, not on new messages while scrolled up.

## Loading / empty / error conventions

- Loading: skeleton rows (`animate-pulse bg-muted rounded`) matching final row geometry — no spinners for list loads.
- Empty states: centered `text-sm text-muted-foreground` message, icon above it, primary CTA button when one exists (`bg-primary text-primary-foreground`).
- Errors: `text-error` inline for field/send failures; a dismissible `bg-error/10 text-error border-error/20` banner for screen-level failures, always with a retry action.
- Message send failure: bubble stays visible with `text-error` affordance + retry; never drop the draft.

## Theme toggle

Three-option control (light / dark / system) bound to `useTheme().setTheme`. Task 4 ships a three-button group with `aria-pressed`; Task 5 MAY swap it for a `dropdown-menu` trigger without changing this contract.
