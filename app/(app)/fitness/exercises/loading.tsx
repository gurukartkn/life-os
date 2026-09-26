import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function ExercisesLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader action />
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-[280px] rounded-md" />
          <Skeleton className="h-9 w-72 rounded-md" />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
          <div className="h-9 bg-surface-200" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex h-14 items-center gap-3 border-t border-border px-4">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
