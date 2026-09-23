"use client";

import { useState, useTransition } from "react";
import { Archive, ArchiveRestore, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { Input } from "@/components/ui/input";
import type { CatalogItem, CatalogResult } from "@/lib/fitness/catalog";

type CatalogActions = {
  create: (input: { name: string }) => Promise<CatalogResult<CatalogItem>>;
  rename: (id: string, name: string) => Promise<CatalogResult<CatalogItem>>;
  archive: (id: string) => Promise<CatalogResult<CatalogItem>>;
  restore: (id: string) => Promise<CatalogResult<CatalogItem>>;
  remove: (id: string) => Promise<CatalogResult>;
};

// The "Muscle Groups" and "Equipment" submodules (v2 Stage 3): one implementation for
// both, given as props so this file never imports a specific pair of action files.
// Delete is refused with a typed `in_use` error telling the person to archive instead.
export function CatalogManager({
  title,
  items,
  actions,
}: {
  title: string;
  items: CatalogItem[];
  actions: CatalogActions;
}) {
  const [list, setList] = useState(items);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newName, setNewName] = useState("");
  const [rowError, setRowError] = useState<{ id: string | "new"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Re-sorts every time, not just on insert — a rename can change where the row
  // belongs, and leaving it in place would read wrong until the next page load.
  function upsert(item: CatalogItem) {
    setList((prev) => {
      const next = prev.some((row) => row.id === item.id)
        ? prev.map((row) => (row.id === item.id ? item : row))
        : [...prev, item];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setRowError(null);
    startTransition(async () => {
      const result = await actions.create({ name });
      if (!result.success || !result.data) {
        setRowError({ id: "new", message: result.error ?? "Couldn't add that. Try again." });
        return;
      }
      upsert(result.data);
      setNewName("");
    });
  }

  function handleRename(id: string) {
    const name = editValue.trim();
    if (!name) return;
    setRowError(null);
    startTransition(async () => {
      const result = await actions.rename(id, name);
      if (!result.success || !result.data) {
        setRowError({ id, message: result.error ?? "Couldn't rename that. Try again." });
        return;
      }
      upsert(result.data);
      setEditingId(null);
    });
  }

  function handleToggleActive(item: CatalogItem) {
    setRowError(null);
    startTransition(async () => {
      const result = item.isActive ? await actions.archive(item.id) : await actions.restore(item.id);
      if (!result.success || !result.data) {
        setRowError({
          id: item.id,
          message: result.error ?? `Couldn't ${item.isActive ? "archive" : "restore"} that. Try again.`,
        });
        return;
      }
      upsert(result.data);
    });
  }

  function handleDelete(id: string) {
    setRowError(null);
    startTransition(async () => {
      const result = await actions.remove(id);
      if (!result.success) {
        setRowError({ id, message: result.error ?? "Couldn't delete that. Try again." });
        return;
      }
      setList((prev) => prev.filter((row) => row.id !== id));
    });
  }

  return (
    <div
      aria-label={`${title} catalog`}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-100 p-4"
    >
      <span className="text-label text-ink">{title}</span>
      <div className="flex flex-col gap-1.5">
        {list.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="flex items-center gap-1.5">
              <Input
                aria-label={`Rename ${item.name}`}
                value={editValue}
                autoFocus
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename(item.id)}
                className="h-7 flex-1 text-caption"
              />
              <button
                type="button"
                onClick={() => handleRename(item.id)}
                disabled={isPending}
                aria-label="Save name"
                className="text-ink-faint hover:text-teal-ink"
              >
                <Check className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setEditingId(null)}
                aria-label="Cancel rename"
                className="text-ink-faint hover:text-pink-ink"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div key={item.id} className="flex items-center gap-2 py-0.5">
              <span
                className={`flex-1 text-body-sm ${item.isActive ? "text-ink" : "text-ink-faint line-through"}`}
              >
                {item.name}
              </span>
              {!item.isActive && <Tag>Archived</Tag>}
              <button
                type="button"
                onClick={() => {
                  setEditingId(item.id);
                  setEditValue(item.name);
                }}
                aria-label={`Rename ${item.name}`}
                className="text-ink-faint transition-colors hover:text-ink"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(item)}
                disabled={isPending}
                aria-label={item.isActive ? `Archive ${item.name}` : `Restore ${item.name}`}
                className="text-ink-faint transition-colors hover:text-ink disabled:pointer-events-none disabled:opacity-50"
              >
                {item.isActive ? <Archive className="size-3.5" /> : <ArchiveRestore className="size-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                disabled={isPending}
                aria-label={`Delete ${item.name}`}
                className="text-ink-faint transition-colors hover:text-pink-ink disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )
        )}
        {list.length === 0 && <span className="text-caption text-ink-faint">None yet.</span>}
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        <Input
          aria-label={`New ${title.toLowerCase()}`}
          placeholder="Add one…"
          value={newName}
          disabled={isPending}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          className="h-7 flex-1 text-caption"
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={isPending || !newName.trim()}
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:text-teal-ink disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {rowError && <span className="text-caption text-pink-ink">{rowError.message}</span>}
    </div>
  );
}
