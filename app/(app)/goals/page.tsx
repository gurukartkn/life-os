import { Target } from "lucide-react";
import { AddGoalForm } from "@/components/goals/add-goal-form";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import { formatDueDate } from "@/lib/dates";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    logError("Load goals", error);
  }

  const goals = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-page-title text-ink">Goals</h1>
      <AddGoalForm />
      {goals.length === 0 ? (
        <EmptyState icon={Target} title="No goals yet." />
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="flex items-center justify-between">
                <span className="text-body text-ink">{goal.title}</span>
                {goal.target_date && (
                  <span className="text-caption text-ink-muted">
                    Target {formatDueDate(goal.target_date)}
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
