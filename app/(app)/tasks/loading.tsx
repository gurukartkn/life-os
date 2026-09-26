import { Skeleton, SkeletonHeader, SkeletonRows } from "@/components/ui/skeleton";

export default function TasksLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader action />
      <div className="flex flex-col gap-4">
        <div className="flex h-11 items-center gap-5 border-b border-border">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <SkeletonRows rows={5} />
      </div>
    </div>
  );
}
