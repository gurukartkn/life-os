import Link from "next/link";
import { cn } from "cn";

const TABS = [
  { value: "workouts", label: "Workouts" },
  { value: "exercises", label: "Exercises" },
] as const;

export function FitnessTabs({ active }: { active: "workouts" | "exercises" }) {
  return (
    <div className="flex gap-5 border-b border-border" role="tablist" aria-label="Fitness sections">
      {TABS.map(({ value, label }) => {
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={value === "workouts" ? "/fitness" : `/fitness?tab=${value}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "text-button-text -mb-px border-b-2 pb-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              isActive
                ? "border-teal text-ink"
                : "border-transparent text-ink-faint hover:text-ink-muted"
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
