import { RoutineItemRow } from "@/components/routines/routine-item-row";

export type RoutineItemData = {
  id: string;
  title: string;
  checked: boolean;
};

export function RoutineChecklist({
  items,
  periodStart,
  routineId,
}: {
  items: RoutineItemData[];
  periodStart: string;
  routineId: string;
}) {
  const totalCount = items.length;
  const doneCount = items.filter((item) => item.checked).length;
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-body-sm text-ink-faint">
          {totalCount === 0 ? "No items yet" : `${doneCount} of ${totalCount} done`}
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
          <div className="h-full bg-blue transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-body text-ink-muted">Nothing on the list yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <RoutineItemRow
              key={item.id}
              id={item.id}
              title={item.title}
              checked={item.checked}
              periodStart={periodStart}
              routineId={routineId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
