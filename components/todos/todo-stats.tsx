import { Card, CardContent } from "@/components/ui/card";

const STATS = [
  { key: "dueToday", label: "Due today", colorClass: "text-blue-ink" },
  { key: "overdue", label: "Overdue", colorClass: "text-pink-ink" },
  { key: "completed", label: "Completed", colorClass: "text-teal-ink" },
] as const;

export function TodoStats({
  dueToday,
  overdue,
  completed,
}: {
  dueToday: number;
  overdue: number;
  completed: number;
}) {
  const values = { dueToday, overdue, completed };

  return (
    <div className="grid grid-cols-3 gap-4">
      {STATS.map(({ key, label, colorClass }) => (
        <Card key={key}>
          <CardContent className="flex flex-col gap-1">
            <span className="text-label text-ink-muted">{label}</span>
            <span className={`text-stat-xl ${colorClass}`}>{values[key]}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
