import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

function SkeletonList({ rows, rowClass }: { rows: number; rowClass: string }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface-100 px-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-center gap-3 border-b border-border last:border-b-0 ${rowClass}`}>
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export default function WorkoutsLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader action />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <SkeletonList rows={3} rowClass="h-[72px]" />
        <Skeleton className="h-4 w-36" />
        <SkeletonList rows={3} rowClass="h-14" />
      </div>
    </div>
  );
}
