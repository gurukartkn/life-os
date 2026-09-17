import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function TodayPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Today</h1>
      <EmptyState icon={CalendarCheck} title="Nothing on the list today." />
    </div>
  );
}
