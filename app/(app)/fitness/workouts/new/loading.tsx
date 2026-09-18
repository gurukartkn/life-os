import { Skeleton } from "@/components/ui/skeleton";

export default function NewWorkoutLoading() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-10 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
