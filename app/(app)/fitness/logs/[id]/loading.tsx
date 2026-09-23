import { Skeleton } from "@/components/ui/skeleton";

export default function PastWorkoutLogLoading() {
  return (
    <div className="flex flex-col gap-5">
      <Skeleton className="h-7 w-40" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
