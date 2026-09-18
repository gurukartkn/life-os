import { Card } from "@/components/ui/card";
import { formatDueDate } from "@/lib/dates";

export type RecentLogData = { id: string; workoutName: string; performedOn: string };

export function RecentLogs({ logs }: { logs: RecentLogData[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-ink-muted">Recent workout logs</span>
      <Card className="gap-0 overflow-hidden py-0">
        {logs.map((log, index) => (
          <div
            key={log.id}
            className={`flex items-center gap-3 px-5 py-3.5 ${
              index < logs.length - 1 ? "border-b border-border" : ""
            }`}
          >
            <div className="size-2 rounded-full bg-teal" />
            <span className="flex-1 text-body text-ink">{log.workoutName}</span>
            <span className="text-body-sm text-ink-faint">{formatDueDate(log.performedOn)}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
