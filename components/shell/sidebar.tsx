"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Dumbbell, ListChecks, LogOut } from "lucide-react";
import { logout } from "@/actions/auth";
import { ExportDataButton } from "@/components/shell/export-data-button";

const NAV_ITEMS = [
  { href: "/todos", label: "Today", icon: CalendarCheck },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: ListChecks },
];

const NAV_LINK_BASE =
  "text-body flex items-center gap-2 rounded-md px-2.5 py-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
const NAV_LINK_INACTIVE = `${NAV_LINK_BASE} text-ink-muted hover:bg-surface-200 hover:text-ink`;
const NAV_LINK_ACTIVE = `${NAV_LINK_BASE} bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text`;

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full flex-row items-center gap-1 border-b border-border bg-surface-050 px-3 py-2 md:h-svh md:w-60 md:shrink-0 md:flex-col md:items-stretch md:gap-0 md:border-b-0 md:border-r md:p-4">
      <div className="hidden px-2 pb-6 text-heading text-ink md:block">Life OS</div>
      <nav className="flex flex-1 items-center gap-1 md:flex-1 md:flex-col md:items-stretch md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={isActive ? NAV_LINK_ACTIVE : NAV_LINK_INACTIVE}
            >
              <Icon className="size-5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-1 md:flex-col md:items-stretch md:gap-2 md:border-t md:border-border md:pt-4">
        <p className="hidden truncate px-2.5 text-caption text-ink-faint md:block">{userEmail}</p>
        <ExportDataButton />
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-body text-ink-muted outline-none transition-colors hover:bg-surface-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <LogOut className="size-5 shrink-0" />
            <span className="hidden md:inline">Log out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
