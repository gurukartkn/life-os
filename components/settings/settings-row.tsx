// One Settings row: a medium-weight name with a muted line under it, and the
// control right-aligned.
export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body font-medium text-ink">{title}</span>
        <span className="truncate text-caption text-ink-muted">{description}</span>
      </div>
      {children}
    </div>
  );
}

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface-100 p-4">
      <h2 className="text-heading text-ink">{title}</h2>
      {children}
    </section>
  );
}
