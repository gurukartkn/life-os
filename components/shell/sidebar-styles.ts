// Shared class strings for the sidebar (docs/05-design-system.md, v2 Amendment §E).
// Collapse is driven by <html data-sidebar="collapsed"> through the
// `sidebar-collapsed:` variant (app/globals.css), so it is right before hydration.
// On mobile the sidebar is a top bar that is always icon-only, so every collapse
// rule is scoped to `md:`.

export const SIDEBAR_ITEM_BASE =
  "flex items-center gap-2 rounded-md px-2.5 py-2 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 md:sidebar-collapsed:justify-center md:sidebar-collapsed:px-0";

export const SIDEBAR_ITEM_INACTIVE = `${SIDEBAR_ITEM_BASE} text-ink-muted hover:bg-surface-200 hover:text-ink`;
export const SIDEBAR_ITEM_ACTIVE = `${SIDEBAR_ITEM_BASE} bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text`;

// Text shown next to an icon: desktop only, and not when collapsed.
export const SIDEBAR_LABEL = "hidden md:inline md:sidebar-collapsed:hidden";
