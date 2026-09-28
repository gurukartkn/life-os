import { Dumbbell, House, Repeat, SlidersHorizontal, SquareCheck, Target, Wallet, type LucideIcon } from "lucide-react";

// `match` lists extra path prefixes that belong to a child screen (a workout's log
// pages sit under Workouts without living beneath /fitness/workouts).
export type NavChild = { href: string; label: string; match?: string[] };
export type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavChild[] };

// The sidebar's sections, in the shell mockup's order. A section with children
// (Fitness) shows them indented while it is the current section, and as a flyout
// from the collapsed icon rail. Today comes first: it is also where "/" lands.
export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: House },
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  {
    href: "/fitness",
    label: "Fitness",
    icon: Dumbbell,
    children: [
      { href: "/fitness/workouts", label: "Workouts", match: ["/fitness/log", "/fitness/logs"] },
      { href: "/fitness/exercises", label: "Exercises" },
      { href: "/fitness/muscle-groups", label: "Muscle Groups" },
      { href: "/fitness/equipment", label: "Equipment" },
    ],
  },
  { href: "/routines", label: "Routines", icon: Repeat },
  { href: "/goals", label: "Goals", icon: Target },
  // One item: Finance's sections are tabs inside the page (5b · Finance).
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isChildCurrent(pathname: string, child: NavChild): boolean {
  return [child.href, ...(child.match ?? [])].some((href) => isCurrent(pathname, href));
}
