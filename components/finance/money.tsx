import { AlertCircle } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { formatInr, type FinanceKind } from "@/lib/finance/money";
import { cn } from "@/lib/utils";

// Finance is neutral ink (5b · Finance): an expense is ink with −, income is teal-ink
// with +. Amounts use tabular figures so columns line up.
export function Amount({
  paise,
  kind,
  className,
}: {
  paise: number;
  kind?: FinanceKind;
  className?: string;
}) {
  return (
    <span className={cn("text-amount whitespace-nowrap", kind === "income" ? "text-teal-ink" : "text-ink", className)}>
      {formatInr(paise, { kind })}
    </span>
  );
}

// Spend against budget: an ink bar on the track, pink once it's over.
export function SpendBar({ fill, over, className }: { fill: number; over: boolean; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-2 w-full shrink overflow-hidden rounded-full bg-surface-200", className)}
    >
      <div className={cn("h-full rounded-full", over ? "bg-pink" : "bg-ink")} style={{ width: `${fill}%` }} />
    </div>
  );
}

// "Over by ₹1,400" — the excess written out, in the attention colour.
export function OverTag({ paise, children }: { paise: number; children?: React.ReactNode }) {
  return (
    <Tag tone="pink" data-slot="over-tag">
      <AlertCircle strokeWidth={1.75} />
      {children ?? `Over by ${formatInr(paise)}`}
    </Tag>
  );
}
