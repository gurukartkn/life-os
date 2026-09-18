import Link from "next/link";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
] as const;

const BASE_CLASS =
  "text-button-text rounded-md px-2.5 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
const INACTIVE_CLASS = `${BASE_CLASS} text-ink-muted hover:bg-surface-200 hover:text-ink`;
const ACTIVE_CLASS = `${BASE_CLASS} bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text`;

export function TodoFilters({ active }: { active: "all" | "active" | "completed" }) {
  return (
    <div className="flex gap-1">
      {FILTERS.map(({ value, label }) => (
        <Link
          key={value}
          href={value === "all" ? "/todos" : `/todos?status=${value}`}
          className={active === value ? ACTIVE_CLASS : INACTIVE_CLASS}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
