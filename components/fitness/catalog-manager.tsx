"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Archive, ChevronDown, ChevronRight, Inbox, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Tag } from "@/components/ui/tag";
import { plural } from "@/lib/fitness/labels";
import type { CatalogItem, CatalogResult } from "@/lib/fitness/catalog";

export type CatalogActions = {
  create: (input: { name: string }) => Promise<CatalogResult<CatalogItem>>;
  rename: (id: string, name: string) => Promise<CatalogResult<CatalogItem>>;
  archive: (id: string) => Promise<CatalogResult<CatalogItem>>;
  restore: (id: string) => Promise<CatalogResult<CatalogItem>>;
  remove: (id: string) => Promise<CatalogResult>;
};

export type CatalogCopy = {
  title: string; // "Muscle Groups"
  singular: string; // "muscle group"
  emptyDescription: string;
};

const byName = (a: CatalogItem, b: CatalogItem) => a.name.localeCompare(b.name);

function duplicateMessage(name: string) {
  return `“${name}” already exists. Names are unique, ignoring case.`;
}

// The Muscle Groups and Equipment screens (Fitness boards): one implementation for
// both, given its actions as props so this file never imports a specific pair of
// action files. Items are added from a row under the header, renamed in place,
// archived (hidden from pickers, history kept) or deleted. Delete is refused while
// exercises use the item — the row says so and offers Archive instead.
export function CatalogManager({
  copy,
  items,
  usage,
  actions,
}: {
  copy: CatalogCopy;
  items: CatalogItem[];
  usage: Record<string, number>;
  actions: CatalogActions;
}) {
  const [list, setList] = useState(() => [...items].sort(byName));
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [blockedId, setBlockedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const active = list.filter((item) => item.isActive);
  const archived = list.filter((item) => !item.isActive);
  const addLabel = `Add ${copy.singular}`;

  // Re-sorts every time — a rename can change where the row belongs.
  function upsert(item: CatalogItem) {
    setList((prev) =>
      (prev.some((row) => row.id === item.id) ? prev.map((row) => (row.id === item.id ? item : row)) : [...prev, item]).sort(
        byName
      )
    );
  }

  function takenBy(name: string, exceptId?: string) {
    const wanted = name.trim().toLowerCase();
    return wanted ? list.find((item) => item.id !== exceptId && item.name.toLowerCase() === wanted) : undefined;
  }

  const newNameTaken = takenBy(newName);

  function cancelAdd() {
    setAdding(false);
    setNewName("");
    setAddError(null);
  }

  function handleCreate() {
    const name = newName.trim();
    if (!name || newNameTaken) return;
    setAddError(null);
    startTransition(async () => {
      const result = await actions.create({ name });
      if (!result.success || !result.data) {
        setAddError(result.code === "duplicate_name" ? duplicateMessage(name) : result.error ?? "Couldn't add that. Try again.");
        return;
      }
      upsert(result.data);
      setNewName("");
    });
  }

  function handleRename(id: string) {
    const name = editValue.trim();
    if (!name) return;
    if (takenBy(name, id)) {
      setRowError({ id, message: duplicateMessage(name) });
      return;
    }
    setRowError(null);
    startTransition(async () => {
      const result = await actions.rename(id, name);
      if (!result.success || !result.data) {
        setRowError({
          id,
          message: result.code === "duplicate_name" ? duplicateMessage(name) : result.error ?? "Couldn't rename that. Try again.",
        });
        return;
      }
      upsert(result.data);
      setEditingId(null);
    });
  }

  function handleSetActive(item: CatalogItem, isActive: boolean) {
    setRowError(null);
    setBlockedId(null);
    startTransition(async () => {
      const result = isActive ? await actions.restore(item.id) : await actions.archive(item.id);
      if (!result.success || !result.data) {
        setRowError({ id: item.id, message: result.error ?? `Couldn't ${isActive ? "restore" : "archive"} that. Try again.` });
        return;
      }
      upsert(result.data);
    });
  }

  function handleDelete(item: CatalogItem) {
    setRowError(null);
    // Known to be in use: say so straight away rather than asking the server.
    if ((usage[item.id] ?? 0) > 0) {
      setBlockedId(item.id);
      return;
    }
    startTransition(async () => {
      const result = await actions.remove(item.id);
      if (result.code === "in_use") {
        setBlockedId(item.id);
        return;
      }
      if (!result.success) {
        setRowError({ id: item.id, message: result.error ?? "Couldn't delete that. Try again." });
        return;
      }
      setList((prev) => prev.filter((row) => row.id !== item.id));
    });
  }

  const addButton = (
    <Button type="button" onClick={() => setAdding(true)}>
      <Plus strokeWidth={1.75} />
      {addLabel}
    </Button>
  );

  return (
    <div className="flex flex-col">
      <PageHeader title={copy.title} actions={addButton} />
      <div className="flex flex-col gap-3">
        {adding && (
          <div className="rounded-lg border border-border bg-surface-100 p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                <label htmlFor="catalog-new-name" className="text-label text-ink">
                  New {copy.singular}
                </label>
                <Input
                  id="catalog-new-name"
                  autoFocus
                  value={newName}
                  aria-invalid={newNameTaken || addError ? true : undefined}
                  onChange={(event) => {
                    setNewName(event.target.value);
                    setAddError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleCreate();
                    } else if (event.key === "Escape") {
                      cancelAdd();
                    }
                  }}
                />
                <FieldError>{newNameTaken ? duplicateMessage(newName.trim()) : addError}</FieldError>
              </div>
              <div className="flex items-center gap-2 pt-[22px]">
                <Button type="button" disabled={isPending || !newName.trim() || Boolean(newNameTaken)} onClick={handleCreate}>
                  Add
                </Button>
                <Button type="button" variant="ghost" onClick={cancelAdd}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {list.length === 0 && !adding ? (
          <EmptyState icon={Inbox} title={`No ${copy.title.toLowerCase()} yet`} description={copy.emptyDescription} action={addButton} />
        ) : (
          active.length > 0 && (
            <div aria-label={copy.title} className="overflow-hidden rounded-lg border border-border bg-surface-100">
              {active.map((item) => {
                const count = usage[item.id] ?? 0;
                return (
                  <div key={item.id} data-slot="catalog-row" className="border-b border-border last:border-b-0">
                    {editingId === item.id ? (
                      <div className="flex min-h-16 flex-wrap items-center gap-2 px-4 py-3">
                        <Input
                          aria-label={`Rename ${item.name}`}
                          autoFocus
                          value={editValue}
                          className="min-w-48 flex-1"
                          aria-invalid={rowError?.id === item.id ? true : undefined}
                          onChange={(event) => setEditValue(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleRename(item.id);
                            else if (event.key === "Escape") setEditingId(null);
                          }}
                        />
                        <Button type="button" size="sm" disabled={isPending} onClick={() => handleRename(item.id)}>
                          Save
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex min-h-14 items-center gap-1.5 py-2 pr-3 pl-4">
                        <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{item.name}</span>
                        <span className="mr-2 text-body-sm text-ink-muted">{count > 0 ? plural(count, "exercise") : "Not used"}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Rename ${item.name}`}
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.name);
                            setRowError(null);
                          }}
                        >
                          <Pencil strokeWidth={1.75} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Archive ${item.name}`}
                          disabled={isPending}
                          onClick={() => handleSetActive(item, false)}
                        >
                          <Archive strokeWidth={1.75} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${item.name}`}
                          disabled={isPending}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 strokeWidth={1.75} />
                        </Button>
                      </div>
                    )}
                    {rowError?.id === item.id && <FieldError className="px-4 pb-3">{rowError.message}</FieldError>}
                    {blockedId === item.id && (
                      <div className="px-3 pb-3">
                        <div role="alert" className="flex flex-wrap items-center gap-2.5 rounded-md bg-pink-soft px-3 py-2.5">
                          <AlertCircle className="size-4 shrink-0 text-pink-ink" strokeWidth={1.75} />
                          <p className="min-w-0 flex-1 text-body-sm font-medium text-pink-ink">
                            Can’t delete {item.name}: {count > 0 ? `${plural(count, "exercise")} use it` : "exercises use it"}. Archive
                            it to hide it from pickers instead.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => handleSetActive(item, false)}
                          >
                            Archive instead
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setBlockedId(null)}>
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}

        {archived.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
            <button
              type="button"
              aria-expanded={showArchived}
              onClick={() => setShowArchived((open) => !open)}
              className="flex h-12 w-full items-center gap-2 px-4 text-left outline-none transition-colors hover:bg-surface-200 focus-visible:bg-surface-200"
            >
              {showArchived ? (
                <ChevronDown className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
              )}
              <span className="text-body font-medium text-ink">Archived ({archived.length})</span>
              <span className="text-caption text-ink-muted">Hidden from pickers; history is kept.</span>
            </button>
            {showArchived &&
              archived.map((item) => (
                <div key={item.id} className="border-t border-border">
                  <div className="flex min-h-[52px] items-center gap-2.5 py-2 pr-3 pl-4">
                    <span className="min-w-0 flex-1 truncate text-body font-medium text-ink-muted">{item.name}</span>
                    <Tag>
                      <Archive strokeWidth={1.75} />
                      Archived
                    </Tag>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      aria-label={`Restore ${item.name}`}
                      onClick={() => handleSetActive(item, true)}
                    >
                      <RotateCcw strokeWidth={1.75} />
                      Restore
                    </Button>
                  </div>
                  {rowError?.id === item.id && <FieldError className="px-4 pb-3">{rowError.message}</FieldError>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
