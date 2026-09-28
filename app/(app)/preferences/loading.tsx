import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex flex-col">
      <SkeletonHeader />
      <div className="flex max-w-[640px] flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface-100 p-4">
            <Skeleton className="h-4 w-28" />
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
