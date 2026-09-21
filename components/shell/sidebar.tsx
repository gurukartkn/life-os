"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  Dumbbell,
  ListChecks,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/auth";
import { ExportDataButton } from "@/components/shell/export-data-button";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import {
  SIDEBAR_ITEM_ACTIVE,
  SIDEBAR_ITEM_BASE,
  SIDEBAR_ITEM_INACTIVE,
  SIDEBAR_LABEL,
} from "@/components/shell/sidebar-styles";
import { useUIStore } from "@/stores/use-ui-store";

const NAV_ITEMS = [
  { href: "/tasks", label: "Tasks", icon: CalendarCheck },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: ListChecks },
];

export function Sidebar({
  userEmail,
  hasExportableData,
}: {
  userEmail: string;
  // Export is offered only once there is something to export (backlog #19).
  hasExportableData: boolean;
}) {
  const pathname = usePathname();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);

  return (
    <aside
      id="app-sidebar"
      className="flex w-full flex-row items-center gap-1 border-b border-border bg-surface-050 px-3 py-2 md:h-svh md:w-60 md:shrink-0 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:p-4 md:transition-[width] md:duration-150 md:sidebar-collapsed:w-16 md:sidebar-collapsed:px-2 motion-reduce:transition-none"
    >
      <div className="hidden items-center justify-between pb-6 md:flex md:sidebar-collapsed:justify-center">
        <span className="px-2 text-heading text-ink md:sidebar-collapsed:hidden">Life OS</span>
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-controls="app-sidebar"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex size-8 items-center justify-center rounded-md text-ink-muted outline-none transition-colors hover:bg-surface-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          <PanelLeftClose className="size-5 sidebar-collapsed:hidden" />
          <PanelLeftOpen className="hidden size-5 sidebar-collapsed:block" />
        </button>
      </div>
      <nav className="flex flex-1 items-center gap-1 md:flex-1 md:flex-col md:items-stretch md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              title={label}
              className={isActive ? SIDEBAR_ITEM_ACTIVE : SIDEBAR_ITEM_INACTIVE}
            >
              <Icon className="size-5 shrink-0" />
              <span className={SIDEBAR_LABEL}>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-2 md:border-t md:border-border md:pt-4">
        <p className="hidden truncate px-2.5 text-caption text-ink-faint md:block md:sidebar-collapsed:hidden">
          {userEmail}
        </p>
        <ThemeToggle
          labelClassName={SIDEBAR_LABEL}
          className="w-full md:sidebar-collapsed:justify-center md:sidebar-collapsed:px-0"
        />
        {hasExportableData && <ExportDataButton />}
        <form action={logout}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className={cn(SIDEBAR_ITEM_BASE, "w-full text-ink-muted hover:bg-surface-200 hover:text-ink")}
          >
            <LogOut className="size-5 shrink-0" />
            <span className={SIDEBAR_LABEL}>Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
