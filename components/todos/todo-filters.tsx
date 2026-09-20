"use client";

import Link from "next/link";
import { filterHref, type StatusFilter } from "@/lib/todo-filters";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const BASE_CLASS =
  "text-button-text rounded-md px-2.5 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
const INACTIVE_CLASS = `${BASE_CLASS} text-ink-muted hover:bg-surface-200 hover:text-ink`;
const ACTIVE_CLASS = `${BASE_CLASS} bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text`;

// The filter is URL state (docs/04 §5) but the page already holds every todo, so
// selecting a tab only updates the URL with history.pushState — Next syncs
// useSearchParams from it without a server round trip — and the list filters in
// memory (TodoView). Modified clicks (new tab etc.) and no-JS keep the real href.
function handleSelect(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  event.preventDefault();
  if (window.location.pathname + window.location.search !== href) {
    window.history.pushState(null, "", href);
  }
}

export function TodoFilters({ active }: { active: StatusFilter }) {
  return (
    <div className="flex gap-1">
      {FILTERS.map(({ value, label }) => {
        const href = filterHref(value);
        return (
          <Link
            key={value}
            href={href}
            prefetch={false}
            aria-current={active === value ? "true" : undefined}
            onClick={(event) => handleSelect(event, href)}
            className={active === value ? ACTIVE_CLASS : INACTIVE_CLASS}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
