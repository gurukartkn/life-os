import { Dumbbell } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function FitnessPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Fitness</h1>
      <EmptyState icon={Dumbbell} title="Nothing logged yet." />
    </div>
  );
}
