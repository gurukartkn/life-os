# Life OS — Design System (Phase 4)

Source: https://claude.ai/artifact/WAeA9ggJeLJTahFE9yB1no

A personal system for the things a notebook used to hold — todos, workouts, routines, and eventually goals, projects, and the rest of a life tracked in one interlinked place. It replaces Obsidian (too much time spent customizing, not enough using it) and Notion (data entry and display never quite fit).

## Point of view

**A clean analytics dashboard, not a document.** This direction was built directly from a reference screenshot: a light, white-card SaaS dashboard with a single deep-violet brand accent and a small, consistent set of supporting hues used for data and status. Life OS borrows that structure — flush white cards on a barely-tinted page, one confident accent color, generous whitespace, numbers given real visual weight — rather than a moody or "personal journal" aesthetic. The three domains (Todo, Fitness, Routines) should read like different views inside one product, the way a CRM's pipeline and revenue views share one visual language.

**Structure from contrast, not shadow.** Cards are pure white sitting on a barely-off-white page — the separation comes from that value step and a near-invisible border, not a drop shadow. `shadow-float` is reserved for things that actually float above the page (a modal, a dropdown, a dragged row).

**One accent, three supporting hues, no more.** Four identity colors across every chart, gauge, and status pill: violet, teal, blue, and pink. Violet (`accent`) is the primary action color and the Todo domain's identity; teal, blue, and pink are reused consistently as both domain accents (Fitness = teal, Routines = blue) and status semantics (teal = done, blue = in progress/upcoming, pink = needs attention/overdue). Don't introduce a fifth hue for a new feature — extend meaning from these four instead.

Light theme only for now — no dark theme was invented since the reference had none. *(Superseded: v2 adds a dark palette — see "v2 Amendment" at the end of this document.)*

## Voice & content

Life OS is a tool one person uses privately, many times a day. The voice is **plain, direct, and unhurried** — closer to a well-made dashboard than a lifestyle app. No exclamation marks, no cheerleading about streaks or productivity, no filler above content that could just start.

- Name things the way the person using it would say them, not the way the schema names them: "Workout," not "Fitness session record."
- Buttons say exactly what happens: "Add todo," "Log set," "Delete workout" — never "Submit" or "Confirm."
- Empty states state what's true and offer one action, nothing more: "Nothing on the list today." / "Add todo" — not "Looks like you're all caught up! 🎉 Why not add something new?"
- Errors say what's wrong and how to fix it, plainly: "Enter a valid date," not "Oops, something went wrong."
- Numbers carry their own weight (`stat-xl`) — don't wrap them in congratulatory copy. Let "12-day streak" sit on its own line instead of "You're on an amazing 12-day streak!"

## Design tokens (CSS custom properties)

*(v2: the values of `ink-muted` and `ink-faint` below are superseded, and `teal-fill` / `blue-fill` are added. See "v2 Amendment" §H.)*

```css
:root, [data-theme="light"] {
  --surface-050: #f9fbfc; /* Page and sidebar background. */
  --surface-100: #ffffff; /* Card, sheet, and modal background — sits as a flush white plane on surface-050. */
  --surface-200: #f4f5f7; /* Hover/pressed state for a card or row; progress-bar and gauge tracks. */
  --border: #efefef; /* Default card and divider border. */
  --border-strong: #e0e0e0; /* Input borders, table rules, anything needing a touch more definition. */
  --ink: #141414; /* Headlines and large numbers. */
  --ink-muted: #6b6b6b; /* Secondary text — labels, helper copy, table metadata. */
  --ink-faint: #9a9a9a; /* Placeholder text, disabled labels, least-important metadata. */
  --accent: #6c4cf5; /* Primary action fill (buttons, active nav item, checked state) and the Todo domain's identity color. ~4.4:1 with accent-ink — fine for medium/bold 14px+ labels, avoid for small regular-weight text. */
  --accent-hover: #5b3ee0; /* Hover/active state for an accent fill. */
  --accent-text: #5b3ee0; /* Accent used AS text — links, the active tab label, icon-only controls. Meets 4.5:1 on surface-050/100. */
  --accent-soft: #eee9fe; /* Light tint background for a purple status pill or the active sidebar item. */
  --accent-ink: #ffffff; /* Text/icons on an accent fill. */
  --teal: #3fa491; /* Fitness domain identity color; success/complete state. */
  --teal-soft: #e1f5f1; /* Light tint background for a teal/success status pill. */
  --teal-ink: #1f6a5c; /* Teal-family text — status labels on teal-soft, or directly on surface-050/100. */
  --blue: #4b9eea; /* Routines domain identity color; in-progress/upcoming state. */
  --blue-soft: #e5f2fd; /* Light tint background for a blue/info status pill. */
  --blue-ink: #235e8c; /* Blue-family text — status labels on blue-soft, or directly on surface-050/100. */
  --pink: #c81e5c; /* Attention/overdue state. Deepened from the sampled magenta (~#e02c72) specifically for use as a solid button fill with white text. */
  --pink-soft: #fce7ef; /* Light tint background for a pink/attention status pill — true-sampled tint, used in badges and data-viz. */
  --pink-ink: #a32359; /* Pink-family text — status labels on pink-soft, or directly on surface-050/100. */
  --ring: #6c4cf5; /* Keyboard focus ring on any interactive control, 2px offset. */
  --shadow-float: 0 12px 32px rgba(20,20,30,0.10); /* Dropdown menus, popovers, modals, a dragged row. */
}
:root {
  --space-1: 4px;  /* Icon-to-label gaps, tight inline spacing. */
  --space-2: 8px;  /* Gap between a label and its input, chip padding. */
  --space-3: 12px; /* Compact control padding (checkbox row, status pill). */
  --space-4: 16px; /* Default card padding, gap between form fields. */
  --space-6: 24px; /* Gap between cards, section padding. */
  --space-8: 32px; /* Gap between page sections. */
  --space-12: 48px; /* Page top margin, empty-state vertical padding. */
  --radius-sm: 8px;   /* Status pills, small chips, checkboxes. */
  --radius-md: 10px;  /* Buttons, inputs, table rows. */
  --radius-lg: 16px;  /* Cards, sheets, modals — the dominant card radius. Every card uses the same radius; don't mix radii on peer elements. */
  --radius-full: 999px; /* Pills, avatars, progress-bar and gauge tracks. */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --text-stat-xl: 700 34px/40px var(--font-sans);    /* The big number on a stat card (revenue, streak count, workouts logged). */
  --text-heading: 600 16px/22px var(--font-sans);    /* Card and section titles. */
  --text-page-title: 600 22px/28px var(--font-sans); /* Page-level title (Today, Fitness, Routines). */
  --text-body: 400 14px/20px var(--font-sans);       /* Default UI and content text. */
  --text-body-sm: 400 13px/18px var(--font-sans);    /* Table cells, dense list rows, secondary card copy. */
  --text-label: 500 12px/16px var(--font-sans);      /* Form labels, field names, column headers. */
  --text-caption: 400 12px/16px var(--font-sans);    /* Timestamps, helper text, status-pill labels. */
  --text-button-text: 500 14px/20px var(--font-sans); /* Button and tab labels. */
}
```

Typography: single font family, **Inter**, no secondary display face — identity comes from color and the weight given to numbers, not typographic contrast.

## Iconography

No icon set shipped with the design system itself — the reference uses simple 24px stroke icons (sidebar nav, search, theme toggle, percentage-delta arrows). **Lucide** (`lucide-react`) is the pick since it ships natively with Shadcn.

- **Size** — 20px inline with `body`/`button-text`, 16px inline with `body-sm`/`caption`, 24px standalone (an empty-state icon, a sidebar item).
- **Stroke** — 1.5–1.75px. Don't mix filled and stroke icons in the same view.
- **Color** — `ink-muted` by default (matching secondary text), `accent`/`teal`/`blue`/`pink` only when carrying status or sitting inside that hue's Tag pill, `ink` only when it's the primary glyph in an otherwise-empty state. Never a fifth color.

## Components in this system

Button, Input, Checkbox, Tag (status pill), Card, Tabs, Progress bar, and Empty state — the pieces Todo, Fitness, and Routines are built from. These were designed as static visual references (color, type, spacing, states); wiring them to Shadcn/Next.js is Implementation Plan work. Token names map directly onto Shadcn's CSS variable convention:

| Design token | Shadcn variable |
|---|---|
| `surface-050` | `background` |
| `ink` | `foreground` |
| `accent` | `primary` |
| `border` | `border` |
| `ring` | `ring` |

## Adaptations from the reference (worth knowing)

- The reference's CTA button and chart colors sit close to but not always above 4.5:1 contrast (`accent` on white is ~4.4:1) — kept as sampled for medium/bold labels; don't use for small body text.
- `pink` was deepened one step from the sampled magenta specifically for use as a solid button fill with white text (a destructive action); the lighter, true-sampled tint lives in `pink-soft`.
- The reference's four-stage deal pipeline (Negotiating → Drafting → Activated → Pending Approval) was translated into three status semantics — teal (done), blue (in progress/upcoming), pink (overdue/attention) — reusing the same hues and soft-pill visual pattern.


---

# v2 Amendment (Stage 1) — 2026-09-19

Approved in v2 Phase 2 (see `docs/v2-prd-erd-baseline.md`, Stage 1). Amends, does not replace, the tokens and rules above. Where the two differ, this section wins.

## A. Token mapping fix

The design token `--accent` is the brand violet (`#6c4cf5` fill). Shadcn also has an `accent` slot, meant for a neutral hover highlight, and the v1 build mapped it to `surface-200` — which silently turned every `bg-accent` into light grey. Fix:

- `--accent`, `--accent-hover`, `--accent-text`, `--accent-soft`, `--accent-ink` keep the design-system meaning (violet family).
- Shadcn's neutral highlight (menu/list hover) uses `--surface-200` directly (`bg-surface-200`); the Shadcn `--accent` / `--accent-foreground` variables are not used by any Life OS component.

A related fix: the class-merge helper `cn` (`lib/utils.ts`) is configured to know the named text styles (`text-body`, `text-button-text`, …) are font sizes. Before, it read them as text colours and dropped them whenever a colour class such as `text-ink-muted` sat beside them, so some labels rendered in the browser default font.

## B. Input

One style for every text-like control (text, email, password, date-picker trigger, number):

| Property | Value |
|---|---|
| Height | 38px (matches the default Button) |
| Radius | `--radius-md` (10px) — not the card radius |
| Fill | `--surface-100` (white in light) — never transparent or grey |
| Border | 1px `--border-strong` |
| Text | `text-body`; placeholder `--ink-faint` |
| Focus | border `--accent`, plus 2px `--ring` ring with 2px offset |
| Invalid | border `--pink`, message in `pink-ink` `text-caption` below |
| Disabled | 50% opacity, same fill |

## C. Button

Default size is 38px tall, `--radius-md`, `text-button-text`. Small is 32px. Icon buttons are 38px square.

Variants: `primary` (filled), `soft` (tinted background with the tone's ink colour, for a secondary action inside a card such as "Start workout" or "View checklist"), `secondary`, `outline`, `ghost`, `destructive` (`--pink` fill, white text), `link`.

`primary` and `soft` take a `tone` that carries the domain identity: `violet` (Todo, default), `teal` (Fitness), `blue` (Routines). Every "add / new" action in every domain uses `primary` at the default size, so shape, height, radius and type are identical across screens — only the tone differs. The same styles apply when a Button renders as a link (for example "New workout", "New routine"). Hand-rolled button class strings are not used.

## D. Date picker

One `DatePicker` for every date field: a Popover whose trigger is styled as an Input (B) and whose content is the Shadcn Calendar (`react-day-picker`).

- Selected day: `--accent` fill with `--accent-ink` text. Today: `--accent-soft` ring. Outside-month days: `--ink-faint`. Cell radius `--radius-sm`.
- Week starts Monday (matches the routine week boundary).
- Value is the same `YYYY-MM-DD` string the `date` columns already use; empty means no date, and the picker offers a clear action.
- Past dates are selectable (Stage 2 renders them as overdue).

## E. Sidebar

Collapsible on desktop: expanded 240px, collapsed 64px icon rail. Collapsed items keep their icon and expose the label through `aria-label` and `title`. The toggle uses `PanelLeftClose` / `PanelLeftOpen` and `aria-expanded`. Width animates for ~150ms and does not animate under `prefers-reduced-motion`. The mobile top bar is unchanged. The choice is kept in the browser and applied before first paint.

## F. Dark palette

Set with `data-theme="dark"` on `<html>`; light stays the default token set. Accent, teal, blue and pink keep the same identity and status meaning — only the soft tints and text tones change. Pairs are checked for 4.5:1 for body text.

```css
[data-theme="dark"] {
  --surface-050: #0f1014;  --surface-100: #17181d;  --surface-200: #1f2127;
  --border: #26282f;       --border-strong: #363944;
  --ink: #f2f2f4;         --ink-muted: #a3a5ad;    --ink-faint: #868992;
  --accent: #6c4cf5;       --accent-text: #a595ff;
  --accent-soft: #241d4a;  --accent-ink: #ffffff;
  --teal: #3fa491;         --teal-soft: #12312c;    --teal-ink: #6fd0bd;
  --blue: #4b9eea;         --blue-soft: #14293d;    --blue-ink: #8cc4f5;
  --pink: #c81e5c;         --pink-soft: #3a1626;    --pink-ink: #f28aae;
  --ring: #8b70ff;
  --shadow-float: 0 12px 32px rgba(0, 0, 0, 0.5);
}
```

Dark --accent-hover is not overridden: the light value (#5b3ee0) stays, because a lighter violet on hover would drop white button text below 4.5:1. Values were nudged to meet contrast (see §H); this list is the final set.

## G. Theme switching

Two themes, light and dark, with a toggle (Sun / Moon icon) in the sidebar footer. On a first visit the theme follows the operating-system preference; after that the explicit choice wins. The choice is stored in the browser only (no schema change) and applied by a small inline script before first paint so there is no flash. The theme is UI state (ADR-003), held in the Zustand UI store.


## H. Contrast fixes (WCAG AA)

Checked with axe on every screen in both themes, plus overdue and completed todos, validation errors and the open calendar (`e2e/contrast.spec.ts`). These v1 values fell short of 4.5:1 and are changed, in both themes where noted:

| Token | Was | Now | Why |
|---|---|---|---|
| `ink-faint` (light) | `#9a9a9a` (2.7:1) | `#6f6f6f` (4.6:1 on the darkest light surface) | Captions, placeholders, inactive tab labels |
| `ink-muted` (light) | `#6b6b6b` | `#555555` | Kept one clear step above `ink-faint` so the three text tiers stay distinct |
| `ink-faint` (dark) | `#7f828c` (4.2:1 on a hovered row) | `#868992` | Same reason, on `surface-200` |
| `teal-fill` (new, both themes) | white on `teal` `#3fa491` (3.0:1) | `#318172` (4.65:1), hover `#2b7264` | Solid button fill behind white text |
| `blue-fill` (new, both themes) | white on `blue` `#4b9eea` (2.8:1) | `#3979b3` (4.6:1), hover `#326b9e` | Same |
| `accent-hover` (dark) | `#7d61f7` (4.3:1 with white) | inherits `#5b3ee0` | Hover must not lighten the fill under white text |

`teal` and `blue` keep their identity meaning for bars, dots, icons and charts (3:1 is enough there). Only solid button fills use the `-fill` tokens; button hover is a darker token, not an opacity change, because opacity lightens the fill under white text. Any future colour pair used for text must be checked against 4.5:1 (3:1 for large text and graphics) before it is added.

## I. Hi-fi mockup alignment (v2)

The v2 hi-fi mockups (Life OS v2 – Hi-fi mockups canvas) are the visual reference for every shipped screen. Light-theme values move to the mockups', except `ink-faint`, which stays at the §H value because the mockups' `#767676` is under 4.5:1 on `surface-050`. Dark values are unchanged (the mockups draw the shipped dark palette).

| Token | Was | Now |
|---|---|---|
| `ink-muted` (light) | `#555555` | `#6b6b6b` (5.1:1 on `surface-050`) |
| `border` (light) | `#efefef` | `#e3e5e8` |
| `border-strong` (light) | `#e0e0e0` | `#d5d8dd` |
| `skeleton` (new) | — | light `#e6e8ec`, dark `#262932` — loading bars and the avatar disc |
| `surface-overlay` (new) | — | light `rgba(20,20,30,.40)`, dark `rgba(0,0,0,.60)` — modal scrim |
| `text-amount` (new type style) | — | 600 14px/20px, tabular figures |
| `text-dialog-title` (new type style) | — | 600 18px/24px |

Component changes: buttons and inputs are 40px (small buttons 32px); ghost buttons use `ink`; the input focus state is an accent border with a 3px accent halo; cards use a 1px `border`; tags are 22px `radius-sm` pills with a status tone; tabs are 44px underline tabs with tabular count pills; empty and load-failed states are cards with a 56px icon disc, title, one sentence and one action; forms open as modals (480px panel, `surface-overlay` scrim). The sidebar is 216px (64px collapsed) with the logo mark, a Light/Dark switch and the account initials in the footer; export and sign out moved to a new Settings page.

With `ink-muted` back at `#6b6b6b`, it and `ink-faint` (`#6f6f6f`) are close in value; the tiers are told apart by use (secondary copy vs. placeholder/disabled), not by colour alone.