import { cn } from "@/lib/utils";

// Loading placeholders (shell boards, "loading" content region): skeleton-token bars
// with radius-sm, laid inside the same white cards the loaded content uses.
function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-skeleton motion-reduce:animate-none", className)}
    />
  );
}

// A stat-style card: a short label bar over a taller value bar.
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2.5 rounded-lg border border-border bg-surface-100 p-4", className)}>
      <Skeleton className="h-3 w-2/5" />
      <Skeleton className="h-7 w-[70%]" />
    </div>
  );
}

// A list card: rows of checkbox square, text bar and a trailing pill.
function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-lg border border-border bg-surface-100 p-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-11 items-center gap-3">
          <Skeleton className="size-5" />
          <Skeleton className="h-3 w-[45%]" />
          <div className="flex-1" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

// The page header placeholder: title bar, and an action-button bar when the page has one.
function SkeletonHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-5 flex items-center justify-between">
      <Skeleton className="h-7 w-32" />
      {action && <Skeleton className="h-10 w-32 rounded-md" />}
    </div>
  );
}

export { Skeleton, SkeletonCard, SkeletonRows, SkeletonHeader };
