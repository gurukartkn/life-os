import { cn } from "cn";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-surface-200", className)}
    />
  );
}

export { Skeleton };
