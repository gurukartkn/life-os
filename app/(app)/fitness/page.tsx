import { redirect } from "next/navigation";

// Fitness is four screens (Workouts, Exercises, Muscle Groups, Equipment); the section
// itself lands on Workouts. The old tabbed page's ?tab=exercises still lands right.
export default async function FitnessPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(tab === "exercises" ? "/fitness/exercises" : "/fitness/workouts");
}
