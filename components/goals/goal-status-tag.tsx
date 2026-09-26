import { Check } from "lucide-react";
import { Tag } from "@/components/ui/tag";
import { GOAL_STATUS_LABELS, GOAL_STATUS_TONES } from "@/lib/goals";
import type { GoalStatus } from "@/lib/validations/goals";

// Active in the violet shared with Tasks, Achieved in teal with a tick, Dropped neutral.
export function GoalStatusTag({ status }: { status: GoalStatus }) {
  return (
    <Tag tone={GOAL_STATUS_TONES[status]}>
      {status === "achieved" && <Check strokeWidth={1.75} />}
      {GOAL_STATUS_LABELS[status]}
    </Tag>
  );
}
