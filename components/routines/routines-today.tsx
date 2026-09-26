"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Inbox,
  Moon,
  Plus,
  Repeat,
  RotateCcw,
  Sun,
  Sunrise,
} from "lucide-react";
import { setRoutineActive } from "@/actions/routines";
import { RoutineCheckRow } from "@/components/routines/routine-check-row";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import type { RoutinesToday as RoutinesTodayData, TodayRoutine } from "@/lib/queries/routines";
import type { TimeOfDay } from "@/lib/routines/schedule";

const TIME_ICONS: Record<TimeOfDay, typeof Sun> = { morning: Sunrise, afternoon: Sun, evening: Moon, anytime: Clock };

function NewRoutineLink() {
  return (
    <Link href="/routines/new" className={buttonVariants()}>
      <Plus strokeWidth={1.75} />
      New routine
    </Link>
  );
}

function Bar({ pct, tone, className }: { pct: number; tone: "blue" | "teal"; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("overflow-hidden rounded-full bg-surface-200", className)}>
      <div className={cn("h-full rounded-full transition-all", tone === "teal" ? "bg-teal" : "bg-blue")} style={{ width: `${pct}%` }} />
    </div>
  );
}

// The day's progress: the share of due items done. Items not due today are left out;
// with nothing due there is no percentage at all.
function DayProgress({ due, done }: { due: number; done: number }) {
  if (due === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface-100 p-4">
        <p className="text-body font-medium text-ink-muted">Nothing due today.</p>
        <p className="text-caption text-ink-muted">Nothing on your routines is scheduled for today.</p>
      </div>
    );
  }
  const pct = Math.round((done / due) * 100);
  return (
    <div
      role="group"
      aria-label="Today's progress"
      className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface-100 p-4"
    >
      <div className="flex w-[120px] flex-col">
        <span className="text-caption text-ink-muted">Today</span>
        <span className="text-stat-xl text-ink">{pct}%</span>
      </div>
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Bar pct={pct} tone={pct === 100 ? "teal" : "blue"} className="h-2.5" />
        <p className="text-caption text-ink-muted">
          {done} of {due} due items done. Items not due today are left out of the percentage
          {pct === 100 ? "." : "; a due item not done counts as incomplete."}
        </p>
      </div>
    </div>
  );
}

function RoutineCard({ routine, today }: { routine: TodayRoutine; today: string }) {
  const done = routine.items.filter((item) => item.checked).length;
  return (
    <section aria-label={routine.title} className="overflow-hidden rounded-lg border border-border bg-surface-100">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-2">
          <Link
            href={`/routines/${routine.id}/edit`}
            className="rounded-sm text-heading text-ink outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {routine.title}
          </Link>
          <Tag>
            <Repeat strokeWidth={1.75} />
            {routine.frequencyLabel}
          </Tag>
        </div>
        <div className="flex items-center gap-2.5">
          {routine.weekProgress && (
            <Tag tone="blue">
              <Repeat strokeWidth={1.75} />
              {routine.weekProgress}
            </Tag>
          )}
          <span className="text-body-sm font-medium text-ink tabular-nums">
            {done} of {routine.items.length} today
          </span>
          <Bar pct={Math.round((done / routine.items.length) * 100)} tone="blue" className="h-1.5 w-20" />
        </div>
      </div>
      {routine.items.map((item) => (
        <RoutineCheckRow key={`${item.id}-${item.checked}`} item={item} today={today} />
      ))}
    </section>
  );
}

function Collapsible({
  title,
  count,
  hint,
  children,
}: {
  title: string;
  count: string;
  hint: [collapsed: string, expanded: string];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full flex-wrap items-center gap-2 px-4 text-left outline-none transition-colors hover:bg-surface-200 focus-visible:bg-surface-200"
      >
        <Chevron className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
        <span className="text-body font-semibold text-ink">{title}</span>
        <Tag>{count}</Tag>
        <span className="text-caption text-ink-muted">{open ? hint[1] : hint[0]}</span>
      </button>
      {open && children}
    </div>
  );
}

function ArchivedRoutines({ routines }: { routines: { id: string; title: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Collapsible
      title="Archived routines"
      count={String(routines.length)}
      hint={["Hidden from Routines and Today; history is kept.", "Restore one to use it again."]}
    >
      {routines.map((routine) => (
        <div key={routine.id} className="flex min-h-[52px] items-center gap-2.5 border-t border-border py-2 pr-3 pl-4">
          <span className="min-w-0 flex-1 truncate text-body font-medium text-ink-muted">{routine.title}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={`Restore ${routine.title}`}
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await setRoutineActive(routine.id, true);
                setError(result.success ? null : result.error ?? "Couldn't restore the routine. Try again.");
              })
            }
          >
            <RotateCcw strokeWidth={1.75} />
            Restore
          </Button>
        </div>
      ))}
      {error && <p className="px-4 pb-3 text-caption text-pink-ink">{error}</p>}
    </Collapsible>
  );
}

// The Routines page (Routines boards): today's progress, the routines that run today
// grouped by time of day with their due items, a line for each routine that doesn't run
// today, and the collapsed Not due today list whose items can be checked early.
export function RoutinesToday({ data, loadError = false }: { data: RoutinesTodayData; loadError?: boolean }) {
  let content: React.ReactNode;

  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={AlertCircle}
        title="Couldn’t load routines"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (!data.hasRoutines) {
    content = (
      <>
        <EmptyState
          icon={Inbox}
          title="No routines yet"
          description="Create a routine to check items off each day."
          action={<NewRoutineLink />}
        />
        {data.archived.length > 0 && <ArchivedRoutines routines={data.archived} />}
      </>
    );
  } else {
    const notDueCount = data.notDue.reduce((sum, routine) => sum + routine.items.length, 0);
    content = (
      <>
        <DayProgress due={data.dueCount} done={data.doneCount} />
        {data.groups.map((group) => {
          const Icon = TIME_ICONS[group.timeOfDay];
          return (
            <div key={group.timeOfDay} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-1.5 text-body-sm font-semibold text-ink-muted">
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                {group.label}
              </h2>
              {group.routines.map((routine) => (
                <RoutineCard key={routine.id} routine={routine} today={data.today} />
              ))}
            </div>
          );
        })}
        {data.notScheduled.map((routine) => (
          <p key={routine.id} className="flex items-center gap-2 px-1 py-0.5 text-body-sm font-medium text-ink-faint">
            <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>
              <Link href={`/routines/${routine.id}/edit`} className="rounded-sm outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                {routine.title}
              </Link>{" "}
              · {routine.label}
            </span>
          </p>
        ))}
        {notDueCount > 0 && (
          <Collapsible
            title="Not due today"
            count={`${notDueCount} ${notDueCount === 1 ? "item" : "items"}`}
            hint={["Can still be checked early", "Tap an item to check it off early"]}
          >
            {data.notDue.map((routine) => (
              <div key={routine.id} className="border-t border-border pb-1">
                <div className="flex items-center gap-2 px-4 pt-2.5 pb-0.5">
                  <span className="text-label font-semibold text-ink-muted">{routine.title}</span>
                  <span className="text-caption text-ink-muted">{routine.frequencyLabel}</span>
                </div>
                {routine.items.map((item) => (
                  <RoutineCheckRow key={`${item.id}-${item.checked}`} item={item} today={data.today} early />
                ))}
              </div>
            ))}
          </Collapsible>
        )}
        {data.archived.length > 0 && <ArchivedRoutines routines={data.archived} />}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Routines" actions={<NewRoutineLink />} />
      <div className="flex flex-col gap-3">{content}</div>
    </div>
  );
}
