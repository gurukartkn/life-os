import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function RoutinesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Routines</h1>
      <EmptyState icon={ListChecks} title="No routines yet." />
    </div>
  );
}
