"use client";

import { useState, useTransition } from "react";
import { Archive, ChevronDown, ChevronRight, CircleAlert, Info, Pencil, Plus, RotateCcw, Tags, Wallet } from "lucide-react";
import {
  archiveAccount,
  archiveCategory,
  createAccount,
  createCategory,
  renameAccount,
  renameCategory,
  restoreAccount,
  restoreCategory,
} from "@/actions/finance";
import { FinanceHeader } from "@/components/finance/finance-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RetryButton } from "@/components/ui/retry-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tag } from "@/components/ui/tag";
import type { FinanceKind } from "@/lib/finance/money";
import type { LabelWithCount } from "@/lib/queries/finance";
import type { FinanceLabel } from "@/lib/validations/finance";

type Item = LabelWithCount<FinanceLabel & { kind?: FinanceKind }>;

type Mode = "accounts" | "categories";

const COPY = {
  accounts: {
    singular: "account",
    add: "Add account",
    emptyTitle: "No accounts yet",
    emptyDescription: "Add an account label, like HDFC Savings.",
    errorTitle: "Couldn’t load accounts",
    icon: Wallet,
  },
  categories: {
    singular: "category",
    add: "Add category",
    emptyTitle: "No categories yet",
    emptyDescription: "Add categories to group your transactions.",
    errorTitle: "Couldn’t load categories",
    icon: Tags,
  },
} as const;

const KIND_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
] as const;

function countLabel(count: number): string {
  if (count === 0) return "No transactions";
  return `${count} transaction${count === 1 ? "" : "s"}`;
}

const ACTIONS = {
  accounts: {
    create: (name: string) => createAccount({ name }),
    rename: renameAccount,
    archive: archiveAccount,
    restore: restoreAccount,
  },
  categories: {
    create: (name: string, kind: FinanceKind) => createCategory({ name, kind }),
    rename: renameCategory,
    archive: archiveCategory,
    restore: restoreCategory,
  },
};

// The Accounts and Categories tabs (5b · Finance): add from a row under the header,
// rename in place, archive (hidden from pickers, history kept) and restore. There is no
// delete. Accounts carry a standing "labels only" reminder; income categories an Income tag.
export function LabelManager({
  mode,
  active,
  archived,
  loadError = false,
}: {
  mode: Mode;
  active: Item[];
  archived: Item[];
  loadError?: boolean;
}) {
  const copy = COPY[mode];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<FinanceKind>("expense");
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [isPending, startTransition] = useTransition();

  const all = [...active, ...archived];
  function takenBy(name: string, exceptId?: string) {
    const wanted = name.trim().toLowerCase();
    return wanted ? all.find((item) => item.id !== exceptId && item.name.toLowerCase() === wanted) : undefined;
  }
  const duplicate = (name: string) => `“${name}” already exists. Names are unique, ignoring case.`;
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
      const result = mode === "accounts" ? await ACTIONS.accounts.create(name) : await ACTIONS.categories.create(name, newKind);
      if (!result.success) {
        setAddError(result.code === "duplicate_name" ? duplicate(name) : (result.error ?? "Couldn't add that. Try again."));
        return;
      }
      setNewName("");
    });
  }

  function handleRename(id: string) {
    const name = editValue.trim();
    if (!name) return;
    if (takenBy(name, id)) {
      setRowError({ id, message: duplicate(name) });
      return;
    }
    setRowError(null);
    startTransition(async () => {
      const result = await ACTIONS[mode].rename(id, name);
      if (!result.success) {
        setRowError({ id, message: result.code === "duplicate_name" ? duplicate(name) : (result.error ?? "Couldn't rename that. Try again.") });
        return;
      }
      setEditingId(null);
    });
  }

  function handleSetActive(item: Item, isActive: boolean) {
    setRowError(null);
    startTransition(async () => {
      const result = isActive ? await ACTIONS[mode].restore(item.id) : await ACTIONS[mode].archive(item.id);
      if (!result.success) {
        setRowError({ id: item.id, message: result.error ?? `Couldn't ${isActive ? "restore" : "archive"} that. Try again.` });
      }
    });
  }

  const addButton = (
    <Button type="button" onClick={() => setAdding(true)}>
      <Plus strokeWidth={1.75} />
      {copy.add}
    </Button>
  );

  let content: React.ReactNode;
  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title={copy.errorTitle}
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (all.length === 0 && !adding) {
    content = <EmptyState icon={copy.icon} title={copy.emptyTitle} description={copy.emptyDescription} action={addButton} />;
  } else {
    content = (
      <>
        {active.length > 0 && (
          <ul aria-label={mode === "accounts" ? "Accounts" : "Categories"} className="overflow-hidden rounded-lg border border-border bg-surface-100">
            {active.map((item) => (
              <li key={item.id} data-slot="label-row" className="border-b border-border last:border-b-0">
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
                    <span className="min-w-0 truncate text-body font-medium text-ink">{item.name}</span>
                    {item.kind === "income" && <Tag tone="teal">Income</Tag>}
                    <span className="flex-1" />
                    <span className="mr-2 text-body-sm text-ink-muted">{countLabel(item.transactionCount)}</span>
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
                  </div>
                )}
                {rowError?.id === item.id && <FieldError className="px-4 pb-3">{rowError.message}</FieldError>}
              </li>
            ))}
          </ul>
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
            {showArchived && (
              <ul aria-label="Archived">
                {archived.map((item) => (
                  <li key={item.id} className="border-t border-border">
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <FinanceHeader tab={mode} actions={loadError ? undefined : addButton} />
      <div className="flex flex-col gap-3">
        {mode === "accounts" && !loadError && (
          <p className="flex items-center gap-2 rounded-md bg-surface-200 px-3 py-2.5 text-body-sm text-ink-muted">
            <Info className="size-4 shrink-0" strokeWidth={1.75} />
            Accounts are labels only, like “HDFC Savings”. Never enter real account numbers.
          </p>
        )}
        {adding && (
          <div className="rounded-lg border border-border bg-surface-100 p-4">
            <div className="flex flex-wrap items-start gap-2">
              <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                <label htmlFor="finance-new-name" className="text-label text-ink">
                  New {copy.singular}
                </label>
                <Input
                  id="finance-new-name"
                  autoFocus
                  value={newName}
                  maxLength={100}
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
                <FieldError>{newNameTaken ? duplicate(newName.trim()) : addError}</FieldError>
              </div>
              {mode === "categories" && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-label text-ink">Type</span>
                  <SegmentedControl<FinanceKind> label="Type" value={newKind} options={KIND_OPTIONS} onChange={setNewKind} />
                </div>
              )}
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
        {content}
      </div>
    </div>
  );
}
