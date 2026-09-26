"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArrowDown, ArrowUp, ChevronDown, ChevronRight, GripVertical, Info, Plus, Repeat, RotateCcw, Trash2 } from "lucide-react";
import { createRoutine, setRoutineActive, updateRoutine } from "@/actions/routines";
import { BackLink } from "@/components/ui/back-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldError, FieldHint } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl, SegmentedToggles } from "@/components/ui/segmented-control";
import { Stepper } from "@/components/ui/stepper";
import { Tag } from "@/components/ui/tag";
import {
  repeatHint,
  TIME_OF_DAY_LABELS,
  TIMES_OF_DAY,
  WEEKDAY_SHORT,
  type Frequency,
  type RepeatRule,
  type TimeOfDay,
} from "@/lib/routines/schedule";
import type { RoutineFormInput } from "@/lib/validations/routines";

export type RoutineFormItem = {
  key: string;
  id?: string;
  title: string;
  repeatRule: RepeatRule;
  repeatEvery: number;
  isActive: boolean;
};

export type RoutineFormRoutine = {
  id: string;
  title: string;
  timeOfDay: TimeOfDay;
  frequency: Frequency;
  timesPerWeek: number | null;
  weekdays: number[] | null;
};

let keySeed = 0;
const newItem = (): RoutineFormItem => ({
  key: `new-${++keySeed}`,
  title: "",
  repeatRule: "every_time",
  repeatEvery: 2,
  isActive: true,
});

const TIME_OPTIONS = TIMES_OF_DAY.map((value) => ({ value, label: TIME_OF_DAY_LABELS[value] }));
const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "times_per_week", label: "N times a week" },
  { value: "specific_days", label: "Specific days" },
];
const DAY_OPTIONS = WEEKDAY_SHORT.map((label, index) => ({ value: index + 1, label }));

function DetailsCard({ children }: { children: React.ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface-100 p-5">{children}</section>;
}

// The routine form (Routines "Routine form" board): details and schedule, then the
// items, each with its own repeatability — reordered by the grip or the arrows,
// archived into a collapsed group, or removed. The same screen creates a routine.
export function RoutineForm({
  routine,
  initialItems,
}: {
  routine: RoutineFormRoutine | null;
  initialItems: RoutineFormItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(routine?.title ?? "");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(routine?.timeOfDay ?? "anytime");
  const [frequency, setFrequency] = useState<Frequency>(routine?.frequency ?? "daily");
  const [timesPerWeek, setTimesPerWeek] = useState(routine?.timesPerWeek ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? []);
  const [items, setItems] = useState<RoutineFormItem[]>(initialItems.length > 0 ? initialItems : [newItem()]);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragKey = useRef<string | null>(null);

  const active = items.filter((item) => item.isActive);
  const archived = items.filter((item) => !item.isActive);

  function update(key: string, patch: Partial<RoutineFormItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  // Moves an active item within the active ones; archived items keep their place after.
  function moveTo(key: string, targetKey: string) {
    if (key === targetKey) return;
    setItems((prev) => {
      const list = prev.filter((item) => item.isActive);
      const from = list.findIndex((item) => item.key === key);
      const to = list.findIndex((item) => item.key === targetKey);
      if (from < 0 || to < 0) return prev;
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return [...list, ...prev.filter((item) => !item.isActive)];
    });
  }

  function values(): RoutineFormInput {
    return {
      title,
      timeOfDay,
      frequency,
      timesPerWeek: frequency === "times_per_week" ? timesPerWeek : null,
      weekdays: frequency === "specific_days" ? weekdays : null,
      items: [...active, ...archived].map((item) => ({
        id: item.id,
        title: item.title,
        repeatRule: item.repeatRule,
        repeatEvery: item.repeatRule === "every_nth" ? item.repeatEvery : null,
        isActive: item.isActive,
      })),
    };
  }

  function validate(): string | null {
    if (!title.trim()) return "Enter a name.";
    if (frequency === "specific_days" && weekdays.length === 0) return "Pick at least one day.";
    if (active.length === 0) return "Add at least one item.";
    if (items.some((item) => !item.title.trim())) return "Name every item.";
    return null;
  }

  function handleSave() {
    const problem = validate();
    setError(problem);
    if (problem) return;
    startTransition(async () => {
      if (routine) {
        const result = await updateRoutine(routine.id, values());
        if (!result.success) {
          setError(result.error ?? "Couldn't save the routine. Try again.");
          return;
        }
        router.push("/routines");
        return;
      }
      // createRoutine redirects on success, so only a failure comes back.
      const result = await createRoutine(values());
      if (result && !result.success) setError(result.error ?? "Couldn't create the routine. Try again.");
    });
  }

  function handleArchiveRoutine() {
    if (!routine) return;
    startTransition(async () => {
      const result = await setRoutineActive(routine.id, false);
      if (!result.success) {
        setError(result.error ?? "Couldn't archive the routine. Try again.");
        return;
      }
      router.push("/routines");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <BackLink href="/routines">Routines</BackLink>
        <PageHeader className="mb-0" title={routine ? "Edit routine" : "New routine"} />
      </div>

      <DetailsCard>
        <h2 className="text-heading text-ink">Details</h2>
        <Field className="max-w-[360px]">
          <Label htmlFor="routine-name">Name</Label>
          <Input id="routine-name" value={title} placeholder="Skincare" onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field>
          <span className="text-label text-ink">Time of day</span>
          <SegmentedControl label="Time of day" value={timeOfDay} options={TIME_OPTIONS} onChange={setTimeOfDay} />
        </Field>
        <Field>
          <span className="text-label text-ink">Frequency</span>
          <SegmentedControl label="Frequency" value={frequency} options={FREQUENCY_OPTIONS} onChange={setFrequency} />
        </Field>
        {frequency === "daily" && <FieldHint className="-mt-2">Every day.</FieldHint>}
        {frequency === "times_per_week" && (
          <Field>
            <div className="flex items-center gap-2">
              <Stepper
                value={timesPerWeek}
                min={1}
                max={6}
                onChange={setTimesPerWeek}
                decreaseLabel="Decrease times a week"
                increaseLabel="Increase times a week"
              />
              <span className="text-body-sm text-ink-muted">times a week</span>
            </div>
            <FieldHint>Pick 1 to 6. Not tied to fixed days.</FieldHint>
          </Field>
        )}
        {frequency === "specific_days" && (
          <Field>
            <span className="text-label text-ink">Days</span>
            <SegmentedToggles label="Days" values={weekdays} options={DAY_OPTIONS} onChange={setWeekdays} />
            <FieldHint>Picking all seven days is the same as Daily.</FieldHint>
          </Field>
        )}
      </DetailsCard>

      <DetailsCard>
        <div className="flex flex-col gap-0.5">
          <h2 className="text-heading text-ink">Items</h2>
          <p className="text-caption text-ink-muted">Each item has its own repeatability. Drag the grip, or use the arrows, to reorder.</p>
        </div>
        <div className="-mb-2 hidden text-label text-ink-muted md:flex">
          <span className="w-[254px]">Item</span>
          <span>Repeats</span>
        </div>
        <div className="flex flex-col">
          {active.map((item, index) => {
            const name = item.title.trim() || `item ${index + 1}`;
            return (
              <div
                key={item.key}
                data-slot="routine-form-item"
                draggable
                onDragStart={() => (dragKey.current = item.key)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragKey.current) moveTo(dragKey.current, item.key);
                  dragKey.current = null;
                }}
                className="flex flex-col gap-1 py-2.5"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <GripVertical className="size-[18px] shrink-0 cursor-grab text-ink-muted" strokeWidth={1.75} aria-hidden="true" />
                  <Input
                    aria-label="Item name"
                    value={item.title}
                    placeholder="e.g. Cleanser"
                    className="w-[194px]"
                    onChange={(event) => update(item.key, { title: event.target.value })}
                  />
                  <SegmentedControl
                    label={`How often ${name} repeats`}
                    value={item.repeatRule}
                    options={[
                      { value: "every_time", label: "Every time" },
                      { value: "every_nth", label: frequency === "daily" ? "Every Nth day" : "Every Nth time" },
                      { value: "weekly", label: "Once a week" },
                    ]}
                    onChange={(repeatRule) => update(item.key, { repeatRule })}
                  />
                  {item.repeatRule === "every_nth" && (
                    <Stepper
                      value={item.repeatEvery}
                      min={2}
                      max={30}
                      onChange={(repeatEvery) => update(item.key, { repeatEvery })}
                      decreaseLabel={`Decrease N for ${name}`}
                      increaseLabel={`Increase N for ${name}`}
                    />
                  )}
                  <div className="flex-1" />
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${name} up`}
                      disabled={index === 0}
                      onClick={() => moveTo(item.key, active[index - 1].key)}
                    >
                      <ArrowUp strokeWidth={1.75} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${name} down`}
                      disabled={index === active.length - 1}
                      onClick={() => moveTo(item.key, active[index + 1].key)}
                    >
                      <ArrowDown strokeWidth={1.75} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Archive ${name}`}
                      disabled={!item.id}
                      title={item.id ? undefined : "Save the routine before archiving a new item"}
                      onClick={() => update(item.key, { isActive: false })}
                    >
                      <Archive strokeWidth={1.75} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${name}`}
                      onClick={() => setItems((prev) => prev.filter((row) => row.key !== item.key))}
                    >
                      <Trash2 strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 pl-7 text-caption text-ink-muted">
                  <Repeat className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  {repeatHint({ repeatRule: item.repeatRule, repeatEvery: item.repeatEvery }, frequency)}
                </p>
              </div>
            );
          })}
        </div>
        <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => setItems((prev) => [...prev, newItem()])}>
          <Plus strokeWidth={1.75} />
          Add item
        </Button>

        {archived.length > 0 && (
          <>
            <div className="h-px bg-border" />
            <div className="flex flex-col">
              <button
                type="button"
                aria-expanded={showArchived}
                onClick={() => setShowArchived((open) => !open)}
                className="flex h-11 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showArchived ? (
                  <ChevronDown className="size-4 text-ink-muted" strokeWidth={1.75} />
                ) : (
                  <ChevronRight className="size-4 text-ink-muted" strokeWidth={1.75} />
                )}
                <span className="text-body font-medium text-ink">Archived ({archived.length})</span>
                <span className="text-caption text-ink-muted">Hidden from the routine; history is kept.</span>
              </button>
              {showArchived &&
                archived.map((item) => (
                  <div key={item.key} className="flex min-h-12 items-center gap-2.5 pl-[34px]">
                    <span className="min-w-0 flex-1 truncate text-body font-medium text-ink-muted">{item.title}</span>
                    <Tag>
                      <Archive strokeWidth={1.75} />
                      Archived
                    </Tag>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Restore ${item.title}`}
                      onClick={() => update(item.key, { isActive: true })}
                    >
                      <RotateCcw strokeWidth={1.75} />
                      Restore
                    </Button>
                  </div>
                ))}
            </div>
          </>
        )}
        <p className="flex items-start gap-1.5 text-caption text-ink-muted">
          <Info className="mt-px size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          Next due counts from when an item was last done, so a missed item is due again next time. There is no skip.
        </p>
      </DetailsCard>

      <FieldError>{error}</FieldError>
      <div className="flex flex-wrap items-center gap-2">
        {routine && (
          <Button type="button" variant="outline" disabled={isPending} onClick={handleArchiveRoutine}>
            <Archive strokeWidth={1.75} />
            Archive routine
          </Button>
        )}
        <div className="flex-1" />
        <Link href="/routines" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        <Button type="button" disabled={isPending} onClick={handleSave}>
          {isPending ? "Saving…" : "Save routine"}
        </Button>
      </div>
    </div>
  );
}
