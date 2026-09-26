import Link from "next/link";
import { AlertCircle, Inbox, Plus } from "lucide-react";
import { RecentSessions } from "@/components/fitness/recent-sessions";
import { WorkoutList } from "@/components/fitness/workout-list";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import { SectionHeader } from "@/components/ui/section-header";
import { getRecentSessions, getWorkoutSummaries } from "@/lib/queries/fitness";
import { createClient } from "@/lib/supabase/server";

function NewWorkoutLink() {
  return (
    <Link href="/fitness/workouts/new" className={buttonVariants()}>
      <Plus strokeWidth={1.75} />
      New workout
    </Link>
  );
}

export default async function WorkoutsPage() {
  const supabase = await createClient();
  const [{ workouts, error }, sessions] = await Promise.all([
    getWorkoutSummaries(supabase),
    getRecentSessions(supabase),
  ]);

  let content: React.ReactNode;
  if (error) {
    content = (
      <EmptyState
        tone="error"
        icon={AlertCircle}
        title="Couldn’t load workouts"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (workouts.length === 0) {
    content = (
      <EmptyState
        icon={Inbox}
        title="No workouts yet"
        description="Build a workout from your exercises, then log it."
        action={<NewWorkoutLink />}
      />
    );
  } else {
    content = (
      <>
        <SectionHeader title="Your workouts" />
        <WorkoutList workouts={workouts} />
        {sessions.length > 0 && (
          <>
            <SectionHeader title="Recent sessions" />
            <RecentSessions sessions={sessions} />
          </>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Workouts" actions={<NewWorkoutLink />} />
      <div className="flex flex-col gap-3">{content}</div>
    </div>
  );
}
