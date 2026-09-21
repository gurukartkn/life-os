import Link from "next/link";
import { Dumbbell, Plus } from "lucide-react";
import { FitnessTabs } from "@/components/fitness/fitness-tabs";
import { WorkoutList, type WorkoutCardData } from "@/components/fitness/workout-list";
import { RecentLogs, type RecentLogData } from "@/components/fitness/recent-logs";
import { ExerciseList } from "@/components/fitness/exercise-list";
import { AddExerciseForm } from "@/components/fitness/add-exercise-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/errors";
import type { Tables } from "@/lib/types/database";

type FitnessTab = "workouts" | "exercises";

type WorkoutWithRelations = {
  id: string;
  name: string;
  created_at: string;
  workout_exercises: { exercise_id: string; exercises: { muscle_groups: string[] } | null }[];
  workout_logs: { performed_at: string }[];
};

type RecentLogRow = {
  id: string;
  performed_on: string;
  workouts: { name: string } | null;
};

function parseTab(tab: string | undefined): FitnessTab {
  return tab === "exercises" ? "exercises" : "workouts";
}

export default async function FitnessPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = parseTab(tab);
  const supabase = await createClient();

  let workouts: WorkoutCardData[] = [];
  let recentLogs: RecentLogData[] = [];
  let exercises: Tables<"exercises">[] = [];

  if (activeTab === "workouts") {
    // The workouts and the recent logs don't depend on each other, so they are read together.
    const [{ data, error }, { data: logsData, error: logsError }] = await Promise.all([
      supabase
        .from("workouts")
        .select(
          "id, name, created_at, workout_exercises(exercise_id, exercises(muscle_groups)), workout_logs(performed_at)"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("workout_logs")
        .select("id, performed_on, workouts(name)")
        .order("performed_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (error) logError("Load workouts", error);

    workouts = ((data ?? []) as unknown as WorkoutWithRelations[]).map((workout) => {
      const muscleGroups = Array.from(
        new Set(workout.workout_exercises.flatMap((we) => we.exercises?.muscle_groups ?? []))
      ).slice(0, 3);
      // Compared as instants: performed_at is a timestamp, and its text form can vary in length.
      const lastLogged = workout.workout_logs.reduce<string | null>(
        (latest, log) =>
          !latest || new Date(log.performed_at).getTime() > new Date(latest).getTime()
            ? log.performed_at
            : latest,
        null
      );
      return {
        id: workout.id,
        name: workout.name,
        exerciseCount: workout.workout_exercises.length,
        muscleGroups,
        lastLogged,
      };
    });

    if (logsError) logError("Load recent logs", logsError);

    recentLogs = ((logsData ?? []) as unknown as RecentLogRow[]).map((log) => ({
      id: log.id,
      workoutName: log.workouts?.name ?? "Ad-hoc workout",
      performedOn: log.performed_on,
    }));
  } else {
    const { data, error } = await supabase
      .from("exercises")
      .select("*")
      .order("is_active", { ascending: false })
      .order("name", { ascending: true });

    if (error) logError("Load exercises", error);
    exercises = data ?? [];
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-page-title text-ink">Fitness</h1>
        <Link href="/fitness/workouts/new" className={buttonVariants({ tone: "teal" })}>
          <Plus />
          New workout
        </Link>
      </div>

      <FitnessTabs active={activeTab} />

      {activeTab === "workouts" ? (
        <>
          {workouts.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No workouts yet." />
          ) : (
            <WorkoutList workouts={workouts} />
          )}
          {recentLogs.length > 0 && <RecentLogs logs={recentLogs} />}
        </>
      ) : (
        <>
          <AddExerciseForm />
          {exercises.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No exercises yet." />
          ) : (
            <ExerciseList exercises={exercises} />
          )}
        </>
      )}
    </div>
  );
}
