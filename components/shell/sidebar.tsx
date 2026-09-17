"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Dumbbell, ListChecks, LogOut } from "lucide-react";
import { cn } from "cn";
import { logout } from "@/actions/auth";

const NAV_ITEMS = [
  { href: "/todos", label: "Today", icon: CalendarCheck },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: ListChecks },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-svh w-60 shrink-0 flex-col border-r border-border bg-surface-050 p-4">
      <div className="px-2 pb-6 text-heading text-ink">Life OS</div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2 text-body text-ink-muted transition-colors hover:bg-surface-200 hover:text-ink",
                isActive && "bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <p className="truncate px-2.5 text-caption text-ink-faint">{userEmail}</p>
        <form action={logout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-body text-ink-muted transition-colors hover:bg-surface-200 hover:text-ink"
          >
            <LogOut className="size-5" />
            Log out
          </button>
        </form>
      </div>
    </aside>
  );
}
