import Link from "next/link";
import { Tag } from "@/components/ui/tag";
import { DeleteRoutineButton } from "@/components/routines/delete-routine-button";

const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
};

export function RoutineCard({
  id,
  title,
  cadence,
  totalCount,
  doneCount,
}: {
  id: string;
  title: string;
  cadence: string;
  totalCount: number;
  doneCount: number;
}) {
  const progressPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-surface-100 p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-2">
          <span className="text-heading text-ink">{title}</span>
          <Tag>{CADENCE_LABELS[cadence] ?? cadence}</Tag>
        </div>
        <DeleteRoutineButton id={id} />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-caption text-ink-faint">
          {totalCount === 0 ? "No items yet" : `${doneCount} of ${totalCount} done`}
        </span>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
          <div className="h-full bg-blue transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <Link
        href={`/routines/${id}`}
        className="text-button-text flex h-[38px] w-full items-center justify-center gap-1.5 rounded-md bg-blue-soft text-blue-ink transition-colors hover:bg-blue-soft/80"
      >
        View checklist
      </Link>
    </div>
  );
}
