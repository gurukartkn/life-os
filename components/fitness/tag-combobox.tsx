"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CatalogItem } from "@/lib/fitness/catalog";

export type TagCreateResult = { success: true; item: CatalogItem } | { success: false; error: string };

type Option =
  | { kind: "item"; item: CatalogItem; hint?: string }
  | { kind: "create"; name: string };

// Multi-select over a catalog (muscle groups, equipment) with inline create — the
// exercise form's field (Exercises "Exercise form with inline create" board). Chosen
// items are chips in the field; typing filters the rest; a new name offers
// `Create "…"`. Names are unique ignoring case, so typing an existing name offers that
// item instead, with a note. Created items are kept locally so they show at once.
export function TagCombobox({
  label,
  items,
  selectedIds,
  onChange,
  onCreate,
  placeholder = "Search or create",
}: {
  label: string;
  items: CatalogItem[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onCreate: (name: string) => Promise<TagCreateResult>;
  placeholder?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [extraItems, setExtraItems] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const known = new Map([...items, ...extraItems].map((item) => [item.id, item]));
  const selected = selectedIds.flatMap((selectedId) => known.get(selectedId) ?? []);
  const typed = query.trim();
  const exact = typed
    ? [...known.values()].find((item) => item.name.toLowerCase() === typed.toLowerCase())
    : undefined;
  const duplicate = exact && !selectedIds.includes(exact.id) ? exact : undefined;

  const options: Option[] = duplicate
    ? [{ kind: "item", item: duplicate, hint: "Select existing" }]
    : [
        ...[...known.values()]
          .filter((item) => item.isActive && !selectedIds.includes(item.id))
          .filter((item) => !typed || item.name.toLowerCase().includes(typed.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item): Option => ({ kind: "item", item })),
        ...(typed && !exact ? [{ kind: "create", name: typed } as Option] : []),
      ];
  const active = Math.min(highlight, Math.max(options.length - 1, 0));

  function select(item: CatalogItem) {
    if (!selectedIds.includes(item.id)) onChange([...selectedIds, item.id]);
    setQuery("");
    setError(null);
    setHighlight(0);
    inputRef.current?.focus();
  }

  async function create(name: string) {
    setError(null);
    setIsCreating(true);
    const result = await onCreate(name);
    setIsCreating(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (!known.has(result.item.id)) setExtraItems((prev) => [...prev, result.item]);
    select(result.item);
  }

  function choose(option: Option | undefined) {
    if (!option || isCreating) return;
    if (option.kind === "item") select(option.item);
    else void create(option.name);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlight((current) => Math.min(current + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      // Never submit the surrounding form from inside the picker.
      event.preventDefault();
      if (open || typed) choose(options[active]);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
    } else if (event.key === "Backspace" && !query && selectedIds.length > 0) {
      onChange(selectedIds.slice(0, -1));
    }
  }

  const message = duplicate ? `“${typed}” already exists. Names are unique, ignoring case.` : error;
  const showList = open && options.length > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <div className="relative">
        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            "flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border bg-surface-100 px-3 py-2 transition-colors focus-within:ring-3",
            message
              ? "border-pink focus-within:ring-pink/20"
              : "border-border-strong focus-within:border-accent focus-within:ring-accent/30"
          )}
        >
          {selected.map((item) => (
            <span
              key={item.id}
              className="inline-flex h-[26px] items-center gap-1 rounded-sm bg-surface-200 pr-1 pl-2 text-[13px] font-medium text-ink"
            >
              {item.name}
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(selectedIds.filter((selectedId) => selectedId !== item.id));
                }}
                className="flex size-4 items-center justify-center rounded-sm text-ink-muted outline-none hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-3" strokeWidth={1.75} />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            aria-invalid={message ? true : undefined}
            aria-describedby={message ? `${id}-message` : undefined}
            value={query}
            placeholder={selected.length === 0 ? placeholder : undefined}
            disabled={isCreating}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setHighlight(0);
              setError(null);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={handleKeyDown}
            className="h-7 min-w-24 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-faint md:text-sm"
          />
        </div>
        {showList && (
          <ul
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute top-full right-0 left-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border-strong bg-surface-100 p-1.5 shadow-float"
          >
            {options.map((option, index) => (
              <li
                key={option.kind === "item" ? option.item.id : `create-${option.name}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                // mousedown, not click: it must win over the input's blur.
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(option);
                }}
                onMouseEnter={() => setHighlight(index)}
                className={cn(
                  "flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-2.5",
                  index === active && "bg-surface-200"
                )}
              >
                {option.kind === "create" ? (
                  <>
                    <Plus className="size-4 shrink-0 text-ink" strokeWidth={1.75} />
                    <span className="flex-1 text-body font-semibold text-ink">Create “{option.name}”</span>
                    <span className="text-caption text-ink-muted">Press Enter</span>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-body font-medium text-ink">{option.item.name}</span>
                    {option.hint && <span className="text-caption text-ink-muted">{option.hint}</span>}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {message && (
        <p id={`${id}-message`} className="flex items-start gap-1 text-caption text-pink-ink">
          <AlertCircle className="mt-px size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
}
