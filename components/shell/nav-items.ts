import { Dumbbell, Repeat, SlidersHorizontal, SquareCheck, Target, type LucideIcon } from "lucide-react";

export type NavChild = { href: string; label: string };
export type NavItem = { href: string; label: string; icon: LucideIcon; children?: NavChild[] };

// The sidebar's sections, in the shell mockup's order. A section with children
// (Fitness) shows them indented while it is the current section, and as a flyout
// from the collapsed icon rail.
export const NAV_ITEMS: NavItem[] = [
  { href: "/tasks", label: "Tasks", icon: SquareCheck },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/routines", label: "Routines", icon: Repeat },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
