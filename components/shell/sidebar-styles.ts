// Shared class strings for the sidebar (shell mockup; docs/05-design-system.md,
// v2 Amendment §E). Collapse is driven by <html data-sidebar="collapsed"> through
// the `sidebar-collapsed:` variant (app/globals.css), so it is right before
// hydration. On mobile the sidebar is a top bar that is always icon-only, so every
// collapse rule is scoped to `md:`.

// 36px rows, 10px inset, 18px icons; the collapsed rail turns them into 40px tiles.
export const SIDEBAR_ITEM_BASE =
  "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 max-md:size-10 max-md:justify-center max-md:px-0 md:sidebar-collapsed:size-10 md:sidebar-collapsed:justify-center md:sidebar-collapsed:px-0";

export const SIDEBAR_ITEM_INACTIVE = `${SIDEBAR_ITEM_BASE} font-medium text-ink-muted hover:bg-surface-200 hover:text-ink`;
export const SIDEBAR_ITEM_ACTIVE = `${SIDEBAR_ITEM_BASE} bg-accent-soft font-semibold text-accent-text`;

// A child row (Fitness › Workouts…): indented 18px, with an 18px spacer where the
// icon would be so labels line up with their parent's.
export const SIDEBAR_CHILD_BASE =
  "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
export const SIDEBAR_CHILD_INACTIVE = `${SIDEBAR_CHILD_BASE} font-medium text-ink-muted hover:bg-surface-200 hover:text-ink`;
export const SIDEBAR_CHILD_ACTIVE = `${SIDEBAR_CHILD_BASE} bg-accent-soft font-semibold text-accent-text`;

// Text shown next to an icon: desktop only, and not when collapsed.
export const SIDEBAR_LABEL = "hidden md:inline md:sidebar-collapsed:hidden";
