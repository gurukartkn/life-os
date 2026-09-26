import { Skeleton, SkeletonHeader, SkeletonRows } from "@/components/ui/skeleton";

export default function RoutinesLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader action />
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-6 rounded-lg border border-border bg-surface-100 p-4">
          <div className="flex w-[120px] flex-col gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-2.5 w-full rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-3.5 w-20" />
        <SkeletonRows rows={2} />
        <Skeleton className="h-3.5 w-20" />
        <SkeletonRows rows={2} />
      </div>
    </div>
  );
}
