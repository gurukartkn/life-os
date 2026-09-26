import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <div className="flex flex-col">
      <div className="mb-5 flex items-center justify-between">
        <Skeleton className="h-7 w-20" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="flex flex-col gap-px overflow-hidden rounded-lg border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] w-full rounded-none" />
        ))}
      </div>
    </div>
  );
}
