import { TodaySpendingCard } from "@/components/finance/today-spending-card";
import { TodayGoalsCard } from "@/components/goals/today-goals-card";
import { TodayFitnessCard } from "@/components/today/today-fitness-card";
import { TodayRoutinesCard } from "@/components/today/today-routines-card";
import { TodayTasksCard } from "@/components/today/today-tasks-card";
import type { RecentSession } from "@/lib/queries/fitness";
import type { TodaySpending } from "@/lib/queries/finance";
import type { GoalWithCount } from "@/lib/queries/goals";
import type { RoutinesToday } from "@/lib/queries/routines";
import type { TodayTask } from "@/lib/queries/tasks";

// Every section the Today dashboard shows, in order, with its column. The board maps
// over this list and nothing else, and each section renders its own empty or error
// state, so a module can't drop off the page by a missing branch or an early return.
// Adding a module here without its data and renderer below is a type error.
export const TODAY_SECTIONS = [
  { id: "tasks", column: "main" },
  { id: "routines", column: "main" },
  { id: "fitness", column: "main" },
  { id: "goals", column: "side" },
  { id: "spending", column: "side" },
] as const;

export type TodaySectionId = (typeof TODAY_SECTIONS)[number]["id"];

export type TodayData = {
  today: string;
  timeZone: string;
  tasks: { tasks: TodayTask[]; total: number; error: boolean };
  routines: { data: RoutinesToday; error: boolean };
  fitness: { sessions: RecentSession[]; error: boolean };
  goals: { goals: GoalWithCount[]; error: boolean };
  spending: { spending: TodaySpending | null; error: boolean };
};

const RENDER: { [K in TodaySectionId]: (data: TodayData) => React.ReactNode } = {
  tasks: ({ tasks, today }) => (
    <TodayTasksCard tasks={tasks.tasks} total={tasks.total} today={today} loadError={tasks.error} />
  ),
  routines: ({ routines }) => <TodayRoutinesCard routines={routines.data} loadError={routines.error} />,
  fitness: ({ fitness, timeZone }) => (
    <TodayFitnessCard sessions={fitness.sessions} timeZone={timeZone} loadError={fitness.error} />
  ),
  goals: ({ goals }) => <TodayGoalsCard goals={goals.goals} loadError={goals.error} />,
  spending: ({ spending }) => <TodaySpendingCard spending={spending.spending} loadError={spending.error} />,
};

export function TodayBoard({ data }: { data: TodayData }) {
  const column = (name: "main" | "side") =>
    TODAY_SECTIONS.filter((section) => section.column === name).map((section) => (
      <div key={section.id} data-today-section={section.id}>
        {RENDER[section.id](data)}
      </div>
    ));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">{column("main")}</div>
      <div className="flex flex-col gap-4">{column("side")}</div>
    </div>
  );
}
