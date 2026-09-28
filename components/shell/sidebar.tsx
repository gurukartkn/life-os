"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavUser } from "@/components/shell/nav-user";
import { NAV_ITEMS, isChildCurrent, isCurrent, type NavItem } from "@/components/shell/nav-items";
import {
  SIDEBAR_CHILD_ACTIVE,
  SIDEBAR_CHILD_INACTIVE,
  SIDEBAR_ITEM_ACTIVE,
  SIDEBAR_ITEM_INACTIVE,
  SIDEBAR_LABEL,
} from "@/components/shell/sidebar-styles";
import type { UserIdentity } from "@/lib/user-display";
import { useUIStore } from "@/stores/use-ui-store";

function LogoMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-accent text-[13px] leading-[18px] font-bold text-accent-ink"
    >
      L
    </span>
  );
}

function NavSection({ item, pathname }: { item: NavItem; pathname: string }) {
  const { href, label, icon: Icon, children } = item;
  const active = isCurrent(pathname, href);
  const childActive = children?.some((child) => isChildCurrent(pathname, child)) ?? false;
  const Chevron = active ? ChevronDown : ChevronRight;

  return (
    <div className="group/nav relative">
      <Link
        href={href}
        aria-label={label}
        title={label}
        aria-current={active ? "page" : undefined}
        // The section row is highlighted only when none of its children carries the highlight.
        className={active && !childActive ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_INACTIVE}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
        <span className={cn(SIDEBAR_LABEL, "flex-1")}>{label}</span>
        {children && <Chevron className={cn(SIDEBAR_LABEL, "size-3.5 shrink-0 text-ink-muted")} strokeWidth={1.75} />}
      </Link>
      {children && active && (
        <div className="mt-0.5 hidden flex-col gap-0.5 md:flex md:sidebar-collapsed:hidden">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              aria-current={isChildCurrent(pathname, child) ? "page" : undefined}
              className={cn(
                "ml-[18px]",
                isChildCurrent(pathname, child) ? SIDEBAR_CHILD_ACTIVE : SIDEBAR_CHILD_INACTIVE
              )}
            >
              <span aria-hidden="true" className="w-[18px] shrink-0" />
              {child.label}
            </Link>
          ))}
        </div>
      )}
      {children && (
        // Collapsed rail: the section's screens open as a flyout on hover or focus.
        <div className="absolute top-[-4px] left-[52px] z-40 hidden w-46 rounded-lg border border-border-strong bg-surface-100 p-1.5 shadow-float md:sidebar-collapsed:group-focus-within/nav:block md:sidebar-collapsed:group-hover/nav:block">
          <p className="px-2 py-1 text-label font-semibold text-ink-muted">{label}</p>
          <div className="flex flex-col gap-0.5">
            {children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                tabIndex={-1}
                className={isChildCurrent(pathname, child) ? SIDEBAR_CHILD_ACTIVE : SIDEBAR_CHILD_INACTIVE}
              >
                <span aria-hidden="true" className="w-[18px] shrink-0" />
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ user }: { user: UserIdentity }) {
  const pathname = usePathname();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside
      id="app-sidebar"
      className="flex w-full flex-row items-center gap-1 border-b border-border bg-surface-050 px-3 py-2 md:sticky md:top-0 md:h-svh md:w-[216px] md:shrink-0 md:flex-col md:items-stretch md:gap-2 md:border-r md:border-b-0 md:p-3 md:transition-[width] md:duration-150 md:sidebar-collapsed:w-16 md:sidebar-collapsed:items-center md:sidebar-collapsed:px-0 motion-reduce:transition-none"
    >
      <div className="mb-2 hidden items-center justify-between gap-2 pr-1 pl-1.5 md:flex md:sidebar-collapsed:flex-col md:sidebar-collapsed:px-0">
        <div className="flex items-center gap-2">
          <LogoMark />
          <span className="text-heading text-ink md:sidebar-collapsed:hidden">Life OS</span>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 items-center justify-center rounded-md text-ink outline-none transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <PanelLeft className="size-4" strokeWidth={1.75} />
        </button>
      </div>
      <nav
        aria-label="Main"
        // Narrower than the seven tiles fit, the mobile bar scrolls sideways rather than the
        // page; the 4px padding (cancelled by the margin) keeps focus rings inside the clip.
        className="flex min-w-0 flex-1 items-center gap-0.5 max-md:-m-1 max-md:overflow-x-auto max-md:p-1 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden md:flex-none md:flex-col md:items-stretch md:gap-0.5 md:sidebar-collapsed:items-center md:sidebar-collapsed:gap-1"
      >
        {NAV_ITEMS.map((item) => (
          <NavSection key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="hidden flex-1 md:block" />
      <div className="flex shrink-0 items-center md:flex-col md:items-stretch md:sidebar-collapsed:items-center">
        <NavUser user={user} />
      </div>
    </aside>
  );
}
