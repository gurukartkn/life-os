import { Skeleton } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-7 w-24" />
      <div className="flex gap-4">
        <Skeleton className="h-20 flex-1" />
        <Skeleton className="h-20 flex-1" />
        <Skeleton className="h-20 flex-1" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] w-full" />
        ))}
      </div>
    </div>
  );
}
