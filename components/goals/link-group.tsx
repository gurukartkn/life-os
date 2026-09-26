"use client";

import { useState, useTransition } from "react";
import { Plus, Unlink } from "lucide-react";
import { setLinks, unlinkItem } from "@/actions/links";
import { LinkPicker } from "@/components/goals/link-picker";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tag } from "@/components/ui/tag";
import { linkedTaskLabel } from "@/lib/goals";
import type { GoalItem, PickerItem } from "@/lib/queries/goals";
import type { LinkItemType } from "@/lib/validations/goals";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<LinkItemType, string> = {
  task: "Task",
  routine: "Routine",
  workout: "Workout",
  exercise: "Exercise",
};

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && [...a].every((id) => b.has(id));
}

// One group card on the goal detail (Tasks, Routines or Fitness items): its title and
// count, a Link button that opens the picker, and a row per linked item with an unlink
// button. The picker saves when it closes: for each type in the group, setLinks gets the
// ticked items plus any linked item the picker doesn't offer (an archived exercise, a
// deactivated routine), so closing the picker never unlinks what it didn't show.
export function LinkGroup({
  goalId,
  title,
  types,
  linked,
  pickerItems,
  today,
  searchLabel,
}: {
  goalId: string;
  title: string;
  types: LinkItemType[];
  linked: GoalItem[];
  pickerItems: PickerItem[];
  today: string;
  searchLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();
  const mixed = types.length > 1;

  function openPicker(next: boolean) {
    if (next) {
      setChecked(new Set(linked.map((item) => item.id)));
      setError(null);
      setOpen(true);
      return;
    }
    setOpen(false);
    save();
  }

  function save() {
    const offered = new Set(pickerItems.map((item) => item.id));
    const changes = types.flatMap((type) => {
      const current = new Set(linked.filter((item) => item.type === type).map((item) => item.id));
      const wanted = new Set([
        ...pickerItems.filter((item) => item.type === type && checked.has(item.id)).map((item) => item.id),
        ...[...current].filter((id) => !offered.has(id)),
      ]);
      return sameSet(current, wanted) ? [] : [{ type, ids: [...wanted] }];
    });
    if (changes.length === 0) return;

    startSave(async () => {
      for (const change of changes) {
        const result = await setLinks(goalId, change.type, change.ids);
        if (!result.success) {
          setError(result.error ?? "Couldn't save the links. Try again.");
          return;
        }
      }
    });
  }

  function unlink(item: GoalItem) {
    setError(null);
    startSave(async () => {
      const result = await unlinkItem(goalId, { type: item.type, id: item.id });
      if (!result.success) setError(result.error ?? "Couldn't unlink that. Try again.");
    });
  }

  function toggle(id: string, next: boolean) {
    setChecked((current) => {
      const updated = new Set(current);
      if (next) updated.add(id);
      else updated.delete(id);
      return updated;
    });
  }

  function metaFor(item: PickerItem): string | null {
    if (item.type === "task") return linkedTaskLabel(item, today, "picker");
    return mixed ? TYPE_LABELS[item.type] : null;
  }

  return (
    <section
      aria-label={title}
      data-slot="link-group"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface-100 p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-heading text-ink">{title}</h2>
          <p className="text-caption text-ink-muted">{isSaving ? "Saving…" : `${linked.length} linked`}</p>
        </div>
        <Popover open={open} onOpenChange={openPicker}>
          <PopoverTrigger
            render={<Button type="button" variant="ghost" size="sm" disabled={isSaving} />}
            aria-label={`Link ${title.toLowerCase()}`}
          >
            <Plus strokeWidth={1.75} />
            Link
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <LinkPicker
              items={pickerItems}
              checked={checked}
              onToggle={toggle}
              searchLabel={searchLabel}
              metaFor={metaFor}
            />
          </PopoverContent>
        </Popover>
      </div>
      <FieldError>{error}</FieldError>
      {linked.length === 0 ? (
        <p className="border-t border-border pt-3 text-body-sm text-ink-muted">Nothing linked yet.</p>
      ) : (
        <ul>
          {linked.map((item) => {
            const line = item.type === "task" ? linkedTaskLabel(item, today) : item.detail;
            return (
              <li
                key={`${item.type}:${item.id}`}
                data-slot="linked-item"
                className="flex min-h-14 items-center gap-2 border-t border-border py-1.5"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-body font-medium",
                        item.isCompleted || item.archived ? "text-ink-muted" : "text-ink"
                      )}
                    >
                      {item.title}
                    </span>
                    {mixed && <Tag>{TYPE_LABELS[item.type]}</Tag>}
                    {item.archived && <Tag tone="dashed">Archived</Tag>}
                  </div>
                  {line && (
                    <span
                      className={cn(
                        "truncate text-caption",
                        line === "Overdue" ? "font-medium text-pink-ink" : "text-ink-muted"
                      )}
                    >
                      {line}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Unlink ${item.title}`}
                  disabled={isSaving}
                  onClick={() => unlink(item)}
                >
                  <Unlink strokeWidth={1.75} />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
