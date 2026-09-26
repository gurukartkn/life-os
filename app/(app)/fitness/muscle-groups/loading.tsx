import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader action />
      <div className="flex flex-col rounded-lg border border-border bg-surface-100 px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex h-14 items-center gap-3 border-b border-border last:border-b-0">
            <Skeleton className="h-3.5 w-32" />
            <div className="flex-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
