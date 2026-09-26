"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { PickerItem } from "@/lib/queries/goals";

// The Link picker's body (5a · "Goal detail with link picker"): a search field, the
// items that can be linked with a tick on each linked one, and the hint. Ticking and
// unticking only change `checked`; the group saves the difference when the picker closes.
export function LinkPicker({
  items,
  checked,
  onToggle,
  searchLabel,
  metaFor,
}: {
  items: PickerItem[];
  checked: Set<string>;
  onToggle: (id: string, next: boolean) => void;
  searchLabel: string;
  metaFor: (item: PickerItem) => string | null;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter((item) => item.title.toLowerCase().includes(needle)) : items;
  }, [items, query]);

  return (
    <div className="flex flex-col gap-2">
      <label className="flex h-10 items-center gap-2 rounded-md border border-border-strong bg-surface-100 px-3 has-focus-visible:border-accent has-focus-visible:ring-3 has-focus-visible:ring-accent/30">
        <Search className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} aria-hidden />
        <span className="sr-only">{searchLabel}</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchLabel}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint md:text-sm"
        />
      </label>
      {items.length === 0 ? (
        <p className="px-2.5 py-2 text-body-sm text-ink-muted">Nothing to link yet.</p>
      ) : visible.length === 0 ? (
        <p className="px-2.5 py-2 text-body-sm text-ink-muted">No matches.</p>
      ) : (
        <ul className="-mx-1 flex max-h-72 flex-col overflow-y-auto">
          {visible.map((item) => {
            const meta = metaFor(item);
            // Named by its title alone: the enclosing label would add the meta text too.
            const titleId = `link-picker-${item.type}-${item.id}`;
            return (
              <li key={`${item.type}:${item.id}`}>
                <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2.5 hover:bg-surface-200">
                  <Checkbox
                    checked={checked.has(item.id)}
                    onCheckedChange={(next) => onToggle(item.id, next)}
                    aria-labelledby={titleId}
                  />
                  <span id={titleId} className="min-w-0 flex-1 truncate text-body font-medium text-ink">
                    {item.title}
                  </span>
                  {meta && <span className="shrink-0 text-caption text-ink-muted">{meta}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-caption text-ink-muted">Tick to link, untick to unlink.</p>
    </div>
  );
}
