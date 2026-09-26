import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// The small "← Workouts" link above a detail page's title.
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex w-fit items-center gap-1.5 rounded-sm text-[13px] leading-[18px] font-medium text-ink-muted outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="size-3.5" strokeWidth={1.75} />
      {children}
    </Link>
  );
}
