import { Skeleton } from "@/components/ui/skeleton";

export default function GoalLoading() {
  return (
    <div className="flex flex-col">
      <div className="mb-5 flex flex-col gap-2">
        <Skeleton className="h-4 w-16" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
