// A section heading inside a page ("Your workouts", "Exercises"): heading-weight
// title with an optional right-aligned slot (a count, a small action).
export function SectionHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-heading text-ink">{title}</h2>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
