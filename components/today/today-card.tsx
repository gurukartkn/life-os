import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The frame every Today section shares (Today dashboard board): a titled card whose
// region is named by its heading, the body, then a ghost link to the module.
export function TodayCard({
  title,
  slot,
  link,
  children,
}: {
  title: string;
  slot: string;
  link: { href: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      data-slot={slot}
      className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-100 p-4"
    >
      <h2 className="text-heading text-ink">{title}</h2>
      {children}
      <Link href={link.href} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}>
        {link.label}
        <ChevronRight strokeWidth={1.75} />
      </Link>
    </section>
  );
}

// The one-line body for a failed read or an empty section.
export function TodayCardNote({ error = false, children }: { error?: boolean; children: React.ReactNode }) {
  return (
    <p
      role={error ? "alert" : undefined}
      className={cn("border-t border-border py-3 text-body-sm", error ? "text-pink-ink" : "text-ink-muted")}
    >
      {children}
    </p>
  );
}

export const todayRowClassName =
  "flex min-h-[52px] items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
