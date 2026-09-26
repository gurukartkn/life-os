"use client";

import Link from "next/link";
import { TabBar, TabCount, tabClassName } from "@/components/ui/tab-bar";
import { filterHref, type StatusFilter } from "@/lib/task-filters";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

// The filter is URL state (docs/04 §5) but the page already holds every task, so
// selecting a tab only updates the URL with history.pushState — Next syncs
// useSearchParams from it without a server round trip — and the list filters in
// memory (TasksScreen). Modified clicks (new tab etc.) and no-JS keep the real href.
function handleSelect(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  if (window.location.pathname + window.location.search !== href) {
    window.history.pushState(null, "", href);
  }
}

// Underline tabs with tabular counts (Tasks board): fixed widths keep the row still.
export function TaskFilters({
  active,
  counts,
}: {
  active: StatusFilter;
  counts: Record<StatusFilter, number>;
}) {
  return (
    <TabBar role="group" aria-label="Filter tasks">
      {FILTERS.map(({ value, label }) => {
        const href = filterHref(value);
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={href}
            prefetch={false}
            aria-current={isActive ? "true" : undefined}
            onClick={(event) => handleSelect(event, href)}
            className={tabClassName(isActive)}
          >
            {label}{" "}
            <TabCount>{counts[value]}</TabCount>
          </Link>
        );
      })}
    </TabBar>
  );
}
