"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { CatalogItem } from "@/lib/fitness/catalog";

export type TagPickerCreateResult =
  | { success: true; item: CatalogItem }
  | { success: false; error: string };

// A multi-select of toggle chips (muscle groups or equipment) with an inline "add new"
// row. Newly created items are kept in local state so they show up as chosen without
// waiting for the page to revalidate — the create actions do that in the background.
export function TagPicker({
  label,
  items,
  selectedIds,
  onChange,
  onCreate,
  addPlaceholder = "Add one…",
}: {
  label: string;
  items: CatalogItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<TagPickerCreateResult>;
  addPlaceholder?: string;
}) {
  const [extraItems, setExtraItems] = useState<CatalogItem[]>([]);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const known = new Map([...items, ...extraItems].map((item) => [item.id, item]));
  const options = [...known.values()].sort((a, b) => a.name.localeCompare(b.name));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    setIsCreating(true);
    const result = await onCreate(name);
    setIsCreating(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!known.has(result.item.id)) setExtraItems((prev) => [...prev, result.item]);
    onChange(selectedIds.includes(result.item.id) ? selectedIds : [...selectedIds, result.item.id]);
    setNewName("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label text-ink">{label}</span>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
        {options.map((item) => {
          const selected = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggle(item.id)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                selected
                  ? "bg-teal-soft text-teal-ink"
                  : "bg-surface-200 text-ink-muted hover:bg-border-strong/50"
              )}
            >
              {item.name}
            </button>
          );
        })}
        {options.length === 0 && <span className="text-caption text-ink-faint">None yet.</span>}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          aria-label={`New ${label.toLowerCase()}`}
          placeholder={addPlaceholder}
          value={newName}
          disabled={isCreating}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          className="h-7 w-40 text-caption"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={isCreating || !newName.trim()}
          aria-label={`Add ${label.toLowerCase()}`}
          className="flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-teal-ink disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
